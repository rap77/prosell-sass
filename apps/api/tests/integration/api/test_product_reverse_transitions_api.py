"""Integration tests for the reverse/resubmit/restore product endpoints.

Slice 5/10 of the reverse-transitions spec (revised — see spec amendment
2026-08-20: FB unpublish is async via the existing durable queue, not a
synchronous IPublisherService call, so there is no 502 path here).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import (
    FBAccountModel,
    FBPublicationStatusModel,
)
from prosell.infrastructure.models.fb_unpublish_request_model import FBUnpublishRequestModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


async def _create_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    *,
    status: str,
    archived_from_status: str | None = None,
    published_to_marketplace: bool = False,
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
        published_to_marketplace=published_to_marketplace,
    )
    db_session.add(product)
    await db_session.flush()
    return product


async def _add_active_publication(
    db_session: AsyncSession, product: ProductModel
) -> FBPublicationStatusModel:
    account = FBAccountModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        email=f"account-{uuid4().hex}@example.test",
        password_encrypted=b"test-password",
    )
    publication_status = FBPublicationStatusModel(
        id=uuid4(),
        tenant_id=product.tenant_id,
        product_id=product.id,
        fb_account_id=account.id,
        status="active",
    )
    db_session.add_all([account, publication_status])
    await db_session.flush()
    return publication_status


class TestReverseEndpoint:
    @pytest.mark.asyncio
    async def test_reverse_published_product_queues_unpublish(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="published"
        )
        await _add_active_publication(db_session, product)

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "pending"
        assert response.json()["version"] == 2

        requests = (
            (
                await db_session.execute(
                    select(FBUnpublishRequestModel).where(
                        FBUnpublishRequestModel.product_id == product.id
                    )
                )
            )
            .scalars()
            .all()
        )
        assert len(requests) == 1

    @pytest.mark.asyncio
    async def test_reverse_without_active_publications_does_not_enqueue(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="published"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        requests = (
            (
                await db_session.execute(
                    select(FBUnpublishRequestModel).where(
                        FBUnpublishRequestModel.product_id == product.id
                    )
                )
            )
            .scalars()
            .all()
        )
        assert len(requests) == 0

    @pytest.mark.asyncio
    async def test_reverse_requires_super_admin(
        self,
        async_client_as_seller: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="published"
        )

        response = await async_client_as_seller.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_reverse_not_found_returns_404(
        self,
        async_client_as_admin: AsyncClient,
    ) -> None:
        response = await async_client_as_admin.post(
            f"/api/v1/products/{uuid4()}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reverse_from_pending_returns_409(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="pending"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_reverse_stale_version_returns_412(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="published"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "99"},
        )

        assert response.status_code == 412

    @pytest.mark.asyncio
    async def test_reverse_published_product_clears_marketplace_flag(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session,
            test_organization,
            test_category,
            status="published",
            published_to_marketplace=True,
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["published_to_marketplace"] is False


class TestResubmitEndpoint:
    @pytest.mark.asyncio
    async def test_resubmit_rejected_product_returns_pending(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="rejected"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/resubmit",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "pending"

    @pytest.mark.asyncio
    async def test_resubmit_from_draft_returns_409(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="draft"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/resubmit",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 409


class TestRevertSaleEndpoint:
    @pytest.mark.asyncio
    async def test_revert_sale_sold_product_returns_published(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(db_session, test_organization, test_category, status="sold")

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/revert-sale",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "published"
        assert response.json()["sold_at"] is None

    @pytest.mark.asyncio
    async def test_revert_sale_from_published_returns_409(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session, test_organization, test_category, status="published"
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/revert-sale",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_revert_sale_requires_super_admin(
        self,
        async_client_as_seller: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(db_session, test_organization, test_category, status="sold")

        response = await async_client_as_seller.post(
            f"/api/v1/products/{product.id}/revert-sale",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 403


class TestRestoreEndpoint:
    @pytest.mark.asyncio
    async def test_restore_archived_product_returns_previous_status(
        self,
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

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/restore",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "published"

    @pytest.mark.asyncio
    async def test_restore_without_recorded_status_returns_409(
        self,
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

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/restore",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 409
