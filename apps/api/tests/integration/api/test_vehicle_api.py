"""Integration tests — Vehicle API (Phase 12, Plan 12-05).

Tests: SC-5 (typed VehicleResponse) and SC-6 (DELETE product cascades to vehicle).
Uses real DB. No repository mocks.
Auth: dependency_overrides[get_current_auth_user_from_cookie] (Brain #7 Condition B).

Requirements: VEH-01, VEH-02, VEH-03, VEH-04, PROD-05, API-04, API-05
"""

import pytest
from uuid import uuid4
from httpx import AsyncClient


# ─── Helpers ──────────────────────────────────────────────────────────────────


async def create_test_product(client: AsyncClient, admin_user) -> str:
    """Helper: create a category + product and return the product ID."""
    tenant_id = str(admin_user.tenant_id)
    org_id = str(uuid4())  # Use random org_id — product belongs to tenant

    cat_resp = await client.post(
        "/api/v1/categories",
        json={
            "name": f"Cars-{uuid4().hex[:8]}",
            "slug": f"cars-{uuid4().hex[:8]}",
            "tenant_id": tenant_id,
        },
    )
    assert cat_resp.status_code == 201, cat_resp.text
    cat_id = cat_resp.json()["id"]

    prod_resp = await client.post(
        "/api/v1/products",
        json={
            "title": f"Test Car {uuid4().hex[:4]}",
            "slug": f"test-car-{uuid4().hex[:8]}",
            "price_cents": 2000000,
            "tenant_id": tenant_id,
            "organization_id": org_id,
            "category_id": cat_id,
            "condition": "used",
        },
    )
    assert prod_resp.status_code == 201, prod_resp.text
    return prod_resp.json()["id"]


VALID_VIN = "1HGCM82633A004352"  # A real valid VIN with correct checksum


def make_vin() -> str:
    """Generate a VIN-like string. Uses a known valid VIN base with variation."""
    # Use a known-valid VIN to avoid checksum issues
    return VALID_VIN


# ─── SC-5: Typed VehicleResponse ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_vehicle_returns_typed_response(
    async_client_as_admin: AsyncClient, admin_user
):
    """POST /vehicles returns typed VehicleResponse with all fields — not raw dict."""
    product_id = await create_test_product(async_client_as_admin, admin_user)

    response = await async_client_as_admin.post(
        "/api/v1/vehicles",
        json={
            "product_id": product_id,
            "vin": VALID_VIN,
            "year": 2003,
            "make": "Honda",
            "model": "Accord",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    # Typed DTO fields (proves VehicleResponse, not raw dict)
    assert data["product_id"] == product_id
    assert data["vin"] == VALID_VIN
    assert data["make"] == "Honda"
    assert data["model"] == "Accord"
    assert data["year"] == 2003
    assert "created_at" in data, "Typed DTO must include created_at"
    assert "updated_at" in data, "Typed DTO must include updated_at"
    assert "vin_verified" in data, "Typed DTO must include vin_verified"
    assert "mileage_unit" in data, "Typed DTO must include mileage_unit"


@pytest.mark.asyncio
async def test_get_vehicle_by_id_returns_200(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /vehicles/{id} returns 200 with VehicleResponse."""
    product_id = await create_test_product(async_client_as_admin, admin_user)

    create_resp = await async_client_as_admin.post(
        "/api/v1/vehicles",
        json={
            "product_id": product_id,
            "vin": VALID_VIN,
            "year": 2003,
            "make": "Toyota",
            "model": "Camry",
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    vehicle_id = create_resp.json()["id"]

    get_resp = await async_client_as_admin.get(f"/api/v1/vehicles/{vehicle_id}")
    assert get_resp.status_code == 200, get_resp.text
    data = get_resp.json()
    assert data["id"] == vehicle_id
    assert data["make"] == "Toyota"
    assert data["model"] == "Camry"


@pytest.mark.asyncio
async def test_get_vehicle_by_id_not_found_returns_404(
    async_client_as_admin: AsyncClient, admin_user
):
    """GET /vehicles/{id} returns 404 for unknown ID."""
    fake_id = str(uuid4())
    response = await async_client_as_admin.get(f"/api/v1/vehicles/{fake_id}")
    assert response.status_code == 404, response.text


# ─── SC-6: DELETE /products/{id} cascades to vehicle ─────────────────────────


@pytest.mark.asyncio
async def test_delete_product_cascades_to_vehicle(
    async_client_as_admin: AsyncClient, admin_user
):
    """
    DELETE /products/{id} → 204 and vehicle auto-deleted via ON DELETE CASCADE.

    Verifies the DB constraint: vehicles.product_id REFERENCES products(id) ON DELETE CASCADE
    Established in migration abc123def456.
    """
    # Step 1: Create product
    product_id = await create_test_product(async_client_as_admin, admin_user)

    # Step 2: Create vehicle linked to product
    create_resp = await async_client_as_admin.post(
        "/api/v1/vehicles",
        json={
            "product_id": product_id,
            "vin": VALID_VIN,
            "year": 2003,
            "make": "Ford",
            "model": "F-150",
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    vehicle_id = create_resp.json()["id"]

    # Verify vehicle exists before delete
    get_before = await async_client_as_admin.get(f"/api/v1/vehicles/{vehicle_id}")
    assert get_before.status_code == 200, "Vehicle should exist before product delete"

    # Step 3: Delete product
    delete_resp = await async_client_as_admin.delete(f"/api/v1/products/{product_id}")
    assert delete_resp.status_code == 204, delete_resp.text

    # Step 4: Vehicle should be gone (CASCADE)
    get_after = await async_client_as_admin.get(f"/api/v1/vehicles/{vehicle_id}")
    assert get_after.status_code == 404, (
        f"Vehicle {vehicle_id} should have been cascade-deleted with product {product_id}"
    )


@pytest.mark.asyncio
async def test_delete_product_not_found_returns_404(
    async_client_as_admin: AsyncClient, admin_user
):
    """DELETE /products/{id} with unknown ID returns 404."""
    fake_id = str(uuid4())
    response = await async_client_as_admin.delete(f"/api/v1/products/{fake_id}")
    assert response.status_code == 404, response.text


@pytest.mark.asyncio
async def test_delete_product_without_vehicle_returns_204(
    async_client_as_admin: AsyncClient, admin_user
):
    """DELETE /products/{id} when no vehicle exists still returns 204."""
    product_id = await create_test_product(async_client_as_admin, admin_user)

    response = await async_client_as_admin.delete(f"/api/v1/products/{product_id}")
    assert response.status_code == 204, response.text
