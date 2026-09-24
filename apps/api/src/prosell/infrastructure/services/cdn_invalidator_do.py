"""DigitalOcean Spaces CDN invalidator.

The DO Spaces CDN exposes a `POST /v2/cdn/endpoints/<id>/purge` endpoint
to drop cached objects from the edge. This adapter is the thinnest
possible wrapper around that call — no batching, no caching, no retries
(those concerns live in the calling use case so the policy can be unit
tested in isolation).

When DO_CDN_ENDPOINT or DO_SPACES_CDN_PURGE_URL is not configured the
adapter raises a CdnInvalidationError so the application fails fast at
runtime (same posture as DOSpacesService for missing endpoints).
"""

import logging

import httpx

from prosell.core.config import settings
from prosell.domain.ports.i_cdn_invalidator import (
    CdnInvalidationError,
    ICdnInvalidator,
)

logger = logging.getLogger(__name__)


class DigitalOceanCdnInvalidator(ICdnInvalidator):
    """ICdnInvalidator implementation backed by DO Spaces CDN purge."""

    def __init__(
        self,
        purge_url: str | None = None,
        bearer_token: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        # ponytail: tests inject the URL + token explicitly so the
        # service constructor doesn't reach for settings (which would
        # block test-time env override). Default reads from settings.
        self._purge_url = purge_url if purge_url is not None else settings.do_spaces_cdn_purge_url
        self._bearer_token = (
            bearer_token if bearer_token is not None else settings.do_spaces_cdn_purge_token
        )
        # Async client is reentrant and shared across calls; tests
        # inject a Mock to assert on `post(...)` directly.
        self._client = client or httpx.AsyncClient()

    async def invalidate_key(self, key: str) -> None:
        """Drop the CDN's cached copy of `key`.

        Raises:
            CdnInvalidationError: When the purge URL is not configured
                (NFR5.1 fail-fast) or the provider confirms the
                invalidation failed.
        """
        if not self._purge_url:
            raise CdnInvalidationError("do_spaces_cdn_purge_url is not configured (NFR5.1).")

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self._bearer_token:
            headers["Authorization"] = f"Bearer {self._bearer_token}"

        try:
            response = await self._client.post(
                self._purge_url,
                headers=headers,
                json={"files": [key]},
            )
        except httpx.HTTPError as exc:
            raise CdnInvalidationError(f"CDN purge request failed for {key}: {exc}") from exc

        # Any 2xx counts as success. DO Spaces returns 204; some CDNs
        # return 200 with a body. Anything else is a real failure.
        if response.status_code // 100 != 2:
            raise CdnInvalidationError(
                f"CDN purge for {key} returned HTTP {response.status_code}: {response.text[:200]!r}"
            )

        # Audit trail without leaking the signed key into logs (the
        # key is non-secret but pre-signing a different key is the
        # easiest way to keep the log free of CDN-hosted hints).
        logger.info(
            "CDN purge success key_prefix=%s",
            key.split("/", 1)[0] if "/" in key else key,
        )
