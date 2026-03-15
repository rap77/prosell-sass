"""Unit tests for Publication entity.

Tests the state machine: pending -> publishing -> published -> failed/expired/sold
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from prosell.domain.entities.publication import (
    Publication,
    PublicationErrorCategory,
    PublicationStatus,
)


def make_publication(**kwargs) -> Publication:
    """Factory helper for test publications."""
    defaults = {
        "product_id": uuid4(),
        "tenant_id": uuid4(),
        "seller_user_id": uuid4(),
        "facebook_page_id": uuid4(),
        "title": "Toyota Camry 2020",
        "price_cents": 1500000,
        "zip_code": "90210",
    }
    defaults.update(kwargs)
    return Publication(**defaults)


class TestPublicationDefaults:
    def test_new_publication_defaults_to_pending(self):
        """New Publication with no explicit status defaults to PENDING."""
        pub = make_publication()
        assert pub.status == PublicationStatus.PENDING

    def test_new_publication_has_correct_fields(self):
        """New Publication has all required fields set."""
        pub = make_publication()
        assert pub.id is not None
        assert pub.fb_listing_id is None
        assert pub.published_at is None
        assert pub.expires_at is None
        assert pub.sold_at is None
        assert pub.retry_count == 0
        assert pub.blocked_until_confirmed is False


class TestMarkPublished:
    def test_mark_published_sets_status_and_listing_id(self):
        """mark_published() sets status=PUBLISHED and fb_listing_id."""
        pub = make_publication()
        pub.mark_published("fb_123", "playwright", "playwright_v1.42")

        assert pub.status == PublicationStatus.PUBLISHED
        assert pub.fb_listing_id == "fb_123"
        assert pub.strategy_used == "playwright"
        assert pub.engine_version == "playwright_v1.42"

    def test_mark_published_sets_expires_at_7_days(self):
        """mark_published() sets expires_at = published_at + 7 days."""
        pub = make_publication()
        before = datetime.now(UTC)
        pub.mark_published("fb_123", "playwright", "playwright_v1.42")
        after = datetime.now(UTC)

        assert pub.published_at is not None
        assert pub.expires_at is not None
        expected_min = before + timedelta(days=7)
        expected_max = after + timedelta(days=7)
        assert expected_min <= pub.expires_at <= expected_max


class TestMarkFailed:
    def test_mark_failed_category_b_sets_blocked(self):
        """mark_failed(BLOCKING) sets blocked_until_confirmed=True."""
        pub = make_publication()
        pub.mark_failed(PublicationErrorCategory.B, "captcha detected")

        assert pub.status == PublicationStatus.FAILED
        assert pub.blocked_until_confirmed is True
        assert pub.error_message == "captcha detected"
        assert pub.error_category == PublicationErrorCategory.B

    def test_mark_failed_category_a_does_not_block(self):
        """mark_failed(transient) sets blocked_until_confirmed=False."""
        pub = make_publication()
        pub.mark_failed(PublicationErrorCategory.A, "timeout")

        assert pub.status == PublicationStatus.FAILED
        assert pub.blocked_until_confirmed is False
        assert pub.error_message == "timeout"
        assert pub.error_category == PublicationErrorCategory.A


class TestIsApproachingExpiry:
    def test_is_approaching_expiry_returns_true_when_within_window(self):
        """is_approaching_expiry(48) returns True when expires_at < now + 48h."""
        pub = make_publication()
        # Simulate a published listing expiring in 24h
        pub.status = PublicationStatus.PUBLISHED
        pub.expires_at = datetime.now(UTC) + timedelta(hours=24)

        assert pub.is_approaching_expiry(hours_before=48) is True

    def test_is_approaching_expiry_returns_false_when_outside_window(self):
        """is_approaching_expiry(48) returns False when expires_at > now + 48h."""
        pub = make_publication()
        pub.status = PublicationStatus.PUBLISHED
        pub.expires_at = datetime.now(UTC) + timedelta(hours=72)

        assert pub.is_approaching_expiry(hours_before=48) is False

    def test_is_approaching_expiry_returns_false_when_not_published(self):
        """is_approaching_expiry returns False if status is not PUBLISHED."""
        pub = make_publication()
        pub.status = PublicationStatus.PENDING
        pub.expires_at = datetime.now(UTC) + timedelta(hours=24)

        assert pub.is_approaching_expiry(hours_before=48) is False


class TestMarkSold:
    def test_mark_sold_sets_status_and_sold_at(self):
        """mark_sold() sets status=SOLD and sold_at is not None."""
        pub = make_publication()
        pub.mark_sold()

        assert pub.status == PublicationStatus.SOLD
        assert pub.sold_at is not None
