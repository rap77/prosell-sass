"""Tests for fb_sync_router endpoints.

Tests cover:
- X-Bot-Token authentication
- Tenant scoping (cross-tenant access blocked)
- Endpoint functionality
"""

from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

BOT_TOKEN = "test-bot-token-12345"


@pytest_asyncio.fixture
async def shared_session() -> AsyncGenerator[AsyncSession]:
    """Shared session for test data and endpoint."""
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        await session.rollback()

    await engine.dispose()


@pytest.fixture(name="_setup_override")
def setup_override(shared_session: AsyncSession, monkeypatch: pytest.MonkeyPatch):
    """Override session and bot token for tests."""

    async def _override() -> AsyncGenerator[AsyncSession]:
        yield shared_session

    app.dependency_overrides[get_async_session] = _override
    monkeypatch.setattr(
        "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
        BOT_TOKEN,
    )
    yield
    app.dependency_overrides.pop(get_async_session, None)


@pytest.fixture(name="_shared_session")
def shared_session_alias(shared_session: AsyncSession) -> AsyncSession:
    """Alias for shared_session when not directly used."""
    return shared_session


async def _create_tenant(session: AsyncSession) -> OrganizationModel:
    """Create a test organization/tenant."""
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


async def _create_category(session: AsyncSession, tenant_id: UUID) -> CategoryModel:
    """Create a test category."""
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=tenant_id,
        name=f"Test Category {uuid4().hex[:6]}",
        slug=f"test-cat-{uuid4().hex[:8]}",
        status="active",
        level=0,
    )
    session.add(cat)
    await session.flush()
    return cat


async def _create_fb_account(session: AsyncSession, tenant_id: UUID, email: str) -> FBAccountModel:
    """Create a test FB account."""
    account = FBAccountModel(
        id=uuid4(),
        tenant_id=tenant_id,
        email=email,
        password_encrypted="encrypted-password",
        status="active",
        browser="firefox",
        language="es",
    )
    session.add(account)
    await session.flush()
    return account


async def _create_product(
    session: AsyncSession,
    tenant_id: UUID,
    category_id: UUID,
    *,
    published_to_marketplace: bool = True,
) -> ProductModel:
    """Create a test product."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        category_id=category_id,
        title=f"Test Vehicle {uuid4().hex[:6]}",
        slug=f"test-vehicle-{uuid4().hex[:8]}",
        description="Test description",
        price_cents=1500000,
        currency="USD",
        status=ProductStatus.PUBLISHED,
        published_to_marketplace=published_to_marketplace,
        image_urls=["images/test.webp"],
        location_city="Miami",
        location_state="FL",
        condition="used",
        attributes={"year": 2020, "make": "Ford", "model": "Explorer"},
    )
    session.add(product)
    await session.flush()
    return product


class TestFbSyncAuth:
    """Tests for X-Bot-Token authentication."""

    async def test_missing_token_returns_401(self, _setup_override: None) -> None:
        """Request without X-Bot-Token should return 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/fb-sync/accounts")

        assert response.status_code == 401
        assert "Invalid or missing bot token" in response.json()["detail"]

    async def test_invalid_token_returns_401(self, _setup_override: None) -> None:
        """Request with wrong token should return 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/accounts",
                headers={"X-Bot-Token": "wrong-token"},
            )

        assert response.status_code == 401

    async def test_valid_token_passes(
        self, _shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Request with valid token should pass auth."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/accounts",
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        # 200 = auth passed (empty list is fine)
        assert response.status_code == 200
        assert response.json() == {"accounts": []}


class TestPendingEndpointTenantScoping:
    """Tests for /pending tenant isolation."""

    async def test_pending_returns_only_same_tenant_products(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Products from other tenants should NOT appear in /pending."""
        # Create two tenants
        tenant_a = await _create_tenant(shared_session)
        tenant_b = await _create_tenant(shared_session)

        # Create FB account in tenant A
        fb_account = await _create_fb_account(shared_session, tenant_a.tenant_id, "bot@tenanta.com")

        # Create categories
        cat_a = await _create_category(shared_session, tenant_a.tenant_id)
        cat_b = await _create_category(shared_session, tenant_b.tenant_id)

        # Create products: 1 in tenant A, 1 in tenant B
        product_a = await _create_product(shared_session, tenant_a.tenant_id, cat_a.id)
        await _create_product(shared_session, tenant_b.tenant_id, cat_b.id)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": fb_account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        products = response.json()["products"]

        # Should only see tenant A's product
        assert len(products) == 1
        assert products[0]["id"] == str(product_a.id)

    async def test_pending_unknown_account_returns_404(
        self, _shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Requesting with unknown email should return 404."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": "nonexistent@example.com"},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCallbackEndpointTenantScoping:
    """Tests for /callback tenant isolation."""

    async def test_callback_rejects_cross_tenant_publication(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Publishing to a product from different tenant should return 403."""
        # Create two tenants
        tenant_a = await _create_tenant(shared_session)
        tenant_b = await _create_tenant(shared_session)

        # FB account in tenant A
        fb_account = await _create_fb_account(shared_session, tenant_a.tenant_id, "bot@tenanta.com")

        # Product in tenant B
        cat_b = await _create_category(shared_session, tenant_b.tenant_id)
        product_b = await _create_product(shared_session, tenant_b.tenant_id, cat_b.id)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/fb-sync/callback",
                json={
                    "product_id": str(product_b.id),
                    "status": "published",
                    "account_email": fb_account.email,
                    "fb_post_id": "123456",
                },
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 403
        assert "tenant" in response.json()["detail"].lower()

    async def test_callback_accepts_same_tenant_publication(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Publishing to product in same tenant should succeed."""
        tenant = await _create_tenant(shared_session)
        fb_account = await _create_fb_account(shared_session, tenant.tenant_id, "bot@tenant.com")
        category = await _create_category(shared_session, tenant.tenant_id)
        product = await _create_product(shared_session, tenant.tenant_id, category.id)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/fb-sync/callback",
                json={
                    "product_id": str(product.id),
                    "status": "published",
                    "account_email": fb_account.email,
                    "fb_post_id": "123456",
                    "fb_groups": [{"position": 1, "fb_group_id": "111", "name": "Test"}],
                },
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "active"
        assert "publication_id" in data
