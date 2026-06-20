"""Integration tests -- Subsystem D Phase 3: marketplace publish permission gate.

Task 3.1 (RED): vendor with MARKETPLACE_PUBLISH can PATCH
    published_to_marketplace=true on any product.
Task 3.3 (RED): seller WITHOUT MARKETPLACE_PUBLISH cannot toggle the field (403).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def own_tenant_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    """Product belonging to the default test tenant."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Marketplace Gate Product",
        price_cents=1_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_admin_with_marketplace_publish_can_toggle_flag(
    async_client_as_admin: AsyncClient,
    own_tenant_product: ProductModel,
) -> None:
    """Task 3.1: vendor with MARKETPLACE_PUBLISH can publish any product."""
    response = await async_client_as_admin.patch(
        f"/api/v1/products/{own_tenant_product.id}",
        json={"published_to_marketplace": True},
    )

    assert response.status_code == 200
    assert response.json()["published_to_marketplace"] is True


@pytest.mark.asyncio
async def test_seller_without_marketplace_publish_cannot_toggle_flag(
    async_client_as_seller: AsyncClient,
    own_tenant_product: ProductModel,
) -> None:
    """Task 3.3: seller without MARKETPLACE_PUBLISH cannot toggle the flag."""
    response = await async_client_as_seller.patch(
        f"/api/v1/products/{own_tenant_product.id}",
        json={"published_to_marketplace": True},
    )

    assert response.status_code == 403
