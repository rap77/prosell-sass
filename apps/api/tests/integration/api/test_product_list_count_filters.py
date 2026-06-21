"""Integration test — code review finding: list_products' `total` ignores filters.

`ListProductsUseCase.execute()` called `get_all()` with the full filter set
(category_id, is_featured, search_query, price range, attribute_filters) but
`count()` only ever received tenant_id/organization_id/status — so `total`
in the paginated response was the COUNT OF ALL PRODUCTS, not of the filtered
set, whenever any of the other filters were used.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def featured_and_unfeatured_products(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    """One featured, two non-featured products in the same tenant."""
    products = [
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Featured Product",
            price_cents=1_000_000,
            is_featured=True,
        ),
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Plain Product One",
            price_cents=1_500_000,
            is_featured=False,
        ),
        ProductModel(
            id=uuid4(),
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title="Plain Product Two",
            price_cents=2_000_000,
            is_featured=False,
        ),
    ]
    db_session.add_all(products)
    await db_session.flush()


@pytest.mark.asyncio
async def test_total_respects_is_featured_filter(
    async_client_as_seller: AsyncClient,
    featured_and_unfeatured_products: None,  # noqa: ARG001
) -> None:
    """`total` must count only the filtered (is_featured=true) rows, not all 3."""
    response = await async_client_as_seller.get(
        "/api/v1/products",
        params={"is_featured": "true"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["products"]) == 1
    assert body["total"] == 1


@pytest.mark.asyncio
async def test_total_respects_min_price_filter(
    async_client_as_seller: AsyncClient,
    featured_and_unfeatured_products: None,  # noqa: ARG001
) -> None:
    """`total` must count only the rows above min_price, not all 3."""
    response = await async_client_as_seller.get(
        "/api/v1/products",
        params={"min_price": 1_800_000},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["products"]) == 1
    assert body["total"] == 1
