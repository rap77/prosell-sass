"""Integration tests — Category API (Phase 12, Plan 12-01).

Tests: SC-1 (attribute_schema in create/response) and SC-2 (role-based active filtering).
Uses real DB with rollback. No repository mocks.
Auth: dependency_overrides[get_current_auth_user_from_cookie] (Brain #7 Condition B).

Requirements: CTGY-01, CTGY-02, CTGY-03, CTGY-04
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

# ─── SC-1: POST /categories returns attribute_schema ──────────────────────────


@pytest.mark.asyncio
async def test_create_category_returns_attribute_schema(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /categories returns 201 with attribute_schema in response."""
    schema = {
        "color": {"type": "string", "required": True},
        "year": {"type": "number", "required": False},
    }
    payload = {
        "name": f"Cars-{uuid4().hex[:8]}",
        "slug": f"cars-{uuid4().hex[:8]}",
        "tenant_id": str(admin_user.tenant_id),
        "attribute_schema": schema,
    }
    response = await async_client_as_admin.post("/api/v1/categories", json=payload)

    assert response.status_code == 201, response.text
    data = response.json()
    assert "attribute_schema" in data
    assert data["attribute_schema"]["color"]["type"] == "string"
    assert data["attribute_schema"]["year"]["required"] is False


@pytest.mark.asyncio
async def test_create_category_without_attribute_schema_defaults_empty(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /categories without attribute_schema defaults to {}."""
    payload = {
        "name": f"NoSchema-{uuid4().hex[:8]}",
        "slug": f"no-schema-{uuid4().hex[:8]}",
        "tenant_id": str(admin_user.tenant_id),
    }
    response = await async_client_as_admin.post("/api/v1/categories", json=payload)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["attribute_schema"] == {}


# ─── SC-2: Role-based active filtering ────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_sees_inactive_categories(async_client_as_admin: AsyncClient, admin_user):
    """Admin user can see is_active=False categories via list."""
    # Create category with is_active=False
    slug = f"inactive-{uuid4().hex[:8]}"
    create_resp = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Inactive-{uuid4().hex[:8]}",
            "slug": slug,
            "tenant_id": str(admin_user.tenant_id),
            "is_active": False,
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    cat_id = create_resp.json()["id"]

    # Admin should see it in list
    list_resp = await async_client_as_admin.get("/api/v1/categories")
    assert list_resp.status_code == 200
    ids = [c["id"] for c in list_resp.json()["categories"]]
    assert cat_id in ids, f"Admin should see inactive category {cat_id}"


@pytest.mark.asyncio
async def test_seller_does_not_see_inactive_categories(
    admin_user,
    seller_user,
    db_session,
):
    """Seller user cannot see is_active=False categories.

    Criteria verificable (Brain #7 Condition D fix):
    1. Admin creates a category with is_active=False
    2. Admin can see it in list (is_admin=True → no filter)
    3. Seller gets list → the inactive category ID is NOT in the response

    NOTE: We don't use both async_client_as_admin and async_client_as_seller fixtures
    simultaneously because they both overwrite app.dependency_overrides, causing one
    to shadow the other. Instead, we control overrides inline.
    """
    from collections.abc import AsyncGenerator

    from httpx import ASGITransport, AsyncClient

    from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
    from prosell.infrastructure.api.main import app
    from prosell.infrastructure.database.session import get_async_session

    async def override_session() -> AsyncGenerator:
        yield db_session

    async def make_client(user):
        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
        app.dependency_overrides[get_async_session] = override_session
        return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    # Step 1: Admin creates inactive category
    slug = f"hidden-{uuid4().hex[:8]}"
    async with await make_client(admin_user) as admin_client:
        create_resp = await admin_client.post(
            "/api/v1/categories",
            json={
                "name": f"Hidden-{uuid4().hex[:8]}",
                "slug": slug,
                "tenant_id": str(admin_user.tenant_id),
                "is_active": False,
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        cat_id = create_resp.json()["id"]

        # Step 2: Admin CAN see it (baseline verification)
        admin_list = await admin_client.get("/api/v1/categories")
        assert admin_list.status_code == 200
        admin_ids = [c["id"] for c in admin_list.json()["categories"]]
        assert cat_id in admin_ids, "Admin should see inactive category"

    # Step 3: Seller CANNOT see it — inactive categories are filtered out
    async with await make_client(seller_user) as seller_client:
        seller_list = await seller_client.get("/api/v1/categories")
        assert seller_list.status_code == 200
        seller_ids = [c["id"] for c in seller_list.json()["categories"]]
        assert cat_id not in seller_ids, "Seller must NOT see inactive categories"

    app.dependency_overrides.clear()


# ─── PATCH /categories/{id}/attribute-schema ──────────────────────────────────


@pytest.mark.asyncio
async def test_update_attribute_schema_replaces_existing(
    async_client_as_admin: AsyncClient, admin_user
):
    """PATCH /categories/{id}/attribute-schema replaces schema (REPLACE semantics)."""
    # Create category with initial schema
    create_resp = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Schema-{uuid4().hex[:8]}",
            "slug": f"schema-{uuid4().hex[:8]}",
            "tenant_id": str(admin_user.tenant_id),
            "attribute_schema": {"old_field": {"type": "string"}},
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    cat_id = create_resp.json()["id"]

    # Replace schema — old_field should disappear
    new_schema = {"new_field": {"type": "number", "required": True}}
    patch_resp = await async_client_as_admin.patch(
        f"/api/v1/categories/{cat_id}/attribute-schema",
        json={"attribute_schema": new_schema},
    )
    assert patch_resp.status_code == 200, patch_resp.text
    data = patch_resp.json()
    assert "old_field" not in data["attribute_schema"], "Old field must be gone after REPLACE"
    assert "new_field" in data["attribute_schema"]
    assert data["attribute_schema"]["new_field"]["required"] is True


# ─── DELETE /categories/{id} ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_category_soft_deletes(async_client_as_admin: AsyncClient, admin_user):
    """DELETE /categories/{id} soft-deletes (deactivates) the category."""
    create_resp = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"ToDelete-{uuid4().hex[:8]}",
            "slug": f"to-delete-{uuid4().hex[:8]}",
            "tenant_id": str(admin_user.tenant_id),
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    cat_id = create_resp.json()["id"]

    # Delete (soft-delete)
    delete_resp = await async_client_as_admin.delete(f"/api/v1/categories/{cat_id}")
    assert delete_resp.status_code == 204

    # GET should return is_active=False (admin sees it, but deactivated)
    get_resp = await async_client_as_admin.get(f"/api/v1/categories/{cat_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["is_active"] is False


# ─── PATCH /categories/{id} basic update ──────────────────────────────────────


@pytest.mark.asyncio
async def test_update_category_basic_info(async_client_as_admin: AsyncClient, admin_user):
    """PATCH /categories/{id} updates name and description."""
    create_resp = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Original-{uuid4().hex[:8]}",
            "slug": f"original-{uuid4().hex[:8]}",
            "tenant_id": str(admin_user.tenant_id),
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    cat_id = create_resp.json()["id"]
    original_slug = create_resp.json()["slug"]

    # Patch only description
    patch_resp = await async_client_as_admin.patch(
        f"/api/v1/categories/{cat_id}",
        json={"description": "Updated description"},
    )
    assert patch_resp.status_code == 200, patch_resp.text
    data = patch_resp.json()
    assert data["description"] == "Updated description"
    assert data["slug"] == original_slug  # Unchanged fields preserved
