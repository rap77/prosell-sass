"""Integration tests for GET /api/v1/admin/users/by-email.

Minimal exact-email lookup for the admin profiles UI's "assign user" panel
(bloque 3, item 3.6) — the picker takes an exact email, not a name/partial
search (no listing/search endpoint exists yet; scoped deliberately, per
the user's explicit choice, to avoid designing pagination/search up
front). Real Postgres end to end, same harness as test_admin_roles_router.py.
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
        email="users-test@test.local",
        full_name="Users Test User",
        tenant_id=user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[],
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: domain_user

    async def override_get_async_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_user_by_email_requires_users_read_grant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    grantless_user = await _create_grantless_user(db_session, test_organization)

    async with _client_as(grantless_user, db_session) as client:
        response = await client.get(
            "/api/v1/admin/users/by-email", params={"email": "nobody@test.local"}
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_user_by_email_returns_the_matching_user(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    target_user = await _create_grantless_user(db_session, test_organization)

    searcher = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        searcher,
        zone="users",
        action="read",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(searcher, db_session) as client:
        response = await client.get(
            "/api/v1/admin/users/by-email", params={"email": target_user.email}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(target_user.id)
    assert body["email"] == target_user.email


@pytest.mark.asyncio
async def test_get_user_by_email_404s_for_unknown_email(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    searcher = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        searcher,
        zone="users",
        action="read",
        scope_type="all",
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(searcher, db_session) as client:
        response = await client.get(
            "/api/v1/admin/users/by-email", params={"email": "nobody@test.local"}
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_user_by_email_404s_for_a_different_tenants_user_without_all_scope(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    other_tenant_user = await _create_grantless_user(db_session, second_organization)

    searcher = await _create_grantless_user(db_session, test_organization)
    await _grant_role(
        db_session,
        searcher,
        zone="users",
        action="read",
        scope_type="explicit",  # NOT all — must not leak the other tenant's user
        tenant_id=test_organization.tenant_id,
    )

    async with _client_as(searcher, db_session) as client:
        response = await client.get(
            "/api/v1/admin/users/by-email", params={"email": other_tenant_user.email}
        )

    assert response.status_code == 404
