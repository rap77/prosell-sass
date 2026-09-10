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
"""

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


async def _create_category(session: AsyncSession, tenant_id: UUID) -> CategoryModel:
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=tenant_id,
        name=f"Test Category {uuid4().hex[:6]}",
        slug=f"test-cat-{uuid4().hex[:8]}",
        level=0,
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
) -> ProductModel:
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
        attributes={
            "year": 2020,
            "make": "Ford",
            "model": "Explorer",
            "mileage": 70000,
            "exterior_color": "Gris",
        },
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
            response = await client.get("/api/v1/products/export-client-format.zip")

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
            response = await client.get("/api/v1/products/export-client-format.zip")

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
            response = await client.get("/api/v1/products/export-client-format.zip")

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
            response = await client.get("/api/v1/products/export-client-format.zip")

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
        category_a = await _create_category(shared_session, org_a.tenant_id)
        category_b = await _create_category(shared_session, org_b.tenant_id)

        product_a = _make_product(
            tenant_id=org_a.tenant_id,
            organization_id=org_a.id,
            category_id=category_a.id,
            title="Org A Vehicle",
        )
        product_b = _make_product(
            tenant_id=org_b.tenant_id,
            organization_id=org_b.id,
            category_id=category_b.id,
            title="Org B Vehicle",
        )
        shared_session.add(product_a)
        shared_session.add(product_b)
        await shared_session.flush()

        _authenticate_as(_auth_user(org_a))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/products/export-client-format.zip")

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")

        assert str(product_a.id) in csv_content
        assert str(product_b.id) not in csv_content


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
        )
        shared_session.add(target_product)
        await shared_session.flush()

        _authenticate_as(_auth_user(own_org))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/products/export-client-format.zip",
                params={"organization_id": str(target_org.tenant_id)},
            )

        assert response.status_code == 200
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            csv_content = archive.read("catalogo.csv").decode("utf-8")
        assert str(target_product.id) in csv_content

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
                params={"organization_id": str(other_org.tenant_id)},
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
                params={"organization_id": str(uuid4())},
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
                    params={"organization_id": str(target_org.tenant_id)},
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
                response = await client.get("/api/v1/products/export-client-format.zip")

        assert response.status_code == 200
        assert "Cross-org catalog export" not in caplog.text
