"""Integration regression test for GET /api/v1/products/export.csv (FEAT-1).

Covers the FR2.3/BR2.3 fix (u1-catalog-export-api): the exported
`image_folder_path` column must read the real `exterior_color` attribute
key, not a nonexistent `color` key. `build_image_folder_name()` itself was
never buggy — the regression lived at the `export_catalog_csv()` call
site in `product_router.py` — so this test exercises that call site over
HTTP rather than testing the pure function in isolation (see
code-generation-plan.md Step 5 and `tests/unit/services/test_csv_export.py`
for the function-level coverage).
"""

import csv
import io
from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest_asyncio.fixture
async def shared_session() -> AsyncGenerator[AsyncSession]:
    """Shared session so test setup and the endpoint see the same data.

    Same pattern as `test_public_product_router.py`'s `shared_session`.
    """
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        await session.rollback()

    await engine.dispose()


async def _create_test_org(session: AsyncSession) -> OrganizationModel:
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name=f"Test Org {uuid4().hex[:8]}",
        status="active",
        settings={},
    )
    session.add(org)
    await session.flush()
    return org


async def _create_test_category(session: AsyncSession, tenant_id: UUID) -> CategoryModel:
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


@pytest_asyncio.fixture
async def org(shared_session: AsyncSession) -> OrganizationModel:
    return await _create_test_org(shared_session)


@pytest.fixture
def auth_user(org: OrganizationModel) -> User:
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


@pytest.fixture
def setup_override(shared_session: AsyncSession, auth_user: User):
    """Override auth + DB session so the app sees `auth_user` and test data."""

    async def _override_db() -> AsyncGenerator[AsyncSession]:
        yield shared_session

    app.dependency_overrides[get_async_session] = _override_db
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: auth_user
    yield
    app.dependency_overrides.pop(get_async_session, None)
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestExportCatalogCsvRegression:
    """GET /api/v1/products/export.csv — FR2.3/BR2.3 regression."""

    async def test_image_folder_path_uses_exterior_color(
        self,
        shared_session: AsyncSession,
        org: OrganizationModel,
    ) -> None:
        cat = await _create_test_category(shared_session, org.tenant_id)
        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="2020 Ford Explorer",
            slug=f"ford-explorer-{uuid4().hex[:6]}",
            description=None,
            price_cents=1780000,
            currency="USD",
            status=ProductStatus.PUBLISHED.value,
            image_urls=[],
            condition="used",
            attributes={
                "year": 2020,
                "make": "Ford",
                "model": "Explorer",
                "mileage": 70000,
                "exterior_color": "Gris",
            },
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/products/export.csv?category_id={cat.id}")

        assert response.status_code == 200
        reader = csv.reader(io.StringIO(response.text))
        rows = list(reader)
        headers = rows[0]
        data_row = rows[1]
        image_folder_path = data_row[headers.index("image_folder_path")]

        # BR2.3 — the color segment comes from `exterior_color`, not a
        # nonexistent `color` key (which would silently drop the segment).
        assert "GRIS" in image_folder_path

    async def test_image_folder_path_drops_color_segment_without_exterior_color(
        self,
        shared_session: AsyncSession,
        org: OrganizationModel,
    ) -> None:
        """Sanity check: a product with no `exterior_color` attribute at
        all still exports successfully — the color segment is just
        omitted, matching `build_image_folder_name()`'s documented
        "drop missing parts" behavior. This is the expected degradation,
        distinct from the FR2.3 bug (which silently dropped the segment
        even when `exterior_color` WAS present, because it looked up the
        wrong key).
        """
        cat = await _create_test_category(shared_session, org.tenant_id)
        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="2019 Toyota Camry",
            slug=f"toyota-camry-{uuid4().hex[:6]}",
            description=None,
            price_cents=1500000,
            currency="USD",
            status=ProductStatus.PUBLISHED.value,
            image_urls=[],
            condition="used",
            attributes={"year": 2019, "make": "Toyota", "model": "Camry", "mileage": 40000},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/products/export.csv?category_id={cat.id}")

        assert response.status_code == 200
        reader = csv.reader(io.StringIO(response.text))
        rows = list(reader)
        headers = rows[0]
        data_row = rows[1]
        image_folder_path = data_row[headers.index("image_folder_path")]

        assert image_folder_path == "2019-TOYOTA-CAMRY-40K"
