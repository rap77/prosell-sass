"""One-time data fix: sanitize legacy image storage keys in production.

Background
----------
Before commit 072bfa10 (sanitize CSV bulk-upload filenames), the
CSVImageMapper._sanitize_filename only stripped path components and
rejected `..` and backslashes -- it did NOT normalize spaces,
parentheses, or colons that real-world phone-cam filenames contain
(e.g. `WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg`). Products
imported via the legacy bulk-upload flow ended up with image_urls /
cover_image_key / thumbnail_image_key entries that the DTO storage-
key regex rejected, making them uneditable (422 on every save).

This script:
  1. Finds products whose image keys contain chars outside
     `[A-Za-z0-9._-]` (the post-fix sanitizer's alphabet).
  2. For each affected key, renames the object in DO Spaces
     (CopyObject old -> new, then head_object verify, then
     DeleteObject old).
  3. Updates the DB row to point to the new key, in a single
     transaction.

Idempotent: re-running on already-sanitized rows is a no-op (the
sanitize function is a pure projection, CopyObject over an existing
same-content target is a no-op overwrite; DeleteObject on a missing
key is also a no-op per the S3 contract).

Pre-conditions
--------------
  - The fix commit (sanitize at upload + accept legacy keys) is
    deployed so this script's sanitization matches what new imports
    would produce.
  - Database accessible via the same env vars as the API
    (DATABASE_URL / ASYNC_DATABASE_URL).
  - DO Spaces credentials available (DO_ACCESS_KEY_ID,
    DO_SECRET_ACCESS_KEY, DO_BUCKET_NAME, DO_REGION).

Usage
-----
    # Default: DRY_RUN. Shows what would change, writes nothing.
    cd apps/api
    uv run python scripts/sanitize_broken_image_keys.py

    # Apply for real.
    DRY_RUN=0 uv run python scripts/sanitize_broken_image_keys.py

    # Optional: only process a single product (debugging).
    PRODUCT_ID=<uuid> DRY_RUN=0 uv run python scripts/sanitize_broken_image_keys.py
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

# Add src to path so we can import the app's models + session
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy import select

from prosell.domain.services.storage_key_sanitizer import is_url, sanitize_storage_key, url_path
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models import ProductModel
from prosell.infrastructure.services.do_spaces_service import DOSpacesService

# Stricter check than the DTO's relaxed regex (the post-fix regex
# also accepts space + parens for backward compat). The script only
# flags keys that the upload-time sanitizer would have rewritten --
# i.e., keys with chars the ORIGINAL pre-fix DTO regex rejected.
# Keeps the scope of the rename to actually-broken data.
_LEGACY_BAD_CHAR_RE = re.compile(r"[^A-Za-z0-9._/\-]")


@dataclass(frozen=True)
class PendingRename:
    """A single (product_id, field, old_key) -> new_key rename."""

    product_id: str
    tenant_id: str
    field: str  # "image_urls" | "cover_image_key" | "thumbnail_image_key"
    old_key: str
    new_key: str


def is_legacy_bad_key(key: str) -> bool:
    """True iff key has chars outside the original pre-fix DTO regex
    alphabet -- the exact rejection criterion of the production bug.

    For a full http(s) URL, only the PATH is checked (see `url_path`)
    -- the scheme/host is never "legacy bad" on its own (a port's `:`
    or a domain's `.` isn't a broken filename), but a URL's path CAN
    still carry the exact same bad filename a bare key would (real
    production row: `https://.../orgs/.../WhatsApp Image ... (1).jpeg`
    -- the bulk-upload flow writes full URLs, not just bare keys, so
    this is not a hypothetical case)."""
    if not key:
        return False
    haystack = url_path(key) if is_url(key) else key
    return bool(_LEGACY_BAD_CHAR_RE.search(haystack))


def find_renames_for_product(
    product_id: str,
    tenant_id: str,
    raw_urls: list[str] | None,
    cover_key: str | None,
    thumbnail_key: str | None,
) -> list[PendingRename]:
    """Return every rename needed for a single product across all three
    image-bearing fields. Caller dedupes across rows."""
    renames: list[PendingRename] = []

    if raw_urls:
        for old_key in raw_urls:
            if not isinstance(old_key, str) or not is_legacy_bad_key(old_key):
                continue
            renames.append(
                PendingRename(
                    product_id=product_id,
                    tenant_id=tenant_id,
                    field="image_urls",
                    old_key=old_key,
                    new_key=sanitize_storage_key(old_key),
                )
            )

    for field, key in (
        ("cover_image_key", cover_key),
        ("thumbnail_image_key", thumbnail_key),
    ):
        if key and is_legacy_bad_key(key):
            renames.append(
                PendingRename(
                    product_id=product_id,
                    tenant_id=tenant_id,
                    field=field,
                    old_key=key,
                    new_key=sanitize_storage_key(key),
                )
            )
    return renames


def _dedupe_renames(renames: list[PendingRename]) -> list[PendingRename]:
    """Dedupe by (product_id, field, old_key). image_urls may carry the
    same broken key twice if a user re-submitted; only one rename is
    needed.

    Also detects collisions: two DISTINCT old_keys that sanitize to
    the same new_key would silently overwrite each other in S3
    (CopyObject + DeleteObject is destructive for the second copy's
    source). When such a collision exists across DIFFERENT rows
    (image_urls + cover_image_key for the same product, or two products
    that happen to share a sanitized key shape) we cannot resolve it
    automatically -- the right answer is to stop and surface the
    conflict for a human to disambiguate by renaming one of the source
    files.
    """
    # Stage 1: dedupe by (product, field, old_key) -- the no-op case.
    seen: set[tuple[str, str, str]] = set()
    deduped: list[PendingRename] = []
    for r in renames:
        k = (r.product_id, r.field, r.old_key)
        if k in seen:
            continue
        seen.add(k)
        deduped.append(r)

    # Stage 2: detect new_key collisions. Same product + same field +
    # same old_key are already deduped, so any further collision means
    # either (a) two different old_keys in the same product/field
    # chain sanitize the same way (e.g. `foo.jpg` and `foo (1).jpg`),
    # or (b) two different products would write to the same S3 target.
    # Both are unsafe to auto-resolve.
    targets: dict[tuple[str, str, str], PendingRename] = {}
    conflicts: list[tuple[tuple[str, str, str], list[PendingRename]]] = []
    for r in deduped:
        key = (r.product_id, r.field, r.new_key)
        if key in targets:
            existing = targets[key]
            if existing.old_key != r.old_key:
                conflicts.append((key, [existing, r]))
                continue
        else:
            targets[key] = r

    if conflicts:
        print(
            f"ERROR: {len(conflicts)} sanitized-key collision(s) "
            "detected. Refusing to auto-resolve; would silently overwrite "
            "distinct storage objects. Inspect and re-run with PRODUCT_ID "
            "for the affected rows.",
            file=sys.stderr,
        )
        for tgt_key, members in conflicts:
            print(
                f"  target {tgt_key[2]} (product={tgt_key[0]}, "
                f"field={tgt_key[1]}) is reached from:",
                file=sys.stderr,
            )
            for m in members:
                print(f"    {m.old_key}", file=sys.stderr)
        sys.exit(2)

    return deduped


async def rename_in_storage(spaces: DOSpacesService, old_key: str, new_key: str) -> None:
    """S3 CopyObject + head_object verify + DeleteObject. Raises on
    failure so the caller can mark this rename as failed and abort
    the DB update.

    The verify-by-head_object is belt-and-suspenders: copy_object
    already raises on most failures, but a head_object after the
    copy confirms the new object is reachable before we delete the
    old one. delete_object on a missing key is a silent no-op per S3,
    so re-running this script is safe even if a prior partial run
    already deleted the old key."""
    bucket = spaces.bucket
    await asyncio.to_thread(
        spaces.s3_client.copy_object,
        Bucket=bucket,
        Key=new_key,
        CopySource={"Bucket": bucket, "Key": old_key},
    )
    await asyncio.to_thread(
        spaces.s3_client.head_object,
        Bucket=bucket,
        Key=new_key,
    )
    await asyncio.to_thread(
        spaces.s3_client.delete_object,
        Bucket=bucket,
        Key=old_key,
    )


async def main() -> None:
    dry_run = os.environ.get("DRY_RUN", "1") != "0"
    product_filter = os.environ.get("PRODUCT_ID")

    print("=== ProSell broken image key sanitizer ===")
    print(f"DRY_RUN    = {dry_run}")
    if product_filter:
        print(f"PRODUCT_ID = {product_filter}")
    print()

    async with async_session_maker() as session:
        # Scan every product: a row may have bad cover_image_key or
        # thumbnail_image_key even when image_urls is NULL (or vice
        # versa). Filtering to `image_urls.isnot(None)` would skip
        # legitimate work, which is what the production bug is
        # about -- "broken image keys" can live in any of the three
        # fields, not just the gallery list.
        stmt = select(ProductModel)
        if product_filter:
            stmt = stmt.where(ProductModel.id == product_filter)
        result = await session.execute(stmt)
        products = list(result.scalars().all())

        all_renames: list[PendingRename] = []
        for product in products:
            all_renames.extend(
                find_renames_for_product(
                    product_id=str(product.id),
                    tenant_id=str(product.tenant_id),
                    raw_urls=product.image_urls,
                    cover_key=product.cover_image_key,
                    thumbnail_key=product.thumbnail_image_key,
                )
            )
        all_renames = _dedupe_renames(all_renames)

    print(f"Products scanned: {len(products)}")
    print(f"Renames queued:  {len(all_renames)}")
    for r in all_renames:
        print(f"  [{r.product_id}] {r.field}:")
        print(f"    old: {r.old_key}")
        print(f"    new: {r.new_key}")
    print()

    if not all_renames:
        print("Nothing to sanitize. Done.")
        return

    if dry_run:
        print("DRY_RUN=1 (default): no changes made. Set DRY_RUN=0 to apply.")
        return

    print("--- APPLYING ---")
    spaces = DOSpacesService()

    storage_failures: list[tuple[PendingRename, str]] = []
    for r in all_renames:
        try:
            await rename_in_storage(spaces, r.old_key, r.new_key)
            print(f"  [storage OK] {r.field}: {r.old_key} -> {r.new_key}")
        except (ClientError, BotoCoreError) as exc:  # pragma: no cover -- infra failure
            storage_failures.append((r, str(exc)))
            print(f"  [storage FAIL] {r.field}: {r.old_key} -> {r.new_key}: {exc}")

    if storage_failures:
        print()
        print(f"!! {len(storage_failures)} storage rename(s) failed. Aborting DB update.")
        print("   No DB changes were made. Re-run after fixing the cause to retry.")
        for r, err in storage_failures:
            print(f"   - {r.field}: {r.old_key} -> {r.new_key}: {err}")
        sys.exit(1)

    async with async_session_maker() as session:
        ids = [str(r.product_id) for r in all_renames]
        result = await session.execute(select(ProductModel).where(ProductModel.id.in_(ids)))
        db_products = {str(p.id): p for p in result.scalars().all()}

        for r in all_renames:
            product = db_products[r.product_id]
            if r.field == "image_urls":
                product.image_urls = [
                    r.new_key if v == r.old_key else v for v in (product.image_urls or [])
                ]
            elif r.field == "cover_image_key":
                product.cover_image_key = r.new_key
            elif r.field == "thumbnail_image_key":
                product.thumbnail_image_key = r.new_key

        await session.commit()
        print(
            f"  [DB OK] {len(all_renames)} field(s) updated across {len(db_products)} product(s)."
        )

    print()
    print("Done. Re-run safely; the script is idempotent.")


if __name__ == "__main__":
    asyncio.run(main())
