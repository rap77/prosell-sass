"""Integration tests for product ownership (broker) endpoints.

NOTE: Uses fixtures from tests/integration/conftest.py.
After PROP-001 tenant cascade, ownership only stores brokers (owner_type='user').
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.user_model import UserModel


@pytest_asyncio.fixture
async def ownership_category(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> CategoryModel:
    """A category for product creation (uses shared test_organization)."""
    category = CategoryModel(
        id=uuid4(),
        name="Test Vehicles",
        slug=f"test-vehicles-{uuid4().hex[:8]}",
        tenant_id=test_organization.id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest_asyncio.fixture
async def test_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    ownership_category: CategoryModel,
) -> ProductModel:
    """A product for broker ownership tests."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.id,
        organization_id=test_organization.id,
        category_id=ownership_category.id,
        title="Test Vehicle",
        slug=f"test-vehicle-{uuid4().hex[:8]}",
        price_cents=2500000,
        currency="USD",
        condition="used",
        status="draft",
        attributes={},
        image_urls=[],
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_set_ownership_single_owner(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_user: UserModel,
):
    """Set single broker with 100%."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={
            "owners": [
                {"owner_id": str(test_user.id), "owner_type": "user", "percentage": "100.00"}
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["owners"]) == 1
    assert data["owners"][0]["percentage"] == "100.00"


@pytest.mark.asyncio
async def test_set_ownership_multiple_owners(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_user: UserModel,
    test_seller_user: UserModel,
):
    """Set multiple brokers with percentages summing to 100%."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={
            "owners": [
                {"owner_id": str(test_user.id), "owner_type": "user", "percentage": "60.00"},
                {"owner_id": str(test_seller_user.id), "owner_type": "user", "percentage": "40.00"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["owners"]) == 2


@pytest.mark.asyncio
async def test_set_ownership_invalid_sum(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_user: UserModel,
):
    """Percentages not summing to 100% should return 400."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={
            "owners": [{"owner_id": str(test_user.id), "owner_type": "user", "percentage": "90.00"}]
        },
    )

    assert response.status_code == 400
    assert "100" in response.json()["detail"]


@pytest.mark.asyncio
async def test_set_ownership_empty_owners(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
):
    """Empty owners should return 400."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={"owners": []},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_ownership(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_user: UserModel,
):
    """Get broker ownership for a product."""
    # First set ownership (broker)
    await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={
            "owners": [
                {"owner_id": str(test_user.id), "owner_type": "user", "percentage": "100.00"}
            ]
        },
    )

    # Then get it
    response = await async_client_as_admin.get(
        f"/api/v1/products/{test_product.id}/ownership",
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["owners"]) == 1
