"""Integration — category management is restricted to the ProSell platform
admin (super_admin).

Business rule: the category taxonomy is GENERAL and platform-managed. Only
the ProSell admin (``super_admin``) may create / update / soft-delete
categories. Tenants (org admins, sales agents) may only READ categories to
classify their own products — never mutate the taxonomy. An org admin is NOT
enough: the distinction is platform-admin vs organization-admin.

Auth pattern: dependency_overrides[get_current_auth_user_from_cookie].
Requires the test DB on localhost:5433.
"""

from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session


def _user_with_role(base, role_type: RoleType) -> User:
    return User(
        id=base.id,
        email=base.email,
        full_name=base.full_name,
        tenant_id=base.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[
            Role(
                id=uuid4(),
                role_type=role_type,
                name=role_type.value,
                is_system_role=True,
                tenant_id=None,
            )
        ],
    )


async def _client_for(user, db_session) -> AsyncClient:
    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_async_session] = override_session
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _category_payload(tenant_id):
    return {
        "name": f"Cat-{uuid4().hex[:8]}",
        "slug": f"cat-{uuid4().hex[:8]}",
        "tenant_id": str(tenant_id),
    }


@pytest.mark.asyncio
async def test_super_admin_can_create_category(async_client_as_admin: AsyncClient, admin_user):
    """Baseline: the ProSell platform admin (super_admin) CAN create."""
    resp = await async_client_as_admin.post(
        "/api/v1/categories", json=_category_payload(admin_user.tenant_id)
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_org_admin_cannot_create_category(test_user, db_session):
    """An ORGANIZATION admin (role=admin) is NOT the ProSell admin → 403."""
    org_admin = _user_with_role(test_user, RoleType.ADMIN)
    async with await _client_for(org_admin, db_session) as client:
        resp = await client.post("/api/v1/categories", json=_category_payload(test_user.tenant_id))
    app.dependency_overrides.clear()
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_seller_cannot_create_category(seller_user, db_session):
    """A sales agent cannot create categories → 403."""
    async with await _client_for(seller_user, db_session) as client:
        resp = await client.post(
            "/api/v1/categories", json=_category_payload(seller_user.tenant_id)
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_seller_cannot_update_category(
    async_client_as_admin: AsyncClient, admin_user, seller_user, db_session
):
    """A sales agent cannot PATCH a category → 403 (admin creates it first)."""
    create = await async_client_as_admin.post(
        "/api/v1/categories", json=_category_payload(admin_user.tenant_id)
    )
    assert create.status_code == 201, create.text
    cat_id = create.json()["id"]

    async with await _client_for(seller_user, db_session) as client:
        resp = await client.patch(f"/api/v1/categories/{cat_id}", json={"description": "hack"})
    app.dependency_overrides.clear()
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_seller_cannot_delete_category(
    async_client_as_admin: AsyncClient, admin_user, seller_user, db_session
):
    """A sales agent cannot DELETE (soft-delete) a category → 403."""
    create = await async_client_as_admin.post(
        "/api/v1/categories", json=_category_payload(admin_user.tenant_id)
    )
    assert create.status_code == 201, create.text
    cat_id = create.json()["id"]

    async with await _client_for(seller_user, db_session) as client:
        resp = await client.delete(f"/api/v1/categories/{cat_id}")
    app.dependency_overrides.clear()
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_seller_cannot_update_attribute_schema(
    async_client_as_admin: AsyncClient, admin_user, seller_user, db_session
):
    """A sales agent cannot replace a category attribute_schema → 403."""
    create = await async_client_as_admin.post(
        "/api/v1/categories", json=_category_payload(admin_user.tenant_id)
    )
    assert create.status_code == 201, create.text
    cat_id = create.json()["id"]

    async with await _client_for(seller_user, db_session) as client:
        resp = await client.patch(
            f"/api/v1/categories/{cat_id}/attribute-schema",
            json={"attribute_schema": {"x": {"type": "string"}}},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_seller_can_still_read_categories(
    async_client_as_admin: AsyncClient, admin_user, seller_user, db_session
):
    """Reads stay open: a sales agent CAN list categories (to classify products)."""
    await async_client_as_admin.post(
        "/api/v1/categories", json=_category_payload(admin_user.tenant_id)
    )
    async with await _client_for(seller_user, db_session) as client:
        resp = await client.get("/api/v1/categories")
    app.dependency_overrides.clear()
    assert resp.status_code == 200, resp.text
