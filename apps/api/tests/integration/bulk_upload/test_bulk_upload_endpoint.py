"""Integration tests for generalized bulk upload endpoint (T5).

Tests POST /api/v1/products/bulk-upload with the schema-aware CSV parser.
Auto-skipped when localhost:5433 is unreachable (handled by shared conftest).
"""

from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel


@pytest_asyncio.fixture
async def vehicle_category(
    db_session: AsyncSession,
    test_organization: "object",
) -> CategoryModel:
    """Category with vehicle attribute_schema (vin required)."""
    category = CategoryModel(
        id=uuid4(),
        name="Vehicles",
        slug=f"vehicles-{uuid4().hex[:6]}",
        tenant_id=test_organization.tenant_id,  # type: ignore[attr-defined]
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={
            "vin": {"type": "string", "required": True},
            "year": {"type": "number", "required": False},
            "mileage": {"type": "number", "required": False},
        },
    )
    db_session.add(category)
    await db_session.flush()
    return category


# ── POST /api/v1/products/bulk-upload ────────────────────────────────────────


@pytest.mark.asyncio
async def test_bulk_upload_returns_upload_id_and_counts(
    async_client: AsyncClient,
    vehicle_category: CategoryModel,
) -> None:
    """Successful upload returns upload_id + correct counts (new BulkUploadUploadResult shape)."""
    cid = vehicle_category.id
    csv_content = (
        f"title,price,category_id,vin\n"
        f"2020 Honda Accord,25000,{cid},1HGCM82633A123456\n"
        f"2021 Toyota Camry,22000,{cid},2T1BURHE0LC123456\n"
    )

    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.csv", csv_content.encode(), "text/csv")},
    )

    assert response.status_code == 201
    data = response.json()

    # New shape: must have upload_id
    assert "upload_id" in data
    UUID(data["upload_id"])  # must be a valid UUID

    assert data["total_rows"] == 2
    assert data["created_count"] == 2
    assert data["failed_count"] == 0
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_bulk_upload_partial_success_returns_errors(
    async_client: AsyncClient,
    vehicle_category: CategoryModel,
) -> None:
    """Rows with missing required schema fields produce per-row errors; successes still created."""
    cid = vehicle_category.id
    csv_content = (
        f"title,price,category_id,vin\n"
        f"Good row,18500,{cid},1HGCM82633A123456\n"
        f"Bad row,18500,{cid},\n"  # vin empty → required missing
    )

    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.csv", csv_content.encode(), "text/csv")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["created_count"] == 1
    assert data["failed_count"] == 1
    assert len(data["errors"]) == 1

    err = data["errors"][0]
    assert err["row_number"] == 3
    assert "vin" in err["column"]
    assert "upload_id" in data  # upload_id present even with partial failure


@pytest.mark.asyncio
async def test_bulk_upload_missing_required_column_422(
    async_client: AsyncClient,
    vehicle_category: CategoryModel,
) -> None:
    """CSV missing a universal column (title) returns 422 before any DB write."""
    cid = vehicle_category.id
    csv_content = f"price,category_id\n18500,{cid}\n"

    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.csv", csv_content.encode(), "text/csv")},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_bulk_upload_non_csv_file_422(
    async_client: AsyncClient,
) -> None:
    """Non-CSV file upload returns 422."""
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.txt", b"not a csv", "text/plain")},
    )
    assert response.status_code == 422
