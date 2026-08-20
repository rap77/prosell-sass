"""Prove-It test for a cross-tenant access gap in 6 single-product endpoints.

Found while manually testing on staging: prosellweb@gmail.com (super_admin,
tenant A) got 404 submitting a product that belongs to tenant B, even though
ProSell staff administer every organization's inventory today (the actual
business model — organizations don't yet have their own users). Every other
single-product endpoint in this router (get_product, pause, reserve,
mark_sold, and archive as of slice 9) already bypasses the tenant filter for
ORG_ADMIN_VIEW_ALL holders (super_admin, admin). These 6 didn't:
submit, approve, reject, publish, resume, and (pre-slice-9) archive.
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
    org: OrganizationModel,
    category: CategoryModel,
    *,
    status: str,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=category.id,
        title="Cross-tenant test vehicle",
        price_cents=1_000_000,
        status=status,
    )
    db_session.add(product)
    await db_session.flush()
    return product


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


@pytest.mark.asyncio
async def test_super_admin_submits_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="draft"
    )

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/submit")

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_super_admin_approves_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="pending"
    )

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/approve")

    assert response.status_code == 200
    assert response.json()["status"] == "published"


@pytest.mark.asyncio
async def test_super_admin_rejects_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="pending"
    )

    response = await async_client_as_admin.post(
        f"/api/v1/products/{product.id}/reject",
        json={"reason": "test"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_super_admin_publishes_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="pending"
    )

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/publish")

    assert response.status_code == 200
    assert response.json()["status"] == "published"


@pytest.mark.asyncio
async def test_super_admin_resumes_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="paused"
    )

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/resume")

    assert response.status_code == 200
    assert response.json()["status"] == "published"


@pytest.mark.asyncio
async def test_super_admin_archives_cross_tenant_product(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
    other_org_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, second_organization, other_org_category, status="draft"
    )

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/archive")

    assert response.status_code == 200
    assert response.json()["status"] == "archived"
