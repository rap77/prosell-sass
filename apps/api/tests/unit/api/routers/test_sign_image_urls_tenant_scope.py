"""Unit tests for the tenant-scope guard in sign_image_urls.

Two invariants pinned here (security-critical — see security review):

1. **Cross-tenant rejection**: A key that does NOT start with
   `orgs/{caller_tenant_id}/` MUST NOT be presigned. Otherwise an attacker
   who can write a foreign key into image_urls (via IDOR on
   UpdateProductRequest) gets the API to mint a presigned URL for another
   tenant's image — a cross-tenant data exposure.

2. **Fail-closed drop**: If a URL in image_urls cannot be parsed (doesn't
   contain the bucket name), the entry MUST be dropped from the output
   rather than passed through as-is. Otherwise an attacker can smuggle
   external URLs (or pre-signed URLs with arbitrary signatures) into the
   response by stuffing them into image_urls.
"""

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from prosell.infrastructure.api.routers.image_router import sign_image_urls

CALLER_TENANT = UUID("11111111-1111-1111-1111-111111111111")
OTHER_TENANT = UUID("99999999-9999-9999-9999-999999999999")
BUCKET = "prosell-assets"


def _spaces() -> AsyncMock:
    """Spaces mock that only signs keys it receives — used to detect unauthorized calls."""
    spaces = AsyncMock()
    spaces.bucket = BUCKET
    # If the helper calls generate_download_url, raise so the test fails loudly
    spaces.generate_download_url = AsyncMock(
        side_effect=lambda key: (_ for _ in ()).throw(
            AssertionError(f"sign_image_urls must NOT call generate_download_url for key: {key!r}")
        )
    )
    return spaces


class TestSignImageURLsTenantScope:
    """Cross-tenant keys must be dropped, not signed."""

    @pytest.mark.asyncio
    async def test_keys_for_caller_tenant_are_signed(self) -> None:
        """Keys under the caller's tenant prefix are signed normally."""
        spaces = AsyncMock()
        spaces.bucket = BUCKET
        spaces.generate_download_url = AsyncMock(
            side_effect=lambda key: f"http://localhost:9000/{BUCKET}/{key}?X-Amz-Signature=ok"
        )

        urls = [f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/a.jpg"]
        signed = await sign_image_urls(urls, spaces, tenant_id=CALLER_TENANT)

        assert len(signed) == 1
        assert "X-Amz-Signature=" in signed[0]
        # And signer was called with the right key
        spaces.generate_download_url.assert_called_once_with(
            f"orgs/{CALLER_TENANT}/vehicles/a.jpg"
        )

    @pytest.mark.asyncio
    async def test_keys_for_other_tenant_are_dropped(self) -> None:
        """A URL whose key belongs to a different tenant must be dropped, NOT signed.

        The signer must not be called for cross-tenant keys. If it were, an
        attacker controlling image_urls could mint presigned URLs to read
        any tenant's objects.
        """
        spaces = _spaces()  # raises if generate_download_url is called
        foreign_url = f"http://minio:9000/{BUCKET}/orgs/{OTHER_TENANT}/vehicles/secret.jpg"

        signed = await sign_image_urls([foreign_url], spaces, tenant_id=CALLER_TENANT)

        # The foreign URL is dropped, NOT signed, NOT passed through
        assert signed == [], (
            f"Cross-tenant key was not dropped; output: {signed!r}. "
            "This would allow cross-tenant data exposure via presigned URLs."
        )
        # And the signer was NEVER called
        spaces.generate_download_url.assert_not_called()

    @pytest.mark.asyncio
    async def test_mixed_tenant_urls_only_sign_caller_tenant(self) -> None:
        """When the list mixes caller's and foreign keys, only the caller's are signed."""
        spaces = AsyncMock()
        spaces.bucket = BUCKET
        spaces.generate_download_url = AsyncMock(
            side_effect=lambda key: f"http://localhost:9000/{BUCKET}/{key}?X-Amz-Signature=ok"
        )

        urls = [
            f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/mine.jpg",
            f"http://minio:9000/{BUCKET}/orgs/{OTHER_TENANT}/vehicles/theirs.jpg",
            f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/mine2.jpg",
        ]

        signed = await sign_image_urls(urls, spaces, tenant_id=CALLER_TENANT)

        # Only the 2 caller-tenant entries are signed; the foreign one is dropped
        assert len(signed) == 2
        for s in signed:
            assert f"/{CALLER_TENANT}/" in s
        # Signer was called exactly twice (once per caller-tenant key)
        assert spaces.generate_download_url.await_count == 2


class TestSignImageURLsFailClosed:
    """Unparseable URLs must be DROPPED, not passed through as-is."""

    @pytest.mark.asyncio
    async def test_url_without_bucket_is_dropped(self) -> None:
        """A URL that doesn't contain the bucket name is unparseable: drop it.

        Returning the original URL would let an attacker smuggle external
        URLs (or attacker-controlled pre-signed URLs) into the response,
        bypassing the signing logic and the next/image allowlist.
        """
        spaces = _spaces()  # raises if generate_download_url is called

        # External URL with no bucket substring
        external = "https://attacker.example.com/some/path.jpg"

        signed = await sign_image_urls([external], spaces, tenant_id=CALLER_TENANT)

        assert signed == [], (
            f"Unparseable URL was passed through as-is: {signed!r}. "
            "This is a fail-open: external URLs leak into the response."
        )
        spaces.generate_download_url.assert_not_called()

    @pytest.mark.asyncio
    async def test_garbage_input_is_dropped(self) -> None:
        """Malformed strings that aren't URLs at all are dropped, not echoed back."""
        spaces = _spaces()

        garbage = ["not-a-url", "javascript:alert(1)", "", "   "]

        signed = await sign_image_urls(garbage, spaces, tenant_id=CALLER_TENANT)

        assert signed == [], (
            f"Garbage input was passed through: {signed!r}. "
            "Each unparseable entry must be dropped, not echoed."
        )
        spaces.generate_download_url.assert_not_called()
