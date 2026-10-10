"""Tests for public product router (no authentication required).

These tests use the integration test database (prosell_test on port 5433).
Uses a shared connection pattern so the endpoint can see test data without commits.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import get_spaces_service
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest_asyncio.fixture
async def shared_session() -> AsyncGenerator[AsyncSession]:
    """Create a shared session for test data and endpoint to use.

    Both test setup and the endpoint override use the SAME session,
    so the endpoint can see flushed (but uncommitted) data.
    """
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        # Rollback on exit to clean up test data
        await session.rollback()

    await engine.dispose()


@pytest.fixture
def setup_override(shared_session: AsyncSession):
    """Override get_async_session to return the shared test session.

    This lets the endpoint see flushed data from the test without commits.
    """

    async def _override() -> AsyncGenerator[AsyncSession]:
        yield shared_session

    app.dependency_overrides[get_async_session] = _override
    yield
    app.dependency_overrides.pop(get_async_session, None)


async def _create_test_org(session: AsyncSession) -> OrganizationModel:
    """Create a test organization for FK constraints."""
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
    """Create a test category for FK constraints."""
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


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestPublicProductRouter:
    """Test GET /api/v1/public/products/{slug} and /image-urls endpoints."""

    async def test_get_published_product_returns_product(self, shared_session: AsyncSession):
        """GET /{slug} returns published product with marketplace=true."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Toyota Corolla 2022",
            slug=f"toyota-corolla-2022-{uuid4().hex[:6]}",
            description="Clean car, low mileage",
            price_cents=2500000,
            currency="USD",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg"],
            cover_image_key="car-front.jpg",
            location_city="Caracas",
            location_state="Distrito Capital",
            view_count=5,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()
        initial_view_count = product.view_count

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Toyota Corolla 2022"
        assert data["slug"] == product.slug
        assert data["price_cents"] == 2500000
        assert data["status"] == ProductStatus.PUBLISHED.value
        assert data["published_to_marketplace"] is True
        # ponytail: use relative check, not absolute — avoids flakiness from shared DB
        assert data["view_count"] == initial_view_count + 1

    async def test_get_product_not_found(self) -> None:
        """GET /{slug} returns 404 when product doesn't exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products/nonexistent-slug")

        assert response.status_code == 404
        assert "Product not found" in response.json()["detail"]

    async def test_get_unpublished_product_still_accessible_via_slug(
        self, shared_session: AsyncSession
    ):
        """GET /{slug} returns product even when status != published.

        Any product with a slug is accessible - slug acts as secret link.
        """
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Unpublished Car",
            slug=f"unpublished-car-{uuid4().hex[:6]}",
            price_cents=1500000,
            status=ProductStatus.DRAFT.value,
            published_to_marketplace=True,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200
        assert response.json()["title"] == "Unpublished Car"

    async def test_get_not_marketplace_product_still_accessible_via_slug(
        self, shared_session: AsyncSession
    ):
        """GET /{slug} returns product even when published_to_marketplace=false.

        Any product with a slug is accessible - slug acts as secret link.
        """
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Internal Only Car",
            slug=f"internal-only-{uuid4().hex[:6]}",
            price_cents=1800000,
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=False,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200
        assert response.json()["title"] == "Internal Only Car"

    async def test_get_product_increments_view_count(self, shared_session: AsyncSession):
        """GET /{slug} increments view_count."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Test Car",
            slug=f"view-count-{uuid4().hex[:6]}",
            price_cents=2000000,
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            view_count=10,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()
        initial_view_count = product.view_count

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = None
            for _ in range(3):
                response = await client.get(f"/api/v1/public/products/{product.slug}")
                assert response.status_code == 200

        # The endpoint increments view_count each time
        # ponytail: use relative check — started at initial, incremented 3x
        assert response is not None
        assert response.json()["view_count"] == initial_view_count + 3

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_returns_signed_urls(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls returns signed URLs for WhatsApp/OG sharing."""
        mock_spaces = AsyncMock()
        # Signed URLs have expiration params
        mock_spaces.generate_download_url.side_effect = [
            "https://nyc3.digitaloceanspaces.com/prosell-assets/car-front.jpg?X-Amz-Signature=abc123",
            "https://nyc3.digitaloceanspaces.com/prosell-assets/car-side.jpg?X-Amz-Signature=def456",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Image Test Car",
            slug=f"image-test-{uuid4().hex[:6]}",
            price_cents=2200000,
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg"],
            cover_image_key="car-front.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 2
        assert data["images"][0]["key"] == "car-front.jpg"
        # Signed URLs for WhatsApp - 7 days expiration (S3 SigV4 max)
        assert "X-Amz-Signature=" in data["images"][0]["url"]
        assert data["images"][0]["expires_in"] == 604800  # 7 days
        assert data["images"][1]["key"] == "car-side.jpg"

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_cover_image_first_when_separate(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls puts cover_image first if not in image_urls."""
        mock_spaces = AsyncMock()
        mock_spaces.get_public_url.side_effect = [
            "https://do.spaces.com/cover-signed",
            "https://do.spaces.com/other1-signed",
            "https://do.spaces.com/other2-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Cover Test Car",
            slug=f"cover-test-{uuid4().hex[:6]}",
            price_cents=2300000,
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["other-image-1.jpg", "other-image-2.jpg"],
            cover_image_key="cover-image.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        assert data["images"][0]["key"] == "cover-image.jpg"

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_reorders_cover_to_first(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls moves cover to first position when it's in the list."""
        mock_spaces = AsyncMock()
        mock_spaces.get_public_url.side_effect = [
            "https://do.spaces.com/car-side-signed",
            "https://do.spaces.com/car-front-signed",
            "https://do.spaces.com/car-back-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Reorder Cover Car",
            slug=f"reorder-cover-{uuid4().hex[:6]}",
            price_cents=2400000,
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg", "car-back.jpg"],
            cover_image_key="car-side.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        assert data["images"][0]["key"] == "car-side.jpg"
        assert data["images"][1]["key"] == "car-front.jpg"
        assert data["images"][2]["key"] == "car-back.jpg"
        assert data["cover_image_key"] == "car-side.jpg"

    async def test_get_product_image_urls_not_found(self) -> None:
        """GET /{slug}/image-urls returns 404 if product doesn't exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products/nonexistent/image-urls")

        assert response.status_code == 404

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_works_for_draft(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls works for draft products (slug = secret link)."""
        mock_spaces = AsyncMock()
        mock_spaces.get_public_url.return_value = "https://do.spaces.com/signed"
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=cat.id,
            title="Draft Car",
            slug=f"draft-image-{uuid4().hex[:6]}",
            price_cents=1200000,
            status=ProductStatus.DRAFT.value,
            published_to_marketplace=True,
            image_urls=["img.jpg"],
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200


async def _create_published_listing_product(
    session: AsyncSession,
    org: OrganizationModel,
    cat: CategoryModel,
    *,
    title: str,
    price_cents: int,
    status_value: str = ProductStatus.PUBLISHED.value,
    image_urls: list[str] | None = None,
    cover_image_key: str | None = None,
) -> ProductModel:
    """Create one listing product with a unique slug for the shared DB."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=cat.id,
        title=title,
        slug=f"listing-{title.lower().replace(' ', '-')}-{uuid4().hex[:6]}",
        price_cents=price_cents,
        currency="USD",
        status=status_value,
        published_to_marketplace=True,
        image_urls=image_urls or [],
        cover_image_key=cover_image_key,
        location_city="Caracas",
        # Valid ProductCondition enum value — this helper's products DO get
        # validated as domain entities by the listing endpoint (get_all →
        # Product.model_validate), unlike the /{slug} tests above which query
        # the model directly. An invalid value ('good') would 422 the listing.
        condition="used",
        attributes={},
    )
    session.add(product)
    await session.flush()
    return product


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestPublicProductsListing:
    """Test GET /api/v1/public/products — the public catalog listing (4.6).

    The public catalog shows every tenant's PUBLISHED products, without
    authentication, behind a DTO that structurally cannot carry
    tenant_id/organization_id (§4 sanitization from day one).
    """

    async def test_listing_returns_published_only_sanitized(self, shared_session: AsyncSession):
        """Published products from every tenant; drafts never; items carry
        NO raw tenant/organization identifiers."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        published_a = await _create_published_listing_product(
            shared_session,
            org,
            cat,
            title="Published Car A",
            price_cents=2500000,
            image_urls=["car-a.jpg", "car-b.jpg"],
            cover_image_key="car-a.jpg",
        )
        published_b = await _create_published_listing_product(
            shared_session, org, cat, title="Published Car B", price_cents=1800000
        )
        draft = await _create_published_listing_product(
            shared_session,
            org,
            cat,
            title="Hidden Draft",
            price_cents=1000000,
            status_value=ProductStatus.DRAFT.value,
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products")

        assert response.status_code == 200
        data = response.json()
        # ponytail: relative check, not absolute — the shared DB carries
        # real published products from other tests/seed data
        assert data["total"] >= 2
        slugs = {item["slug"] for item in data["items"]}
        assert published_a.slug in slugs
        assert published_b.slug in slugs
        assert draft.slug not in slugs
        first = next(item for item in data["items"] if item["slug"] == published_a.slug)
        # §4 sanitization: no raw tenant/organization identifiers on the public list
        assert "tenant_id" not in first
        assert "organization_id" not in first
        assert "org_code" not in first

    async def test_listing_includes_signed_cover_url(self, shared_session: AsyncSession):
        """Each item with images carries one signed cover URL."""
        mock_spaces = AsyncMock()
        mock_spaces.generate_cdn_download_url.return_value = "https://cdn.example.com/signed"
        # dependency_overrides, NOT @patch: the `SpacesService` Annotated alias
        # captures the original callable at import time, so patching the module
        # attribute never reaches the dependency — the real service signed
        # instead of the mock (proven during 4.6's red/green cycle).
        app.dependency_overrides[get_spaces_service] = lambda: mock_spaces
        try:
            await self._assert_signed_cover(shared_session)
        finally:
            app.dependency_overrides.pop(get_spaces_service, None)

    async def _assert_signed_cover(self, shared_session: AsyncSession) -> None:
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        product = await _create_published_listing_product(
            shared_session,
            org,
            cat,
            title="Covered Car",
            price_cents=2200000,
            # Realistic storage key under the org's tenant prefix — the
            # cover signer's tenant-prefix defense requires it (a bare
            # key like "car-front.jpg" is correctly rejected).
            image_urls=[f"orgs/{org.tenant_id}/car-front.jpg"],
            cover_image_key=f"orgs/{org.tenant_id}/car-front.jpg",
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        items_by_slug = {item["slug"]: item for item in data["items"]}
        assert items_by_slug[product.slug]["cover_url"] == "https://cdn.example.com/signed"

    async def test_listing_search_filter(self, shared_session: AsyncSession):
        """?search= narrows the listing by title/description match."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        # Unique search token — the shared DB carries unrelated products,
        # so the term must only match the product created here.
        unique_token = uuid4().hex[:12]
        matching = await _create_published_listing_product(
            shared_session,
            org,
            cat,
            title=f"Corolla {unique_token}",
            price_cents=2000000,
        )
        await _create_published_listing_product(
            shared_session, org, cat, title=f"Hilux {uuid4().hex[:12]}", price_cents=3000000
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products?search={unique_token}")

        assert response.status_code == 200
        data = response.json()
        slugs = {item["slug"] for item in data["items"]}
        assert matching.slug in slugs
        assert all(unique_token in item["title"] for item in data["items"])

    async def test_listing_pagination(self, shared_session: AsyncSession):
        """skip/limit paginate; total reflects the full published count."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        for idx in range(3):
            await _create_published_listing_product(
                shared_session, org, cat, title=f"Paged Car {idx}", price_cents=1000000 + idx
            )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products?limit=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        # ponytail: relative check, not absolute — the shared DB carries
        # real published products from other tests/seed data
        assert data["total"] >= 3
        assert data["limit"] == 2

    async def test_listing_condition_filter(self, shared_session: AsyncSession):
        """?condition= narrows the listing by the ProductCondition enum."""
        org = await _create_test_org(shared_session)
        cat = await _create_test_category(shared_session, org.tenant_id)

        new_car = await _create_published_listing_product(
            shared_session,
            org,
            cat,
            title=f"New Car {uuid4().hex[:8]}",
            price_cents=4000000,
        )
        # Override the helper's default condition for the used variant.
        used_car = await _create_published_listing_product(
            shared_session, org, cat, title=f"Used Car {uuid4().hex[:8]}", price_cents=1500000
        )
        used_car.condition = "new"
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products?condition=used")

        assert response.status_code == 200
        data = response.json()
        slugs = {item["slug"] for item in data["items"]}
        assert new_car.slug in slugs
        assert used_car.slug not in slugs

    async def test_listing_sanitized_on_every_item(self):
        """No item in the listing ever carries raw tenant/organization
        identifiers — even products created by other tests/seed data."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products?limit=100")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        for item in data["items"]:
            assert "tenant_id" not in item
            assert "organization_id" not in item
            assert "org_code" not in item
            assert item["status"] == ProductStatus.PUBLISHED.value
