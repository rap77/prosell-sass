"""Integration tests for the archive endpoint's permission tightening.

Slice 9/10 of the reverse-transitions spec: archive() now requires
super_admin (was previously unrestricted -- any authenticated user with a
tenant could archive their tenant's products). Breaking change for
tenant_admins/sellers, called out in release notes.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


async def _create_product(
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
        status="draft",
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_archive_requires_super_admin(
    async_client_as_seller: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(db_session, test_organization, test_category)

    response = await async_client_as_seller.post(f"/api/v1/products/{product.id}/archive")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_archive_succeeds_for_super_admin(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(db_session, test_organization, test_category)

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/archive")

    assert response.status_code == 200
    assert response.json()["status"] == "archived"
