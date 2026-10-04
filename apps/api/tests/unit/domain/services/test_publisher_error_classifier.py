"""Tests for publisher_error_classifier — PUBLISH-03 follow-up (backend decomposition
Stage 1.4): classification and secret-scrubbing logic shared by publish_product_task
and update_listing_task, previously duplicated character-for-character in both.
"""

from prosell.domain.entities.publication import PublicationErrorCategory
from prosell.domain.services.publisher_error_classifier import (
    classify_publisher_error,
    scrub_secret,
)


class TestClassifyPublisherError:
    def test_captcha_is_category_b(self):
        assert classify_publisher_error(Exception("Captcha challenge detected")) == (
            PublicationErrorCategory.B
        )

    def test_checkpoint_is_category_b(self):
        assert classify_publisher_error(Exception("Account checkpoint required")) == (
            PublicationErrorCategory.B
        )

    def test_ban_is_category_b(self):
        assert classify_publisher_error(Exception("This account has been banned")) == (
            PublicationErrorCategory.B
        )

    def test_is_case_insensitive(self):
        assert classify_publisher_error(Exception("CAPTCHA REQUIRED")) == (
            PublicationErrorCategory.B
        )

    def test_timeout_is_category_a(self):
        assert classify_publisher_error(Exception("Connection timed out")) == (
            PublicationErrorCategory.A
        )

    def test_generic_exception_is_category_a(self):
        assert classify_publisher_error(ValueError("something went wrong")) == (
            PublicationErrorCategory.A
        )


class TestScrubSecret:
    def test_redacts_secret_when_present(self):
        text = "HTTP 500 for url with token=sess:abc123xyz in query string"
        result = scrub_secret(text, "sess:abc123xyz")

        assert "sess:abc123xyz" not in result
        assert "[REDACTED]" in result

    def test_leaves_text_unchanged_when_secret_absent(self):
        text = "Connection timed out after 30s"
        result = scrub_secret(text, "sess:abc123xyz")

        assert result == text

    def test_handles_none_secret(self):
        text = "Connection timed out"
        assert scrub_secret(text, None) == text

    def test_handles_empty_secret(self):
        text = "Connection timed out"
        assert scrub_secret(text, "") == text

    def test_redacts_every_occurrence(self):
        text = "token abc123 failed; retried with abc123 again"
        result = scrub_secret(text, "abc123")

        assert "abc123" not in result
        assert result.count("[REDACTED]") == 2
