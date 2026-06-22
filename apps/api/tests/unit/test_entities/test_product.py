"""Unit tests for Product entity."""

from uuid import uuid4

import pytest

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


class TestProduct:
    """Test Product entity."""

    def test_create_product(self) -> None:
        """Test creating a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="2020 Toyota Camry",
            price_cents=2500000,  # $25,000
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
            condition=ProductCondition.USED,
        )

        assert product.id is not None
        assert product.title == "2020 Toyota Camry"
        assert product.price_cents == 2500000
        assert product.price_dollars == 25000.0
        assert product.status == ProductStatus.DRAFT
        assert product.condition == ProductCondition.USED
        assert product.is_published is False
        assert product.can_be_edited is True

    def test_submit_for_approval_from_draft(self) -> None:
        """Test submitting DRAFT product for approval."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()
        user_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.submit_for_approval(user_id)

        assert product.status == ProductStatus.PENDING
        assert product.submitted_by == user_id
        assert product.submitted_for_approval_at is not None

    def test_submit_for_approval_from_published_raises_error(self) -> None:
        """Test that PUBLISHED product cannot be submitted."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()
        user_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.status = ProductStatus.PUBLISHED

        with pytest.raises(ValueError, match="Cannot submit product"):
            product.submit_for_approval(user_id)

    def test_approve_product(self) -> None:
        """Test approving a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()
        user_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.submit_for_approval(user_id)
        approver_id = uuid4()

        product.approve(approver_id)

        assert product.status == ProductStatus.PUBLISHED
        assert product.approved_by == approver_id
        assert product.approved_at is not None
        assert product.published_at is not None

    def test_reject_product(self) -> None:
        """Test rejecting a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()
        submitter_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.submit_for_approval(submitter_id)
        approver_id = uuid4()
        reason = "Missing information"

        product.reject(approver_id, reason)

        assert product.status == ProductStatus.REJECTED
        assert product.approved_by == approver_id
        assert product.rejection_reason == reason

    def test_pause_and_resume_product(self) -> None:
        """Test pausing and resuming a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.status = ProductStatus.PUBLISHED

        product.pause()
        assert product.status == ProductStatus.PAUSED

        product.resume()
        assert product.status == ProductStatus.PUBLISHED

    def test_mark_sold(self) -> None:
        """Test marking product as sold."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.status = ProductStatus.PUBLISHED

        product.mark_sold()

        assert product.status == ProductStatus.SOLD
        assert product.sold_at is not None

    def test_archive_product(self) -> None:
        """Test archiving a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.archive()

        assert product.status == ProductStatus.ARCHIVED
        assert product.archived_at is not None

    def test_update_basic_info(self) -> None:
        """Test updating basic product info."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.update_basic_info(
            title="Updated Title",
            price_cents=20000,
            condition=ProductCondition.NEW,
        )

        assert product.title == "Updated Title"
        assert product.price_cents == 20000
        assert product.condition == ProductCondition.NEW

    def test_update_published_product_raises_error(self) -> None:
        """Test that updating PUBLISHED product raises error."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.status = ProductStatus.PUBLISHED

        with pytest.raises(ValueError, match="Cannot edit product"):
            product.update_basic_info(title="New Title")

    def test_update_attributes(self) -> None:
        """Test updating product attributes."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.update_attributes({"year": 2020, "make": "Toyota"})

        assert product.attributes["year"] == 2020
        assert product.attributes["make"] == "Toyota"

    def test_set_attribute(self) -> None:
        """Test setting a single attribute."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.set_attribute("year", 2020)

        assert product.attributes["year"] == 2020

    def test_increment_view_count(self) -> None:
        """Test incrementing view count."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        initial_count = product.view_count
        product.increment_view_count()

        assert product.view_count == initial_count + 1

    def test_increment_favorite_count(self) -> None:
        """Test incrementing favorite count."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        initial_count = product.favorite_count
        product.increment_favorite_count()

        assert product.favorite_count == initial_count + 1

    def test_decrement_favorite_count(self) -> None:
        """Test decrementing favorite count."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.favorite_count = 5

        product.decrement_favorite_count()
        assert product.favorite_count == 4

        # Should not go below 0
        product.favorite_count = 0
        product.decrement_favorite_count()
        assert product.favorite_count == 0

    def test_set_featured(self) -> None:
        """Test setting featured status."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        product.set_featured(True)
        assert product.is_featured is True

        product.set_featured(False)
        assert product.is_featured is False

    def test_create_product_defaults_published_to_marketplace_false(self) -> None:
        """Subsystem D Task 1.6: new products opt out of the cross-dealer marketplace by default."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        assert product.published_to_marketplace is False

    def test_is_new_property(self) -> None:
        """Test is_new property."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )

        # Newly created product is new
        assert product.is_new is True
