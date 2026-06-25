"""Integration tests for bulk upload errors CSV download endpoint (T5).

Tests GET /api/v1/products/bulk-upload/errors.csv?upload_id=X.
Auto-skipped when localhost:5433 is unreachable (handled by shared conftest).
"""

import csv
import io
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel
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
        attribute_schema={"vin": {"type": "string", "required": True}},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest_asyncio.fixture
async def error_record(
    db_session: AsyncSession,
    test_organization: "object",
    vehicle_category: CategoryModel,
) -> BulkUploadErrorModel:
    """Seed a BulkUploadErrorModel row for download tests."""
    tenant_id = test_organization.tenant_id  # type: ignore[attr-defined]
    now = datetime.now(UTC)
    record = BulkUploadErrorModel(
        id=uuid4(),
        tenant_id=tenant_id,
        category_id=vehicle_category.id,
        created_at=now,
        expires_at=now + timedelta(hours=24),
        payload=[
            {
                "row_number": 3,
                "column": "attributes.vin",
                "message": "Required attribute 'vin' is missing",
                "raw_row": {"title": "Bad row", "price": "18500", "vin": ""},
            }
        ],
    )
    db_session.add(record)
    await db_session.flush()
    return record


# ── GET /api/v1/products/bulk-upload/errors.csv ──────────────────────────────


@pytest.mark.asyncio
async def test_errors_csv_download_returns_csv(
    async_client: AsyncClient,
    error_record: BulkUploadErrorModel,
) -> None:
    """Downloading errors CSV returns a valid CSV with the error rows."""
    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={error_record.id}"
    )

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]

    reader = csv.DictReader(io.StringIO(response.text))
    rows = list(reader)
    assert len(rows) == 1
    assert rows[0]["row_number"] == "3"
    assert rows[0]["column"] == "attributes.vin"
    assert "vin" in rows[0]["message"]


@pytest.mark.asyncio
async def test_errors_csv_unknown_upload_id_404(
    async_client: AsyncClient,
) -> None:
    """Unknown upload_id returns 404."""
    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={uuid4()}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_errors_csv_expired_record_404(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_organization: "object",
    vehicle_category: CategoryModel,
) -> None:
    """Expired error record (expires_at in the past) returns 404."""
    tenant_id = test_organization.tenant_id  # type: ignore[attr-defined]
    past = datetime.now(UTC) - timedelta(hours=1)
    record = BulkUploadErrorModel(
        id=uuid4(),
        tenant_id=tenant_id,
        category_id=vehicle_category.id,
        created_at=past - timedelta(hours=24),
        expires_at=past,
        payload=[],
    )
    db_session.add(record)
    await db_session.flush()

    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={record.id}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_errors_csv_wrong_tenant_404(
    async_client: AsyncClient,
    db_session: AsyncSession,
    vehicle_category: CategoryModel,
) -> None:
    """Error record belonging to a different tenant returns 404 (not 403 — no info leak)."""
    other_tenant_id = uuid4()
    now = datetime.now(UTC)
    record = BulkUploadErrorModel(
        id=uuid4(),
        tenant_id=other_tenant_id,  # different tenant
        category_id=vehicle_category.id,
        created_at=now,
        expires_at=now + timedelta(hours=24),
        payload=[],
    )
    db_session.add(record)
    await db_session.flush()

    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={record.id}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_bulk_upload_then_download_errors_csv(
    async_client: AsyncClient,
    vehicle_category: CategoryModel,
) -> None:
    """End-to-end: upload with errors → get upload_id → download errors.csv."""
    cid = vehicle_category.id
    csv_content = (
        f"title,price,category_id,vin\n"
        f"Good row,18500,{cid},1HGCM82633A123456\n"
        f"Bad row,18500,{cid},\n"  # vin empty → required missing
    )

    upload_response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.csv", csv_content.encode(), "text/csv")},
    )
    assert upload_response.status_code == 201
    upload_id = upload_response.json()["upload_id"]
    UUID(upload_id)

    download_response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={upload_id}"
    )
    assert download_response.status_code == 200
    reader = csv.DictReader(io.StringIO(download_response.text))
    rows = list(reader)
    assert len(rows) == 1
    assert rows[0]["row_number"] == "3"
