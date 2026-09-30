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


def _make_product_without_vehicle_code(
    *,
    tenant_id: UUID,
    organization_id: UUID,
    category_id: UUID,
    vin: str | None = None,
    image_urls: list[str] | None = None,
) -> ProductModel:
    """A published product whose `attributes` deliberately omits the
    `vehicle_code` key — the exact pre-fix shape that used to produce a
    header-only client CSV. The backfill path must persist a code for
    this row and emit both the CSV row AND the image folder."""
    attributes: dict[str, object] = {
        "year": 2021,
        "make": "Honda",
        "model": "Civic",
        "mileage": 30000,
        "exterior_color": "Negro",
    }
    if vin is not None:
        attributes["vin"] = vin
    return ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        title="2021 Honda Civic",
        slug=f"2021-honda-civic-{uuid4().hex[:6]}",
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
class TestExportClientFormatVehicleCodeBackfill:
    """`export-vehicle-code-backfill` fix: a published product with no
    `vehicle_code` in `attributes` used to be dropped by the BR1.7-style
    guard (silent header-only CSV + missing images). The export now
    backfills a fresh code via the atomic
    `update_vehicle_code_if_absent` UPDATE and persists it durably in
    the JSONB column so the partial unique index
    `ix_products_attrs_vehicle_code_unique` enforces integrity across
    re-exports.
    """

    async def test_product_without_vehicle_code_is_included_with_persisted_code(
        self, shared_session: AsyncSession
    ) -> None:
        """(a) Backfill — one published product lacking `vehicle_code`
        yields a CSV row AND an image folder, and the code is
        durably persisted in `attributes->>'vehicle_code'`."""
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product = _make_product_without_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
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
        # Image folder emitted alongside the row (would be missing
        # under the old silent-skip behavior) — the ZIP layout is
        # `{org_segment}/{vehicle_folder}/<filename>`, so we look for
        # the file by basename instead of guessing the prefix.
        assert any(name.endswith("backfill-photo.jpg") for name in namelist)
        # Sanity: the CSV id column carries a positive integer we
        # backfilled (the test asserts >= 1, not a specific value,
        # because the global counter may have advanced across tests
        # in the same session).
        id_column = csv_content.splitlines()[1].split(";")[0]
        assert int(id_column) >= 1

        # Code is durably persisted on the row, so a subsequent
        # `get_max_vehicle_code()` would see it.
        await shared_session.refresh(product)
        persisted_code = (product.attributes or {}).get("vehicle_code")
        assert persisted_code is not None
        assert int(str(persisted_code).strip()) >= 1

    async def test_export_is_stable_across_two_consecutive_calls(
        self, shared_session: AsyncSession
    ) -> None:
        """(b) Stability — calling the export twice in a row yields the
        SAME `id` (vehicle_code) for the backfilled product and the
        SAME folder/file structure. The first call backfills and
        persists; the second call reads the persisted value and emits
        it again without re-allocating."""
        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        product = _make_product_without_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
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

        # Both exports must include the backfilled product, with the
        # SAME `id` column (CSV column index 0 in the 24-column
        # client format — see `CLIENT_FORMAT_COLUMNS`).
        for csv_content, label in ((csv_first, "first"), (csv_second, "second")):
            rows = csv_content.splitlines()[1:]
            assert len(rows) == 1, f"{label} export must contain exactly one row, got {len(rows)}"
            columns = rows[0].split(";")
            assert columns[0]  # `id` (vehicle_code) is non-empty
            assert int(columns[0]) >= 1
            assert columns[-1] == "VINSTABLE00000001"

        # Same product, same `id` across both exports — proves the
        # backfill was durable and the second export reuses it instead
        # of allocating a fresh one.
        id_first = csv_first.splitlines()[1].split(";")[0]
        id_second = csv_second.splitlines()[1].split(";")[0]
        assert id_first == id_second
        # Same folder/image structure too (the ZIP is byte-stable for
        # everything except the filename which contains a date suffix
        # the router builds — we only inspect body content here).
        assert namelist_first == namelist_second

    async def test_concurrent_backfill_serializes_safely(
        self, shared_session: AsyncSession
    ) -> None:
        """(c) Concurrency — sequential proof.

        The atomic `UPDATE ... WHERE attributes->>'vehicle_code' IS NULL`
        predicate serializes concurrent writers targeting the SAME
        product: exactly one observes `rowcount == 1`; every other
        observes `rowcount == 0` and re-reads the persisted value.
        This test exercises the loser's re-read branch in isolation by
        running two `update_vehicle_code_if_absent` calls against the
        same row and asserting both are safe (no exception, final
        value is one of the two offered codes).

        Documented limitation: true cross-process concurrency on a
        single row is hard to simulate in pytest without forking the
        process — the WHERE-clause atomicity guarantee is a PostgreSQL
        semantic, not an application-level invariant, and the rest of
        the export suite already covers the steady-state codepath. We
        additionally seed two products so the test also exercises the
        cross-product (multi-row) backfill path that the export loop
        takes per-iteration.
        """
        from prosell.infrastructure.repositories.product_repository_impl import (
            SqlAlchemyProductRepository,
        )

        org = await _create_org(shared_session)
        category = await _create_category(shared_session, org.tenant_id)
        # Seed TWO products lacking vehicle_code, both targeted at the
        # same export. The use case's per-product loop will try to
        # backfill each one in turn; cross-product collisions are not
        # expected because `base_code + i` is unique per i.
        product_a = _make_product_without_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vin="VINCONCURRENT0001A",
        )
        product_b = _make_product_without_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
            vin="VINCONCURRENT0001B",
        )
        shared_session.add(product_a)
        shared_session.add(product_b)
        await shared_session.flush()
        _authenticate_as(_auth_user(org))

        # Same-row concurrency: two backfill attempts against
        # `product_a`. The second MUST observe `rowcount == 0` and
        # silently no-op (loser's branch) — the WHERE-clause guard
        # makes the second write a no-op rather than a collision.
        repo = SqlAlchemyProductRepository(shared_session)
        first_won = await repo.update_vehicle_code_if_absent(product_a.id, 1001)
        second_won = await repo.update_vehicle_code_if_absent(product_a.id, 2002)

        assert first_won is True
        assert second_won is False  # WHERE clause blocked the second writer

        await shared_session.refresh(product_a)
        persisted_a = int(str((product_a.attributes or {})["vehicle_code"]))
        # The persisted value is the WINNER's offer (1001), not the
        # loser's (2002) — proves the loser's UPDATE was a no-op, not
        # an overwrite.
        assert persisted_a == 1001

        # Multi-row backfill through the actual export: both seeded
        # products need to land in the CSV. `product_b` is still NULL
        # at this point, so the export backfills it; `product_a`
        # already carries 1001 and rides through unchanged.
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip", params=_REQUIRED_EXPORT_PARAMS
            )
        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")
        assert "VINCONCURRENT0001A" in csv_content
        assert "VINCONCURRENT0001B" in csv_content

        # Both rows are durably persisted after the export
        await shared_session.refresh(product_a)
        await shared_session.refresh(product_b)
        assert int(str((product_a.attributes or {})["vehicle_code"])) == 1001
        assert (product_b.attributes or {}).get("vehicle_code") is not None

        # Sanity: the status filter still excludes non-published
        # products even if they lack a vehicle_code (defense in depth).
        draft = _make_product_without_vehicle_code(
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=category.id,
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
