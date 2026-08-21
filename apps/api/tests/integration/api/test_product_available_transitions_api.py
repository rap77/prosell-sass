"""Integration tests for GET /products/{id}/available-transitions.

Slice 8/10 of the reverse-transitions spec.
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
    *,
    status: str,
    archived_from_status: str | None = None,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1_000_000,
        status=status,
        archived_from_status=archived_from_status,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_published_product_shows_reverse_transition(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, test_organization, test_category, status="published"
    )

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "to_status": "pending",
            "endpoint": f"POST /products/{product.id}/reverse",
            "requires_role": "super_admin",
            "side_effects": ["fb_unpublish"],
            "method": "reverse_publication",
        }
    ]


@pytest.mark.asyncio
async def test_rejected_product_shows_resubmit_transition(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(db_session, test_organization, test_category, status="rejected")

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "to_status": "pending",
            "endpoint": f"POST /products/{product.id}/resubmit",
            "requires_role": "super_admin",
            "side_effects": [],
            "method": "resubmit",
        }
    ]


@pytest.mark.asyncio
async def test_archived_with_recorded_status_shows_restore_transition(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="archived",
        archived_from_status="published",
    )

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "to_status": "published",
            "endpoint": f"POST /products/{product.id}/restore",
            "requires_role": "super_admin",
            "side_effects": [],
            "method": "restore",
        }
    ]


@pytest.mark.asyncio
async def test_archived_without_recorded_status_shows_no_transitions(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="archived",
        archived_from_status=None,
    )

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_sold_product_shows_revert_sale_transition(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(db_session, test_organization, test_category, status="sold")

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "to_status": "published",
            "endpoint": f"POST /products/{product.id}/revert-sale",
            "requires_role": "super_admin",
            "side_effects": [],
            "method": "revert_sale",
        }
    ]


@pytest.mark.asyncio
async def test_pending_product_shows_no_transitions(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(db_session, test_organization, test_category, status="pending")

    response = await async_client_as_admin.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_not_found_returns_404(
    async_client_as_admin: AsyncClient,
) -> None:
    response = await async_client_as_admin.get(f"/api/v1/products/{uuid4()}/available-transitions")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_any_authenticated_user_can_read_not_just_super_admin(
    async_client_as_seller: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_product(
        db_session, test_organization, test_category, status="published"
    )

    response = await async_client_as_seller.get(
        f"/api/v1/products/{product.id}/available-transitions"
    )

    assert response.status_code == 200
    assert response.json()[0]["requires_role"] == "super_admin"
