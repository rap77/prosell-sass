"""Integration tests for GET /api/v1/products/export-client-format.zip
(u1-catalog-export-api).

Covers Step 10 of code-generation-plan.md: Content-Type/Content-Disposition
contract, 200/404/413, and multi-tenant isolation (NFR1) — a caller from
one organization never sees another organization's products by default.

Also covers the cross-org export permission fix (intent
260910-export-cross-org): a caller with `ORG_ADMIN_VIEW_ALL` may pass
`organization_id` to export a DIFFERENT organization's catalog, a caller
without that permission is rejected with 403, and every cross-org export
is audit-logged.

Also covers the "all organizations" export mode (intent
260911-cross-org-export-ux, u1-cross-org-export-api): `base_folder` and
`facebook_groups_fallback` are now required in EVERY mode (FR8.1/FR9.1),
so every pre-existing test below now sends them; `all_organizations=true`
requires `ORG_ADMIN_VIEW_ALL` (BR2.1) and produces a distinct
`catalogo_TODAS_*.zip` filename (BR2.8).
"""

import itertools
import zipfile
from collections.abc import AsyncGenerator
from io import BytesIO
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.application.use_cases.product.export_catalog_client_format import (
    EXPORT_MAX_PRODUCTS,
)
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

# FR8.1/FR9.1 — required in every mode. Every call below that doesn't
# test their absence merges this in.
_REQUIRED_EXPORT_PARAMS = {
    "base_folder": "orgs/",
    "facebook_groups_fallback": "General",
}

# The export requires a durable, positive vehicle code in JSONB. Keep fixture
# products representative of the create path while remaining unique per test.
_vehicle_code_seq = itertools.count(start=1)


@pytest_asyncio.fixture
async def shared_session() -> AsyncGenerator[AsyncSession]:
    """Shared session so test setup and the endpoint see the same data."""
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        await session.rollback()

    await engine.dispose()


async def _create_org(session: AsyncSession, *, code: str | None = "MF") -> OrganizationModel:
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name=f"Test Org {uuid4().hex[:8]}",
        status="active",
        code=code,
        settings={},
    )
    session.add(org)
    await session.flush()
    return org


async def _create_vertical(session: AsyncSession) -> CategoryModel:
    """The root "vehiculos-y-transporte" vertical (BR1.3) that every leaf
    category in this file resolves up to via `parent_id`. Its `slug` must
    match `CATEGORY_TRANSLATION_TABLE` exactly (`category_translation.py`)
    — `tenant_id=None` (a real root-vertical row is a global template per
    `category_model.py`'s own docstring, and `categories.tenant_id` has a
    FK to `organizations`, so an arbitrary UUID here would violate it).
    `slug` is globally UNIQUE, so a test that needs more than one leaf
    category must create this once and share it (see `_create_category`'s
    `vertical` param).
    """
    vertical = CategoryModel(
        id=uuid4(),
        tenant_id=None,
        name="Vehiculos y Transporte",
        slug="vehiculos-y-transporte",
        level=0,
        field_config=[],
    )
    session.add(vertical)
    await session.flush()
    return vertical


async def _create_category(
    session: AsyncSession, tenant_id: UUID, vertical: CategoryModel | None = None
) -> CategoryModel:
    """A leaf category (level=1) under the shared vehicles vertical
    (BR1.3) — a product's `category_id` always points at a leaf like this
    one, never at the vertical itself. Without a resolvable vertical, the
    product is silently excluded from the export (BR1.7), which would
    empty every CSV assertion in this file. Pass an already-created
    `vertical` when a test needs more than one leaf category.
    """
    if vertical is None:
        vertical = await _create_vertical(session)
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=tenant_id,
        parent_id=vertical.id,
        name=f"Test Category {uuid4().hex[:6]}",
        slug=f"test-cat-{uuid4().hex[:8]}",
        level=1,
        field_config=[],
    )
    session.add(cat)
    await session.flush()
    return cat


def _make_product(
    *,
    tenant_id: UUID,
    organization_id: UUID,
    category_id: UUID,
    status: str = ProductStatus.PUBLISHED.value,
    title: str = "2020 Ford Explorer",
    image_urls: list[str] | None = None,
    vin: str | None = None,
) -> ProductModel:
    attributes: dict[str, object] = {
        "year": 2020,
        "make": "Ford",
        "model": "Explorer",
        "mileage": 70000,
        "exterior_color": "Gris",
        "vehicle_code": str(next(_vehicle_code_seq)),
    }
    if vin is not None:
        # A distinguishing per-product value tests can assert on in the
        # exported CSV — the `id` column is now a sequential position
        # (BR-id-sequential), not the product's own UUID, so tests that
        # need to prove "this specific product is/isn't in the export"
        # need a different marker.
        attributes["vin"] = vin
    return ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        title=title,
        slug=f"{title.lower().replace(' ', '-')}-{uuid4().hex[:6]}",
        description="Great vehicle",
        price_cents=1780000,
        currency="USD",
        status=status,
        image_urls=image_urls or [],
        condition="used",
        attributes=attributes,
    )


def _auth_user(org: OrganizationModel) -> User:
    role = Role(
        id=uuid4(),
        role_type=RoleType.SUPER_ADMIN,
        name="Super Admin",
        is_system_role=True,
        tenant_id=None,
    )
    return User(
        id=uuid4(),
        email=f"export-test-{uuid4().hex[:6]}@example.com",
        full_name="Export Test User",
        tenant_id=org.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


def _non_admin_user(org: OrganizationModel) -> User:
    """A caller without ORG_ADMIN_VIEW_ALL (sales_agent), for the 403 path."""
    role = Role(
        id=uuid4(),
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
        tenant_id=org.tenant_id,
    )
    return User(
        id=uuid4(),
        email=f"export-test-nonadmin-{uuid4().hex[:6]}@example.com",
        full_name="Non-Admin Export Test User",
        tenant_id=org.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


@pytest.fixture
def mock_spaces() -> AsyncMock:
    spaces = AsyncMock()
    spaces.get_object.return_value = b"jpeg-bytes"
    return spaces


@pytest.fixture
def setup_override(shared_session: AsyncSession, mock_spaces: AsyncMock):
    """Override DB session + storage; auth is overridden per-test (the
    caller's identity is the thing under test in the isolation case).
    """

    async def _override_db() -> AsyncGenerator[AsyncSession]:
        yield shared_session

    app.dependency_overrides[get_async_session] = _override_db
    app.dependency_overrides[get_spaces_service] = lambda: mock_spaces
    yield
    app.dependency_overrides.pop(get_async_session, None)
    app.dependency_overrides.pop(get_spaces_service, None)
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)


def _authenticate_as(user: User) -> None:
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatContract:
    """Content-Type/Content-Disposition contract (team.md piso mínimo #3)."""

    async def test_returns_zip_content_type_and_disposition(
        self, shared_session: AsyncSession
    ) -> None:
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product = _make_product(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            image_urls=["orgs/tenant/vehicles/photo.jpg"],
        )
        shared_session.add(product)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        content_disposition = response.headers["content-disposition"]
        assert content_disposition.startswith("attachment; filename=")
        assert content_disposition.endswith('.zip"')

        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            assert "catalogo.csv" in archive.namelist()


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatStatusCodes:
    """200/404/413 (BR1.1, BR4.1, BR3.1)."""

    async def test_empty_catalog_returns_404(self, shared_session: AsyncSession) -> None:
        org = await _create_org(shared_session)
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        assert response.status_code == 404

    async def test_non_published_products_do_not_count(self, shared_session: AsyncSession) -> None:
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        draft_product = _make_product(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            status=ProductStatus.DRAFT.value,
        )
        shared_session.add(draft_product)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        # BR1.1 — only `published` products count; a draft-only org is
        # indistinguishable from an empty catalog for this endpoint.
        assert response.status_code == 404

    async def test_cap_exceeded_returns_413(self, shared_session: AsyncSession) -> None:
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        for _ in range(EXPORT_MAX_PRODUCTS + 1):
            shared_session.add(
                _make_product(
                    tenant_id=org.tenant_id,
                    organization_id=org.id,
                    category_id=category.id,
                )
            )
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        assert response.status_code == 413


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatTenantIsolation:
    """NFR1 — a caller only ever sees their own organization's products."""

    async def test_other_organizations_products_never_appear(
        self, shared_session: AsyncSession
    ) -> None:
        org_a = await _create_org(shared_session, code="AA")
        org_b = await _create_org(shared_session, code="BB")
        vertical = await _create_vertical(shared_session)
        category_a = await _create_category(shared_session, org_a.tenant_id, vertical)
        category_b = await _create_category(shared_session, org_b.tenant_id, vertical)

        product_a = _make_product(
            tenant_id=org_a.tenant_id,
            organization_id=org_a.id,
            category_id=category_a.id,
            title="Org A Vehicle",
            vin="VINORGA000000001",
        )
        product_b = _make_product(
            tenant_id=org_b.tenant_id,
            organization_id=org_b.id,
            category_id=category_b.id,
            title="Org B Vehicle",
            vin="VINORGB000000002",
        )
        shared_session.add(product_a)
        shared_session.add(product_b)
        await shared_session.flush()

        _authenticate_as(_auth_user(org_a))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")

        assert "VINORGA000000001" in csv_content
        assert "VINORGB000000002" not in csv_content


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatCrossOrgPermission:
    """Cross-org export permission fix (intent 260910-export-cross-org):
    a caller with ORG_ADMIN_VIEW_ALL may target another organization via
    `organization_id`, a caller without it is rejected with 403, and
    every cross-org export is audit-logged (fail-open, best-effort).
    """

    async def test_super_admin_with_organization_id_sees_target_org_catalog(
        self, shared_session: AsyncSession
    ) -> None:
        """FR1.2, FR4.2 — the targeted regression for this bugfix."""
        own_org = await _create_org(shared_session, code="AA")
        target_org = await _create_org(shared_session, code="BB")
        target_category = await _create_category(shared_session, target_org.tenant_id)
        target_product = _make_product(
            tenant_id=target_org.tenant_id,
            organization_id=target_org.id,
            category_id=target_category.id,
            title="Target Org Vehicle",
            vin="VINTARGETORG00001",
        )
        shared_session.add(target_product)
        await shared_session.flush()

        _authenticate_as(_auth_user(own_org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={**_REQUIRED_EXPORT_PARAMS, "organization_id": str(target_org.tenant_id)},
            )

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")
        assert "VINTARGETORG00001" in csv_content

    async def test_non_admin_with_organization_id_returns_403(
        self, shared_session: AsyncSession
    ) -> None:
        """FR1.3, FR4.3."""
        own_org = await _create_org(shared_session, code="AA")
        other_org = await _create_org(shared_session, code="BB")
        _authenticate_as(_non_admin_user(own_org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={**_REQUIRED_EXPORT_PARAMS, "organization_id": str(other_org.tenant_id)},
            )

        assert response.status_code == 403

    async def test_nonexistent_organization_id_behaves_like_empty_catalog(
        self, shared_session: AsyncSession
    ) -> None:
        """FR1.5 — no existence validation, same as list_products: an
        organization_id with no published products (real or nonexistent)
        yields the ordinary empty-catalog 404.
        """
        own_org = await _create_org(shared_session, code="AA")
        _authenticate_as(_auth_user(own_org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={**_REQUIRED_EXPORT_PARAMS, "organization_id": str(uuid4())},
            )

        assert response.status_code == 404

    async def test_cross_org_export_is_audited(
        self, shared_session: AsyncSession, caplog: pytest.LogCaptureFixture
    ) -> None:
        """FR2.1."""
        own_org = await _create_org(shared_session, code="AA")
        target_org = await _create_org(shared_session, code="BB")
        target_category = await _create_category(shared_session, target_org.tenant_id)
        shared_session.add(
            _make_product(
                tenant_id=target_org.tenant_id,
                organization_id=target_org.id,
                category_id=target_category.id,
            )
        )
        await shared_session.flush()
        _authenticate_as(_auth_user(own_org))

        with caplog.at_level("INFO"):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.get(
                    "/api/v1/products/export-client-format.zip",
                    params={
                        **_REQUIRED_EXPORT_PARAMS,
                        "organization_id": str(target_org.tenant_id),
                    },
                )

        assert response.status_code == 200
        assert "Cross-org catalog export" in caplog.text
        assert str(target_org.tenant_id) in caplog.text

    async def test_own_org_export_is_not_audited(
        self, shared_session: AsyncSession, caplog: pytest.LogCaptureFixture
    ) -> None:
        """FR2.2 — exporting the caller's own organization (default, no
        organization_id) does not emit the cross-org audit log line.
        """
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        shared_session.add(
            _make_product(tenant_id=org.tenant_id, organization_id=org.id, category_id=category.id)
        )
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        with caplog.at_level("INFO"):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.get(
                    "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
                )

        assert response.status_code == 200
        assert "Cross-org catalog export" not in caplog.text


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatAllOrganizations:
    """u1-cross-org-export-api: `all_organizations=true` mode (BR2.1, BR2.8,
    team.md piso mínimo punto 2b — defense in depth for the new sentinel).
    """

    async def test_non_admin_with_all_organizations_returns_403(
        self, shared_session: AsyncSession
    ) -> None:
        """BR2.1 — rejected even when invoked directly (not through the UI)
        with otherwise-valid required parameters.
        """
        org = await _create_org(shared_session)
        _authenticate_as(_non_admin_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={**_REQUIRED_EXPORT_PARAMS, "all_organizations": "true"},
            )

        assert response.status_code == 403

    async def test_admin_with_all_organizations_returns_zip_named_todas(
        self, shared_session: AsyncSession
    ) -> None:
        """BR2.8 — the filename distinguishes the ALL_ORGS export from any
        single-organization export.
        """
        org_a = await _create_org(shared_session, code="AA")
        org_b = await _create_org(shared_session, code="BB")
        vertical = await _create_vertical(shared_session)
        category_a = await _create_category(shared_session, org_a.tenant_id, vertical)
        category_b = await _create_category(shared_session, org_b.tenant_id, vertical)
        shared_session.add(
            _make_product(
                tenant_id=org_a.tenant_id, organization_id=org_a.id, category_id=category_a.id
            )
        )
        shared_session.add(
            _make_product(
                tenant_id=org_b.tenant_id, organization_id=org_b.id, category_id=category_b.id
            )
        )
        await shared_session.flush()
        _authenticate_as(_auth_user(org_a))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={**_REQUIRED_EXPORT_PARAMS, "all_organizations": "true"},
            )

        assert response.status_code == 200
        content_disposition = response.headers["content-disposition"]
        assert "catalogo_TODAS_" in content_disposition
        assert content_disposition.endswith('.zip"')


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportClientFormatRequiredParams:
    """FR8.1/FR9.1 — `base_folder`/`facebook_groups_fallback` are required
    in EVERY mode, not only `all_organizations=true`.
    """

    async def test_missing_base_folder_returns_422(self, shared_session: AsyncSession) -> None:
        org = await _create_org(shared_session)
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={"facebook_groups_fallback": "General"},
            )

        assert response.status_code == 422

    async def test_missing_facebook_groups_fallback_returns_422(
        self, shared_session: AsyncSession
    ) -> None:
        org = await _create_org(shared_session)
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={"base_folder": "orgs/"},
            )

        assert response.status_code == 422


def _make_product_with_vehicle_code(
    *,
    tenant_id: UUID,
    organization_id: UUID,
    category_id: UUID,
    vehicle_code: int,
    vin: str | None = None,
    image_urls: list[str] | None = None,
    title: str = "2021 Honda Civic",
) -> ProductModel:
    """A published product with `vehicle_code` already present in
    `attributes` — the steady state enforced by the DB trigger from
    migration `20260929_0001_enforce_vehicle_code_required`."""
    attributes: dict[str, object] = {
        "year": 2021,
        "make": "Honda",
        "model": "Civic",
        "mileage": 30000,
        "exterior_color": "Negro",
        "vehicle_code": str(vehicle_code),
    }
    if vin is not None:
        attributes["vin"] = vin
    return ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        title=title,
        slug=f"{title.lower().replace(' ', '-')}-{uuid4().hex[:6]}",
        description="Reliable compact",
        price_cents=1850000,
        currency="USD",
        status=ProductStatus.PUBLISHED.value,
        image_urls=image_urls or [],
        condition="used",
        attributes=attributes,
    )


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
# Class rename: `TestExportClientFormatVehicleCodeBackfill` ->
# `TestExportClientFormatVehicleCodeRequired`. The original class encoded
# the runtime backfill fix (case: product lacks vehicle_code -> use case
# backfills via update_vehicle_code_if_absent before exporting). After
# the enforce-vehicle_code-required migration installs the DB trigger,
# that runtime path is unreachable — the invariant "every published
# vehicle-category product has vehicle_code" is enforced at the DB level,
# and the use case trusts it. Renaming the class documents the new
# semantic so future readers see "required" (DB invariant) instead of
# "backfill" (runtime repair) and don't reintroduce the removed branch.
class TestExportClientFormatVehicleCodeRequired:
    """`export-vehicle-code-required` invariant (the enforce-vehicle_code-
    required migration): a published product in a vehicle category is
    GUARANTEED by the DB trigger to carry `vehicle_code` before the
    export ever reads it. The runtime backfill path
    (`update_vehicle_code_if_absent`) is gone — the use case trusts the
    DB invariant. This class documents the new contract.
    """

    async def test_product_with_persisted_vehicle_code_is_included_in_csv(
        self, shared_session: AsyncSession
    ) -> None:
        """(a) DB-guaranteed `vehicle_code` on a vehicle-category product
        yields a CSV row AND an image folder, with the CSV `id` column
        carrying exactly the persisted code.

        The DB trigger installed by migration
        `20260929_0001_enforce_vehicle_code_required` enforces
        `vehicle_code` presence at INSERT time for vehicle-category
        products, so the product is created with the code in
        `attributes["vehicle_code"]` from the start (the runtime
        backfill path that used to assign a code here was removed).
        """
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product = _make_product_with_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vehicle_code=1001,
            vin="VINNOCODE00000001",
            image_urls=["orgs/tenant/vehicles/backfill-photo.jpg"],
        )
        shared_session.add(product)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")
            namelist = archive.namelist()

        # Row included and contains the distinguishing VIN
        assert "VINNOCODE00000001" in csv_content
        # Image folder emitted alongside the row.
        assert any(name.endswith("backfill-photo.jpg") for name in namelist)
        # The CSV `id` column carries exactly the persisted code —
        # deterministic across runs, since the trigger guarantees the
        # value at INSERT time.
        id_column = csv_content.splitlines()[1].split(";")[0]
        assert id_column == "1001"

    async def test_export_is_stable_across_two_consecutive_calls(
        self, shared_session: AsyncSession
    ) -> None:
        """(b) Stability — calling the export twice in a row yields the
        SAME `id` (vehicle_code) for the product and the SAME folder/file
        structure. The code is durable in `attributes["vehicle_code"]`
        from INSERT time (DB trigger), so both exports read the same
        value and emit it."""
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product = _make_product_with_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vehicle_code=2002,
            vin="VINSTABLE00000001",
            image_urls=["orgs/tenant/vehicles/stable-photo.jpg"],
        )
        shared_session.add(product)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async def _export_once() -> tuple[str, list[str]]:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.get(
                    "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
                )
            assert response.status_code == 200
            with zipfile.ZipFile(BytesIO(response.content)) as archive:
                return (
                    archive.read("catalogo.csv").decode("utf-8"),
                    sorted(archive.namelist()),
                )

        csv_first, namelist_first = await _export_once()
        csv_second, namelist_second = await _export_once()

        # Both exports must include the product, with the SAME `id`
        # column (CSV column index 0 in the 24-column client format —
        # see `CLIENT_FORMAT_COLUMNS`).
        for csv_content, label in ((csv_first, "first"), (csv_second, "second")):
            rows = csv_content.splitlines()[1:]
            assert len(rows) == 1, f"{label} export must contain exactly one row, got {len(rows)}"
            columns = rows[0].split(";")
            assert columns[0] == "2002"  # the persisted vehicle_code
            assert columns[-1] == "VINSTABLE00000001"

        # Same product, same `id` across both exports.
        id_first = csv_first.splitlines()[1].split(";")[0]
        id_second = csv_second.splitlines()[1].split(";")[0]
        assert id_first == id_second
        # Same folder/image structure too.
        assert namelist_first == namelist_second

    async def test_export_includes_two_products_with_distinct_vehicle_codes(
        self, shared_session: AsyncSession
    ) -> None:
        """(c) Multi-row steady state — two products with distinct
        `vehicle_code` values land in the CSV with their exact codes.

        This replaces the legacy "concurrent backfill" test: with the
        DB trigger enforcing `vehicle_code` at INSERT time, the
        runtime backfill path is gone, so there is no concurrency
        scenario to exercise for `vehicle_code` allocation. The export
        simply trusts the DB invariant and emits each row with the
        persisted code."""
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product_a = _make_product_with_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vehicle_code=1001,
            vin="VINCONCURRENT0001A",
        )
        product_b = _make_product_with_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vehicle_code=1002,
            vin="VINCONCURRENT0001B",
        )
        shared_session.add(product_a)
        shared_session.add(product_b)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )
        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")

        assert "VINCONCURRENT0001A" in csv_content
        assert "VINCONCURRENT0001B" in csv_content

        # Each CSV `id` column carries the EXACT persisted code.
        rows = csv_content.splitlines()[1:]
        ids_by_vin = {row.split(";")[-1]: row.split(";")[0] for row in rows}
        assert ids_by_vin["VINCONCURRENT0001A"] == "1001"
        assert ids_by_vin["VINCONCURRENT0001B"] == "1002"

        # Sanity: a draft product is still excluded from the export.
        draft = _make_product_with_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vehicle_code=1003,
            vin="VINDRAFT000000001",
        )
        draft.status = ProductStatus.DRAFT.value
        shared_session.add(draft)
        await shared_session.flush()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )
        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")
        assert "VINDRAFT000000001" not in csv_content

    async def test_export_includes_products_after_db_guarantees_vehicle_code(
        self,
        shared_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Post-migration contract: the DB trigger guarantees
        ``attributes["vehicle_code"]`` is present on every published
        vehicle-category product, so the use case no longer needs any
        runtime backfill scaffolding. We prove BOTH halves of that
        contract here:

        1. The export emits the row with the EXACT ``vehicle_code`` we
           persisted on the product (not a freshly-allocated one), in
           the ``id`` column of the client-format CSV.
        2. NEITHER of the two backfill-scaffolding repository calls is
           made during the export —

             a. ``get_max_vehicle_code()`` (read once before the loop
                to seed the per-export allocation base; only meaningful
                when a backfill is going to happen), AND
             b. ``update_vehicle_code_if_absent(product_id, code)``
                (the actual atomic backfill primitive),

           both belong entirely to the runtime backfill path. With the
           DB trigger guaranteeing the invariant, both calls are dead
           code and must be removed.

        The use case invokes both through the
        ``SqlAlchemyProductRepository`` class (the router constructs a
        fresh instance per request), so we monkeypatch the unbound
        methods on the class itself and assert neither was reached.

        Why the spy covers TWO methods, not one
        ---------------------------------------
        ``update_vehicle_code_if_absent`` is conditionally called (the
        use case short-circuits with ``needs_backfill = vehicle_code_raw
        is None or ... == ''``), so a spy on that alone would pass for
        a row that already carries a code — the very row this test
        pins. ``get_max_vehicle_code()``, by contrast, is called
        UNCONDITIONALLY once per export (the export always seeds the
        allocation base, even when no product ends up needing it). So
        spying on it gives us the actual signal that the backfill
        scaffolding still exists in the use case — currently true, so
        the test fails today; after the backfill branch is removed,
        both calls vanish and the test passes.

        The test currently fails because the use case still calls
        ``get_max_vehicle_code()`` unconditionally on every export.
        After the backfill branch is removed from the use case, neither
        spy is invoked and both assertions pass.
        """
        from prosell.infrastructure.repositories.product_repository_impl import (
            SqlAlchemyProductRepository,
        )

        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        # Use a known, distinctive code so we can assert it appears in
        # the CSV verbatim — `_make_product` would have produced a
        # monotonically-increasing value, but the CSV `id` column is
        # whatever the row carries in `attributes["vehicle_code"]`.
        pinned_code = "424242"
        product = _make_product(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vin="VINDBGUARANTEED0001",
        )
        product.attributes["vehicle_code"] = pinned_code
        shared_session.add(product)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        # Spy on BOTH backfill-scaffolding repository methods. Each
        # spy records the call (so the assertion can name the offender)
        # but never executes the real implementation (so the test
        # cannot silently rely on the real method's no-op semantics).
        backfill_calls: list[tuple[object, object]] = []
        max_calls: list[None] = []

        async def _spy_update_vehicle_code_if_absent(
            self: object,  # noqa: ARG001
            product_id: object,
            code: object,
        ) -> bool:
            backfill_calls.append((product_id, code))
            # Return False — the use case treats a False return as
            # "row already had a code, nothing changed", which is
            # exactly the post-trigger steady state we want to test.
            return False

        async def _spy_get_max_vehicle_code(self: object) -> int | None:  # noqa: ARG001
            max_calls.append(None)
            # Return a sentinel that exercises the use case's "empty
            # table" branch (`base_code = (max or 0) + 1 = 1`) without
            # touching the real DB MAX aggregate.
            return None

        monkeypatch.setattr(
            SqlAlchemyProductRepository,
            "update_vehicle_code_if_absent",
            _spy_update_vehicle_code_if_absent,
        )
        monkeypatch.setattr(
            SqlAlchemyProductRepository,
            "get_max_vehicle_code",
            _spy_get_max_vehicle_code,
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params=_REQUIRED_EXPORT_PARAMS,
            )

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")

        # (1) The row landed in the CSV with the exact vehicle_code we
        # pinned, in the `id` column (CSV column index 0 in the 24-
        # column client format — see `CLIENT_FORMAT_COLUMNS`).
        rows = csv_content.splitlines()[1:]
        assert len(rows) == 1, f"Expected exactly one row (the pinned product), got {len(rows)}"
        columns = rows[0].split(";")
        assert columns[0] == pinned_code, (
            f"CSV id column must be the persisted vehicle_code "
            f"({pinned_code!r}), got {columns[0]!r}"
        )
        # The distinguishing VIN is still in the last column — proves
        # we are looking at OUR product, not a sibling row.
        assert columns[-1] == "VINDBGUARANTEED0001"

        # (2a) The per-row backfill primitive was NEVER called.
        assert backfill_calls == [], (
            "Use case must NOT call `update_vehicle_code_if_absent` "
            "anymore — the DB trigger installed by the enforce-"
            "vehicle_code_required migration guarantees vehicle_code "
            f"on every vehicle-category product. Calls observed: {backfill_calls!r}"
        )

        # (2b) The pre-loop MAX read that seeded the backfill allocation
        # was NEVER called. This is the assertion that fails today:
        # the use case still does
        #     base_vehicle_code = await self._product_repository.get_max_vehicle_code()
        # unconditionally on every export (line ~248 of the use case),
        # even when no product in the export needs backfilling. After
        # the migration, the entire backfill branch — including the MAX
        # read — must be removed.
        assert max_calls == [], (
            "Use case must NOT call `get_max_vehicle_code()` anymore — "
            "the read exists only to seed the per-export base code for "
            "runtime backfill, and that scaffolding is unreachable once "
            "the DB trigger guarantees vehicle_code on every product. "
            f"Calls observed: {len(max_calls)} call(s) during this export."
        )
