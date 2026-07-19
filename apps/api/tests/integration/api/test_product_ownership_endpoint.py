"""Integration tests for product ownership endpoints.

NOTE: Uses test_organization from tests/integration/conftest.py (same as admin_user).
Do NOT redefine test_organization locally - causes tenant mismatch.
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest_asyncio.fixture
async def ownership_category(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> CategoryModel:
    """A category for product creation (uses shared test_organization)."""
    category = CategoryModel(
        id=uuid4(),
        name="Test Vehicles",
        slug=f"test-vehicles-{uuid4().hex[:8]}",
        tenant_id=test_organization.id,  # Use org.id as tenant_id per schema
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
    """A product for ownership tests (uses shared test_organization)."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.id,  # Use org.id as tenant_id per schema
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


@pytest_asyncio.fixture
async def second_org(db_session: AsyncSession) -> OrganizationModel:
    """A second organization for multi-owner tests."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name="Second Org",
        status="active",
        description="Second org for ownership tests",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    return org


@pytest.mark.asyncio
async def test_set_ownership_single_owner(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_organization: OrganizationModel,
):
    """Set single owner with 100%."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={"owners": [{"owner_id": str(test_organization.id), "percentage": "100.00"}]},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["owners"]) == 1
    assert data["owners"][0]["percentage"] == "100.00"


@pytest.mark.asyncio
async def test_set_ownership_multiple_owners(
    async_client_as_admin: AsyncClient,
    test_product: ProductModel,
    test_organization: OrganizationModel,
    second_org: OrganizationModel,
):
    """Set multiple owners with percentages summing to 100%."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={
            "owners": [
                {"owner_id": str(test_organization.id), "percentage": "60.00"},
                {"owner_id": str(second_org.id), "percentage": "40.00"},
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
    test_organization: OrganizationModel,
):
    """Percentages not summing to 100% should return 400."""
    response = await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={"owners": [{"owner_id": str(test_organization.id), "percentage": "90.00"}]},
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
    test_organization: OrganizationModel,
):
    """Get ownership for a product."""
    # First set ownership
    await async_client_as_admin.put(
        f"/api/v1/products/{test_product.id}/ownership",
        json={"owners": [{"owner_id": str(test_organization.id), "percentage": "100.00"}]},
    )

    # Then get it
    response = await async_client_as_admin.get(
        f"/api/v1/products/{test_product.id}/ownership",
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["owners"]) == 1
