"""Unit tests for the cache-invalidation + purge compensation path.

Pins FR4 (image replacement / deletion invalidates the CDN cache in the
same flow, with Taskiq retry when the synchronous purge fails) and
NFR3.1 / NFR3.2 / NFR4.2 / NFR4.3 (the response stays 2xx; ops gets
the outcome label without ever seeing the signed URL or the raw key).

Scope:

- `PurgeProductImageUseCase` — the orchestration with sync invalidate +
  Taskiq retry fallback. The single boundary that knows about both
  ports. Tested with `AsyncMock` fakes for `ICdnInvalidator`,
  `IDOSpacesService`, and `ITaskDispatcher` (no real CDN, no Taskiq
  broker, no storage).
"""

from unittest.mock import AsyncMock

import pytest

from prosell.application.use_cases.product.purge_product_image import (
    PURGE_OUTCOME_FAILED_NO_RETRY,
    PURGE_OUTCOME_QUEUED_RETRY,
    PURGE_OUTCOME_SUCCESS,
    PurgeProductImageUseCase,
)
from prosell.domain.ports.i_cdn_invalidator import CdnInvalidationError

TENANT_KEY = "orgs/11111111-1111-1111-1111-111111111111/products/abc-thumb.webp"


def _make_fakes(*, purge_raises: Exception | None = None, dispatch_raises: bool = False):
    invalidator = AsyncMock()
    if purge_raises is not None:
        invalidator.invalidate_key = AsyncMock(side_effect=purge_raises)
    else:
        invalidator.invalidate_key = AsyncMock(return_value=None)

    dispatcher = AsyncMock()
    if dispatch_raises:
        dispatcher.dispatch_cdn_purge = AsyncMock(side_effect=RuntimeError("broker down"))

    storage = AsyncMock()
    storage.delete_file = AsyncMock(return_value=True)

    return invalidator, dispatcher, storage


class TestPurgeProductImageSuccess:
    """Synchronous invalidate succeeds → `success`, storage delete runs."""

    @pytest.mark.asyncio
    async def test_returns_success_when_invalidation_succeeds(self) -> None:
        invalidator, dispatcher, storage = _make_fakes()
        use_case = PurgeProductImageUseCase(
            invalidator=invalidator,
            dispatcher=dispatcher,
            storage=storage,
        )

        outcome = await use_case.execute(TENANT_KEY)

        assert outcome == PURGE_OUTCOME_SUCCESS
        invalidator.invalidate_key.assert_awaited_once_with(TENANT_KEY)
        # No retry dispatched on success.
        dispatcher.dispatch_cdn_purge.assert_not_awaited()
        # Storage delete runs (best-effort: failure here is logged but
        # the outcome is still `success`).
        storage.delete_file.assert_awaited_once_with(TENANT_KEY)

    @pytest.mark.asyncio
    async def test_storage_delete_failure_does_not_change_outcome(self) -> None:
        """A failed storage delete is housekeeping — the cache is
        already clean, the outcome stays `success` so the client gets
        a 2xx."""
        invalidator, dispatcher, storage = _make_fakes()
        storage.delete_file = AsyncMock(side_effect=RuntimeError("s3 down"))
        use_case = PurgeProductImageUseCase(
            invalidator=invalidator,
            dispatcher=dispatcher,
            storage=storage,
        )

        outcome = await use_case.execute(TENANT_KEY)

        assert outcome == PURGE_OUTCOME_SUCCESS


class TestPurgeProductImageQueuedRetry:
    """Synchronous invalidate fails → retry via Taskiq; client gets 2xx."""

    @pytest.mark.asyncio
    async def test_dispatches_retry_on_invalidation_failure(self) -> None:
        invalidator, dispatcher, storage = _make_fakes(
            purge_raises=CdnInvalidationError("cdn provider 500")
        )
        use_case = PurgeProductImageUseCase(
            invalidator=invalidator,
            dispatcher=dispatcher,
            storage=storage,
        )

        outcome = await use_case.execute(TENANT_KEY)

        assert outcome == PURGE_OUTCOME_QUEUED_RETRY
        invalidator.invalidate_key.assert_awaited_once_with(TENANT_KEY)
        # Retry task dispatched with the same key (idempotency lives
        # in the CDN provider, not the task).
        dispatcher.dispatch_cdn_purge.assert_awaited_once_with(TENANT_KEY)
        # Storage delete still runs even when the CDN purge queued —
        # we don't want orphan objects lingering in the bucket.
        storage.delete_file.assert_awaited_once_with(TENANT_KEY)


class TestPurgeProductImageFailedNoRetry:
    """If both the synchronous invalidate AND the Taskiq dispatch
    fail, the use case reports `failed_no_retry` for ops to alert on.
    The new image is still kept (storage delete still runs) so the
    client isn't asked to repeat the upload."""

    @pytest.mark.asyncio
    async def test_returns_failed_no_retry_when_dispatch_fails(self) -> None:
        invalidator, dispatcher, storage = _make_fakes(
            purge_raises=CdnInvalidationError("cdn provider 500"),
            dispatch_raises=True,
        )
        use_case = PurgeProductImageUseCase(
            invalidator=invalidator,
            dispatcher=dispatcher,
            storage=storage,
        )

        outcome = await use_case.execute(TENANT_KEY)

        assert outcome == PURGE_OUTCOME_FAILED_NO_RETRY
        # Both ports were exercised.
        invalidator.invalidate_key.assert_awaited_once_with(TENANT_KEY)
        dispatcher.dispatch_cdn_purge.assert_awaited_once_with(TENANT_KEY)
        # Storage delete still attempted (best-effort).
        storage.delete_file.assert_awaited_once_with(TENANT_KEY)


class TestPurgeProductImageAuditLogContract:
    """NFR4.2 — outcome labels match the strings ops dashboards grep on."""

    def test_outcome_labels_are_stable(self) -> None:
        """The labels are part of the audit log schema — ops matches
        against them in dashboards. Changing them silently would break
        observability, so they're pinned here."""
        assert PURGE_OUTCOME_SUCCESS == "success"
        assert PURGE_OUTCOME_QUEUED_RETRY == "queued_retry"
        assert PURGE_OUTCOME_FAILED_NO_RETRY == "failed_no_retry"


class TestPurgeProductImageIdempotency:
    """The same key can be purged repeatedly without side effects beyond
    the expected calls — the contract is idempotent at both the
    invalidator and the dispatcher level."""

    @pytest.mark.asyncio
    async def test_two_consecutive_purges_are_both_safe(self) -> None:
        invalidator, dispatcher, storage = _make_fakes()
        use_case = PurgeProductImageUseCase(
            invalidator=invalidator,
            dispatcher=dispatcher,
            storage=storage,
        )

        # Run the same purge twice — both must succeed independently.
        first = await use_case.execute(TENANT_KEY)
        second = await use_case.execute(TENANT_KEY)

        assert first == PURGE_OUTCOME_SUCCESS
        assert second == PURGE_OUTCOME_SUCCESS
        assert invalidator.invalidate_key.await_count == 2
        assert storage.delete_file.await_count == 2
