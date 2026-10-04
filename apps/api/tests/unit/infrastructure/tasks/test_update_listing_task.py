"""Tests for update_listing_task — backend decomposition Stage 1.4.

Zero test coverage existed for this file before this change. Covers the same
security finding as publish_product_task: a decrypted Facebook page access token
embedded in a publisher adapter's exception message must never reach persisted
`publication.error_message` or a task result.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.domain.entities.publication import Publication, PublicationStatus
from prosell.infrastructure.tasks.use_cases.update_listing_task import update_listing_task

DECRYPTED_TOKEN = "EAAFakePageAccessToken123SECRET"


def _make_publication(**overrides) -> Publication:
    defaults: dict = {
        "id": uuid4(),
        "product_id": uuid4(),
        "tenant_id": uuid4(),
        "facebook_page_id": uuid4(),
        "fb_listing_id": "fb_listing_123",
        "title": "2020 Toyota Camry",
        "price_cents": 2_500_000,
        "zip_code": "33101",
        "status": PublicationStatus.PUBLISHED,
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
    monkeypatch.setenv("ENCRYPTION_KEY", "a" * 32)


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


def _patch_playwright(monkeypatch, *, update_side_effect=None):
    playwright_svc = AsyncMock()
    if update_side_effect is not None:
        playwright_svc.update.side_effect = update_side_effect
    monkeypatch.setattr(
        "prosell.infrastructure.services.playwright_publisher.PlaywrightPublisherService",
        lambda: playwright_svc,
    )
    return playwright_svc


class TestUpdateListingTaskHappyPath:
    @pytest.mark.asyncio
    async def test_update_success(self, monkeypatch):
        publication = _make_publication()
        _patch_dependencies(monkeypatch, publication)
        _patch_playwright(monkeypatch)

        result = await update_listing_task(str(publication.id))

        assert result.get("status") == "updated"
        assert result.get("fb_listing_id") == "fb_listing_123"


class TestUpdateListingTaskEarlyReturns:
    @pytest.mark.asyncio
    async def test_no_fb_listing_id_returns_skipped(self, monkeypatch):
        publication = _make_publication(fb_listing_id=None)
        _patch_dependencies(monkeypatch, publication)

        result = await update_listing_task(str(publication.id))

        assert result.get("status") == "skipped"

    @pytest.mark.asyncio
    async def test_blocked_publication_returns_without_updating(self, monkeypatch):
        publication = _make_publication(blocked_until_confirmed=True)
        _patch_dependencies(monkeypatch, publication)
        playwright_svc = _patch_playwright(monkeypatch)

        result = await update_listing_task(str(publication.id))

        assert result == {"status": "blocked", "publication_id": str(publication.id)}
        playwright_svc.update.assert_not_called()


class TestUpdateListingTaskSecretScrubbing:
    """The security finding this Stage 1.4 fix closes."""

    @pytest.mark.asyncio
    async def test_category_b_error_never_persists_the_decrypted_token(self, monkeypatch):
        publication = _make_publication()
        pub_repo, _ = _patch_dependencies(monkeypatch, publication)
        leaking_exc = Exception(f"Checkpoint required for session {DECRYPTED_TOKEN}")
        _patch_playwright(monkeypatch, update_side_effect=leaking_exc)

        result = await update_listing_task(str(publication.id))

        assert result.get("status") == "failed"
        assert result.get("category") == "B"
        assert DECRYPTED_TOKEN not in result.get("error", "")
        assert DECRYPTED_TOKEN not in (publication.error_message or "")
        assert "[REDACTED]" in (publication.error_message or "")
        persisted = pub_repo.update.await_args.args[0]
        assert DECRYPTED_TOKEN not in (persisted.error_message or "")

    @pytest.mark.asyncio
    async def test_category_a_error_never_returns_the_decrypted_token(self, monkeypatch):
        """Category A doesn't persist via mark_failed here (caller decides retry), but
        the returned error string must still be scrubbed before it can reach a log."""
        publication = _make_publication()
        _patch_dependencies(monkeypatch, publication)
        leaking_exc = Exception(f"Timeout calling FB API with token {DECRYPTED_TOKEN}")
        _patch_playwright(monkeypatch, update_side_effect=leaking_exc)

        result = await update_listing_task(str(publication.id))

        assert result.get("status") == "failed"
        assert result.get("category") == "A"
        assert DECRYPTED_TOKEN not in result.get("error", "")
