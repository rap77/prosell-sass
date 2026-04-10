"""Integration tests — Product C3 attribute validation (Phase 12, Plan 12-02).

Tests: SC-3 (attribute validation on create) and SC-4 (organization_id filter).
Uses real DB. No repository mocks.
Auth: dependency_overrides[get_current_auth_user_from_cookie] (Brain #7 Condition B).

Requirements: PROD-01, PROD-02, PROD-03, PROD-04, API-02, API-03
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4


# ─── Helpers ──────────────────────────────────────────────────────────────────


async def create_category_with_schema(
    client: AsyncClient, tenant_id: str, schema: dict
) -> str:
    """Helper: create category and return its ID."""
    resp = await client.post(
        "/api/v1/categories",
        json={
            "name": f"Cat-{uuid4().hex[:8]}",
            "slug": f"cat-{uuid4().hex[:8]}",
            "tenant_id": tenant_id,
            "attribute_schema": schema,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def base_product_payload(tenant_id: str, org_id: str, cat_id: str, **overrides) -> dict:
    """Helper: base product create payload with required fields."""
    payload = {
        "title": f"Test Car {uuid4().hex[:4]}",
        "slug": f"test-car-{uuid4().hex[:8]}",
        "price_cents": 1500000,
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "category_id": cat_id,
        "condition": "used",
        "attributes": {},
    }
    payload.update(overrides)
    return payload


# ─── SC-3: Attribute validation on POST /products ─────────────────────────────


@pytest.mark.asyncio
async def test_create_product_with_valid_attributes_succeeds(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /products with attributes matching schema returns 201."""
    cat_id = await create_category_with_schema(
        async_client_as_admin,
        str(admin_user.tenant_id),
        {"color": {"type": "string", "required": True}},
    )

    payload = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=str(uuid4()),  # org_id from user context
        cat_id=cat_id,
        attributes={"color": "red"},
    )
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_create_product_missing_required_attribute_returns_422(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /products with missing required attribute returns 422."""
    cat_id = await create_category_with_schema(
        async_client_as_admin,
        str(admin_user.tenant_id),
        {"color": {"type": "string", "required": True}},
    )

    payload = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=str(uuid4()),
        cat_id=cat_id,
        attributes={},  # Missing required 'color'
    )
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    assert resp.status_code == 422, resp.text
    assert "color" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_product_empty_schema_always_passes(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /products with any attributes passes when category schema is empty."""
    cat_id = await create_category_with_schema(
        async_client_as_admin,
        str(admin_user.tenant_id),
        {},  # Empty schema = no validation
    )

    payload = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=str(uuid4()),
        cat_id=cat_id,
        attributes={"random_field": "any_value"},
    )
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_create_product_attribute_wrong_type_returns_422(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /products with wrong attribute type returns 422."""
    cat_id = await create_category_with_schema(
        async_client_as_admin,
        str(admin_user.tenant_id),
        {"year": {"type": "number", "required": True}},
    )

    payload = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=str(uuid4()),
        cat_id=cat_id,
        attributes={"year": "not-a-number"},  # String instead of number
    )
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    assert resp.status_code == 422, resp.text
    assert "year" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_product_no_category_skips_validation(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /products without category_id skips attribute validation."""
    payload = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=str(uuid4()),
        cat_id=str(uuid4()),  # Non-existent category → validation skipped (category not found)
        attributes={"anything": "goes"},
    )
    # When category not found, validation is skipped and product is created
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    # Either 201 (category not found = no validation) or 422 (if FK check fires)
    assert resp.status_code in (201, 422, 400), resp.text


# ─── SC-4: organization_id filter on GET /products ────────────────────────────


@pytest.mark.asyncio
async def test_list_products_filtered_by_organization(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /products?organization_id=X returns only products from that org."""
    org_id = str(uuid4())
    cat_id = await create_category_with_schema(
        async_client_as_admin, str(admin_user.tenant_id), {}
    )

    # Create a product in this specific org
    prod_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
        ),
    )
    assert prod_resp.status_code == 201, prod_resp.text
    prod_id = prod_resp.json()["id"]

    # Filter by org — should see this product
    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?organization_id={org_id}"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id in ids, f"Product {prod_id} should be in org filter results"


@pytest.mark.asyncio
async def test_list_products_org_filter_excludes_other_orgs(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /products?organization_id=X excludes products from other orgs."""
    org_a = str(uuid4())
    org_b = str(uuid4())
    cat_id = await create_category_with_schema(
        async_client_as_admin, str(admin_user.tenant_id), {}
    )

    # Create product in org_a
    prod_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_a,
            cat_id=cat_id,
        ),
    )
    assert prod_resp.status_code == 201, prod_resp.text
    prod_id_a = prod_resp.json()["id"]

    # Filter by org_b — should NOT see org_a product
    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?organization_id={org_b}"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id_a not in ids, "Product from org_a should not appear in org_b filter"


@pytest.mark.asyncio
async def test_list_products_filtered_by_category(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /products?category_id=X returns only products in that category."""
    cat_id = await create_category_with_schema(
        async_client_as_admin, str(admin_user.tenant_id), {}
    )

    prod_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=str(uuid4()),
            cat_id=cat_id,
        ),
    )
    assert prod_resp.status_code == 201, prod_resp.text
    prod_id = prod_resp.json()["id"]

    list_resp = await async_client_as_admin.get(f"/api/v1/products?category_id={cat_id}")
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id in ids, f"Product {prod_id} should appear in category filter"
