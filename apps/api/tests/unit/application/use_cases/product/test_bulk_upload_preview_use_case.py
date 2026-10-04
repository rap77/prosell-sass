"""Tests organization code validation in the CSV bulk-upload preview."""

import io
import zipfile
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_preview import BulkUploadPreviewUseCase
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product


@pytest.mark.asyncio
async def test_preview_reports_csv_organization_codes_missing_from_database() -> None:
    """Preview distinguishes recognized CSV organization codes from missing ones."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = [
        Organization(id=uuid4(), tenant_id=uuid4(), name="Dealer", code="DJ")
    ]
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
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
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n1;OTHER-TENANT-CODE;25000;1FMSK7DH7LGA77418\n"
    tenant_id = uuid4()

    await use_case.execute(csv_content, tenant_id=tenant_id)

    organization_repository.get_by_codes.assert_called_once_with(
        ["OTHER-TENANT-CODE"], tenant_id=tenant_id
    )


# ============================================================================
# VIN ownership — a VIN that already exists must say whether it belongs to
# the row's own organization (will update) or a DIFFERENT one (real import
# will skip it entirely, never overwriting that other organization's data).
# ============================================================================


@pytest.mark.asyncio
async def test_preview_marks_vin_as_matching_when_it_belongs_to_the_same_organization() -> None:
    """An existing VIN under the row's OWN organization is a legitimate
    update — flagged for visibility, but still importable."""
    organization_id = uuid4()
    tenant_id = uuid4()
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = [
        Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
    ]
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = Mock(
        spec=Product, id=uuid4(), organization_id=organization_id
    )
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n1;DJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=tenant_id)

    row = result.rows[0]
    assert row.vin_exists is True
    assert row.vin_organization_match is True
    assert row.importable is True
    assert row.errors == []
    product_repository.get_by_vin.assert_awaited_once_with("1FMSK7DH7LGA77418", organization_id)


@pytest.mark.asyncio
async def test_preview_flags_vin_as_not_importable_when_it_belongs_to_another_organization() -> (
    None
):
    """An existing VIN under a DIFFERENT organization must be reported as
    NOT importable, with an explicit error — the real import will skip
    this row entirely rather than overwrite the other organization's data,
    and the preview must never promise an import that won't happen."""
    row_organization_id = uuid4()
    other_organization_id = uuid4()
    tenant_id = uuid4()
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = [
        Organization(id=row_organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
    ]
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = Mock(
        spec=Product, id=uuid4(), organization_id=other_organization_id
    )
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n1;DJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=tenant_id)

    row = result.rows[0]
    assert row.vin_exists is True
    assert row.vin_organization_match is False
    assert row.importable is False
    assert "different organization" in row.errors[0]
    assert result.summary.error_count == 1
    assert result.summary.importable_count == 0


@pytest.mark.asyncio
async def test_preview_leaves_vin_fields_untouched_when_vin_does_not_exist_yet() -> None:
    """A brand-new VIN must not be flagged at all — `vin_exists` stays
    False and `vin_organization_match` stays None (not applicable)."""
    organization_id = uuid4()
    tenant_id = uuid4()
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = [
        Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
    ]
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;VIN\n1;DJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=tenant_id)

    row = result.rows[0]
    assert row.vin_exists is False
    assert row.vin_organization_match is None
    assert row.importable is True


# ============================================================================
# `csv_id` — display-only, never validated against `internal_code`
# ============================================================================


@pytest.mark.asyncio
async def test_preview_captures_csv_id_for_display_without_validating_it() -> None:
    """`csv_id` is informational only (shown in the preview as "ID CSV") —
    duplicate or already-persisted CSV ids are never flagged as errors,
    since `internal_code` is always sourced from the internal allocator at
    import time, never from the CSV's `id` column."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = (
        "id;title;price;VIN\n42;DJ;25000;1FMSK7DH7LGA77418\n42;DJ;18000;2T1BURHE0LC123456\n"
    )

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    assert len(result.rows) == 2
    assert result.rows[0].csv_id == "42"
    assert result.rows[1].csv_id == "42"
    assert result.rows[0].importable is True
    assert result.rows[1].importable is True
    assert result.rows[0].errors == []
    assert result.rows[1].errors == []


@pytest.mark.asyncio
async def test_preview_does_not_flag_empty_csv_id() -> None:
    """Row with empty `csv_id` → no error. `csv_id` stays `None`; display
    only, same as a populated one."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    # No `id` column at all → every row has csv_id=None → nothing to check.
    csv_content = "title;price;VIN\nDJ;25000;1FMSK7DH7LGA77418\n"

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.csv_id is None
    assert row.importable is True
    assert row.errors == []


# ============================================================================
# Image filename validation — preview-side
# ============================================================================


def _make_zip_with_files(filenames: list[str]) -> bytes:
    """Build a real in-memory ZIP containing entries named `filenames`."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in filenames:
            zf.writestr(name, b"fake-bytes-for-preview")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_preview_accepts_row_path_matching_a_zip_folder() -> None:
    """Row with `path` naming a vehicle FOLDER that IS in the ZIP, with
    one or more images under it → no image-validation error. This is
    the project's only supported convention — a client CSV's `path`
    always names a folder holding the vehicle's images, never a single
    file path directly."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;path;VIN\n1;DJ;25000;org/vehicle;1FMSK7DH7LGA77418\n"
    zip_bytes = _make_zip_with_files(["org/vehicle/photo1.jpg", "org/vehicle/photo2.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    # image-found check passes; row stays importable as far as this
    # validator is concerned. Other validators (org code etc.) are
    # irrelevant for this assertion.
    assert not any("image 'org/vehicle' not found in upload" in e for e in row.errors), row.errors


@pytest.mark.asyncio
async def test_preview_flags_row_path_missing_from_zip() -> None:
    """Row with `path` naming a folder that has no match anywhere in
    the ZIP → error and `importable=False`. The error must name the
    missing path so the user knows which row to fix."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = "id;title;price;path;VIN\n1;DJ;25000;org/missing-vehicle;1FMSK7DH7LGA77418\n"
    zip_bytes = _make_zip_with_files(["org/vehicle/other_photo.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    assert row.importable is False
    assert any("image 'org/missing-vehicle' not found in upload" in e for e in row.errors), (
        row.errors
    )
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
    product_repository.get_by_vin.return_value = None
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
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    csv_content = (
        "id;title;price;path;VIN\n"
        "1;DJ;25000;photo1.jpg;1FMSK7DH7LGA77418\n"
        "2;DJ;18000;nonexistent.jpg;2T1BURHE0LC123456\n"
    )

    result = await use_case.execute(csv_content, tenant_id=uuid4())

    for row in result.rows:
        assert not any("not found in upload" in e for e in row.errors), row.errors


@pytest.mark.asyncio
async def test_preview_accepts_folder_prefix_path_matched_by_csv_image_mapper() -> None:
    """Row with a legacy client `path` naming a vehicle FOLDER (no file
    extension, e.g. `IMG/Vehiculos/AF/2004-FORD-F150-216K-ROJO-AF`) must
    NOT be flagged as missing when `CSVImageMapper`'s folder-prefix
    matcher resolves it against files nested under that folder name in
    the ZIP — even though the folder's basename never equals any
    individual filename in the ZIP. Regression for a real production
    false-positive: the basename-only check used to flag these rows as
    errors unconditionally, by design, blocking an otherwise-importable
    client upload."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    folder_path = (
        "/Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/AF/2004-FORD-F150-216K-ROJO-AF"
    )
    csv_content = f"id;title;price;path;VIN\n1;AF;25000;{folder_path};1FTPX12554NB18918\n"
    zip_bytes = _make_zip_with_files([f"{folder_path}/photo1.jpg", f"{folder_path}/photo2.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    assert row.importable is True
    assert not any("not found in upload" in e for e in row.errors), row.errors


@pytest.mark.asyncio
async def test_preview_still_flags_folder_prefix_path_with_no_matching_folder() -> None:
    """Row with a folder-shaped `path` that genuinely has no matching
    folder anywhere in the ZIP still gets flagged — the OR-combination
    fix must not turn the check into a no-op for real missing images."""
    organization_repository = AsyncMock()
    organization_repository.get_by_codes.return_value = []
    product_repository = AsyncMock()
    product_repository.get_by_vin.return_value = None
    use_case = BulkUploadPreviewUseCase(organization_repository, product_repository)
    folder_path = "IMG/Vehiculos/AF/2004-FORD-F150-216K-ROJO-AF"
    csv_content = f"id;title;price;path;VIN\n1;AF;25000;{folder_path};1FTPX12554NB18918\n"
    zip_bytes = _make_zip_with_files(["IMG/Vehiculos/AF/OTHER-VEHICLE/photo1.jpg"])

    result = await use_case.execute(csv_content, zip_bytes=zip_bytes, tenant_id=uuid4())

    row = result.rows[0]
    assert row.importable is False
    assert any(f"image '{folder_path}' not found in upload" in e for e in row.errors), row.errors
