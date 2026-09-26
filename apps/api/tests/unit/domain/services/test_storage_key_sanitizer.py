"""Unit tests for the shared storage-key sanitizer.

Single source of truth used by CreateProductUseCase, UpdateProductUseCase,
and scripts/sanitize_broken_image_keys.py -- these tests pin the exact
contract so the three consumers can't drift again (see the finding this
module was extracted to fix: the script and the two use cases had each
grown their own copy, and the copies had already diverged on which keys
count as "not a bare storage key")."""

from __future__ import annotations

from prosell.domain.services.storage_key_sanitizer import is_url, sanitize_storage_key, url_path

BAD_KEY = (
    "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
    "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
)
GOOD_KEY = (
    "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
    "WhatsApp_Image_2026-09-12_at_8.42.31_AM_1_.jpeg"
)

# The exact real production row (Chevrolet Traverse, prosellweb.com prod DB,
# 2026-09-26) that slipped past the first version of this sanitizer: a
# GENUINE production bug, not a hypothetical -- the bulk-upload flow wrote
# the full URL with the broken filename straight into `image_urls`, and the
# first `is_url` guard skipped the ENTIRE url (scheme, host, AND path)
# instead of just protecting the scheme/host.
BROKEN_PROD_URL = (
    "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
    "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
    "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
)
SANITIZED_PROD_URL = (
    "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
    "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
    "WhatsApp_Image_2026-09-12_at_8.44.04_AM_1_.jpeg"
)


class TestIsUrl:
    def test_http_is_url(self) -> None:
        assert is_url("http://localhost:9002/prosell-assets/vehicles/x.jpg") is True

    def test_https_is_url(self) -> None:
        assert is_url("https://prosell-assets.atl1.digitaloceanspaces.com/orgs/x.jpg") is True

    def test_bare_key_is_not_url(self) -> None:
        assert is_url("orgs/a-b-c-d/vehicles/e-f-g-h/x.jpg") is False

    def test_empty_string_is_not_url(self) -> None:
        assert is_url("") is False


class TestSanitizeStorageKey:
    def test_sanitizes_bad_storage_key(self) -> None:
        assert sanitize_storage_key(BAD_KEY) == GOOD_KEY

    def test_passes_clean_storage_key_unchanged(self) -> None:
        assert sanitize_storage_key(GOOD_KEY) == GOOD_KEY

    def test_leaves_http_url_unchanged(self) -> None:
        """Regression: real production data. Confirmed against staging
        DB -- most `image_urls`/`cover_image_key` rows are full public
        URLs written directly by the bulk-upload flow, not bare storage
        keys. Without the URL guard, the scheme gets mangled
        (`http://` -> `http_//`), corrupting a perfectly healthy row."""
        url = (
            "http://localhost:9002/prosell-assets/vehicles/"
            "d49b7917-81f2-4c1e-b502-4abdaae81128/1.jpeg"
        )
        assert sanitize_storage_key(url) == url

    def test_leaves_clean_https_url_unchanged(self) -> None:
        url = "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/vehicles/clean.jpeg"
        assert sanitize_storage_key(url) == url

    def test_sanitizes_broken_filename_inside_a_url_path(self) -> None:
        """Regression: the exact real production row that slipped past
        the FIRST version of this fix. A URL is not automatically
        healthy just because it's a URL -- the bulk-upload flow writes
        the raw, unencoded phone-cam filename straight into the URL's
        path, same as it would into a bare key. Only skipping
        sanitization for the whole URL (instead of just its
        scheme/host) left this row broken after the first deploy."""
        assert sanitize_storage_key(BROKEN_PROD_URL) == SANITIZED_PROD_URL

    def test_preserves_port_in_url_host(self) -> None:
        """The guard must not eat a legitimate port separator while
        fixing a broken path alongside it."""
        url = "http://localhost:9002/prosell-assets/vehicles/e-f-g-h/bad name (1).jpg"
        expected = "http://localhost:9002/prosell-assets/vehicles/e-f-g-h/bad_name_1_.jpg"
        assert sanitize_storage_key(url) == expected

    def test_legacy_vehicles_prefix_sanitized_too(self) -> None:
        bad = "vehicles/56e652de-c522-4664-a977-4bb18586f2fa/bad name.jpg"
        assert sanitize_storage_key(bad) == (
            "vehicles/56e652de-c522-4664-a977-4bb18586f2fa/bad_name.jpg"
        )

    def test_handles_empty_string(self) -> None:
        assert sanitize_storage_key("") == ""

    def test_is_idempotent(self) -> None:
        once = sanitize_storage_key(BAD_KEY)
        twice = sanitize_storage_key(once)
        assert once == twice

    def test_is_idempotent_for_a_broken_url(self) -> None:
        once = sanitize_storage_key(BROKEN_PROD_URL)
        twice = sanitize_storage_key(once)
        assert once == twice

    def test_collapses_runs_of_underscores(self) -> None:
        assert sanitize_storage_key("a ( b.jpg") == "a_b.jpg"

    def test_does_not_alter_uuid_or_vin_segments(self) -> None:
        key = "orgs/aaaa-bbbb-cccc-dddd/vehicles/eeee-ffff-gggg-hhhh/1FMSK7DH7LGA77418/x.jpg"
        assert sanitize_storage_key(key) == key


class TestUrlPath:
    def test_returns_path_only(self) -> None:
        assert url_path("https://host:9002/prosell-assets/x.jpg") == "/prosell-assets/x.jpg"

    def test_returns_path_for_broken_prod_url(self) -> None:
        assert url_path(BROKEN_PROD_URL).endswith(
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
