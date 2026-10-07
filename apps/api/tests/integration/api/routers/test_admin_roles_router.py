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

from prosell.domain.entities.role import Role, RoleType
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
async def _client_as(user: UserModel, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    domain_user = User(
        id=user.id,
        email="roles-test@test.local",
        full_name="Roles Test User",
        tenant_id=user.tenant_id,
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

    async with _client_as(grantless_user, db_session) as client:
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

    async with _client_as(test_user, db_session) as client:
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

    async with _client_as(test_user, db_session) as client:
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

    async with _client_as(test_user, db_session) as client:
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

    async with _client_as(grantless_user, db_session) as client:
        response = await client.get(f"/api/v1/admin/roles/{other_tenant_role.id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_role_requires_roles_create_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.post("/api/v1/admin/roles", json={"name": "Should Fail"})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_role_persists_requested_grants_and_scope(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    creator = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        creator,
        zone="roles",
        action="create",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )
    # Also needs catalog:read itself to be allowed to grant it to the new role.
    await _grant_role(
        db_session,
        creator,
        zone="catalog",
        action="read",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(creator, db_session) as client:
        response = await client.post(
            "/api/v1/admin/roles",
            json={
                "name": "New Profile",
                "description": "Created via API",
                "grants": [{"zone": "catalog", "action": "read"}],
                "scope": {"scope_type": "own"},
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New Profile"
    assert body["tenant_id"] == str(test_organization.tenant_id)
    assert {"zone": "catalog", "action": "read"} in body["grants"]
    assert body["scope"]["scope_type"] == "own"

    repo = SqlAlchemyRoleRepository(db_session)
    persisted = await repo.get_by_id_with_grants(body["id"])
    assert persisted is not None
    assert persisted.has_zone_action("catalog", "read") is True


@pytest.mark.asyncio
async def test_create_role_rejects_a_grant_the_creator_does_not_hold(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    creator = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        creator,
        zone="roles",
        action="create",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )
    # creator has NO roles:delete grant of their own.

    async with _client_as(creator, db_session) as client:
        response = await client.post(
            "/api/v1/admin/roles",
            json={"name": "Escalated", "grants": [{"zone": "roles", "action": "delete"}]},
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_role_rejects_a_scope_broader_than_the_creators_own(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    creator = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        creator,
        zone="roles",
        action="create",
        scope_type="own",  # creator only has OwnScope
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(creator, db_session) as client:
        response = await client.post(
            "/api/v1/admin/roles",
            json={"name": "Escalated Scope", "scope": {"scope_type": "all"}},
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_role_requires_roles_update_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target = await repo.create(
        Role.create_custom_role(
            name="Target", description=None, tenant_id=test_organization.tenant_id
        )
    )
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.patch(
            f"/api/v1/admin/roles/{target.id}", json={"name": "Should Fail"}
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_role_replaces_name_and_grants(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target = await repo.create(
        Role.create_custom_role(
            name="Original", description="desc", tenant_id=test_organization.tenant_id
        )
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=target.id, zone="catalog", action="read"))
    db_session.add(RoleScopeModel(id=uuid4(), role_id=target.id, scope_type="own"))
    await db_session.flush()

    editor = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        editor,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )
    await _grant_role(
        db_session,
        editor,
        zone="catalog",
        action="update",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(editor, db_session) as client:
        response = await client.patch(
            f"/api/v1/admin/roles/{target.id}",
            json={
                "name": "Renamed",
                "grants": [{"zone": "catalog", "action": "update"}],
                "scope": {"scope_type": "own"},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed"
    assert {"zone": "catalog", "action": "update"} in body["grants"]
    assert {"zone": "catalog", "action": "read"} not in body["grants"]

    persisted = await repo.get_by_id_with_grants(target.id)
    assert persisted is not None
    assert persisted.has_zone_action("catalog", "read") is False
    assert persisted.has_zone_action("catalog", "update") is True


@pytest.mark.asyncio
async def test_update_role_404s_for_missing_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    editor = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        editor,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(editor, db_session) as client:
        response = await client.patch(f"/api/v1/admin/roles/{uuid4()}", json={"name": "Nope"})

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_role_rejects_a_grant_the_editor_does_not_hold(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target = await repo.create(
        Role.create_custom_role(
            name="Target", description=None, tenant_id=test_organization.tenant_id
        )
    )
    editor = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        editor,
        zone="roles",
        action="update",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )
    # editor has NO roles:delete grant of their own.

    async with _client_as(editor, db_session) as client:
        response = await client.patch(
            f"/api/v1/admin/roles/{target.id}",
            json={"name": "Escalated", "grants": [{"zone": "roles", "action": "delete"}]},
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_role_requires_roles_delete_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target = await repo.create(
        Role.create_custom_role(
            name="Target", description=None, tenant_id=test_organization.tenant_id
        )
    )
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.delete(f"/api/v1/admin/roles/{target.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_role_removes_a_custom_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target = await repo.create(
        Role.create_custom_role(
            name="Target", description=None, tenant_id=test_organization.tenant_id
        )
    )
    deleter = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        deleter,
        zone="roles",
        action="delete",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(deleter, db_session) as client:
        response = await client.delete(f"/api/v1/admin/roles/{target.id}")

    assert response.status_code == 204
    assert await repo.get_by_id(target.id) is None


@pytest.mark.asyncio
async def test_delete_role_404s_for_missing_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    deleter = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        deleter,
        zone="roles",
        action="delete",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(deleter, db_session) as client:
        response = await client.delete(f"/api/v1/admin/roles/{uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clone_role_requires_roles_create_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.post(
            f"/api/v1/admin/roles/{uuid4()}/clone", json={"name": "Should Fail"}
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_clone_role_copies_source_grants_and_scope_under_requested_name(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    source = await repo.create(
        Role.create_custom_role(
            name="Manager", description="Source profile", tenant_id=test_organization.tenant_id
        )
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=source.id, zone="catalog", action="read"))
    db_session.add(RoleScopeModel(id=uuid4(), role_id=source.id, scope_type="own"))
    await db_session.flush()

    cloner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        cloner,
        zone="roles",
        action="create",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )
    await _grant_role(
        db_session,
        cloner,
        zone="catalog",
        action="read",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(cloner, db_session) as client:
        response = await client.post(
            f"/api/v1/admin/roles/{source.id}/clone",
            json={"name": "Manager Global", "description": "Clon de Manager"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] != str(source.id)
    assert body["name"] == "Manager Global"
    assert body["description"] == "Clon de Manager"
    assert body["is_system_role"] is False
    assert {"zone": "catalog", "action": "read"} in body["grants"]
    assert body["scope"]["scope_type"] == "own"

    persisted = await repo.get_by_id_with_grants(body["id"])
    assert persisted is not None
    assert persisted.has_zone_action("catalog", "read") is True


@pytest.mark.asyncio
async def test_clone_role_404s_for_missing_source_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    cloner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        cloner,
        zone="roles",
        action="create",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(cloner, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{uuid4()}/clone", json={"name": "Nope"})

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clone_role_404s_for_a_different_tenants_source_role_without_all_scope(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    other_tenant_source = await repo.create(
        Role.create_custom_role(
            name="Other Tenant Source",
            description="desc",
            tenant_id=second_organization.tenant_id,
        )
    )

    cloner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        cloner,
        zone="roles",
        action="create",
        scope_type="explicit",  # NOT all — must not leak the other tenant's role
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(cloner, db_session) as client:
        response = await client.post(
            f"/api/v1/admin/roles/{other_tenant_source.id}/clone", json={"name": "Leaked"}
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clone_role_rejects_a_grant_the_cloner_does_not_hold(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    source = await repo.create(
        Role.create_custom_role(
            name="Over-Privileged Template",
            description=None,
            tenant_id=test_organization.tenant_id,
        )
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=source.id, zone="roles", action="delete"))
    await db_session.flush()

    cloner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        cloner,
        zone="roles",
        action="create",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )
    # cloner has NO roles:delete grant of their own.

    async with _client_as(cloner, db_session) as client:
        response = await client.post(
            f"/api/v1/admin/roles/{source.id}/clone", json={"name": "Escalated Clone"}
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_assign_role_requires_roles_update_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    grantless_user = await _create_grantless_user(db_session, test_organization)
    target_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{target_role.id}/users/{target_user.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_assign_role_persists_the_assignment(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    db_session.add(
        RoleGrantModel(id=uuid4(), role_id=target_role.id, zone="catalog", action="read")
    )
    db_session.add(RoleScopeModel(id=uuid4(), role_id=target_role.id, scope_type="own"))
    await db_session.flush()

    assigner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        assigner,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )
    await _grant_role(
        db_session,
        assigner,
        zone="catalog",
        action="read",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )
    target_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(assigner, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{target_role.id}/users/{target_user.id}")

    assert response.status_code == 204

    assigned_roles = await repo.get_user_roles(target_user.id)
    assert any(r.id == target_role.id for r in assigned_roles)


@pytest.mark.asyncio
async def test_assign_role_404s_for_missing_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    assigner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        assigner,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )
    target_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(assigner, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{uuid4()}/users/{target_user.id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_role_404s_for_missing_user(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    assigner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        assigner,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(assigner, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{target_role.id}/users/{uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_role_404s_for_a_different_tenants_target_user_without_all_scope(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    assigner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        assigner,
        zone="roles",
        action="update",
        scope_type="explicit",  # NOT all — must not leak the other tenant's user
        tenant_id=test_organization.tenant_id,
    )
    other_tenant_user = await _create_grantless_user(db_session, second_organization)

    async with _client_as(assigner, db_session) as client:
        response = await client.post(
            f"/api/v1/admin/roles/{target_role.id}/users/{other_tenant_user.id}"
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_role_rejects_a_role_whose_grants_the_assigner_does_not_hold(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Over-Privileged Target", description=None, tenant_id=test_organization.tenant_id
        )
    )
    db_session.add(
        RoleGrantModel(id=uuid4(), role_id=target_role.id, zone="roles", action="delete")
    )
    await db_session.flush()

    assigner = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        assigner,
        zone="roles",
        action="update",
        scope_type="own",
        tenant_id=test_organization.tenant_id,
    )
    # assigner has NO roles:delete grant of their own.
    target_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(assigner, db_session) as client:
        response = await client.post(f"/api/v1/admin/roles/{target_role.id}/users/{target_user.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_remove_role_requires_roles_update_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    grantless_user = await _create_grantless_user(db_session, test_organization)
    target_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.delete(
            f"/api/v1/admin/roles/{target_role.id}/users/{target_user.id}"
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_remove_role_removes_the_assignment(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    target_user = await _create_grantless_user(db_session, test_organization)
    await repo.assign_role_to_user(target_user.id, target_role.id)

    remover = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        remover,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(remover, db_session) as client:
        response = await client.delete(
            f"/api/v1/admin/roles/{target_role.id}/users/{target_user.id}"
        )

    assert response.status_code == 204

    remaining_roles = await repo.get_user_roles(target_user.id)
    assert all(r.id != target_role.id for r in remaining_roles)


@pytest.mark.asyncio
async def test_remove_role_404s_for_missing_user(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    target_role = await repo.create(
        Role.create_custom_role(
            name="Target Role", description=None, tenant_id=test_organization.tenant_id
        )
    )
    remover = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        remover,
        zone="roles",
        action="update",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(remover, db_session) as client:
        response = await client.delete(f"/api/v1/admin/roles/{target_role.id}/users/{uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_role_rejects_deleting_a_system_role(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    # The real super_admin system role — guaranteed to exist (seeded
    # every container start) and definitely is_system_role=True.
    repo = SqlAlchemyRoleRepository(db_session)
    super_admin = await repo.get_by_type(RoleType.SUPER_ADMIN)
    assert super_admin is not None

    deleter = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        deleter,
        zone="roles",
        action="delete",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(deleter, db_session) as client:
        response = await client.delete(f"/api/v1/admin/roles/{super_admin.id}")

    assert response.status_code == 400
