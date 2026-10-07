"""Integration tests for the 20261007_0001 migration (bloque 3, item 3.0).

Loads the migration module directly via importlib and drives its
`_do_upgrade()`/`_do_downgrade()` — the same sync-Connection entry points
Alembic's `upgrade()`/`downgrade()` call via `op.get_bind()` — against a
real Postgres connection obtained from the async `db_session` fixture via
`AsyncConnection.run_sync()`. Same technique as
`test_migrate_legacy_vehicle_catalog.py`.
"""

import importlib.util
from collections.abc import Callable
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel
from prosell.infrastructure.models.user_model import UserModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "20261007_0001_merge_vendedor_role_into_sales_agent.py"
)


@pytest.fixture(scope="module")
def migration() -> Any:
    spec = importlib.util.spec_from_file_location(
        "merge_vendedor_role_into_sales_agent_20261007_0001", _MIGRATION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def _run(db_session: AsyncSession, fn: Callable[[sa.engine.Connection], None]) -> None:
    conn = await db_session.connection()
    await conn.run_sync(fn)


async def _create_user(
    db_session: AsyncSession, test_organization: OrganizationModel, *, email: str
) -> UserModel:
    user = UserModel(
        id=uuid4(),
        email=email,
        full_name="Test User",
        tenant_id=test_organization.tenant_id,
        status="active",
        email_verified=True,
        password_hash="hash",
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _create_role(
    db_session: AsyncSession, *, role_type: str, name: str = "Sales Agent"
) -> RoleModel:
    role = RoleModel(
        id=uuid4(),
        role_type=role_type,
        name=name,
        description="Manage own leads and catalog",
        is_system_role=True,
    )
    db_session.add(role)
    await db_session.flush()
    return role


async def _assign_role(db_session: AsyncSession, user: UserModel, role: RoleModel) -> None:
    db_session.add(UserRoleModel(id=uuid4(), user_id=user.id, role_id=role.id))
    await db_session.flush()


async def _role_by_type(db_session: AsyncSession, role_type: str) -> RoleModel | None:
    result = await db_session.execute(select(RoleModel).where(RoleModel.role_type == role_type))
    return result.scalar_one_or_none()


async def _role_types_for_user(db_session: AsyncSession, user_id: Any) -> list[str]:
    result = await db_session.execute(
        select(RoleModel.role_type)
        .join(UserRoleModel, UserRoleModel.role_id == RoleModel.id)
        .where(UserRoleModel.user_id == user_id)
    )
    return sorted(row[0] for row in result.all())


class TestMergeVendedorRoleIntoSalesAgentUpgrade:
    async def test_no_op_when_vendedor_role_absent(
        self, migration: Any, db_session: AsyncSession
    ) -> None:
        """Safe no-op: nothing to merge, nothing to crash on."""
        assert await _role_by_type(db_session, "vendedor") is None

        await _run(db_session, migration._do_upgrade)

        assert await _role_by_type(db_session, "vendedor") is None

    async def test_reassigns_vendedor_only_user_to_sales_agent(
        self, migration: Any, db_session: AsyncSession, test_organization: OrganizationModel
    ) -> None:
        vendedor_role = await _create_role(db_session, role_type="vendedor")
        user = await _create_user(db_session, test_organization, email=f"{uuid4().hex}@test.local")
        await _assign_role(db_session, user, vendedor_role)

        await _run(db_session, migration._do_upgrade)

        assert await _role_by_type(db_session, "vendedor") is None
        assert await _role_types_for_user(db_session, user.id) == ["sales_agent"]

    async def test_deduplicates_user_who_already_holds_both_roles(
        self, migration: Any, db_session: AsyncSession, test_organization: OrganizationModel
    ) -> None:
        """A user with BOTH 'vendedor' and 'sales_agent' must end up with
        exactly one 'sales_agent' row, never a duplicate."""
        vendedor_role = await _create_role(db_session, role_type="vendedor")
        # This DB may already carry a real 'sales_agent' system role (shared
        # persistent test container) — reuse it rather than assume a clean
        # slate, same as the migration itself would find in that case.
        sales_agent_role = await _role_by_type(db_session, "sales_agent") or await _create_role(
            db_session, role_type="sales_agent"
        )
        user = await _create_user(db_session, test_organization, email=f"{uuid4().hex}@test.local")
        await _assign_role(db_session, user, vendedor_role)
        await _assign_role(db_session, user, sales_agent_role)

        await _run(db_session, migration._do_upgrade)

        assert await _role_types_for_user(db_session, user.id) == ["sales_agent"]

    async def test_creates_sales_agent_role_when_missing(
        self, migration: Any, db_session: AsyncSession, test_organization: OrganizationModel
    ) -> None:
        """sales_agent is not guaranteed to pre-exist — the migration must
        create it (with its real grants/scope) rather than crash or silently
        drop the user's assignment."""
        # This DB may already carry a real 'sales_agent' system role (shared
        # persistent test container) — remove it for this test only, inside
        # the rolled-back transaction, to exercise the "missing" precondition.
        existing = await _role_by_type(db_session, "sales_agent")
        if existing is not None:
            await db_session.delete(existing)
            await db_session.flush()

        vendedor_role = await _create_role(db_session, role_type="vendedor")
        assert await _role_by_type(db_session, "sales_agent") is None
        user = await _create_user(db_session, test_organization, email=f"{uuid4().hex}@test.local")
        await _assign_role(db_session, user, vendedor_role)

        await _run(db_session, migration._do_upgrade)

        sales_agent_role = await _role_by_type(db_session, "sales_agent")
        assert sales_agent_role is not None
        assert await _role_types_for_user(db_session, user.id) == ["sales_agent"]

        grants = await db_session.execute(
            sa.text("SELECT zone, action FROM role_grants WHERE role_id = :role_id"),
            {"role_id": sales_agent_role.id},
        )
        assert sorted(grants.all()) == sorted(
            [
                ("catalog", "create"),
                ("catalog", "read"),
                ("catalog", "update"),
                ("analytics", "view"),
            ]
        )
        scope = await db_session.execute(
            sa.text("SELECT scope_type FROM role_scope WHERE role_id = :role_id"),
            {"role_id": sales_agent_role.id},
        )
        assert scope.scalar_one() == "own"


class TestMergeVendedorRoleIntoSalesAgentDowngrade:
    async def test_recreates_empty_vendedor_shell(
        self, migration: Any, db_session: AsyncSession, test_organization: OrganizationModel
    ) -> None:
        vendedor_role = await _create_role(db_session, role_type="vendedor")
        user = await _create_user(db_session, test_organization, email=f"{uuid4().hex}@test.local")
        await _assign_role(db_session, user, vendedor_role)

        await _run(db_session, migration._do_upgrade)
        assert await _role_by_type(db_session, "vendedor") is None

        await _run(db_session, migration._do_downgrade)

        recreated = await _role_by_type(db_session, "vendedor")
        assert recreated is not None
        # Documented limitation: the original assignment is NOT restored.
        assert await _role_types_for_user(db_session, user.id) == ["sales_agent"]

    async def test_downgrade_is_idempotent(self, migration: Any, db_session: AsyncSession) -> None:
        assert await _role_by_type(db_session, "vendedor") is None

        await _run(db_session, migration._do_downgrade)
        await _run(db_session, migration._do_downgrade)

        result = await db_session.execute(
            select(RoleModel).where(RoleModel.role_type == "vendedor")
        )
        assert len(result.scalars().all()) == 1
