"""Test ExportCatalogClientFormatUseCase (u1-catalog-export-api)."""

import zipfile
from io import BytesIO
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from prosell.application.ports.ido_spaces import StorageReadError
from prosell.application.use_cases.product.export_catalog_client_format import (
    EXPORT_MAX_PRODUCTS,
    ExportCatalogClientFormatUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import (
    EmptyCatalogExportError,
    ExportLimitExceededError,
)
from prosell.domain.services.csv_export import CLIENT_FORMAT_COLUMNS
from prosell.domain.value_objects.product_status import ProductStatus


def _make_product(
    tenant_id: UUID,
    *,
    image_urls: list[str] | None = None,
    exterior_color: str = "Gris",
) -> Product:
    return Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=uuid4(),
        title="2020 Ford Explorer",
        price_cents=1780000,
        status=ProductStatus.PUBLISHED,
        description="Great vehicle",
        attributes={
            "year": 2020,
            "make": "Ford",
            "model": "Explorer",
            "mileage": 70000,
            "exterior_color": exterior_color,
        },
        image_urls=image_urls or [],
    )


def _make_use_case(
    *,
    tenant_id: UUID,
    product_count: int,
    products: list[Product],
    org_code: str | None = "MF",
    get_object: AsyncMock | None = None,
) -> tuple[ExportCatalogClientFormatUseCase, AsyncMock, AsyncMock, AsyncMock]:
    product_repository = AsyncMock()
    product_repository.count.return_value = product_count
    product_repository.get_all.return_value = products

    organization_repository = AsyncMock()
    organization_repository.get_by_tenant_id.return_value = Organization(
        id=tenant_id, name="Test Org", tenant_id=tenant_id, code=org_code
    )

    do_spaces_service = AsyncMock()
    if get_object is not None:
        do_spaces_service.get_object = get_object

    use_case = ExportCatalogClientFormatUseCase(
        product_repository=product_repository,
        organization_repository=organization_repository,
        do_spaces_service=do_spaces_service,
    )
    return use_case, product_repository, organization_repository, do_spaces_service


class TestExportCatalogClientFormatUseCase:
    """Test the catalog export use case (BR1.1, BR3.1, BR4.1, BR4.2, BR1.5)."""

    @pytest.mark.asyncio
    async def test_empty_catalog_raises_empty_catalog_export_error(self) -> None:
        # BR4.1 — no published products, reject before touching org/images.
        tenant_id = uuid4()
        use_case, _, organization_repository, do_spaces_service = _make_use_case(
            tenant_id=tenant_id, product_count=0, products=[]
        )

        with pytest.raises(EmptyCatalogExportError):
            await use_case.execute(tenant_id=tenant_id)

        organization_repository.get_by_tenant_id.assert_not_called()
        do_spaces_service.get_object.assert_not_called()

    @pytest.mark.asyncio
    async def test_cap_exceeded_raises_export_limit_exceeded_error(self) -> None:
        # BR3.1 — resource cap enforced before assembling anything.
        tenant_id = uuid4()
        use_case, _, organization_repository, _ = _make_use_case(
            tenant_id=tenant_id, product_count=EXPORT_MAX_PRODUCTS + 1, products=[]
        )

        with pytest.raises(ExportLimitExceededError) as exc_info:
            await use_case.execute(tenant_id=tenant_id)

        assert exc_info.value.limit == EXPORT_MAX_PRODUCTS
        assert exc_info.value.count == EXPORT_MAX_PRODUCTS + 1
        organization_repository.get_by_tenant_id.assert_not_called()

    @pytest.mark.asyncio
    async def test_individual_image_failure_does_not_abort_export(self) -> None:
        # BR4.2 — one bad image is skipped, the export still completes.
        tenant_id = uuid4()
        product = _make_product(
            tenant_id,
            image_urls=[
                "orgs/tenant/vehicles/good.jpg",
                "orgs/tenant/vehicles/bad.jpg",
            ],
        )

        async def fake_get_object(key: str) -> bytes:
            if "bad" in key:
                raise StorageReadError("boom")
            return b"jpeg-bytes"

        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            get_object=AsyncMock(side_effect=fake_get_object),
        )

        result = await use_case.execute(tenant_id=tenant_id)

        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            names = archive.namelist()
        assert any(name.endswith("good.jpg") for name in names)
        assert not any(name.endswith("bad.jpg") for name in names)

    @pytest.mark.asyncio
    async def test_zip_contains_csv_and_vehicle_image_folder(self) -> None:
        # BR1.5 — single combined ZIP: CSV at the root + one folder per vehicle.
        tenant_id = uuid4()
        product = _make_product(tenant_id, image_urls=["orgs/tenant/vehicles/photo.jpg"])
        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            org_code="MF",
            get_object=AsyncMock(return_value=b"jpeg-bytes"),
        )

        result = await use_case.execute(tenant_id=tenant_id)

        assert result.product_count == 1
        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            names = archive.namelist()
            assert "catalogo.csv" in names
            csv_lines = archive.read("catalogo.csv").decode("utf-8").strip("\r\n").splitlines()

            image_entries = [
                name for name in names if name.startswith("MF/2020-FORD-EXPLORER-70K-GRIS-MF/")
            ]

        # BR1.3 — exact header/order, written with the fixed 24 columns.
        assert csv_lines[0] == ";".join(CLIENT_FORMAT_COLUMNS)
        assert len(csv_lines) == 2  # header + 1 product row
        assert len(image_entries) == 1
        assert image_entries[0].endswith("photo.jpg")

    @pytest.mark.asyncio
    async def test_product_with_no_images_still_exports(self) -> None:
        # No images referenced — the vehicle's CSV row is still exported,
        # just with no folder entries (nothing to fail on, BR4.2 n/a here).
        tenant_id = uuid4()
        product = _make_product(tenant_id, image_urls=[])
        use_case, *_ = _make_use_case(tenant_id=tenant_id, product_count=1, products=[product])

        result = await use_case.execute(tenant_id=tenant_id)

        assert result.product_count == 1
        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            names = archive.namelist()
        assert names == ["catalogo.csv"]
