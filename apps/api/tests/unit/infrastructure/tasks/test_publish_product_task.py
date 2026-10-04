"""Tests for publish_product_task — backend decomposition Stage 1.4.

Zero test coverage existed for this file before this change. Covers the real
security finding (a decrypted Facebook page access token embedded in a publisher
adapter's exception message must never reach persisted `publication.error_message`
or a task result) plus the existing status-transition/retry behavior, now pinned.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.domain.entities.publication import Publication, PublicationStatus
from prosell.infrastructure.tasks.use_cases.publish_product_task import publish_product_task

DECRYPTED_TOKEN = "EAAFakePageAccessToken123SECRET"


def _make_publication(**overrides) -> Publication:
    defaults: dict = {
        "id": uuid4(),
        "product_id": uuid4(),
        "tenant_id": uuid4(),
        "facebook_page_id": uuid4(),
        "title": "2020 Toyota Camry",
        "price_cents": 2_500_000,
        "zip_code": "33101",
        "image_urls": [],
    }
    defaults.update(overrides)
    return Publication(**defaults)


class _FakeSessionCtx:
    async def __aenter__(self):
        return MagicMock()

    async def __aexit__(self, *_args):
        return False


@pytest.fixture(autouse=True)
def encryption_key_env(monkeypatch):
    # Exactly 32 bytes — TokenEncryptionService's real length check, so tests that
    # don't care about encryption specifics don't need to mock the factory.
    monkeypatch.setenv("ENCRYPTION_KEY", "a" * 32)


class _FakeKicker:
    """Stands in for taskiq's real kicker — the real one needs a live Redis broker,
    which isn't available/authenticated in this unit-test environment."""

    def with_labels(self, **_kwargs):
        return self

    async def kiq(self, **_kwargs):
        return None


@pytest.fixture(autouse=True)
def fake_kicker(monkeypatch):
    monkeypatch.setattr(publish_product_task, "kicker", lambda: _FakeKicker())


def _patch_dependencies(monkeypatch, publication, page_access_token_encrypted="encrypted-blob"):
    pub_repo = AsyncMock()
    pub_repo.get_by_id_admin.return_value = publication
    pub_repo.update = AsyncMock()

    page = MagicMock()
    page.page_access_token_encrypted = page_access_token_encrypted
    page_repo = AsyncMock()
    page_repo.get_by_id.return_value = page

    encryption = MagicMock()
    encryption.decrypt.return_value = DECRYPTED_TOKEN

    monkeypatch.setattr(
        "prosell.infrastructure.database.session.async_session_maker",
        lambda: _FakeSessionCtx(),
    )
    monkeypatch.setattr(
        "prosell.infrastructure.repositories.publication_repository_impl."
        "SqlAlchemyPublicationRepository",
        lambda _session: pub_repo,
    )
    monkeypatch.setattr(
        "prosell.infrastructure.repositories.facebook_page_repository_impl."
        "SqlAlchemyFacebookPageRepository",
        lambda _session: page_repo,
    )
    monkeypatch.setattr(
        "prosell.infrastructure.services.token_encryption_service.create_encryption_service",
        lambda key: encryption,  # noqa: ARG005
    )

    return pub_repo, page_repo


def _patch_playwright(monkeypatch, *, publish_return=None, publish_side_effect=None):
    playwright_svc = AsyncMock()
    if publish_side_effect is not None:
        playwright_svc.publish.side_effect = publish_side_effect
    else:
        playwright_svc.publish.return_value = publish_return
    monkeypatch.setattr(
        "prosell.infrastructure.services.playwright_publisher.PlaywrightPublisherService",
        lambda: playwright_svc,
    )
    return playwright_svc


class TestPublishProductTaskHappyPath:
    @pytest.mark.asyncio
    async def test_publish_success_marks_published(self, monkeypatch):
        publication = _make_publication()
        pub_repo, _ = _patch_dependencies(monkeypatch, publication)
        _patch_playwright(monkeypatch, publish_return="fb_listing_999")

        result = await publish_product_task(str(publication.id))

        assert result.get("status") == "published"
        assert result.get("fb_listing_id") == "fb_listing_999"
        assert publication.status == PublicationStatus.PUBLISHED
        assert pub_repo.update.await_count >= 1


class TestPublishProductTaskEarlyReturns:
    @pytest.mark.asyncio
    async def test_not_found_returns_error(self, monkeypatch):
        pub_repo = AsyncMock()
        pub_repo.get_by_id_admin.return_value = None
        monkeypatch.setattr(
            "prosell.infrastructure.database.session.async_session_maker",
            lambda: _FakeSessionCtx(),
        )
        monkeypatch.setattr(
            "prosell.infrastructure.repositories.publication_repository_impl."
            "SqlAlchemyPublicationRepository",
            lambda _session: pub_repo,
        )

        result = await publish_product_task(str(uuid4()))

        assert "error" in result

    @pytest.mark.asyncio
    async def test_blocked_publication_returns_without_publishing(self, monkeypatch):
        publication = _make_publication(blocked_until_confirmed=True)
        _patch_dependencies(monkeypatch, publication)
        playwright_svc = _patch_playwright(monkeypatch, publish_return="unused")

        result = await publish_product_task(str(publication.id))

        assert result == {"status": "blocked", "publication_id": str(publication.id)}
        playwright_svc.publish.assert_not_called()

    @pytest.mark.asyncio
    async def test_missing_encryption_key_returns_error(self, monkeypatch):
        monkeypatch.delenv("ENCRYPTION_KEY", raising=False)

        result = await publish_product_task(str(uuid4()))

        assert result == {"error": "ENCRYPTION_KEY environment variable not set"}


class TestPublishProductTaskSecretScrubbing:
    """The security finding this Stage 1.4 fix closes."""

    @pytest.mark.asyncio
    async def test_category_b_error_never_persists_the_decrypted_token(self, monkeypatch):
        publication = _make_publication()
        pub_repo, _ = _patch_dependencies(monkeypatch, publication)
        leaking_exc = Exception(f"Checkpoint required for session {DECRYPTED_TOKEN}")
        _patch_playwright(monkeypatch, publish_side_effect=leaking_exc)

        result = await publish_product_task(str(publication.id))

        assert result.get("status") == "failed"
        assert result.get("category") == "B"
        assert DECRYPTED_TOKEN not in result.get("error", "")
        assert DECRYPTED_TOKEN not in (publication.error_message or "")
        assert "[REDACTED]" in (publication.error_message or "")
        assert publication.blocked_until_confirmed is True
        # Verify what actually got persisted via the repo, not just the in-memory entity.
        persisted = pub_repo.update.await_args.args[0]
        assert DECRYPTED_TOKEN not in (persisted.error_message or "")

    @pytest.mark.asyncio
    async def test_max_retries_exceeded_never_persists_the_decrypted_token(self, monkeypatch):
        publication = _make_publication(retry_count=3)
        pub_repo, _ = _patch_dependencies(monkeypatch, publication)
        leaking_exc = Exception(f"Timeout calling FB API with token {DECRYPTED_TOKEN}")
        _patch_playwright(monkeypatch, publish_side_effect=leaking_exc)

        result = await publish_product_task(str(publication.id))

        assert result.get("status") == "failed"
        assert result.get("category") == "A"
        assert DECRYPTED_TOKEN not in result.get("error", "")
        assert DECRYPTED_TOKEN not in (publication.error_message or "")
        persisted = pub_repo.update.await_args.args[0]
        assert DECRYPTED_TOKEN not in (persisted.error_message or "")

    @pytest.mark.asyncio
    async def test_exception_before_token_decryption_does_not_crash(self, monkeypatch):
        """Regression guard: access_token is assigned INSIDE the try block (decrypted
        after the facebook_page_id/page lookups), so an exception raised before that
        point must not crash the except handler's scrub_secret(str(exc), access_token)
        call with an UnboundLocalError — classify_publisher_error treats this as a
        generic (Category A) error, so it schedules a retry just like any other
        transient failure; the point of this test is that it doesn't crash."""
        publication = _make_publication(facebook_page_id=None)
        _patch_dependencies(monkeypatch, publication)

        result = await publish_product_task(str(publication.id))

        assert result.get("status") == "retry_scheduled"

    @pytest.mark.asyncio
    async def test_transient_error_under_retry_limit_schedules_retry(self, monkeypatch):
        publication = _make_publication(retry_count=0)
        _patch_dependencies(monkeypatch, publication)
        _patch_playwright(monkeypatch, publish_side_effect=Exception("Connection timed out"))

        result = await publish_product_task(str(publication.id))

        assert result.get("status") == "retry_scheduled"
        assert result.get("retry_count") == 1
        assert result.get("delay_seconds") == 60
        assert publication.status != PublicationStatus.FAILED


__all__ = [
    "TestPublishProductTaskEarlyReturns",
    "TestPublishProductTaskHappyPath",
    "TestPublishProductTaskSecretScrubbing",
]
