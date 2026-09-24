"""purge_cdn_cache_task — Taskiq worker task for retrying CDN invalidations.

When a synchronous purge fails (transient CDN outage, network blip), the
HTTP request handler catches the failure and enqueues this task so the
client gets a 2xx (NFR3.1, NFR3.2). The task re-runs the same
invalidation against the CDN and logs the outcome (success /
failed_after_retry per NFR4.2) without ever logging the signed URL or
the raw key.

Idempotence: the CDN provider's POST /purge is itself idempotent (calling
it twice for the same key yields the same end state — the cache entry
is gone). The task is therefore safe to retry on demand.
"""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def purge_cdn_cache_task(key: str) -> dict[str, str]:
    """Retry a CDN cache invalidation for `key`.

    Returns a small status dict for the worker's audit log; never
    raises so a worker-side failure (broken env, dead broker, etc.)
    doesn't crash the surrounding Taskiq scheduler.
    """
    from prosell.domain.ports.i_cdn_invalidator import CdnInvalidationError
    from prosell.infrastructure.services.cdn_invalidator_do import (
        DigitalOceanCdnInvalidator,
    )

    try:
        await DigitalOceanCdnInvalidator().invalidate_key(key)
        return {"status": "success", "key_prefix": key.split("/", 1)[0]}
    except CdnInvalidationError as exc:
        # NFR4.2 — record the retry outcome without leaking the key.
        return {
            "status": "failed_after_retry",
            "key_prefix": key.split("/", 1)[0],
            "reason": str(exc)[:200],
        }
    except Exception as exc:  # pragma: no cover — defensive
        return {
            "status": "failed_after_retry",
            "key_prefix": key.split("/", 1)[0],
            "reason": f"unexpected: {type(exc).__name__}",
        }
