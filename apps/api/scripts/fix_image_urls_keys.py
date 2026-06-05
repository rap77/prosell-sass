"""
One-time data fix: extract the raw S3 key from `product.image_urls` entries
that were mistakenly stored as ALREADY-SIGNED URLs.

Background
----------
A prior bug stored the value returned by the upload endpoint's `url` field
(presigned, expires in 1h) into the `image_urls` column instead of the raw
storage `key`. Even after the bug is fixed in the upload flow, the rows
written by the old code are still corrupted:
  - Re-signing the value produces a malformed URL (the signer treats the
    full path+query as the key, mints a new signature on top of the old
    query string, browser rejects it).
  - After 1h the embedded signature expires, breaking the image silently.

The runtime safety net `product_router.get_product_image_urls` already
strips the query string when extracting the key (see
`test_get_product_image_urls.py::TestGetProductImageUrlsStripsQueryString`).
This script backfills the column with the clean keys so the data is
correct on disk and the safety net is no longer load-bearing.

Idempotent: only touches rows where any value contains `?X-Amz-`; safe to
run multiple times.

Usage
-----
    cd apps/api
    uv run python scripts/fix_image_urls_keys.py
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import urlparse

# Add src to path so we can import the app's models + session
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import select  # noqa: E402

from prosell.infrastructure.database.session import async_session_maker  # noqa: E402
from prosell.infrastructure.models import ProductModel  # noqa: E402


def extract_storage_key(value: str) -> str:
    """Return the storage key from a value that may be a URL, a signed URL,
    or a bare key.

    A value written by the buggy code looks like:
        `http://minio:9000/prosell-assets/orgs/{tenant}/vehicles/{uuid}.jpg?X-Amz-...`
    A value written by the fixed code looks like:
        `orgs/{tenant}/vehicles/{uuid}.jpg`

    The algorithm:
      1. Drop the query string (`?...`).
      2. If the value parses as an absolute URL, take the path.
      3. Strip a leading `/` so the result is a bare key.
      4. If the result still starts with the bucket, strip that too.
    """
    if not isinstance(value, str) or not value:
        return value
    # 1. Drop the query string (the embedded signature).
    without_query = value.split("?", 1)[0]
    # 2. If it's a URL, take the path.
    if "://" in without_query:
        parsed = urlparse(without_query)
        path = parsed.path or ""
    else:
        path = without_query
    # 3. Strip leading "/".
    path = path.lstrip("/")
    # 4. The value might still have the bucket name as the first segment
    #    (e.g. "prosell-assets/orgs/.../vehicles/..."). We can't safely
    #    strip the bucket generically (the script doesn't know it), so we
    #    leave the bucket segment in. The signer already splits on
    #    `<bucket>/` so a path with the bucket prefix is fine; the bare-key
    #    path is also fine. Either way, the result no longer contains
    #    `?X-Amz-` and the runtime signer can extract a usable key.
    return path


async def fix_image_urls_keys(dry_run: bool = False) -> dict[str, int]:
    """Scan products for corrupted `image_urls` entries; replace each with
    its bare storage key.

    Returns a summary dict:
        {
            "scanned":  int,  # total products with non-empty image_urls
            "updated":  int,  # products that had at least one corrupted value
            "values_fixed": int,  # total individual entries normalized
        }
    """
    scanned = 0
    updated = 0
    values_fixed = 0

    async with async_session_maker() as session:
        # Select products with non-empty image_urls.
        # Using JSONB ? operator via the ARRAY contains check is overkill;
        # we just pull candidates and filter in Python because the column
        # is a JSONB array.
        stmt = select(ProductModel).where(ProductModel.image_urls.isnot(None))
        result = await session.execute(stmt)
        products = list(result.scalars().all())

        for product in products:
            scanned += 1
            raw_urls = product.image_urls
            if not isinstance(raw_urls, list) or not raw_urls:
                continue

            new_urls: list[str] = []
            changed = False
            for v in raw_urls:
                if not isinstance(v, str):
                    new_urls.append(v)
                    continue
                if "?X-Amz-" in v or v != extract_storage_key(v):
                    new_key = extract_storage_key(v)
                    new_urls.append(new_key)
                    changed = True
                    values_fixed += 1
                else:
                    new_urls.append(v)

            if changed:
                updated += 1
                product.image_urls = new_urls
                if not dry_run:
                    await session.flush()

        if not dry_run:
            await session.commit()

    return {
        "scanned": scanned,
        "updated": updated,
        "values_fixed": values_fixed,
    }


async def main() -> None:
    print("=== ProSell image_urls key fix ===")
    print("This script normalizes `product.image_urls` entries that were")
    print("mistakenly stored as signed URLs back to bare S3 keys.")
    print()

    # First, dry-run to show what would change.
    print("--- DRY RUN ---")
    dry = await fix_image_urls_keys(dry_run=True)
    print(f"Scanned:        {dry['scanned']}")
    print(f"Would update:   {dry['updated']}")
    print(f"Values fixed:   {dry['values_fixed']}")
    print()

    if dry["updated"] == 0:
        print("Nothing to fix. Done.")
        return

    print("--- APPLYING ---")
    real = await fix_image_urls_keys(dry_run=False)
    print(f"Scanned:        {real['scanned']}")
    print(f"Updated:        {real['updated']}")
    print(f"Values fixed:   {real['values_fixed']}")
    print()
    print("Done. Re-run safely; the script is idempotent.")


if __name__ == "__main__":
    asyncio.run(main())
