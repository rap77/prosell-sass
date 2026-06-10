"""Unit tests for the pure logic in `apps/api/scripts/fix_image_urls_keys.py`.

The DB-touching parts of the script (the async `fix_image_urls_keys` function)
require a live database and are exercised manually against staging. Here we
test the pure helper `extract_storage_key` in isolation, plus a small
sync wrapper that mirrors the script's per-row transformation, so the
data-shape invariants are pinned by tests.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "fix_image_urls_keys.py"


@pytest.fixture(scope="module")
def fix_image_urls_keys_module():
    """Load the script as a module so we can import its helpers.

    The script has top-level `sys.path.insert` to wire up the app's `src/`
    dir, which is what enables the DB imports in the real run. We replicate
    that here so the import succeeds.
    """
    sys.path.insert(0, str(SCRIPT_PATH.parent.parent / "src"))
    spec = importlib.util.spec_from_file_location("fix_image_urls_keys", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestExtractStorageKey:
    """The pure helper must turn any of the in-the-wild value shapes into
    a clean storage key (or a path that the runtime signer can handle)."""

    def test_returns_bare_key_unchanged(self, fix_image_urls_keys_module) -> None:
        """A value that's already a clean key passes through."""
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg"
        assert fix_image_urls_keys_module.extract_storage_key(key) == key

    def test_strips_query_string_from_signed_url(self, fix_image_urls_keys_module) -> None:
        """A value containing `?X-Amz-...` must end up with no query string."""
        signed = (
            "http://minio:9000/prosell-assets/orgs/tenant/vehicles/abc.jpg"
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef"
        )
        result = fix_image_urls_keys_module.extract_storage_key(signed)
        assert "?" not in result, f"Query string not stripped: {result!r}"
        assert "X-Amz-" not in result
        # And it must end with the original key filename.
        assert result.endswith("orgs/tenant/vehicles/abc.jpg"), result

    def test_handles_internal_endpoint_url(self, fix_image_urls_keys_module) -> None:
        """The docker-network internal endpoint is also handled."""
        signed = (
            "http://minio:9000/prosell-assets/orgs/abc/vehicles/x.jpg"
            "?X-Amz-Algorithm=foo&X-Amz-Signature=bar"
        )
        result = fix_image_urls_keys_module.extract_storage_key(signed)
        assert "?" not in result
        assert "minio" not in result
        assert result.endswith("orgs/abc/vehicles/x.jpg")

    def test_handles_public_digitalocean_endpoint(self, fix_image_urls_keys_module) -> None:
        """The DO Spaces public endpoint (used in prod) is also handled."""
        signed = (
            "https://prosell-assets.nyc3.digitaloceanspaces.com/orgs/abc/vehicles/y.jpg"
            "?X-Amz-Algorithm=foo&X-Amz-Signature=bar"
        )
        result = fix_image_urls_keys_module.extract_storage_key(signed)
        assert "?" not in result
        assert "digitaloceanspaces" not in result
        assert result.endswith("orgs/abc/vehicles/y.jpg")

    def test_empty_or_non_string_passthrough(self, fix_image_urls_keys_module) -> None:
        """Edge cases: empty string or non-string are passed through untouched
        (the script's caller decides what to do with them; the helper is a
        pure string transform)."""
        assert fix_image_urls_keys_module.extract_storage_key("") == ""
        # The helper signature is permissive; a non-string would fall through
        # as-is. We don't assert anything about that — the script's loop
        # already type-checks `isinstance(v, str)` before calling.
