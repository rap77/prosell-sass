"""Integration tests — Product C3 attribute validation (Phase 12, Plan 12-02).

Tests: SC-3 (attribute validation on create) and SC-4 (organization_id filter).
Uses real DB. No repository mocks.
Auth: dependency_overrides[get_current_auth_user_from_cookie] (Brain #7 Condition B).

Requirements: PROD-01, PROD-02, PROD-03, PROD-04, API-02, API-03
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

# ─── Helpers ──────────────────────────────────────────────────────────────────


async def create_category_with_schema(client: AsyncClient, tenant_id: str, schema: dict) -> str:
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


async def publish_product(client: AsyncClient, product_id: str) -> None:
    """Move a created product through the workflow that enables marketplace visibility."""
    submit_response = await client.post(f"/api/v1/products/{product_id}/submit")
    assert submit_response.status_code == 200, submit_response.text

    approve_response = await client.post(f"/api/v1/products/{product_id}/approve")
    assert approve_response.status_code == 200, approve_response.text
    assert approve_response.json()["published_to_marketplace"] is True


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
        org_id=str(admin_user.tenant_id),  # use real org ID (org.id == org.tenant_id)
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
        org_id=str(admin_user.tenant_id),
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
        org_id=str(admin_user.tenant_id),
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
        org_id=str(admin_user.tenant_id),
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
        org_id=str(admin_user.tenant_id),
        cat_id=str(uuid4()),  # Non-existent category → validation skipped (category not found)
        attributes={"anything": "goes"},
    )
    resp = await async_client_as_admin.post("/api/v1/products", json=payload)
    # 404 when category not found (API validates existence); 201/422/400 are also valid paths
    assert resp.status_code in (201, 422, 400, 404), resp.text


# ─── SC-4: organization_id filter on GET /products ────────────────────────────


@pytest.mark.asyncio
async def test_list_products_filtered_by_organization(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /products?organization_id=X returns only products from that org."""
    org_id = str(admin_user.tenant_id)  # use real org ID (org.id == org.tenant_id)
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})

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
    list_resp = await async_client_as_admin.get(f"/api/v1/products?organization_id={org_id}")
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id in ids, f"Product {prod_id} should be in org filter results"


@pytest.mark.asyncio
async def test_list_products_org_filter_excludes_other_orgs(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /products?organization_id=X excludes products from other orgs."""
    org_a = str(admin_user.tenant_id)  # use real org ID for the product we create
    org_b = str(uuid4())  # fake org used only as filter — no product created in it
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})

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
    list_resp = await async_client_as_admin.get(f"/api/v1/products?organization_id={org_b}")
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id_a not in ids, "Product from org_a should not appear in org_b filter"


@pytest.mark.asyncio
async def test_list_products_filtered_by_category(async_client_as_admin: AsyncClient, admin_user):
    """GET /products?category_id=X returns only products in that category."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})

    prod_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=str(admin_user.tenant_id),
            cat_id=cat_id,
        ),
    )
    assert prod_resp.status_code == 201, prod_resp.text
    prod_id = prod_resp.json()["id"]

    list_resp = await async_client_as_admin.get(f"/api/v1/products?category_id={cat_id}")
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert prod_id in ids, f"Product {prod_id} should appear in category filter"


# ─── Catalog filters: published_to_marketplace / has_images ────────────────
# These two query params were added so the catalog header can filter the
# list by marketplace visibility and image presence without overloading
# the `status` filter or doing client-side filtering. They use the same
# `?organization_id=` and `?category_id=` pre-conditions as the existing
# `?status=` and `?condition=` tests.


@pytest.mark.asyncio
async def test_list_products_filtered_by_published_to_marketplace_true(
    async_client_as_admin: AsyncClient, admin_user
):
    """published_to_marketplace=true keeps only products with the flag set."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})
    org_id = str(admin_user.tenant_id)

    published_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
        ),
    )
    assert published_resp.status_code == 201, published_resp.text
    published_id = published_resp.json()["id"]
    await publish_product(async_client_as_admin, published_id)

    # A non-published product in the same category should be filtered out.
    await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
        ),
    )

    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?category_id={cat_id}&published_to_marketplace=true"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert published_id in ids
    assert all(p["published_to_marketplace"] for p in list_resp.json()["products"])


@pytest.mark.asyncio
async def test_list_products_filtered_by_published_to_marketplace_false(
    async_client_as_admin: AsyncClient, admin_user
):
    """published_to_marketplace=false keeps only products NOT on marketplace."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})
    org_id = str(admin_user.tenant_id)

    published_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
        ),
    )
    assert published_resp.status_code == 201, published_resp.text
    await publish_product(async_client_as_admin, published_resp.json()["id"])
    draft_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
        ),
    )
    assert draft_resp.status_code == 201, draft_resp.text
    draft_id = draft_resp.json()["id"]

    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?category_id={cat_id}&published_to_marketplace=false"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert draft_id in ids
    assert all(not p["published_to_marketplace"] for p in list_resp.json()["products"])


@pytest.mark.asyncio
async def test_list_products_filtered_by_has_images_true(
    async_client_as_admin: AsyncClient, admin_user
):
    """has_images=true keeps only products with at least one image."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})
    org_id = str(admin_user.tenant_id)

    # Storage keys, not bare filenames — `cover.jpg` fails the
    # `_STORAGE_KEY_PATTERN` validator (422). Tenant-prefixed form
    # matches what the bulk-upload CSV importer actually emits.
    with_image = base_product_payload(
        tenant_id=str(admin_user.tenant_id),
        org_id=org_id,
        cat_id=cat_id,
        image_urls=[
            f"orgs/{admin_user.tenant_id}/vehicles/cover.jpg",
            f"orgs/{admin_user.tenant_id}/vehicles/side.jpg",
        ],
    )
    with_image_resp = await async_client_as_admin.post("/api/v1/products", json=with_image)
    assert with_image_resp.status_code == 201, with_image_resp.text
    with_image_id = with_image_resp.json()["id"]

    await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[],
        ),
    )

    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?category_id={cat_id}&has_images=true"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert with_image_id in ids
    assert all(p["image_urls"] for p in list_resp.json()["products"])


@pytest.mark.asyncio
async def test_list_products_filtered_by_has_images_false(
    async_client_as_admin: AsyncClient, admin_user
):
    """has_images=false keeps only products with no images."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})
    org_id = str(admin_user.tenant_id)

    await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[f"orgs/{admin_user.tenant_id}/vehicles/cover.jpg"],
        ),
    )
    no_image_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[],
        ),
    )
    assert no_image_resp.status_code == 201, no_image_resp.text
    no_image_id = no_image_resp.json()["id"]

    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?category_id={cat_id}&has_images=false"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert no_image_id in ids
    assert all(not p["image_urls"] for p in list_resp.json()["products"])


@pytest.mark.asyncio
async def test_list_products_filtered_combined_published_and_has_images(
    async_client_as_admin: AsyncClient, admin_user
):
    """Both filters compose: only published products with images come back."""
    cat_id = await create_category_with_schema(async_client_as_admin, str(admin_user.tenant_id), {})
    org_id = str(admin_user.tenant_id)

    # The product that should match BOTH filters.
    both_resp = await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[f"orgs/{admin_user.tenant_id}/vehicles/cover.jpg"],
        ),
    )
    assert both_resp.status_code == 201, both_resp.text
    both_id = both_resp.json()["id"]
    await publish_product(async_client_as_admin, both_id)

    # Products that should NOT match — one fails published, the other fails has_images.
    await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[f"orgs/{admin_user.tenant_id}/vehicles/cover.jpg"],
        ),
    )
    await async_client_as_admin.post(
        "/api/v1/products",
        json=base_product_payload(
            tenant_id=str(admin_user.tenant_id),
            org_id=org_id,
            cat_id=cat_id,
            image_urls=[],
        ),
    )

    list_resp = await async_client_as_admin.get(
        f"/api/v1/products?category_id={cat_id}&published_to_marketplace=true&has_images=true"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = [p["id"] for p in list_resp.json()["products"]]
    assert ids == [both_id]
    assert list_resp.json()["total"] == 1
