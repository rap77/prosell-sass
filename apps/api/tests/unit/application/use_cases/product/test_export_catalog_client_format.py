"""Test ExportCatalogClientFormatUseCase (u1-catalog-export-api, u1-cross-org-export-api)."""

import csv
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
from prosell.domain.entities.category import Category
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import (
    EmptyCatalogExportError,
    ExportLimitExceededError,
)
from prosell.domain.services.csv_export import CLIENT_FORMAT_COLUMNS
from prosell.domain.value_objects.product_status import ProductStatus

# Matches the one confirmed entry in category_translation.CATEGORY_TRANSLATION_TABLE.
_VEHICLES_VERTICAL_SLUG = "vehiculos-y-transporte"


def _make_product(
    tenant_id: UUID,
    *,
    image_urls: list[str] | None = None,
    exterior_color: str = "Gris",
    category_id: UUID | None = None,
    location_city: str | None = None,
    location_state: str | None = None,
) -> Product:
    return Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category_id or uuid4(),
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
        location_city=location_city,
        location_state=location_state,
    )


def _make_category_repository(
    vertical_slug_by_category_id: dict[UUID, str] | None = None,
) -> AsyncMock:
    """Stub `AbstractCategoryRepository` where every category IS ALREADY its
    own root vertical (`parent_id=None`) — no multi-level tree to walk up,
    matching how these tests build products with a bare `category_id` and no
    real category hierarchy. Defaults every unresolved id to the vehicles
    vertical's slug (translated); pass an explicit mapping to test a
    category resolving to an untranslated vertical (BR1.7).
    """
    overrides = vertical_slug_by_category_id or {}

    async def get_by_id_cross_tenant(category_id: UUID) -> Category:
        return Category(
            id=category_id,
            name="Test Vertical",
            slug=overrides.get(category_id, _VEHICLES_VERTICAL_SLUG),
            tenant_id=None,
            parent_id=None,
            level=0,
        )

    category_repository = AsyncMock()
    category_repository.get_by_id_cross_tenant.side_effect = get_by_id_cross_tenant
    return category_repository


def _make_use_case(
    *,
    tenant_id: UUID,
    product_count: int,
    products: list[Product],
    org_code: str | None = "MF",
    get_object: AsyncMock | None = None,
    organizations: list[Organization] | None = None,
    category_repository: AsyncMock | None = None,
) -> tuple[ExportCatalogClientFormatUseCase, AsyncMock, AsyncMock, AsyncMock]:
    product_repository = AsyncMock()
    product_repository.count.return_value = product_count
    product_repository.get_all.return_value = products

    organization_repository = AsyncMock()
    organization_repository.get_by_ids.return_value = (
        organizations
        if organizations is not None
        else [Organization(id=tenant_id, name="Test Org", tenant_id=tenant_id, code=org_code)]
    )

    do_spaces_service = AsyncMock()
    if get_object is not None:
        do_spaces_service.get_object = get_object

    use_case = ExportCatalogClientFormatUseCase(
        product_repository=product_repository,
        organization_repository=organization_repository,
        do_spaces_service=do_spaces_service,
        category_repository=category_repository or _make_category_repository(),
    )
    return use_case, product_repository, organization_repository, do_spaces_service


def _read_csv_rows(zip_bytes: bytes) -> list[dict[str, str]]:
    with zipfile.ZipFile(BytesIO(zip_bytes)) as archive:
        csv_content = archive.read("catalogo.csv").decode("utf-8")
    return list(csv.DictReader(csv_content.splitlines(), delimiter=";"))


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
            await use_case.execute(
                organization_id=tenant_id,
                all_organizations=False,
                base_folder="",
                facebook_groups_fallback="",
            )

        organization_repository.get_by_ids.assert_not_called()
        do_spaces_service.get_object.assert_not_called()

    @pytest.mark.asyncio
    async def test_cap_exceeded_raises_export_limit_exceeded_error(self) -> None:
        # BR3.1 — resource cap enforced before assembling anything.
        tenant_id = uuid4()
        use_case, _, organization_repository, _ = _make_use_case(
            tenant_id=tenant_id, product_count=EXPORT_MAX_PRODUCTS + 1, products=[]
        )

        with pytest.raises(ExportLimitExceededError) as exc_info:
            await use_case.execute(
                organization_id=tenant_id,
                all_organizations=False,
                base_folder="",
                facebook_groups_fallback="",
            )

        assert exc_info.value.limit == EXPORT_MAX_PRODUCTS
        assert exc_info.value.count == EXPORT_MAX_PRODUCTS + 1
        organization_repository.get_by_ids.assert_not_called()

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

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

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

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

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

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

        assert result.product_count == 1
        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            names = archive.namelist()
        assert names == ["catalogo.csv"]

    @pytest.mark.asyncio
    async def test_blank_product_location_falls_back_to_organization_location(self) -> None:
        tenant_id = uuid4()
        product = _make_product(
            tenant_id,
            location_city=" \t",
            location_state=None,
        )
        organization = Organization(
            id=tenant_id,
            name="Test Org",
            tenant_id=tenant_id,
            code="MF",
            city="Miami",
            state="FL",
        )
        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            organizations=[organization],
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

        assert _read_csv_rows(result.zip_bytes)[0]["location"] == "Miami FL"

    @pytest.mark.asyncio
    async def test_partial_product_location_is_not_mixed_with_organization_location(self) -> None:
        tenant_id = uuid4()
        product = _make_product(
            tenant_id,
            location_city="Orlando",
            location_state=" ",
        )
        organization = Organization(
            id=tenant_id,
            name="Test Org",
            tenant_id=tenant_id,
            code="MF",
            city="Miami",
            state="FL",
        )
        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            organizations=[organization],
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

        assert _read_csv_rows(result.zip_bytes)[0]["location"] == "Orlando"

    @pytest.mark.asyncio
    async def test_product_state_without_city_is_not_mixed_with_organization_location(self) -> None:
        tenant_id = uuid4()
        product = _make_product(
            tenant_id,
            location_city=" \t",
            location_state="TX",
        )
        organization = Organization(
            id=tenant_id,
            name="Test Org",
            tenant_id=tenant_id,
            code="MF",
            city="Miami",
            state="FL",
        )
        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            organizations=[organization],
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

        assert _read_csv_rows(result.zip_bytes)[0]["location"] == "TX"

    @pytest.mark.asyncio
    async def test_cross_org_export_uses_each_product_organization_location(self) -> None:
        org_a_id = uuid4()
        org_b_id = uuid4()
        product_a = _make_product(org_a_id)
        product_b = _make_product(org_b_id)
        organizations = [
            Organization(
                id=org_a_id,
                name="Org A",
                tenant_id=org_a_id,
                code="AA",
                city="Austin",
                state="TX",
            ),
            Organization(
                id=org_b_id,
                name="Org B",
                tenant_id=org_b_id,
                code="BB",
                city="Boston",
                state="MA",
            ),
        ]
        use_case, *_ = _make_use_case(
            tenant_id=org_a_id,
            product_count=2,
            products=[product_a, product_b],
            organizations=organizations,
        )

        result = await use_case.execute(
            organization_id=None,
            all_organizations=True,
            base_folder="",
            facebook_groups_fallback="",
        )

        rows = _read_csv_rows(result.zip_bytes)
        locations_by_code = {row["cod_dealer"]: row["location"] for row in rows}
        assert locations_by_code == {"AA": "Austin TX", "BB": "Boston MA"}

    @pytest.mark.asyncio
    async def test_missing_organization_leaves_blank_product_location(self) -> None:
        tenant_id = uuid4()
        product = _make_product(tenant_id)
        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[product],
            organizations=[],
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="",
            facebook_groups_fallback="",
        )

        assert _read_csv_rows(result.zip_bytes)[0]["location"] == ""


class TestExportCatalogClientFormatUseCaseCrossOrg:
    """u1-cross-org-export-api: `all_organizations` mode + BR1.7 category
    exclusion (team.md piso mínimo, puntos 2 y 3)."""

    @pytest.mark.asyncio
    async def test_single_organization_mode_resolves_to_own_organization_never_all(
        self,
    ) -> None:
        # Piso mínimo punto 2 — regresión negativa explícita: sin
        # `all_organizations` (False), `organization_id` = la propia
        # organización del caller resuelve EXACTAMENTE a esa organización,
        # nunca a "todas" — comportamiento ya existente, sin regresión.
        tenant_id = uuid4()
        product = _make_product(tenant_id)
        use_case, product_repository, organization_repository, _ = _make_use_case(
            tenant_id=tenant_id, product_count=1, products=[product], org_code="MF"
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="base/",
            facebook_groups_fallback="",
        )

        assert result.product_count == 1
        assert result.organization_code == "MF"
        assert result.organization_count is None
        # The product-scope filter is the single caller org, never lifted.
        product_repository.count.assert_called_once_with(
            tenant_id=tenant_id, status=ProductStatus.PUBLISHED
        )
        product_repository.get_all.assert_called_once()
        assert product_repository.get_all.call_args.kwargs["tenant_id"] == tenant_id
        organization_repository.get_by_ids.assert_called_once_with([tenant_id])

    @pytest.mark.asyncio
    async def test_missing_organization_id_without_all_organizations_raises_value_error(
        self,
    ) -> None:
        # Defense in depth (GGA finding, fixed 2026-09-13): the router
        # always resolves a concrete organization_id before calling
        # execute() when all_organizations=False, but the use case must
        # fail closed on its own if a future caller omits both — never
        # silently widen the scope to every tenant.
        tenant_id = uuid4()
        use_case, *_ = _make_use_case(tenant_id=tenant_id, product_count=0, products=[])

        with pytest.raises(ValueError, match="organization_id is required"):
            await use_case.execute(
                organization_id=None,
                all_organizations=False,
                base_folder="base/",
                facebook_groups_fallback="",
            )

    @pytest.mark.asyncio
    async def test_all_organizations_mode_resolves_org_code_per_product(self) -> None:
        # Piso mínimo punto 3 — regresión directa del bug #83: cada
        # producto usa el org_code de SU PROPIA organización, no la de la
        # primera organización resuelta en el loop.
        org_a_id = uuid4()
        org_b_id = uuid4()
        product_a = _make_product(org_a_id, exterior_color="Rojo")
        product_b = _make_product(org_b_id, exterior_color="Azul")

        use_case, product_repository, organization_repository, _ = _make_use_case(
            tenant_id=org_a_id,
            product_count=2,
            products=[product_a, product_b],
            organizations=[
                Organization(id=org_a_id, name="Org A", tenant_id=org_a_id, code="AA"),
                Organization(id=org_b_id, name="Org B", tenant_id=org_b_id, code="BB"),
            ],
        )

        result = await use_case.execute(
            organization_id=None,
            all_organizations=True,
            base_folder="base/",
            facebook_groups_fallback="",
        )

        assert result.product_count == 2
        assert result.organization_count == 2
        assert result.organization_code is None
        # Product-scope filter is lifted entirely for "all organizations".
        product_repository.count.assert_called_once_with(
            tenant_id=None, status=ProductStatus.PUBLISHED
        )
        assert product_repository.get_all.call_args.kwargs["tenant_id"] is None

        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            csv_lines = archive.read("catalogo.csv").decode("utf-8").strip("\r\n").splitlines()

        cod_dealer_index = CLIENT_FORMAT_COLUMNS.index("cod_dealer")
        rows_by_cod_dealer = {
            line.split(";")[cod_dealer_index]
            for line in csv_lines[1:]  # skip header
        }
        # Each product's row must carry ITS OWN org's code, never a single
        # (e.g. the first-resolved) code reused across every row.
        assert rows_by_cod_dealer == {"AA", "BB"}
        organization_repository.get_by_ids.assert_called_once()
        assert set(organization_repository.get_by_ids.call_args.args[0]) == {org_a_id, org_b_id}

    @pytest.mark.asyncio
    async def test_product_without_category_translation_is_excluded(self) -> None:
        # BR1.7 — a product whose resolved root vertical has no
        # `CategoryTranslationEntry` is excluded from the export entirely:
        # no CSV row, no image folder, not counted in `product_count`.
        tenant_id = uuid4()
        untranslated_category_id = uuid4()
        excluded_product = _make_product(tenant_id, category_id=untranslated_category_id)
        category_repository = _make_category_repository(
            {untranslated_category_id: "otra-vertical-sin-traduccion"}
        )

        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=1,
            products=[excluded_product],
            category_repository=category_repository,
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="base/",
            facebook_groups_fallback="",
        )

        assert result.product_count == 0
        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            names = archive.namelist()
            assert names == ["catalogo.csv"]
            csv_lines = archive.read("catalogo.csv").decode("utf-8").strip("\r\n").splitlines()
        assert len(csv_lines) == 1  # header only — the excluded product has no row

    @pytest.mark.asyncio
    async def test_csv_id_column_is_sequential_and_skips_no_number_for_excluded_products(
        self,
    ) -> None:
        # `id` must be a plain 1-based sequential position within the
        # export (matching the client's own reference CSV, e.g. "527"),
        # never the product's internal UUID — and a BR1.7-excluded
        # product in the middle must NOT consume a number (no gap).
        tenant_id = uuid4()
        untranslated_category_id = uuid4()
        included_a = _make_product(tenant_id)
        excluded = _make_product(tenant_id, category_id=untranslated_category_id)
        included_b = _make_product(tenant_id)
        category_repository = _make_category_repository(
            {untranslated_category_id: "otra-vertical-sin-traduccion"}
        )

        use_case, *_ = _make_use_case(
            tenant_id=tenant_id,
            product_count=3,
            products=[included_a, excluded, included_b],
            category_repository=category_repository,
        )

        result = await use_case.execute(
            organization_id=tenant_id,
            all_organizations=False,
            base_folder="base/",
            facebook_groups_fallback="",
        )

        assert result.product_count == 2
        with zipfile.ZipFile(BytesIO(result.zip_bytes)) as archive:
            csv_lines = archive.read("catalogo.csv").decode("utf-8").strip("\r\n").splitlines()
        id_column = CLIENT_FORMAT_COLUMNS.index("id")
        row_ids = [line.split(";")[id_column] for line in csv_lines[1:]]
        assert row_ids == ["1", "2"]

    @pytest.mark.asyncio
    async def test_cap_exceeded_in_all_organizations_mode_raises_export_limit_exceeded_error(
        self,
    ) -> None:
        # Piso mínimo — BR2.4: EXPORT_MAX_PRODUCTS aplica como límite
        # GLOBAL en modo "todas", mismo mecanismo ya usado para una sola
        # organización.
        use_case, _, organization_repository, _ = _make_use_case(
            tenant_id=uuid4(), product_count=EXPORT_MAX_PRODUCTS + 1, products=[]
        )

        with pytest.raises(ExportLimitExceededError) as exc_info:
            await use_case.execute(
                organization_id=None,
                all_organizations=True,
                base_folder="base/",
                facebook_groups_fallback="",
            )

        assert exc_info.value.limit == EXPORT_MAX_PRODUCTS
        assert exc_info.value.count == EXPORT_MAX_PRODUCTS + 1
        organization_repository.get_by_ids.assert_not_called()

    @pytest.mark.asyncio
    async def test_exactly_max_products_in_all_organizations_mode_does_not_raise(
        self,
    ) -> None:
        # AC4.3.2 — el límite es "mayor que 500", no "mayor o igual": un
        # total de EXACTAMENTE EXPORT_MAX_PRODUCTS completa normalmente
        # (no lanza ExportLimitExceededError).
        use_case, *_ = _make_use_case(
            tenant_id=uuid4(),
            product_count=EXPORT_MAX_PRODUCTS,
            products=[],
        )

        result = await use_case.execute(
            organization_id=None,
            all_organizations=True,
            base_folder="base/",
            facebook_groups_fallback="",
        )

        assert result.product_count == 0  # no `products` fixture rows, only the boundary check

    @pytest.mark.asyncio
    async def test_empty_catalog_in_all_organizations_mode_raises_empty_catalog_export_error(
        self,
    ) -> None:
        # AC4.5.1 — cuando ninguna organización tiene productos published,
        # el modo "todas" recibe el mismo comportamiento de catálogo vacío
        # (404 en el router) ya usado para el caso de una sola organización
        # — el chequeo de conteo es el mismo código para ambos modos.
        use_case, _, organization_repository, _ = _make_use_case(
            tenant_id=uuid4(), product_count=0, products=[]
        )

        with pytest.raises(EmptyCatalogExportError):
            await use_case.execute(
                organization_id=None,
                all_organizations=True,
                base_folder="base/",
                facebook_groups_fallback="",
            )

        organization_repository.get_by_ids.assert_not_called()
