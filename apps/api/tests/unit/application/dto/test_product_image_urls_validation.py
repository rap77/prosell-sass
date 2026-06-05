"""Unit tests for the image_urls field validator on Product DTOs.

Defense in depth — second layer that rejects malformed/non-http(s) image
URLs at the DTO boundary. The signer (infrastructure) already enforces
tenant scope (sign_image_urls drops cross-tenant keys), and the router
enforces tenant scope on incoming image_urls (validate_image_urls_for_tenant).
This layer rejects obvious bad input early so the use case and
infrastructure layers can assume well-formed URLs.

Tenant scope (orgs/{tenant_id}/ prefix) is enforced separately at the
router layer because the DTO is parsed before the auth context is
available. See test_product_image_urls_tenant_scope.py for that check.
"""

from uuid import UUID

import pytest
from pydantic import ValidationError

from prosell.application.dto.product import CreateProductRequest, UpdateProductRequest

CATEGORY_ID = UUID("11111111-1111-1111-1111-111111111111")


class TestCreateProductRequestImageUrlsValidation:
    """CreateProductRequest.image_urls must be a list of valid http(s) URLs."""

    def _valid_create(self, image_urls):
        return CreateProductRequest(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            category_id=CATEGORY_ID,
            image_urls=image_urls,
        )

    def test_valid_https_url_is_accepted(self) -> None:
        """A valid https URL passes the validator."""
        url = "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/vehicles/img.jpg"
        request = self._valid_create([url])
        assert request.image_urls == [url]

    def test_valid_http_url_is_accepted_for_dev(self) -> None:
        """Internal minio uses http in dev — http scheme is also allowed."""
        url = "http://minio:9000/prosell-assets/orgs/abc/vehicles/img.jpg"
        request = self._valid_create([url])
        assert request.image_urls == [url]

    def test_empty_list_is_accepted(self) -> None:
        """An empty image_urls list is valid (no images on this product)."""
        request = self._valid_create([])
        assert request.image_urls == []

    def test_default_empty_list_is_accepted(self) -> None:
        """The default (no image_urls field sent) is an empty list."""
        request = CreateProductRequest(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            category_id=CATEGORY_ID,
        )
        assert request.image_urls == []

    @pytest.mark.parametrize(
        "bad_url",
        [
            "",
            "   ",
            "not-a-url",
            "://missing-scheme",
            "file:///etc/passwd",
            "ftp://server/file",
            "javascript:alert(1)",
            "data:text/plain,hello",
        ],
    )
    def test_non_url_or_dangerous_scheme_is_rejected(self, bad_url: str) -> None:
        """Non-URL strings and non-http(s) schemes must be rejected."""
        with pytest.raises(ValidationError) as exc:
            self._valid_create([bad_url])
        assert "image_urls" in str(exc.value)

    # ─── Storage key acceptance (canonical form post-migration) ────────────
    #
    # After the migration from signed URLs in DB to raw S3 keys, the system
    # persists keys like `orgs/<tenant-uuid>/vehicles/<file>.jpg` and signs
    # them on read via the dedicated /image-urls endpoint. The DTO must
    # accept this canonical form so that the edit form (which already
    # extracts keys from signed URLs) can round-trip them through PATCH.

    def test_raw_storage_key_is_accepted(self) -> None:
        """A bare storage key (orgs/<uuid>/vehicles/<file>) passes."""
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg"
        request = self._valid_create([key])
        assert request.image_urls == [key]

    def test_raw_storage_key_with_subfolder_is_accepted(self) -> None:
        """A bare key with nested subfolders is accepted."""
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/2025/01/abc.webp"
        request = self._valid_create([key])
        assert request.image_urls == [key]

    @pytest.mark.parametrize(
        "bad_key",
        [
            "vehicles/abc.jpg",  # missing orgs/<uuid>/ prefix
            "orgs/not-a-uuid/vehicles/abc.jpg",  # tenant segment not a UUID
            "orgs/11111111-1111-1111-1111-111111111111/../etc/passwd",  # traversal
            "/orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg",  # leading slash
        ],
    )
    def test_malformed_storage_key_is_rejected(self, bad_key: str) -> None:
        """A string that looks key-like but is malformed is rejected."""
        with pytest.raises(ValidationError) as exc:
            self._valid_create([bad_key])
        assert "image_urls" in str(exc.value)


class TestUpdateProductRequestImageUrlsValidation:
    """UpdateProductRequest.image_urls must be a list of valid http(s) URLs."""

    def _valid_update(self, image_urls):
        return UpdateProductRequest(image_urls=image_urls)

    def test_valid_https_url_is_accepted(self) -> None:
        url = "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/vehicles/img.jpg"
        request = self._valid_update([url])
        assert request.image_urls == [url]

    def test_valid_http_url_is_accepted_for_dev(self) -> None:
        url = "http://minio:9000/prosell-assets/orgs/abc/vehicles/img.jpg"
        request = self._valid_update([url])
        assert request.image_urls == [url]

    def test_none_is_accepted_for_partial_update(self) -> None:
        """None means 'do not change this field' (PATCH semantics)."""
        request = self._valid_update(None)
        assert request.image_urls is None

    @pytest.mark.parametrize(
        "bad_url",
        [
            "",
            "   ",
            "not-a-url",
            "file:///etc/passwd",
            "javascript:alert(1)",
        ],
    )
    def test_non_url_or_dangerous_scheme_is_rejected(self, bad_url: str) -> None:
        with pytest.raises(ValidationError) as exc:
            self._valid_update([bad_url])
        assert "image_urls" in str(exc.value)

    # ─── Storage key acceptance (canonical form post-migration) ────────────
    #
    # Mirrors the Create tests above. Update must accept the same canonical
    # form so the edit form can round-trip keys without converting them to
    # signed URLs (which would expire in 1h and trigger the data corruption
    # bug we just fixed).

    def test_raw_storage_key_is_accepted(self) -> None:
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg"
        request = self._valid_update([key])
        assert request.image_urls == [key]

    def test_raw_storage_key_with_subfolder_is_accepted(self) -> None:
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/2025/01/abc.webp"
        request = self._valid_update([key])
        assert request.image_urls == [key]

    @pytest.mark.parametrize(
        "bad_key",
        [
            "vehicles/abc.jpg",
            "orgs/not-a-uuid/vehicles/abc.jpg",
            "orgs/11111111-1111-1111-1111-111111111111/../etc/passwd",
            "/orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg",
        ],
    )
    def test_malformed_storage_key_is_rejected(self, bad_key: str) -> None:
        with pytest.raises(ValidationError) as exc:
            self._valid_update([bad_key])
        assert "image_urls" in str(exc.value)
