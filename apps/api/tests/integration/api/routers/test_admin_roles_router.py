"""Integration tests for GET /api/v1/admin/roles (bloque 3, item 3.2).

Real Postgres end to end — no mocked repository. `get_current_auth_user_from_cookie`
is overridden with a domain `User` whose `id` matches a REAL persisted user;
`get_async_session` is overridden to the test's `db_session` so the whole
dependency chain (require_zone_action -> get_effective_scope ->
get_role_repository -> SqlAlchemyRoleRepository) resolves against the same
transaction the test persists its fixtures in.

Deliberately NOT using the shared `async_client_as_admin`/`admin_user`
fixtures from tests/integration/api/conftest.py: their `admin_role` is
fabricated ONLY in memory (a placeholder id, never inserted) — the new
zone x action engine always resolves grants via a real DB query by
user_id, so that fixture would resolve to zero grants here. Same lesson
already documented in the workbook for the item 3.0/product_router.py
test fixes.
"""

from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import RoleGrantModel, RoleScopeModel, UserRoleModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.role_repository_impl import SqlAlchemyRoleRepository


async def _grant_role(
    db_session: AsyncSession,
    user: UserModel,
    *,
    zone: str,
    action: str,
    scope_type: str,
    tenant_id,
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    role = await repo.create(
        Role.create_custom_role(
            name=f"Test grant {uuid4().hex[:6]}", description="Test-only", tenant_id=tenant_id
        )
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=role.id, zone=zone, action=action))
    db_session.add(RoleScopeModel(id=uuid4(), role_id=role.id, scope_type=scope_type))
    db_session.add(UserRoleModel(id=uuid4(), user_id=user.id, role_id=role.id))
    await db_session.flush()


async def _create_grantless_user(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> UserModel:
    """A genuinely fresh user with ZERO roles assigned — unlike the
    shared `test_user` fixture, which always carries a real, seeded
    super_admin role (see its own docstring in tests/integration/conftest.py).
    Reusing `test_user` for a "no grants" assertion silently passes for
    the wrong reason (super_admin's AllScope, not an absence of grants)."""
    user = UserModel(
        id=uuid4(),
        email=f"grantless-{uuid4().hex[:8]}@test.local",
        full_name="Grantless Test User",
        tenant_id=test_organization.tenant_id,
        status="active",
        email_verified=True,
        is_2fa_enabled=False,
        failed_login_attempts=0,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@asynccontextmanager
async def _client_as(user_id, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    domain_user = User(
        id=user_id,
        email="roles-test@test.local",
        full_name="Roles Test User",
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[],  # irrelevant — the new engine resolves grants from the DB by id
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: domain_user

    async def override_get_async_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_roles_requires_roles_read_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    """A user with zero grants gets 403, not a crash or an empty list."""
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user.id, db_session) as client:
        response = await client.get("/api/v1/admin/roles")
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_roles_with_all_scope_includes_system_and_custom_roles(
    db_session: AsyncSession,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    await _grant_role(
        db_session,
        test_user,
        zone="roles",
        action="read",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(test_user.id, db_session) as client:
        response = await client.get("/api/v1/admin/roles")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(item["is_system_role"] for item in body["items"])


@pytest.mark.asyncio
async def test_get_role_by_id_returns_grants_and_scope(
    db_session: AsyncSession,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description="desc", tenant_id=test_organization.tenant_id
        )
    )
    db_session.add(
        RoleGrantModel(id=uuid4(), role_id=target_role.id, zone="catalog", action="read")
    )
    db_session.add(RoleScopeModel(id=uuid4(), role_id=target_role.id, scope_type="own"))
    await db_session.flush()

    await _grant_role(
        db_session,
        test_user,
        zone="roles",
        action="read",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(test_user.id, db_session) as client:
        response = await client.get(f"/api/v1/admin/roles/{target_role.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(target_role.id)
    assert {"zone": "catalog", "action": "read"} in body["grants"]
    assert body["scope"]["scope_type"] == "own"


@pytest.mark.asyncio
async def test_get_role_by_id_404s_for_missing_role(
    db_session: AsyncSession,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    await _grant_role(
        db_session,
        test_user,
        zone="roles",
        action="read",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(test_user.id, db_session) as client:
        response = await client.get(f"/api/v1/admin/roles/{uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_role_by_id_404s_for_a_different_tenants_role_without_all_scope(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    """Cross-tenant visibility leak check — same discipline as the rest
    of the app (3 real leaks already found and fixed this project)."""
    grantless_user = await _create_grantless_user(db_session, test_organization)

    repo = SqlAlchemyRoleRepository(db_session)
    other_tenant_role = await repo.create(
        Role.create_custom_role(
            name="Other Tenant Role",
            description="desc",
            tenant_id=second_organization.tenant_id,
        )
    )

    await _grant_role(
        db_session,
        grantless_user,
        zone="roles",
        action="read",
        scope_type="explicit",  # NOT all — must not leak the other tenant's role
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(grantless_user.id, db_session) as client:
        response = await client.get(f"/api/v1/admin/roles/{other_tenant_role.id}")

    assert response.status_code == 404
