"""Unit tests for the logic in
`apps/api/scripts/sanitize_broken_image_keys.py`.

The DB-touching parts of the script require live infrastructure and are
exercised manually against staging/prod. Here we test the pure helpers
(`sanitize_storage_key`, `is_legacy_bad_key`, `find_renames_for_product`,
`_dedupe_renames`) plus `rename_in_storage` against a mocked S3 client
-- that last piece was previously untested with the same "exercise
manually against prod" rationale, which is exactly how a real
production incident slipped through: `PendingRename.old_key`/`new_key`
are the full-URL DB representation, but every S3 call needs the bare
key, and the first version of this function passed the raw URL straight
through, 404ing every single CopyObject the first time it ran for
real."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "sanitize_broken_image_keys.py"


@pytest.fixture(scope="module")
def module():
    """Load the script as a module so we can import its helpers.

    The script has top-level `sys.path.insert` to wire up the app's
    `src/` dir, which is what enables the `prosell.*` imports in the
    real run. We replicate that here so the import succeeds.

    The fixture also registers the module in `sys.modules` before
    executing it -- `@dataclass` (which `PendingRename` uses) looks
    itself up via `sys.modules[<module_name>]` during class body
    evaluation, and `importlib.util.spec_from_file_location` does
    NOT auto-register. Without this, the dataclass raises
    `AttributeError: 'NoneType' object has no attribute '__dict__'`.
    """
    sys.path.insert(0, str(SCRIPT_PATH.parent.parent / "src"))
    spec = importlib.util.spec_from_file_location("sanitize_broken_image_keys", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules["sanitize_broken_image_keys"] = mod
    spec.loader.exec_module(mod)
    return mod


class TestSanitizeStorageKey:
    """The pure sanitizer must rewrite phone-cam filenames to the safe
    alphabet (`[A-Za-z0-9._-]`) without touching UUID/VIN segments."""

    def test_passes_clean_key_unchanged(self, module) -> None:
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg"
        assert module.sanitize_storage_key(key) == key

    def test_normalizes_phone_cam_filename(self, module) -> None:
        """Regression: the production bug's exact key shape. Spaces +
        parens in `WhatsApp Image ... (1).jpeg` are the canonical
        failure case."""
        key = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
            "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
        )
        expected = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
            "WhatsApp_Image_2026-09-12_at_8.42.31_AM_1_.jpeg"
        )
        assert module.sanitize_storage_key(key) == expected

    def test_does_not_alter_uuid_or_vin_segments(self, module) -> None:
        """Defensive: ensure normalization doesn't touch segments that
        are already in the safe alphabet (UUIDs, VINs). A copy+paste
        regression that targets the wrong regex would corrupt these."""
        key = "orgs/aaaa-bbbb-cccc-dddd/vehicles/eeee-ffff-gggg-hhhh/1FMSK7DH7LGA77418/x.jpg"
        assert module.sanitize_storage_key(key) == key

    def test_normalizes_subfolders_too(self, module) -> None:
        """If a subfolder (not just the filename) has a bad char, it
        also gets normalized."""
        key = "orgs/a-b-c-d/vehicles/e-f-g-h/My Folder/x.jpg"
        # The space in `My Folder` becomes `_`, the filename is clean.
        assert module.sanitize_storage_key(key) == ("orgs/a-b-c-d/vehicles/e-f-g-h/My_Folder/x.jpg")

    def test_collapses_runs_of_underscores(self, module) -> None:
        """Adjacent disallowed chars must collapse to a single `_`."""
        assert module.sanitize_storage_key("a ( b.jpg") == "a_b.jpg"

    def test_handles_empty_string(self, module) -> None:
        assert module.sanitize_storage_key("") == ""

    def test_leaves_http_url_unchanged(self, module) -> None:
        """Regression: real production data. Confirmed against staging
        DB -- most `image_urls`/`cover_image_key` rows are full public
        URLs written directly by the bulk-upload flow, not bare storage
        keys. Without the bare-key guard, the URL's `://` falls outside
        the safe alphabet and gets mangled (`http://` -> `http_//`),
        corrupting a perfectly healthy row."""
        url = (
            "http://localhost:9002/prosell-assets/vehicles/"
            "d49b7917-81f2-4c1e-b502-4abdaae81128/d49b7917-81f2-4c1e-b502-4abdaae81128/"
            "KNAGT4L36G5098027/1.jpeg"
        )
        assert module.sanitize_storage_key(url) == url

    def test_leaves_clean_https_url_unchanged(self, module) -> None:
        url = "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/vehicles/clean.jpeg"
        assert module.sanitize_storage_key(url) == url

    def test_sanitizes_broken_filename_inside_a_url_path(self, module) -> None:
        """Regression: the exact real production row (Chevrolet
        Traverse, prod DB) that the FIRST version of this fix missed --
        it skipped the whole URL instead of just its scheme/host."""
        url = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
        expected = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp_Image_2026-09-12_at_8.44.04_AM_1_.jpeg"
        )
        assert module.sanitize_storage_key(url) == expected

    def test_is_idempotent(self, module) -> None:
        """Running sanitize twice yields the same result (the second
        pass sees no chars to rewrite). Critical for safe re-runs."""
        key = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
            "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
        )
        once = module.sanitize_storage_key(key)
        twice = module.sanitize_storage_key(once)
        assert once == twice


class TestIsLegacyBadKey:
    """`is_legacy_bad_key` mirrors the ORIGINAL pre-fix DTO regex
    `[A-Za-z0-9._/-]+`. A key with anything outside that alphabet is
    in scope for the rename."""

    def test_phone_cam_key_is_legacy(self, module) -> None:
        key = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
            "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
        )
        assert module.is_legacy_bad_key(key) is True

    def test_clean_key_is_not_legacy(self, module) -> None:
        key = "orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg"
        assert module.is_legacy_bad_key(key) is False

    def test_key_with_only_uuid_segments_is_not_legacy(self, module) -> None:
        key = "orgs/aaaa-bbbb-cccc-dddd/vehicles/eeee-ffff-gggg-hhhh/x.jpg"
        assert module.is_legacy_bad_key(key) is False

    def test_colon_in_filename_is_legacy(self, module) -> None:
        """The colons in a `2024-01-15 3:45 PM` filename (rare but
        possible) are also caught."""
        key = "orgs/a-b-c-d/vehicles/e-f-g-h/Photo 3:45 PM.jpg"
        assert module.is_legacy_bad_key(key) is True

    def test_empty_string_is_not_legacy(self, module) -> None:
        """Empty string has no bad chars -- no rename queued."""
        assert module.is_legacy_bad_key("") is False

    def test_http_url_is_not_legacy(self, module) -> None:
        """Regression: a full URL's `://` is outside the safe alphabet
        but it isn't a storage key at all -- must not be queued for
        rename. Confirmed against real staging data (see
        TestSanitizeStorageKey.test_leaves_http_url_unchanged)."""
        url = "http://localhost:9002/prosell-assets/vehicles/e-f-g-h/x.jpg"
        assert module.is_legacy_bad_key(url) is False

    def test_https_url_is_not_legacy(self, module) -> None:
        url = "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/a-b-c-d/x.jpg"
        assert module.is_legacy_bad_key(url) is False

    def test_broken_url_path_is_legacy(self, module) -> None:
        """Regression: the exact real production row (Chevrolet
        Traverse, prod DB) that the FIRST version of this fix missed --
        it skipped the whole URL instead of checking its path. A URL is
        not automatically clean just because it's a URL."""
        url = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
        assert module.is_legacy_bad_key(url) is True


class TestFindRenamesForProduct:
    """`find_renames_for_product` should enumerate every rename across
    the three image-bearing fields and skip clean keys."""

    def test_returns_renames_for_all_three_fields(self, module) -> None:
        bad = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
            "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
        )
        clean = "orgs/aaaa-bbbb-cccc-dddd/vehicles/eeee-ffff-gggg-hhhh/x.jpg"
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=[bad, clean],
            cover_key=bad,
            thumbnail_key=None,
        )
        assert len(renames) == 2
        fields = {r.field for r in renames}
        assert fields == {"image_urls", "cover_image_key"}
        for r in renames:
            assert r.old_key == bad
            assert "WhatsApp_Image" in r.new_key
            assert " " not in r.new_key
            assert "(" not in r.new_key
            assert ")" not in r.new_key
            assert r.product_id == "pid"
            assert r.tenant_id == "tid"

    def test_queues_rename_for_broken_url_shaped_product(self, module) -> None:
        """Regression: the real production row this script must actually
        fix. image_urls holds full URLs (as bulk-upload writes them),
        one of them has the broken phone-cam filename in its path."""
        broken = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
        clean = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/2.jpeg"
        )
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=[broken, clean],
            cover_key=broken,
            thumbnail_key=None,
        )
        assert len(renames) == 2
        for r in renames:
            assert r.old_key == broken
            assert r.new_key.startswith("https://atl1.digitaloceanspaces.com/")
            assert " " not in r.new_key
            assert "(" not in r.new_key

    def test_returns_empty_for_clean_product(self, module) -> None:
        clean_urls = ["orgs/a-b-c-d/vehicles/e-f-g-h/x.jpg"]
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=clean_urls,
            cover_key=clean_urls[0],
            thumbnail_key=clean_urls[0],
        )
        assert renames == []

    def test_handles_null_image_urls(self, module) -> None:
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=None,
            cover_key=None,
            thumbnail_key=None,
        )
        assert renames == []

    def test_ignores_healthy_url_shaped_product(self, module) -> None:
        """Regression: the exact shape of real staging/prod data (full
        URLs, not bare keys) must never be queued for rename. Without
        the bare-key guard in `is_legacy_bad_key`, this product would
        have every field flagged and mangled on the very first real run."""
        url = (
            "http://localhost:9002/prosell-assets/vehicles/"
            "d49b7917-81f2-4c1e-b502-4abdaae81128/d49b7917-81f2-4c1e-b502-4abdaae81128/"
            "KNAGT4L36G5098027/1.jpeg"
        )
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=[url],
            cover_key=url,
            thumbnail_key=url,
        )
        assert renames == []

    def test_handles_empty_image_urls(self, module) -> None:
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=[],
            cover_key=None,
            thumbnail_key=None,
        )
        assert renames == []

    def test_ignores_non_string_entries(self, module) -> None:
        """Defensive: a corrupted row could have non-string entries in
        the JSONB array (e.g. a None or int from a bug). Skip them
        instead of crashing -- the script shouldn't widen the blast
        radius of a partial data corruption."""
        renames = module.find_renames_for_product(
            product_id="pid",
            tenant_id="tid",
            raw_urls=[None, 42, "orgs/a-b-c-d/x.jpg"],  # type: ignore[list-item]
            cover_key=None,
            thumbnail_key=None,
        )
        assert renames == []


class TestDedupeRenames:
    """`_dedupe_renames` collapses by PHYSICAL FILE (bare storage key), not by field.

    Multiple fields (image_urls, cover_image_key, thumbnail_image_key)
    may reference the SAME physical S3 object. The function returns
    UnifiedRename objects that combine all fields pointing to the same
    physical file into a single S3 rename operation.
    """

    def test_dedupes_repeated_old_key(self, module) -> None:
        r1 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        r2 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        out = module._dedupe_renames([r1, r2])
        assert len(out) == 1
        assert out[0].product_id == "pid"
        assert out[0].old_key == "bad.jpg"
        assert out[0].new_key == "good.jpg"
        assert out[0].fields == ("image_urls",)

    def test_collapses_same_physical_file_across_fields(self, module) -> None:
        """The FIX: same physical file in image_urls AND cover_image_key
        must collapse to ONE UnifiedRename with both fields.

        This was the bug: the old code returned 2 PendingRenames,
        causing the second CopyObject to fail (source already deleted)."""
        r1 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        r2 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="cover_image_key",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        out = module._dedupe_renames([r1, r2])
        assert len(out) == 1
        assert out[0].product_id == "pid"
        assert out[0].old_key == "bad.jpg"
        assert out[0].new_key == "good.jpg"
        assert set(out[0].fields) == {"image_urls", "cover_image_key"}

    def test_keeps_different_products(self, module) -> None:
        r1 = module.PendingRename(
            product_id="pid1",
            tenant_id="tid",
            field="image_urls",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        r2 = module.PendingRename(
            product_id="pid2",
            tenant_id="tid",
            field="image_urls",
            old_key="bad.jpg",
            new_key="good.jpg",
        )
        out = module._dedupe_renames([r1, r2])
        assert len(out) == 2

    def test_empty_input(self, module) -> None:
        assert module._dedupe_renames([]) == []

    def test_collision_detected_and_aborts(
        self, module, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """Two distinct physical files that sanitize to the same new_key
        for the same field would silently overwrite each other in S3."""
        r1 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="foo.jpg",
            new_key="foo_.jpg",
        )
        r2 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="foo (1).jpg",  # different physical source
            new_key="foo_1_.jpg",  # different target
        )
        # No collision here because targets differ. Sanity check.
        module._dedupe_renames([r1, r2])

        # Actual collision: two DIFFERENT physical files sanitize to same new_key
        r3 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="bad name.jpg",
            new_key="collide.jpg",
        )
        r4 = module.PendingRename(
            product_id="pid",
            tenant_id="tid",
            field="image_urls",
            old_key="bad name (1).jpg",  # different physical source
            new_key="collide.jpg",  # SAME target
        )
        with pytest.raises(SystemExit) as exc_info:
            module._dedupe_renames([r3, r4])
        assert exc_info.value.code == 2
        captured = capsys.readouterr()
        assert "collision" in captured.err
        assert "bad name.jpg" in captured.err
        assert "bad name (1).jpg" in captured.err
        assert "bad name.jpg" in captured.err
        assert "bad name (1).jpg" in captured.err


class TestRenameInStorage:
    """`rename_in_storage` takes `PendingRename.old_key`/`new_key` --
    the full DB representation (a URL, for a row that stores full
    URLs) -- but every S3 call needs the BARE key. Regression: the
    first production run of this script sent the raw URL straight to
    boto3 as the S3 key, and every single CopyObject 404'd with
    NoSuchKey. No DB changes were made (the script aborts cleanly on
    any storage failure), but the rename never actually happened."""

    def _make_spaces(self) -> MagicMock:
        spaces = MagicMock()
        spaces.bucket = "prosell-assets"
        spaces.s3_client = MagicMock()
        return spaces

    @pytest.mark.asyncio
    async def test_uses_bare_keys_for_s3_calls_not_full_urls(self, module) -> None:
        spaces = self._make_spaces()
        old_url = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
        new_url = (
            "https://atl1.digitaloceanspaces.com/prosell-assets/orgs/"
            "56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp_Image_2026-09-12_at_8.44.04_AM_1_.jpeg"
        )
        old_bare_key = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp Image 2026-09-12 at 8.44.04 AM (1).jpeg"
        )
        new_bare_key = (
            "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
            "56e652de-c522-4664-a977-4bb18586f2fa/1GNKRJKDXHJ344338/"
            "WhatsApp_Image_2026-09-12_at_8.44.04_AM_1_.jpeg"
        )

        await module.rename_in_storage(spaces, old_url, new_url)

        spaces.s3_client.copy_object.assert_called_once_with(
            Bucket="prosell-assets",
            Key=new_bare_key,
            CopySource={"Bucket": "prosell-assets", "Key": old_bare_key},
        )
        spaces.s3_client.head_object.assert_called_once_with(
            Bucket="prosell-assets", Key=new_bare_key
        )
        spaces.s3_client.delete_object.assert_called_once_with(
            Bucket="prosell-assets", Key=old_bare_key
        )

    @pytest.mark.asyncio
    async def test_works_for_bare_keys_too(self, module) -> None:
        """A row already stored as a bare key (no URL) must keep working
        -- extraction is a no-op passthrough for that shape."""
        spaces = self._make_spaces()
        old_key = "orgs/a-b-c-d/vehicles/e-f-g-h/bad name.jpg"
        new_key = "orgs/a-b-c-d/vehicles/e-f-g-h/bad_name.jpg"

        await module.rename_in_storage(spaces, old_key, new_key)

        spaces.s3_client.copy_object.assert_called_once_with(
            Bucket="prosell-assets",
            Key=new_key,
            CopySource={"Bucket": "prosell-assets", "Key": old_key},
        )
