"""Integration tests -- published_to_marketplace is no longer PATCHable.

Marketplace-publish fusion (2026-08-21): the flag is now a pure consequence
of Product.approve()/reverse_publication() (see
docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md).
A client still sending the field on PATCH gets it silently ignored --
Pydantic drops unknown fields by default on this DTO (no `extra="forbid"`),
so this is NOT a breaking 422 for stale integrations.
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
    """Product belonging to the default test tenant, already published."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Marketplace Gate Product",
        price_cents=1_000_000,
        status="published",
        published_to_marketplace=False,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_patch_published_to_marketplace_is_ignored(
    async_client_as_admin: AsyncClient,
    own_tenant_product: ProductModel,
) -> None:
    """PATCH no longer accepts published_to_marketplace -- silently dropped."""
    response = await async_client_as_admin.patch(
        f"/api/v1/products/{own_tenant_product.id}",
        json={"published_to_marketplace": True},
    )

    assert response.status_code == 200
    assert response.json()["published_to_marketplace"] is False
