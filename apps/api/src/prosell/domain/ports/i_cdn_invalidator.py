"""ICdnInvalidator — Port for CDN cache invalidation.

The catalog grid fetches signed URLs through a CDN so the CDN caches the
response on first hit and proxies to origin on miss (FR3.1). When a
product image is replaced or deleted, the CDN must drop its cached copy
of the OLD key in the same flow so the next signed URL fetch is forced
to origin (FR4.1, FR4.2).

The port is the minimum the application needs from any CDN provider:

    - invalidate_key(key) tries to drop the cached copy and returns the
      provider's success/failure as-is. The caller decides what to do on
      failure (queue a retry, alert ops, etc.) — keeping that policy out
      of the port avoids pinning a single CDN's semantics in domain code.
"""

from abc import ABC, abstractmethod


class CdnInvalidationError(Exception):
    """Raised when the CDN provider fails to confirm the invalidation.

    The application catches this in the purge use case and falls back to
    a queued retry so the client still gets a 2xx (NFR3.1, NFR3.2).
    """


class ICdnInvalidator(ABC):
    """Port for invalidating a single cached object on the CDN."""

    @abstractmethod
    async def invalidate_key(self, key: str) -> None:
        """Drop the CDN's cached copy of `key`.

        The implementation may use any mechanism the CDN provider
        exposes (DO Spaces `POST /v2/cdn/endpoints/<id>/purge`, Fastly
        `POST /service/<id>/purge`, CloudFront `CreateInvalidation`,
        etc.). The port only pins the contract.

        Args:
            key: The bare storage key (e.g.
                `orgs/<tenant>/products/<uuid>-thumb.webp`). The CDN
                implementation is responsible for mapping the key to
                whatever path the provider expects.

        Raises:
            CdnInvalidationError: If the provider confirms the
                invalidation failed (network error, 4xx/5xx response,
                auth issue). The caller treats this as a retryable
                failure.
        """
        pass
