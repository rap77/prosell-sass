"""Integration tests -- approving a product auto-enables marketplace publish.

Covers the fusion design: docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


async def _create_pending_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1_000_000,
        status="pending",
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_approve_endpoint_enables_marketplace_publish(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_pending_product(db_session, test_organization, test_category)

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/approve")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "published"
    assert data["published_to_marketplace"] is True


@pytest.mark.asyncio
async def test_batch_approve_enables_marketplace_publish(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_pending_product(db_session, test_organization, test_category)

    response = await async_client_as_admin.post(
        "/api/v1/products/batch/approve",
        json={"product_ids": [str(product.id)]},
    )

    assert response.status_code == 200
    assert response.json()["approved_count"] == 1

    repo = SqlAlchemyProductRepository(db_session)
    approved = await repo.get_by_id(product.id, test_organization.tenant_id)
    assert approved is not None
    assert approved.published_to_marketplace is True
