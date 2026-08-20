"""Unit tests for product reverse-transition domain events.

Slice 7/10 of the reverse-transitions spec. These events are declared but
NOT emitted anywhere yet — there is no IDomainEventBus in this codebase
(same status as the pre-existing user_events.py classes). They exist as
scaffolding for a future bus/listener, matching that established pattern.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.domain.events.product_events import (
    ProductRestoredEvent,
    ProductResubmittedEvent,
    ProductReversedEvent,
)
from prosell.domain.value_objects.product_status import ProductStatus


class TestProductReversedEvent:
    def test_create_with_required_fields(self):
        product_id = uuid4()
        tenant_id = uuid4()
        user_id = uuid4()

        event = ProductReversedEvent(
            product_id=product_id,
            tenant_id=tenant_id,
            reversed_by_user_id=user_id,
            old_status=ProductStatus.PUBLISHED,
            new_status=ProductStatus.PENDING,
            fb_unpublish_queued=True,
        )

        assert event.product_id == product_id
        assert event.tenant_id == tenant_id
        assert event.reversed_by_user_id == user_id
        assert event.old_status == ProductStatus.PUBLISHED
        assert event.new_status == ProductStatus.PENDING
        assert event.fb_unpublish_queued is True
        assert isinstance(event.timestamp, datetime)

    def test_auto_sets_timestamp(self):
        before = datetime.now(UTC)

        event = ProductReversedEvent(
            product_id=uuid4(),
            tenant_id=uuid4(),
            reversed_by_user_id=uuid4(),
            old_status=ProductStatus.PUBLISHED,
            new_status=ProductStatus.PENDING,
            fb_unpublish_queued=False,
        )

        after = datetime.now(UTC)
        assert before <= event.timestamp <= after

    def test_is_frozen(self):
        event = ProductReversedEvent(
            product_id=uuid4(),
            tenant_id=uuid4(),
            reversed_by_user_id=uuid4(),
            old_status=ProductStatus.PUBLISHED,
            new_status=ProductStatus.PENDING,
            fb_unpublish_queued=False,
        )

        with pytest.raises(ValidationError, match="Instance is frozen"):
            event.fb_unpublish_queued = True


class TestProductResubmittedEvent:
    def test_create_with_required_fields(self):
        product_id = uuid4()
        tenant_id = uuid4()
        user_id = uuid4()

        event = ProductResubmittedEvent(
            product_id=product_id,
            tenant_id=tenant_id,
            resubmitted_by_user_id=user_id,
            old_status=ProductStatus.REJECTED,
            new_status=ProductStatus.PENDING,
        )

        assert event.product_id == product_id
        assert event.tenant_id == tenant_id
        assert event.resubmitted_by_user_id == user_id
        assert event.old_status == ProductStatus.REJECTED
        assert event.new_status == ProductStatus.PENDING
        assert isinstance(event.timestamp, datetime)

    def test_is_frozen(self):
        event = ProductResubmittedEvent(
            product_id=uuid4(),
            tenant_id=uuid4(),
            resubmitted_by_user_id=uuid4(),
            old_status=ProductStatus.REJECTED,
            new_status=ProductStatus.PENDING,
        )

        with pytest.raises(ValidationError, match="Instance is frozen"):
            event.new_status = ProductStatus.DRAFT


class TestProductRestoredEvent:
    def test_create_with_required_fields(self):
        product_id = uuid4()
        tenant_id = uuid4()
        user_id = uuid4()

        event = ProductRestoredEvent(
            product_id=product_id,
            tenant_id=tenant_id,
            restored_by_user_id=user_id,
            old_status=ProductStatus.ARCHIVED,
            new_status=ProductStatus.PUBLISHED,
        )

        assert event.product_id == product_id
        assert event.tenant_id == tenant_id
        assert event.restored_by_user_id == user_id
        assert event.old_status == ProductStatus.ARCHIVED
        assert event.new_status == ProductStatus.PUBLISHED
        assert isinstance(event.timestamp, datetime)

    def test_new_status_reflects_the_restored_target_not_a_fixed_value(self):
        """Unlike reverse/resubmit, new_status varies with
        archived_from_status -- it isn't always the same target."""
        event = ProductRestoredEvent(
            product_id=uuid4(),
            tenant_id=uuid4(),
            restored_by_user_id=uuid4(),
            old_status=ProductStatus.ARCHIVED,
            new_status=ProductStatus.PAUSED,
        )

        assert event.new_status == ProductStatus.PAUSED

    def test_is_frozen(self):
        event = ProductRestoredEvent(
            product_id=uuid4(),
            tenant_id=uuid4(),
            restored_by_user_id=uuid4(),
            old_status=ProductStatus.ARCHIVED,
            new_status=ProductStatus.PUBLISHED,
        )

        with pytest.raises(ValidationError, match="Instance is frozen"):
            event.new_status = ProductStatus.DRAFT
