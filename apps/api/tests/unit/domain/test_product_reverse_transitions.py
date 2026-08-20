"""Unit tests for Product reverse (undo) transition methods.

Covers reverse_publication(), resubmit(), and restore() — the super_admin-only
undo actions from the reverse-transitions spec. Authorization (super_admin
gating) is enforced at the use case layer, not tested here.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.product import Product, ProductStatus
from prosell.domain.exceptions.product_exceptions import (
    ProductInvalidStatusTransitionError,
    ProductRestoreTargetMissingError,
)


def _create_product(
    status: ProductStatus,
    published_at: datetime | None = None,
    rejection_reason: str | None = None,
    archived_from_status: str | None = None,
) -> Product:
    """Helper to create a product with given status."""
    return Product(
        id=uuid4(),
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
        title="Test Vehicle",
        description="Test description",
        price_cents=1000000,
        currency="USD",
        status=status,
        published_at=published_at,
        rejection_reason=rejection_reason,
        archived_from_status=archived_from_status,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


class TestReversePublication:
    """Test Product.reverse_publication() — undo PUBLISHED back to PENDING."""

    def test_reverse_publication_from_published_succeeds(self):
        product = _create_product(ProductStatus.PUBLISHED, published_at=datetime.now(UTC))

        product.reverse_publication()

        assert product.status == ProductStatus.PENDING
        assert product.published_at is None

    def test_reverse_publication_updates_updated_at(self):
        product = _create_product(ProductStatus.PUBLISHED)
        old_updated_at = product.updated_at

        product.reverse_publication()

        assert product.updated_at > old_updated_at

    def test_reverse_publication_from_pending_fails(self):
        product = _create_product(ProductStatus.PENDING)

        with pytest.raises(ProductInvalidStatusTransitionError):
            product.reverse_publication()

        assert product.status == ProductStatus.PENDING


class TestResubmit:
    """Test Product.resubmit() — admin-forced REJECTED back to PENDING."""

    def test_resubmit_from_rejected_succeeds(self):
        product = _create_product(ProductStatus.REJECTED, rejection_reason="Fotos de mala calidad")
        user_id = uuid4()

        product.resubmit(user_id)

        assert product.status == ProductStatus.PENDING
        assert product.submitted_for_approval_at is not None
        assert product.submitted_by == user_id
        # Rejection reason persists as history, same as submit_for_approval()
        assert product.rejection_reason == "Fotos de mala calidad"

    def test_resubmit_from_draft_fails(self):
        product = _create_product(ProductStatus.DRAFT)
        user_id = uuid4()

        with pytest.raises(ProductInvalidStatusTransitionError):
            product.resubmit(user_id)

        assert product.status == ProductStatus.DRAFT


class TestRestore:
    """Test Product.restore() — undo ARCHIVED back to archived_from_status."""

    def test_archive_records_archived_from_status(self):
        product = _create_product(ProductStatus.PUBLISHED)

        product.archive()

        assert product.status == ProductStatus.ARCHIVED
        assert product.archived_from_status == "published"

    def test_restore_from_archived_with_recorded_status_succeeds(self):
        product = _create_product(ProductStatus.PUBLISHED)
        product.archive()

        product.restore()

        assert product.status == ProductStatus.PUBLISHED
        assert product.archived_from_status is None

    def test_restore_from_non_archived_fails(self):
        product = _create_product(ProductStatus.PENDING)

        with pytest.raises(ProductInvalidStatusTransitionError):
            product.restore()

    def test_restore_without_recorded_archived_from_status_fails(self):
        """Products archived before this feature shipped have no restore
        target recorded — restore must fail loudly, never silently default
        to DRAFT."""
        product = _create_product(ProductStatus.ARCHIVED, archived_from_status=None)

        with pytest.raises(ProductRestoreTargetMissingError):
            product.restore()

        assert product.status == ProductStatus.ARCHIVED
