"""Tests for delete_listing_task — found during backend decomposition Stage 1.4
investigation: this third task independently hand-constructed the same publisher
selector as publish_product_task/update_listing_task, and returns `str(exc)` on
delete failure the same way they did. Covers the shared-factory dedup and the same
secret-scrubbing fix, with no prior test coverage.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.domain.entities.publication import Publication, PublicationStatus
from prosell.infrastructure.tasks.use_cases.delete_listing_task import delete_listing_task

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
        "status": PublicationStatus.SOLD,
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


def _patch_playwright(monkeypatch, *, delete_side_effect=None):
    playwright_svc = AsyncMock()
    if delete_side_effect is not None:
        playwright_svc.delete.side_effect = delete_side_effect
    monkeypatch.setattr(
        "prosell.infrastructure.services.playwright_publisher.PlaywrightPublisherService",
        lambda: playwright_svc,
    )
    return playwright_svc


class TestDeleteListingTaskHappyPath:
    @pytest.mark.asyncio
    async def test_delete_success(self, monkeypatch):
        publication = _make_publication()
        _patch_dependencies(monkeypatch, publication)
        _patch_playwright(monkeypatch)

        result = await delete_listing_task(str(publication.id))

        assert result == {"status": "deleted", "fb_listing_id": "fb_listing_123"}


class TestDeleteListingTaskEarlyReturns:
    @pytest.mark.asyncio
    async def test_no_fb_listing_id_returns_skipped(self, monkeypatch):
        publication = _make_publication(fb_listing_id=None)
        _patch_dependencies(monkeypatch, publication)

        result = await delete_listing_task(str(publication.id))

        assert result == {"status": "skipped", "reason": "no fb_listing_id"}


class TestDeleteListingTaskSecretScrubbing:
    @pytest.mark.asyncio
    async def test_delete_failure_never_returns_the_decrypted_token(self, monkeypatch):
        publication = _make_publication()
        _patch_dependencies(monkeypatch, publication)
        leaking_exc = Exception(f"Timeout calling FB API with token {DECRYPTED_TOKEN}")
        _patch_playwright(monkeypatch, delete_side_effect=leaking_exc)

        result = await delete_listing_task(str(publication.id))

        assert result.get("status") == "fb_delete_failed"
        assert DECRYPTED_TOKEN not in result.get("error", "")
        assert "[REDACTED]" in result.get("error", "")
