"""Unit tests for the DigitalOcean CDN invalidator adapter.

Pins the boundary between the application (`ICdnInvalidator`) and the
DO Spaces CDN provider. The adapter is intentionally thin — the policy
(retry vs. fail-fast) lives in the calling use case, not here.
"""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from prosell.domain.ports.i_cdn_invalidator import CdnInvalidationError
from prosell.infrastructure.services.cdn_invalidator_do import (
    DigitalOceanCdnInvalidator,
)

PURGE_URL = "https://api.digitalocean.com/v2/cdn/endpoints/abc/purge"
BEARER = "test-bearer-token"


def _build(*, status_code: int = 204) -> MagicMock:
    """Build a mocked httpx.AsyncClient that returns the given status."""
    client = MagicMock()
    response = MagicMock()
    response.status_code = status_code
    response.text = ""
    client.post = AsyncMock(return_value=response)
    return client


class TestDigitalOceanCdnInvalidatorHappyPath:
    """2xx responses are treated as success, no exception."""

    @pytest.mark.asyncio
    async def test_204_response_succeeds(self) -> None:
        client = _build(status_code=204)
        invalidator = DigitalOceanCdnInvalidator(
            purge_url=PURGE_URL,
            bearer_token=BEARER,
            client=client,  # type: ignore[arg-type]
        )

        await invalidator.invalidate_key("orgs/t/products/p1.webp")

        client.post.assert_awaited_once()
        call_args = client.post.await_args
        url = call_args.args[0]
        kwargs = call_args.kwargs
        assert url == PURGE_URL
        assert kwargs["json"] == {"files": ["orgs/t/products/p1.webp"]}
        # Bearer token attached so ops can identify the project.
        assert kwargs["headers"]["Authorization"] == f"Bearer {BEARER}"


class TestDigitalOceanCdnInvalidatorFailurePaths:
    """Non-2xx responses and network errors are surfaced as
    `CdnInvalidationError` so the use case can decide whether to
    retry."""

    @pytest.mark.asyncio
    async def test_5xx_response_raises(self) -> None:
        client = _build(status_code=500)
        client.post.return_value.text = "internal server error"
        invalidator = DigitalOceanCdnInvalidator(
            purge_url=PURGE_URL,
            bearer_token=BEARER,
            client=client,  # type: ignore[arg-type]
        )

        with pytest.raises(CdnInvalidationError):
            await invalidator.invalidate_key("orgs/t/products/p1.webp")

    @pytest.mark.asyncio
    async def test_4xx_response_raises(self) -> None:
        client = _build(status_code=401)
        client.post.return_value.text = "unauthorized"
        invalidator = DigitalOceanCdnInvalidator(
            purge_url=PURGE_URL,
            bearer_token=BEARER,
            client=client,  # type: ignore[arg-type]
        )

        with pytest.raises(CdnInvalidationError):
            await invalidator.invalidate_key("orgs/t/products/p1.webp")

    @pytest.mark.asyncio
    async def test_network_error_raises(self) -> None:
        client = MagicMock()
        client.post = AsyncMock(side_effect=httpx.ConnectError("dns down"))
        invalidator = DigitalOceanCdnInvalidator(
            purge_url=PURGE_URL,
            bearer_token=BEARER,
            client=client,  # type: ignore[arg-type]
        )

        with pytest.raises(CdnInvalidationError):
            await invalidator.invalidate_key("orgs/t/products/p1.webp")


class TestDigitalOceanCdnInvalidatorConfig:
    """NFR5.1 — a missing purge URL fails fast at runtime."""

    @pytest.mark.asyncio
    async def test_missing_purge_url_raises(self) -> None:
        invalidator = DigitalOceanCdnInvalidator(
            purge_url="",
            bearer_token=BEARER,
            client=MagicMock(),  # type: ignore[arg-type]
        )

        with pytest.raises(CdnInvalidationError):
            await invalidator.invalidate_key("orgs/t/products/p1.webp")

    @pytest.mark.asyncio
    async def test_bearer_token_optional(self) -> None:
        """Production uses a bearer token; the adapter must still
        call the provider cleanly when it's omitted (dev/CI without
        credentials)."""
        client = _build(status_code=204)
        invalidator = DigitalOceanCdnInvalidator(
            purge_url=PURGE_URL,
            bearer_token=None,
            client=client,  # type: ignore[arg-type]
        )

        await invalidator.invalidate_key("orgs/t/products/p1.webp")

        call_args = client.post.await_args
        kwargs = call_args.kwargs
        assert "Authorization" not in kwargs["headers"]
