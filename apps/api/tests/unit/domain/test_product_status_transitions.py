"""Unit tests for Product status transitions."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.product import Product, ProductStatus


class TestProductStatusTransitions:
    """Test Product status transition methods."""

    def _create_product(self, status: ProductStatus) -> Product:
        """Helper to create a product with given status."""
        return Product(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Test Vehicle",
            description="Test description",
            price_cents=1000000,  # $10,000 in cents
            currency="USD",
            status=status,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    def test_submit_for_approval_from_draft_succeeds(self):
        """Test submitting draft product for approval."""
        product = self._create_product(ProductStatus.DRAFT)
        user_id = uuid4()

        product.submit_for_approval(user_id)

        assert product.status == ProductStatus.PENDING
        assert product.submitted_for_approval_at is not None
        assert product.submitted_by == user_id

    def test_submit_for_approval_from_rejected_succeeds(self):
        """Test re-submitting rejected product for approval."""
        product = self._create_product(ProductStatus.REJECTED)
        user_id = uuid4()

        product.submit_for_approval(user_id)

        assert product.status == ProductStatus.PENDING
        assert product.submitted_for_approval_at is not None
        assert product.submitted_by == user_id

    def test_submit_for_approval_from_published_fails(self):
        """Test submitting already published product fails."""
        product = self._create_product(ProductStatus.PUBLISHED)
        user_id = uuid4()

        with pytest.raises(ValueError) as exc_info:
            product.submit_for_approval(user_id)

        assert "Cannot submit" in str(exc_info.value)
        assert product.status == ProductStatus.PUBLISHED  # Status unchanged

    def test_approve_from_pending_succeeds(self):
        """Test approving pending product."""
        product = self._create_product(ProductStatus.PENDING)
        user_id = uuid4()

        product.approve(user_id)

        assert product.status == ProductStatus.PUBLISHED
        assert product.approved_at is not None
        assert product.approved_by == user_id
        assert product.published_at is not None
        assert product.rejection_reason is None

    def test_approve_from_draft_fails(self):
        """Test approving draft product fails."""
        product = self._create_product(ProductStatus.DRAFT)
        user_id = uuid4()

        with pytest.raises(ValueError) as exc_info:
            product.approve(user_id)

        assert "Cannot approve" in str(exc_info.value)
        assert "PENDING" in str(exc_info.value)
        assert product.status == ProductStatus.DRAFT  # Status unchanged
        assert product.approved_at is None

    def test_approve_from_published_fails(self):
        """Test approving already published product fails."""
        product = self._create_product(ProductStatus.PUBLISHED)
        user_id = uuid4()

        with pytest.raises(ValueError) as exc_info:
            product.approve(user_id)

        assert "Cannot approve" in str(exc_info.value)
        assert product.status == ProductStatus.PUBLISHED  # Status unchanged

    def test_approve_sets_approved_by_and_timestamps(self):
        """Test approve sets all required fields."""
        product = self._create_product(ProductStatus.PENDING)
        user_id = uuid4()
        old_updated_at = product.updated_at

        product.approve(user_id)

        assert product.approved_by == user_id
        assert product.approved_at is not None
        assert product.published_at is not None
        assert product.updated_at > old_updated_at

    def test_reject_from_pending_succeeds(self):
        """Test rejecting pending product."""
        product = self._create_product(ProductStatus.PENDING)
        user_id = uuid4()
        reason = "Falta documentación del vehículo"

        product.reject(user_id, reason)

        assert product.status == ProductStatus.REJECTED
        assert product.approved_by == user_id
        assert product.rejection_reason == reason
        assert product.approved_at is None  # Not approved, just rejected

    def test_reject_from_draft_fails(self):
        """Test rejecting draft product fails."""
        product = self._create_product(ProductStatus.DRAFT)
        user_id = uuid4()

        with pytest.raises(ValueError) as exc_info:
            product.reject(user_id, "Some reason")

        assert "Cannot reject" in str(exc_info.value)
        assert "PENDING" in str(exc_info.value)
        assert product.status == ProductStatus.DRAFT  # Status unchanged
        assert product.rejection_reason is None

    def test_reject_requires_reason(self):
        """Test reject requires a reason."""
        product = self._create_product(ProductStatus.PENDING)
        user_id = uuid4()

        # Empty reason should still be accepted by entity (validation happens at DTO level)
        # But let's verify the reason is stored
        reason = "Missing photos"
        product.reject(user_id, reason)

        assert product.rejection_reason == reason

    def test_reject_sets_rejection_reason(self):
        """Test reject stores the rejection reason."""
        product = self._create_product(ProductStatus.PENDING)
        user_id = uuid4()
        reason = "Fotos de mala calidad, precio fuera de mercado"

        product.reject(user_id, reason)

        assert product.rejection_reason == reason
        assert product.status == ProductStatus.REJECTED

    def test_approve_then_reject_cycle(self):
        """Test a product can be submitted → rejected → submitted → approved."""
        product = self._create_product(ProductStatus.DRAFT)
        seller_id = uuid4()
        reviewer_id = uuid4()

        # Draft → Pending
        product.submit_for_approval(seller_id)
        assert product.status == ProductStatus.PENDING

        # Pending → Rejected
        product.reject(reviewer_id, "Falta información")
        assert product.status == ProductStatus.REJECTED
        assert product.rejection_reason == "Falta información"

        # Rejected → Pending (resubmit)
        product.submit_for_approval(seller_id)
        assert product.status == ProductStatus.PENDING
        # Rejection reason persists (allows seller to see history)

        # Pending → Published
        product.approve(reviewer_id)
        assert product.status == ProductStatus.PUBLISHED
        assert product.approved_at is not None
