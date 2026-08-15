"""Tests for fb_sync_router endpoints.

Tests cover:
- X-Bot-Token authentication
- Tenant scoping (cross-tenant access blocked)
- Endpoint functionality
"""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import (
    FBAccountModel,
    FBPublicationHistoryModel,
    FBPublicationStatusModel,
    product_fb_account_assignments,
)
from prosell.infrastructure.models.fb_unpublish_request_model import FBUnpublishRequestModel
from prosell.infrastructure.models.marketplace_publication_model import (
    MarketplacePublicationModel,
)
from prosell.infrastructure.models.organization_marketplace_access_model import (
    OrganizationMarketplaceAccessModel,
)
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


async def _create_category(
    session: AsyncSession,
    tenant_id: UUID,
    *,
    parent_id: UUID | None = None,
    level: int = 0,
) -> CategoryModel:
    """Create a test category."""
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=tenant_id,
        name=f"Test Category {uuid4().hex[:6]}",
        slug=f"test-cat-{uuid4().hex[:8]}",
        level=level,
        parent_id=parent_id,
    )
    session.add(cat)
    await session.flush()
    return cat


async def _create_fb_account(session: AsyncSession, tenant_id: UUID, email: str) -> FBAccountModel:
    """Create a test FB account."""
    local_part, domain = email.split("@", maxsplit=1)
    account = FBAccountModel(
        id=uuid4(),
        tenant_id=tenant_id,
        email=f"{local_part}+{uuid4().hex[:8]}@{domain}",
        password_encrypted=b"encrypted-password",
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
    organization_id: UUID | None = None,
    published_to_marketplace: bool = True,
    status: ProductStatus = ProductStatus.PUBLISHED,
) -> ProductModel:
    """Create a test product."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=organization_id or tenant_id,
        category_id=category_id,
        title=f"Test Vehicle {uuid4().hex[:6]}",
        slug=f"test-vehicle-{uuid4().hex[:8]}",
        description="Test description",
        price_cents=1500000,
        currency="USD",
        status=status,
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

        # 200 = auth passed. The shared integration DB can contain seed accounts.
        assert response.status_code == 200
        assert "accounts" in response.json()


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
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [{"product_id": product_a.id, "fb_account_id": fb_account.id}],
        )

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

    async def test_pending_returns_only_assigned_authorized_dealer_inventory(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """A ProSell account only receives assigned products from authorized dealers."""
        prosell = await _create_tenant(shared_session)
        authorized_dealer = await _create_tenant(shared_session)
        unauthorized_dealer = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, prosell.tenant_id, "seller@prosell.com")

        authorized_category = await _create_category(shared_session, authorized_dealer.tenant_id)
        unauthorized_category = await _create_category(
            shared_session, unauthorized_dealer.tenant_id
        )
        authorized_product = await _create_product(
            shared_session,
            authorized_dealer.tenant_id,
            authorized_category.id,
            organization_id=authorized_dealer.id,
        )
        unauthorized_product = await _create_product(
            shared_session,
            unauthorized_dealer.tenant_id,
            unauthorized_category.id,
            organization_id=unauthorized_dealer.id,
        )
        shared_session.add(
            OrganizationMarketplaceAccessModel(
                inventory_owner_organization_id=authorized_dealer.id,
                operator_organization_id=prosell.id,
                can_manage_inventory=True,
                can_publish_marketplace=True,
                status="active",
            )
        )
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [
                {"product_id": authorized_product.id, "fb_account_id": account.id},
                {"product_id": unauthorized_product.id, "fb_account_id": account.id},
            ],
        )
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert [product["id"] for product in response.json()["products"]] == [
            str(authorized_product.id)
        ]


class TestMarketplaceAccessGrantLifecycle:
    """Tests for marketplace access grant status lifecycle in /pending."""

    async def test_pending_grant_does_not_authorize_dealer_products(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Products from dealers with pending grants should NOT appear in /pending."""
        prosell = await _create_tenant(shared_session)
        dealer = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, prosell.tenant_id, "bot@prosell.com")

        category = await _create_category(shared_session, dealer.tenant_id)
        product = await _create_product(
            shared_session,
            dealer.tenant_id,
            category.id,
            organization_id=dealer.id,
        )
        # Grant exists but status is "pending" (not yet approved)
        shared_session.add(
            OrganizationMarketplaceAccessModel(
                inventory_owner_organization_id=dealer.id,
                operator_organization_id=prosell.id,
                can_manage_inventory=True,
                can_publish_marketplace=True,
                status="pending",  # NOT active
            )
        )
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [{"product_id": product.id, "fb_account_id": account.id}],
        )
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        # Product should NOT appear because grant is pending
        assert response.json()["products"] == []

    async def test_revoked_grant_blocks_dealer_products(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Products from dealers with revoked grants should NOT appear in /pending."""
        prosell = await _create_tenant(shared_session)
        dealer = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, prosell.tenant_id, "bot@prosell.com")

        category = await _create_category(shared_session, dealer.tenant_id)
        product = await _create_product(
            shared_session,
            dealer.tenant_id,
            category.id,
            organization_id=dealer.id,
        )
        # Grant was active but now revoked
        shared_session.add(
            OrganizationMarketplaceAccessModel(
                inventory_owner_organization_id=dealer.id,
                operator_organization_id=prosell.id,
                can_manage_inventory=True,
                can_publish_marketplace=True,
                status="revoked",  # Revoked access
            )
        )
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [{"product_id": product.id, "fb_account_id": account.id}],
        )
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        # Product should NOT appear because grant is revoked
        assert response.json()["products"] == []

    async def test_can_manage_inventory_without_publish_permission_blocks_products(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Active grants without can_publish_marketplace should NOT authorize publishing."""
        prosell = await _create_tenant(shared_session)
        dealer = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, prosell.tenant_id, "bot@prosell.com")

        category = await _create_category(shared_session, dealer.tenant_id)
        product = await _create_product(
            shared_session,
            dealer.tenant_id,
            category.id,
            organization_id=dealer.id,
        )
        # Grant is active and can manage inventory, but CANNOT publish to marketplace
        shared_session.add(
            OrganizationMarketplaceAccessModel(
                inventory_owner_organization_id=dealer.id,
                operator_organization_id=prosell.id,
                can_manage_inventory=True,
                can_publish_marketplace=False,  # No publish permission
                status="active",
            )
        )
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [{"product_id": product.id, "fb_account_id": account.id}],
        )
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        # Product should NOT appear because can_publish_marketplace is False
        assert response.json()["products"] == []


class TestOrganizationAndVerticalFilters:
    """Tests for dashboard filter options resolved from the selected account."""

    async def test_organizations_include_the_account_operator_organization(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """The bot can select its own organization even without dealer access."""
        tenant = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, tenant.tenant_id, "owner@tenant.com")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/organizations",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert response.json()["organizations"] == [
            {"id": str(tenant.id), "name": tenant.name, "code": tenant.code}
        ]

    async def test_verticals_include_only_published_product_categories(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Draft product categories are not presented as publishable verticals."""
        tenant = await _create_tenant(shared_session)
        account = await _create_fb_account(shared_session, tenant.tenant_id, "verticals@tenant.com")
        published_vertical = await _create_category(shared_session, tenant.tenant_id)
        published_category = await _create_category(
            shared_session,
            tenant.tenant_id,
            parent_id=published_vertical.id,
            level=1,
        )
        draft_category = await _create_category(shared_session, tenant.tenant_id)
        published_product = await _create_product(
            shared_session, tenant.tenant_id, published_category.id
        )
        draft_product = await _create_product(
            shared_session,
            tenant.tenant_id,
            draft_category.id,
            status=ProductStatus.DRAFT,
        )
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [
                {"product_id": published_product.id, "fb_account_id": account.id},
                {"product_id": draft_product.id, "fb_account_id": account.id},
            ],
        )

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/verticals",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )
            pending_response = await client.get(
                "/api/v1/fb-sync/pending",
                params={"account_email": account.email, "category": published_vertical.slug},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert response.json()["verticals"] == [
            {"slug": published_vertical.slug, "name": published_vertical.name}
        ]

        assert pending_response.status_code == 200
        assert [product["id"] for product in pending_response.json()["products"]] == [
            str(published_product.id)
        ]


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
        assert "not authorized" in response.json()["detail"].lower()

    async def test_callback_accepts_same_tenant_publication(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Publishing to product in same tenant should succeed."""
        tenant = await _create_tenant(shared_session)
        fb_account = await _create_fb_account(shared_session, tenant.tenant_id, "bot@tenant.com")
        category = await _create_category(shared_session, tenant.tenant_id)
        product = await _create_product(shared_session, tenant.tenant_id, category.id)
        await shared_session.execute(
            product_fb_account_assignments.insert(),
            [{"product_id": product.id, "fb_account_id": fb_account.id}],
        )

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


class TestUnpublishEndpoints:
    """Tests for the bot-facing durable Facebook removal queue."""

    async def test_pending_requires_bot_token(self, _setup_override: None) -> None:
        """The removal queue is unavailable without the bot credential."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/unpublish-pending",
                params={"account_email": "bot@example.com"},
            )

        assert response.status_code == 401

    async def test_pending_returns_only_queued_requests_for_active_account(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """An account can only poll its own queued removal work."""
        tenant = await _create_tenant(shared_session)
        category = await _create_category(shared_session, tenant.tenant_id)
        account = await _create_fb_account(shared_session, tenant.tenant_id, "bot@tenant.com")
        other_account = await _create_fb_account(
            shared_session, tenant.tenant_id, "other@tenant.com"
        )
        product = await _create_product(shared_session, tenant.tenant_id, category.id)
        other_product = await _create_product(shared_session, tenant.tenant_id, category.id)
        publication_status = FBPublicationStatusModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            fb_account_id=account.id,
            status="active",
        )
        other_publication_status = FBPublicationStatusModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=other_product.id,
            fb_account_id=other_account.id,
            status="active",
        )
        queued_request = FBUnpublishRequestModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            publication_status_id=publication_status.id,
            fb_account_id=account.id,
            fb_post_id="listing-1",
        )
        other_request = FBUnpublishRequestModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=other_product.id,
            publication_status_id=other_publication_status.id,
            fb_account_id=other_account.id,
            fb_post_id="listing-2",
        )
        shared_session.add_all(
            [
                publication_status,
                other_publication_status,
                queued_request,
                other_request,
            ]
        )
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/fb-sync/unpublish-pending",
                params={"account_email": account.email},
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert response.json()["requests"] == [
            {
                "id": str(queued_request.id),
                "product_id": str(product.id),
                "fb_post_id": "listing-1",
                "attempt_count": 0,
            }
        ]

    async def test_completed_callback_updates_all_publication_records_idempotently(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """A completed removal updates every publication projection exactly once."""
        tenant = await _create_tenant(shared_session)
        category = await _create_category(shared_session, tenant.tenant_id)
        account = await _create_fb_account(shared_session, tenant.tenant_id, "bot@tenant.com")
        product = await _create_product(shared_session, tenant.tenant_id, category.id)
        publication_status = FBPublicationStatusModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            fb_account_id=account.id,
            status="active",
        )
        unpublish_request = FBUnpublishRequestModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            publication_status_id=publication_status.id,
            fb_account_id=account.id,
            fb_post_id="listing-1",
        )
        publication = MarketplacePublicationModel(
            id=uuid4(),
            product_id=product.id,
            tenant_id=tenant.tenant_id,
            account_email=account.email,
            fb_groups=[],
            fb_post_id="listing-1",
            published_at=datetime.now(UTC),
            expires_at=datetime.now(UTC),
            status="active",
        )
        shared_session.add_all([publication_status, unpublish_request, publication])
        await shared_session.flush()

        payload = {
            "request_id": str(unpublish_request.id),
            "account_email": account.email,
            "status": "completed",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/fb-sync/unpublish-callback",
                json=payload,
                headers={"X-Bot-Token": BOT_TOKEN},
            )
            repeated_response = await client.post(
                "/api/v1/fb-sync/unpublish-callback",
                json=payload,
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert repeated_response.status_code == 200
        await shared_session.refresh(unpublish_request)
        await shared_session.refresh(publication_status)
        await shared_session.refresh(publication)
        history = (
            (
                await shared_session.execute(
                    select(FBPublicationHistoryModel).where(
                        FBPublicationHistoryModel.product_id == product.id,
                        FBPublicationHistoryModel.event_type == "deleted",
                    )
                )
            )
            .scalars()
            .all()
        )
        assert unpublish_request.status == "completed"
        assert publication_status.status == "deleted"
        assert publication_status.last_deleted_at is not None
        assert publication.status == "deleted"
        assert publication.deleted_at is not None
        assert len(history) == 1

    async def test_failed_callback_keeps_request_queued_with_capped_attempt_count(
        self, shared_session: AsyncSession, _setup_override: None
    ) -> None:
        """Failures remain retryable without allowing an unbounded counter."""
        tenant = await _create_tenant(shared_session)
        category = await _create_category(shared_session, tenant.tenant_id)
        account = await _create_fb_account(shared_session, tenant.tenant_id, "bot@tenant.com")
        product = await _create_product(shared_session, tenant.tenant_id, category.id)
        publication_status = FBPublicationStatusModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            fb_account_id=account.id,
            status="active",
        )
        unpublish_request = FBUnpublishRequestModel(
            id=uuid4(),
            tenant_id=tenant.tenant_id,
            product_id=product.id,
            publication_status_id=publication_status.id,
            fb_account_id=account.id,
            fb_post_id="listing-1",
            attempt_count=2,
        )
        shared_session.add_all([publication_status, unpublish_request])
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/fb-sync/unpublish-callback",
                json={
                    "request_id": str(unpublish_request.id),
                    "account_email": account.email,
                    "status": "failed",
                    "error": "Facebook session expired",
                },
                headers={"X-Bot-Token": BOT_TOKEN},
            )
            repeated_response = await client.post(
                "/api/v1/fb-sync/unpublish-callback",
                json={
                    "request_id": str(unpublish_request.id),
                    "account_email": account.email,
                    "status": "failed",
                    "error": "Facebook session expired again",
                },
                headers={"X-Bot-Token": BOT_TOKEN},
            )

        assert response.status_code == 200
        assert repeated_response.status_code == 200
        await shared_session.refresh(unpublish_request)
        assert unpublish_request.status == "queued"
        assert unpublish_request.attempt_count == 3
        assert unpublish_request.last_error == "Facebook session expired again"
