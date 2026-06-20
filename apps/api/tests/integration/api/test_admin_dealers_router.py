"""Integration tests -- Subsystem D Phase 4: admin dealer endpoints.

Task 4.2 (RED): GET /admin/dealers returns the orgs list (200) for admin,
    403 for a seller without DEALER_ADMIN_VIEW_ALL.
Task 4.4 (RED): GET /admin/dealers/{id}/products returns the dealer's
    products (200), 404 for an unknown dealer id.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def other_dealer(db_session: AsyncSession) -> OrganizationModel:
    """A second, unrelated dealer org with one product."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name="Other Dealer",
        status="active",
        description="Second dealer for admin endpoint tests",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()

    category = CategoryModel(
        id=uuid4(),
        name="Other Dealer Category",
        slug=f"other-dealer-category-{uuid4().hex[:8]}",
        tenant_id=org.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()

    product = ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=category.id,
        title="Other Dealer Product",
        price_cents=3_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return org


@pytest.mark.asyncio
async def test_admin_lists_all_dealers(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.2: admin (DEALER_ADMIN_VIEW_ALL) sees the dealers list."""
    response = await async_client_as_admin.get("/api/v1/admin/dealers")

    assert response.status_code == 200
    names = {org["name"] for org in response.json()["organizations"]}
    assert other_dealer.name in names


@pytest.mark.asyncio
async def test_seller_cannot_list_dealers(
    async_client_as_seller: AsyncClient,
) -> None:
    """Task 4.2: seller without DEALER_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.get("/api/v1/admin/dealers")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_lists_dealer_products(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.4: admin fetches a specific dealer's products."""
    response = await async_client_as_admin.get(f"/api/v1/admin/dealers/{other_dealer.id}/products")

    assert response.status_code == 200
    titles = {p["title"] for p in response.json()["products"]}
    assert "Other Dealer Product" in titles


@pytest.mark.asyncio
async def test_admin_unknown_dealer_id_returns_404(
    async_client_as_admin: AsyncClient,
) -> None:
    """Task 4.4: unknown dealer id returns 404."""
    response = await async_client_as_admin.get(f"/api/v1/admin/dealers/{uuid4()}/products")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_seller_cannot_list_dealer_products(
    async_client_as_seller: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.4: seller without DEALER_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.get(f"/api/v1/admin/dealers/{other_dealer.id}/products")

    assert response.status_code == 403
