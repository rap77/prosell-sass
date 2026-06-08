"""Unit tests for the router-level image_urls tenant scope validator.

Defense in depth — three layers protect against cross-tenant image URLs:

1. DTO `field_validator` (create.py / update.py): rejects malformed URLs
   and non-http(s) schemes at the request boundary.
2. This helper (called from the router): rejects image_urls whose key
   does not start with `orgs/{caller_tenant_id}/` so cross-tenant data
   never reaches the DB in the first place.
3. `sign_image_urls` (image_router): drops cross-tenant keys at READ
   time as a final fail-closed guard.

The router-level check is the only layer with access to the auth
context (`current_user.tenant_id`) at WRITE time, so tenant scope
validation must live there — not in the DTO.
"""

from uuid import UUID

import pytest
from fastapi import HTTPException

from prosell.infrastructure.api.routers.product_router import (
    validate_image_urls_for_tenant,
)

CALLER_TENANT = UUID("11111111-1111-1111-1111-111111111111")
OTHER_TENANT = UUID("99999999-9999-9999-9999-999999999999")
BUCKET = "prosell-assets"


class TestValidateImageUrlsForTenant:
    """The helper must reject image_urls not under the caller's tenant prefix."""

    def test_empty_list_is_accepted(self) -> None:
        """No images is a valid input (clear/empty update case)."""
        validate_image_urls_for_tenant([], CALLER_TENANT)

    def test_caller_tenant_url_is_accepted(self) -> None:
        """A URL under the caller's tenant prefix passes."""
        url = f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/a.jpg"
        # No exception means accepted.
        validate_image_urls_for_tenant([url], CALLER_TENANT)

    def test_caller_tenant_with_https_url_is_accepted(self) -> None:
        """Production https URL under the caller's tenant prefix passes."""
        url = (
            f"https://prosell-assets.atl1.digitaloceanspaces.com/"
            f"{BUCKET}/orgs/{CALLER_TENANT}/vehicles/a.jpg"
        )
        validate_image_urls_for_tenant([url], CALLER_TENANT)

    def test_other_tenant_url_is_rejected(self) -> None:
        """A URL under a different tenant is rejected with 422."""
        url = f"http://minio:9000/{BUCKET}/orgs/{OTHER_TENANT}/vehicles/secret.jpg"
        with pytest.raises(HTTPException) as exc:
            validate_image_urls_for_tenant([url], CALLER_TENANT)
        assert exc.value.status_code == 422
        assert str(OTHER_TENANT) in str(exc.value.detail)

    def test_url_without_path_is_rejected(self) -> None:
        """A URL with no path (e.g. bare host) is rejected."""
        with pytest.raises(HTTPException) as exc:
            validate_image_urls_for_tenant(["http://minio:9000"], CALLER_TENANT)
        assert exc.value.status_code == 422

    def test_mixed_valid_and_invalid_is_rejected(self) -> None:
        """If ANY URL is cross-tenant, the whole request is rejected (atomic)."""
        good = f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/a.jpg"
        bad = f"http://minio:9000/{BUCKET}/orgs/{OTHER_TENANT}/vehicles/secret.jpg"
        with pytest.raises(HTTPException):
            validate_image_urls_for_tenant([good, bad], CALLER_TENANT)

    def test_url_with_no_bucket_segment_is_rejected(self) -> None:
        """A URL whose path has no bucket prefix (no second segment) is rejected.

        Real URLs always have /<bucket>/<key> in the path. Anything else
        is not a valid image storage URL and must be rejected to keep
        the DB clean and prevent smuggled external URLs.
        """
        with pytest.raises(HTTPException) as exc:
            validate_image_urls_for_tenant(
                [f"http://minio:9000/orgs/{OTHER_TENANT}/secret"],
                CALLER_TENANT,
            )
        assert exc.value.status_code == 422


class TestValidateImageUrlsForTenantAcceptsBareKeys:
    """Regression: the validator must accept BARE storage keys (post-migration
    canonical form `orgs/<tenant>/<rest>`), not only full URLs.

    The previous implementation did `urlparse(value).path.partition('/')` which
    strips the first path segment. For a bare key like
    `orgs/<uuid>/vehicles/file.jpg` the result was `<uuid>/vehicles/file.jpg`,
    which does NOT start with `orgs/<uuid>/` and was rejected as cross-tenant
    — breaking the new upload flow that persists the `key` returned by
    `POST /api/v1/images/upload`.
    """

    def test_caller_tenant_bare_key_is_accepted(self) -> None:
        """A bare key under the caller's tenant passes."""
        key = f"orgs/{CALLER_TENANT}/vehicles/abc.jpg"
        # No exception means accepted.
        validate_image_urls_for_tenant([key], CALLER_TENANT)

    def test_bare_key_deeply_nested_path_is_accepted(self) -> None:
        """Bare keys with multiple sub-paths (e.g. year/make dirs) pass."""
        key = f"orgs/{CALLER_TENANT}/vehicles/2024/toyota/corolla/x.jpg"
        validate_image_urls_for_tenant([key], CALLER_TENANT)

    def test_other_tenant_bare_key_is_rejected(self) -> None:
        """A bare key under a different tenant is rejected with 422."""
        key = f"orgs/{OTHER_TENANT}/vehicles/secret.jpg"
        with pytest.raises(HTTPException) as exc:
            validate_image_urls_for_tenant([key], CALLER_TENANT)
        assert exc.value.status_code == 422
        assert str(OTHER_TENANT) in str(exc.value.detail)

    def test_mixed_bare_key_and_url_is_accepted(self) -> None:
        """Mixed input (one bare key + one URL) is accepted when both are valid."""
        key = f"orgs/{CALLER_TENANT}/vehicles/k.jpg"
        url = f"http://minio:9000/{BUCKET}/orgs/{CALLER_TENANT}/vehicles/u.jpg"
        validate_image_urls_for_tenant([key, url], CALLER_TENANT)

    def test_mixed_bare_key_and_cross_tenant_url_is_rejected(self) -> None:
        """A valid bare key does NOT shield a cross-tenant URL in the same list."""
        key = f"orgs/{CALLER_TENANT}/vehicles/mine.jpg"
        bad_url = f"http://minio:9000/{BUCKET}/orgs/{OTHER_TENANT}/vehicles/secret.jpg"
        with pytest.raises(HTTPException):
            validate_image_urls_for_tenant([key, bad_url], CALLER_TENANT)
