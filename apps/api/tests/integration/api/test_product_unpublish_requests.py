"""Integration tests for durable FB unpublish requests from product transitions."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.api.routers.product_router import (
    _enqueue_unpublish_requests,  # type: ignore[attr-defined]
)
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import (
    FBAccountModel,
    FBPublicationHistoryModel,
    FBPublicationStatusModel,
)
from prosell.infrastructure.models.fb_unpublish_request_model import FBUnpublishRequestModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


async def _create_active_publication(
    db_session: AsyncSession,
    product: ProductModel,
    *,
    fb_post_id: str,
) -> FBPublicationStatusModel:
    account = FBAccountModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        email=f"account-{uuid4().hex}@example.test",
        password_encrypted=b"test-password",
    )
    status = FBPublicationStatusModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        product_id=product.id,
        fb_account_id=account.id,
        status="active",
    )
    old_history = FBPublicationHistoryModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        product_id=product.id,
        fb_account_id=account.id,
        event_type="published",
        fb_post_id="old-post-id",
        event_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    latest_history = FBPublicationHistoryModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        product_id=product.id,
        fb_account_id=account.id,
        event_type="republished",
        fb_post_id=fb_post_id,
        event_at=datetime.now(UTC),
    )
    db_session.add_all([account, status, old_history, latest_history])
    await db_session.flush()
    return status


@pytest.fixture
async def published_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Published product",
        price_cents=1_000_000,
        status="published",
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("endpoint", "expected_status"),
    [
        ("reserve", "reserved"),
        ("pause", "paused"),
        ("mark-sold", "sold"),
    ],
)
async def test_transition_queues_one_request_for_each_active_publication(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    published_product: ProductModel,
    endpoint: str,
    expected_status: str,
) -> None:
    """Reserve, pause, and sale each enqueue durable FB removal work."""
    active_status = await _create_active_publication(
        db_session, published_product, fb_post_id="latest-post-id"
    )
    inactive_account = FBAccountModel(
        id=uuid4(),
        tenant_id=published_product.tenant_id,
        email=f"inactive-{uuid4().hex}@example.test",
        password_encrypted=b"test-password",
    )
    inactive_status = FBPublicationStatusModel(
        id=uuid4(),
        tenant_id=published_product.tenant_id,
        product_id=published_product.id,
        fb_account_id=inactive_account.id,
        status="deleted",
    )
    db_session.add_all([inactive_account, inactive_status])
    await db_session.flush()

    response = await async_client_as_admin.post(
        f"/api/v1/products/{published_product.id}/{endpoint}"
    )

    assert response.status_code == 200
    assert response.json()["status"] == expected_status
    requests = (
        (
            await db_session.execute(
                select(FBUnpublishRequestModel).where(
                    FBUnpublishRequestModel.product_id == published_product.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(requests) == 1
    assert requests[0].publication_status_id == active_status.id
    assert requests[0].fb_post_id == "latest-post-id"
    assert requests[0].status == "queued"


@pytest.mark.asyncio
async def test_enqueue_unpublish_requests_is_idempotent(
    db_session: AsyncSession,
    published_product: ProductModel,
) -> None:
    """Repeated enqueue attempts leave exactly one request per publication status."""
    active_status = await _create_active_publication(
        db_session, published_product, fb_post_id="post-id"
    )

    await _enqueue_unpublish_requests(db_session, published_product)
    await _enqueue_unpublish_requests(db_session, published_product)

    requests = (
        (
            await db_session.execute(
                select(FBUnpublishRequestModel).where(
                    FBUnpublishRequestModel.publication_status_id == active_status.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_super_admin_can_reserve_cross_tenant_product_and_queue_request(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    second_organization: OrganizationModel,
) -> None:
    """Cross-tenant transition scope mirrors PATCH for ORG_ADMIN_VIEW_ALL users."""
    category = CategoryModel(
        id=uuid4(),
        name="Other tenant category",
        slug=f"other-tenant-{uuid4().hex}",
        tenant_id=second_organization.tenant_id,
        level=0,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    product = ProductModel(
        id=uuid4(),
        tenant_id=second_organization.tenant_id,
        organization_id=second_organization.id,
        category_id=category.id,
        title="Other tenant product",
        price_cents=1_000_000,
        status="published",
    )
    db_session.add_all([category, product])
    await db_session.flush()
    await _create_active_publication(db_session, product, fb_post_id="cross-tenant-post-id")

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/reserve")

    assert response.status_code == 200
    request = (
        await db_session.execute(
            select(FBUnpublishRequestModel).where(FBUnpublishRequestModel.product_id == product.id)
        )
    ).scalar_one()
    assert request.tenant_id == second_organization.tenant_id
