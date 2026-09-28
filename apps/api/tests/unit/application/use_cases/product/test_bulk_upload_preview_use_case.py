"""Tests organization code validation in the CSV bulk-upload preview."""

import io
import zipfile
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_preview import BulkUploadPreviewUseCase
from prosell.domain.entities.organization import Organization


@pytest.mark.asyncio
async def test_preview_reports_csv_organization_codes_missing_from_database() -> None:
    """Preview distinguishes recognized CSV organization codes from missing ones."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = [
        Organization(id=uuid4(), tenant_id=uuid4(), name="Dealer", code="DJ")
    ]
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = (
        "id;title;price;VIN\n1;DJ;25000;1FMSK7DH7LGA77418\n2;MISSING;18000;2T1BURHE0LC123456\n"
    )
    tenant_id = uuid4()

    result = await use_case.execute(csv_content, tenant_id=tenant_id)

    assert result.summary.detected_org_codes == ["DJ", "MISSING"]
    assert result.summary.missing_org_codes == ["MISSING"]


@pytest.mark.asyncio
async def test_preview_scopes_org_code_lookup_to_the_caller_tenant() -> None:
    """Org-code existence must never leak cross-tenant (GGA finding, fixed
    2026-09-13): the lookup is scoped to the caller's tenant_id, so a code
    that only exists in a DIFFERENT organization is reported as missing."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n1;OTHER-TENANT-CODE;25000;1FMSK7DH7LGA77418\n"
    tenant_id = uuid4()

    await use_case.execute(csv_content, tenant_id=tenant_id)

    organization_repository.get_by_codes.assert_called_once_with(
        ["OTHER-TENANT-CODE"], tenant_id=tenant_id
    )


# ============================================================================
# vehicle_code uniqueness — preview-side validation
# ============================================================================


def _make_zip_with_files(filenames: list[str]) -> bytes:
    """Build a real in-memory ZIP containing entries named `filenames`."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in filenames:
            zf.writestr(name, b"fake-bytes-for-preview")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_preview_flags_csv_id_colliding_with_existing_vehicle_code() -> None:
    """Row's `csv_id` (the legacy id that becomes `vehicle_code`) matches
    a `vehicle_code` already persisted on some other product → error
    and `importable=False`. The error message must name the colliding
    code so the user can locate the conflict in the catalog."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = {42}
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n42;DJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.importable is False
    assert any("vehicle_code '42' already exists in the platform" in e for e in row.errors), (
        row.errors
    )
    # Only the colliding code is checked; a single batched query.
    product_repository.vehicle_codes_exist.assert_awaited_once_with({42})


@pytest.mark.asyncio
async def test_preview_flags_within_csv_duplicate_vehicle_codes() -> None:
    """Two rows in the SAME CSV share the same `csv_id` → both flagged.
    The error text must list the OTHER row numbers (not the current
    one) so the user can locate the conflict."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = (
        "id;title;price;VIN\n"
        "99;DJ;25000;1FMSK7DH7LGA77418\n"
        "99;DJ;18000;2T1BURHE0LC123456\n"
        "100;DJ;22000;3FAFP07Z2YR123456\n"
    )

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    assert len(result.rows) == 3
    # Row numbers in CSV order: header is row 1, then 2, 3, 4. The
    # preview's result list is 0-indexed, so the duplicate id 99 sits
    # at indices 0 and 1; the unique id 100 sits at index 2.
    dup_row_1 = result.rows[0]
    dup_row_2 = result.rows[1]
    solo_row = result.rows[2]
    assert dup_row_1.row_number == 2
    assert dup_row_2.row_number == 3
    assert solo_row.row_number == 4
    assert dup_row_1.importable is False
    assert dup_row_2.importable is False
    assert "duplicated in this CSV" in dup_row_1.errors[0]
    assert "duplicated in this CSV" in dup_row_2.errors[0]
    # The "other rows" list points at the OTHER occurrence, not back at
    # itself: row 2's message lists row 3, and vice versa.
    assert "row(s) 3" in dup_row_1.errors[0]
    assert "row(s) 2" in dup_row_2.errors[0]
    # Row with a unique id stays green.
    assert solo_row.importable is True
    assert solo_row.errors == []
    # The lone non-duplicate id (100) is still checked against the DB
    # in the same batched call.
    product_repository.vehicle_codes_exist.assert_awaited_once_with({99, 100})


@pytest.mark.asyncio
async def test_preview_does_not_flag_empty_csv_id() -> None:
    """Row with empty `csv_id` → no error. The runtime path will let
    the allocator pick a value at import time."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    # No `id` column at all → every row has csv_id=None → nothing to check.
    csv_content = "title;price;VIN\nDJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.csv_id is None
    assert row.importable is True
    assert row.errors == []
    product_repository.vehicle_codes_exist.assert_not_awaited()


# ============================================================================
# Image filename validation — preview-side
# ============================================================================


@pytest.mark.asyncio
async def test_preview_accepts_row_path_present_in_zip() -> None:
    """Row with `path` referencing a filename that IS in the ZIP →
    no image-validation error."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;path;VIN\n1;DJ;25000;photo1.jpg;1FMSK7DH7LGA77418\n"
    zip_bytes = _make_zip_with_files(["org/vehicle/photo1.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    # image-found check passes; row stays importable as far as this
    # validator is concerned. Other validators (org code etc.) are
    # irrelevant for this assertion.
    assert not any("image 'photo1.jpg' not found in upload" in e for e in row.errors), row.errors


@pytest.mark.asyncio
async def test_preview_flags_row_path_missing_from_zip() -> None:
    """Row with `path` referencing a filename NOT in the ZIP → error
    and `importable=False`. The error must name the missing path so
    the user knows which row to fix."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;path;VIN\n1;DJ;25000;missing.jpg;1FMSK7DH7LGA77418\n"
    zip_bytes = _make_zip_with_files(["org/vehicle/other_photo.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    assert row.importable is False
    assert any("image 'missing.jpg' not found in upload" in e for e in row.errors), row.errors
    assert any(
        "referenced by 'path' column but no file in the ZIP matches" in e for e in row.errors
    ), row.errors


@pytest.mark.asyncio
async def test_preview_does_not_flag_row_with_no_image_path() -> None:
    """Row with `path` empty → no image-validation error (there's
    nothing to look up in the ZIP)."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;path;VIN\n1;DJ;25000;;1FMSK7DH7LGA77418\n"
    zip_bytes = _make_zip_with_files(["org/vehicle/photo1.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    assert row.importable is True
    assert row.errors == []


@pytest.mark.asyncio
async def test_preview_skips_image_validation_when_no_zip_uploaded() -> None:
    """No `zip_bytes` at all → no image-validation errors, regardless
    of what the CSV `path` columns contain. CSV-only previews stay
    supported."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.vehicle_codes_exist.return_value = set()
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = (
        "id;title;price;path;VIN\n"
        "1;DJ;25000;photo1.jpg;1FMSK7DH7LGA77418\n"
        "2;DJ;18000;nonexistent.jpg;2T1BURHE0LC123456\n"
    )

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    for row in result.rows:
        assert not any("not found in upload" in e for e in row.errors), row.errors
    # No DB collision either — the new zip-walker isn't entered.
    product_repository.vehicle_codes_exist.assert_awaited_once()
