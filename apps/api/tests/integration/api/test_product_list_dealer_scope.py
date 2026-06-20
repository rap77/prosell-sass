"""Integration tests — Subsystem D Phase 2: admin dealer-scope bypass on product list.

Task 2.1 (RED): admin (DEALER_ADMIN_VIEW_ALL) sees products across ALL tenants.
Task 2.3 (RED): seller (no DEALER_ADMIN_VIEW_ALL) stays scoped to own tenant — regression.
Task 2.4 (RED): seller passing ?organization_id=<other tenant> gets 403 (IDOR guard).
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
    """Product belonging to the default test tenant (org A)."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Org A Product",
        price_cents=1_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.fixture
async def other_tenant_product(db_session: AsyncSession) -> ProductModel:
    """Product belonging to a SECOND, unrelated tenant (org B)."""
    org_b_id = uuid4()
    org_b = OrganizationModel(
        id=org_b_id,
        tenant_id=org_b_id,
        name="Org B Dealer",
        status="active",
        description="Second dealer for cross-tenant tests",
        settings={},
    )
    db_session.add(org_b)
    await db_session.flush()

    category_b = CategoryModel(
        id=uuid4(),
        name="Org B Category",
        slug=f"org-b-category-{uuid4().hex[:8]}",
        tenant_id=org_b.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category_b)
    await db_session.flush()

    product = ProductModel(
        id=uuid4(),
        tenant_id=org_b.tenant_id,
        organization_id=org_b.id,
        category_id=category_b.id,
        title="Org B Product",
        price_cents=2_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_admin_sees_products_across_all_tenants(
    async_client_as_admin: AsyncClient,
    own_tenant_product: ProductModel,
    other_tenant_product: ProductModel,
) -> None:
    """Task 2.1: admin (DEALER_ADMIN_VIEW_ALL) lists products -> sees BOTH tenants."""
    response = await async_client_as_admin.get("/api/v1/products")

    assert response.status_code == 200
    titles = {p["title"] for p in response.json()["products"]}
    assert own_tenant_product.title in titles
    assert other_tenant_product.title in titles


@pytest.mark.asyncio
async def test_seller_stays_scoped_to_own_tenant(
    async_client_as_seller: AsyncClient,
    own_tenant_product: ProductModel,
    other_tenant_product: ProductModel,
) -> None:
    """Task 2.3: seller (no DEALER_ADMIN_VIEW_ALL) -- regression, only own tenant."""
    response = await async_client_as_seller.get("/api/v1/products")

    assert response.status_code == 200
    titles = {p["title"] for p in response.json()["products"]}
    assert own_tenant_product.title in titles
    assert other_tenant_product.title not in titles


@pytest.mark.asyncio
async def test_seller_cross_tenant_organization_id_is_rejected(
    async_client_as_seller: AsyncClient,
    other_tenant_product: ProductModel,
) -> None:
    """Task 2.4: seller passing another tenant's organization_id -> 403 (IDOR guard)."""
    response = await async_client_as_seller.get(
        "/api/v1/products",
        params={"organization_id": str(other_tenant_product.organization_id)},
    )

    assert response.status_code == 403
