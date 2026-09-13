"""Tests organization code validation in the CSV bulk-upload preview."""

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
    use_case = BulkUploadPreviewUseCase(organization_repository)
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
    use_case = BulkUploadPreviewUseCase(organization_repository)
    csv_content = "id;title;price;VIN\n1;OTHER-TENANT-CODE;25000;1FMSK7DH7LGA77418\n"
    tenant_id = uuid4()

    await use_case.execute(csv_content, tenant_id=tenant_id)

    organization_repository.get_by_codes.assert_called_once_with(
        ["OTHER-TENANT-CODE"], tenant_id=tenant_id
    )
