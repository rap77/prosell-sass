"""Integration tests — GET /products/price-range.

Sizes the catalog's price range slider track. Must reflect the real
min/max `price_cents` for the caller's tenant (and whatever other filter
is active), never be clamped by its own output, and never leak another
tenant's price data.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def other_org_category(
    db_session: AsyncSession, second_organization: OrganizationModel
) -> CategoryModel:
    category = CategoryModel(
        id=uuid4(),
        name="Cross-tenant category",
        slug=f"cross-tenant-{uuid4().hex}",
        tenant_id=second_organization.tenant_id,
        level=0,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest.fixture
async def three_priced_products(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    products = [
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Cheapest",
            price_cents=500_000,
            published_to_marketplace=False,
        ),
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Middle",
            price_cents=1_500_000,
            published_to_marketplace=True,
        ),
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Most expensive",
            price_cents=3_000_000,
            published_to_marketplace=False,
        ),
    ]
    db_session.add_all(products)
    await db_session.flush()


@pytest.mark.asyncio
async def test_returns_the_real_min_and_max_price(
    async_client_as_seller: AsyncClient,
    three_priced_products: None,  # noqa: ARG001
) -> None:
    response = await async_client_as_seller.get("/api/v1/products/price-range")

    assert response.status_code == 200
    body = response.json()
    assert body["min_price_cents"] == 500_000
    assert body["max_price_cents"] == 3_000_000


@pytest.mark.asyncio
async def test_null_range_when_no_product_matches(
    async_client_as_seller: AsyncClient,
) -> None:
    """Empty catalog (no fixture seeded) — nothing to size a slider against."""
    response = await async_client_as_seller.get("/api/v1/products/price-range")

    assert response.status_code == 200
    body = response.json()
    assert body["min_price_cents"] is None
    assert body["max_price_cents"] is None


@pytest.mark.asyncio
async def test_narrows_to_the_other_active_filter(
    async_client_as_seller: AsyncClient,
    three_priced_products: None,  # noqa: ARG001
) -> None:
    """The ONE published-to-marketplace product costs 1_500_000 — the track
    must shrink to exactly that when published_to_marketplace=true is also
    applied, not stay at the full [500_000, 3_000_000] range.
    """
    response = await async_client_as_seller.get(
        "/api/v1/products/price-range",
        params={"published_to_marketplace": "true"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["min_price_cents"] == 1_500_000
    assert body["max_price_cents"] == 1_500_000


@pytest.mark.asyncio
async def test_does_not_leak_another_tenant_price_range(
    async_client_as_seller: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
    three_priced_products: None,  # noqa: ARG001
) -> None:
    """A product belonging to a DIFFERENT tenant, priced far outside the
    caller's own [500_000, 3_000_000] range, must never widen the caller's
    slider track.
    """
    other_tenant_product = ProductModel(
        id=uuid4(),
        tenant_id=second_organization.tenant_id,
        organization_id=second_organization.id,
        category_id=other_org_category.id,
        title="Other tenant's expensive product",
        price_cents=99_000_000,
        is_featured=False,
    )
    db_session.add(other_tenant_product)
    await db_session.flush()

    response = await async_client_as_seller.get("/api/v1/products/price-range")

    assert response.status_code == 200
    body = response.json()
    assert body["max_price_cents"] == 3_000_000
