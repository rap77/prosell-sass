"""Use case: purge a product image with CDN-invalidation compensation.

When a seller replaces or deletes a product image the cache must be
dropped in the same flow (FR4.1, FR4.2) so the next signed URL fetch
returns the new bytes (or 404, for a delete). The synchronous purge is
best-effort — the CDN provider can be transiently down — so on failure
the use case:

  - Still deletes the storage object (or keeps the new image, depending
    on caller intent — this use case just orchestrates the CDN side).
  - Enqueues a Taskiq retry so the cache eviction eventually happens
    without blocking the client's response.
  - Logs the outcome (`success` / `queued_retry` per NFR4.2) without
    leaking the signed URL or the raw key into plain text.

The use case is the minimum piece the request handlers and the
prune-sold-galleries task both need; it does not own product reads
or DB writes — those stay at the caller.
"""

import logging

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.ports.i_cdn_invalidator import (
    CdnInvalidationError,
    ICdnInvalidator,
)
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher

logger = logging.getLogger(__name__)


# Public outcome labels surfaced to the caller for audit logging.
# Keep them stable: the structured logs in NFR4.2 match against these.
PURGE_OUTCOME_SUCCESS: str = "success"
PURGE_OUTCOME_QUEUED_RETRY: str = "queued_retry"
PURGE_OUTCOME_FAILED_NO_RETRY: str = "failed_no_retry"


class PurgeProductImageUseCase:
    """Run a synchronous CDN purge with a Taskiq-backed retry fallback.

    The caller (HTTP handler or scheduled task) is responsible for the
    storage-level delete and any DB mutation; this use case only
    orchestrates the CDN side and returns a string outcome for audit
    logging.
    """

    def __init__(
        self,
        invalidator: ICdnInvalidator,
        dispatcher: ITaskDispatcher,
        storage: IDOSpacesService,
    ) -> None:
        self._invalidator = invalidator
        self._dispatcher = dispatcher
        self._storage = storage

    async def execute(self, key: str) -> str:
        """Drop the CDN cache for `key`, with retry-on-failure.

        1. Try the synchronous invalidation. If it succeeds, delete
           the storage object (best-effort: a failure to delete from
           storage after a successful purge still returns
           `success` — the cache is clean, ops can clean up the
           orphan object on a later pass).
        2. If the invalidation raises CdnInvalidationError, enqueue a
           Taskiq retry. The storage delete still runs (the object is
           no longer referenced by the product), so the cache eviction
           is the only thing being compensated.
        3. If the Taskiq dispatch ALSO fails, return
           `failed_no_retry` so the caller can surface an ops alert —
           we never lose the new image, but the cache may stay stale
           until a human investigates.

        Returns:
            One of `PURGE_OUTCOME_SUCCESS`,
            `PURGE_OUTCOME_QUEUED_RETRY`,
            `PURGE_OUTCOME_FAILED_NO_RETRY`. Always non-None.
        """
        try:
            await self._invalidator.invalidate_key(key)
        except CdnInvalidationError as exc:
            # Synchronous purge failed: enqueue a retry. The storage
            # delete still happens below so the object doesn't linger
            # in the bucket forever.
            try:
                await self._dispatcher.dispatch_cdn_purge(key)
            except Exception as dispatch_exc:  # pragma: no cover — defensive
                logger.warning(
                    "CDN purge dispatch failed: key_prefix=%s reason=%s",
                    key.split("/", 1)[0],
                    str(dispatch_exc)[:200],
                )
                await self._safe_delete(key)
                return PURGE_OUTCOME_FAILED_NO_RETRY

            logger.info(
                "CDN purge queued for retry: key_prefix=%s reason=%s",
                key.split("/", 1)[0],
                str(exc)[:200],
            )
            await self._safe_delete(key)
            return PURGE_OUTCOME_QUEUED_RETRY

        await self._safe_delete(key)
        return PURGE_OUTCOME_SUCCESS

    async def _safe_delete(self, key: str) -> None:
        """Best-effort storage delete; never raises.

        The CDN purge is the contract the user cares about; the
        storage delete is housekeeping. A failure here is logged and
        swallowed so the use case still returns a clean outcome to
        the caller.
        """
        try:
            await self._storage.delete_file(key)
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning(
                "Storage delete failed after CDN purge: key_prefix=%s reason=%s",
                key.split("/", 1)[0],
                str(exc)[:200],
            )
