#!/usr/bin/env python3
"""Migrate images: vehicles/ -> products/, reoptimize WebP, generate OG JPEG, update DB.

SAFE MIGRATION ORDER:
1. Copy optimized to products/ (keep vehicles/ intact)
2. Generate OG JPEG in products/
3. Update DB keys
4. Only then delete from vehicles/ (--cleanup flag)

Run:
  uv run python scripts/migrate_og_images.py --dry-run          # See what would happen
  uv run python scripts/migrate_og_images.py                    # Migrate (keeps old files)
  uv run python scripts/migrate_og_images.py --cleanup          # Delete old vehicles/ files

ponytail: one-off migration, delete script after complete.
"""

import argparse
import asyncio
import logging
import sys
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

try:
    RESAMPLING = Image.Resampling.LANCZOS
except AttributeError:
    RESAMPLING = Image.LANCZOS  # type: ignore


def _prepare_rgb(img: Image.Image) -> Image.Image:
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        return bg
    if img.mode not in ("RGB", "L"):
        return img.convert("RGB")
    return img


def _resize_to_fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    w, h = img.size
    if w <= max_w and h <= max_h:
        return img
    aspect = w / h
    if w > h:
        new_w, new_h = max_w, int(max_w / aspect)
    else:
        new_h, new_w = max_h, int(max_h * aspect)
    return img.resize((new_w, new_h), RESAMPLING)


def optimize_webp(image_bytes: bytes) -> bytes:
    """Reoptimize to WebP 1920x1080 quality 82."""
    img = Image.open(BytesIO(image_bytes))
    img = _prepare_rgb(img)
    img = _resize_to_fit(img, 1920, 1080)
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=82, method=6)
    return buf.getvalue()


def generate_og_jpeg(image_bytes: bytes) -> bytes:
    """Generate OG JPEG 1200x630 with center crop."""
    img = Image.open(BytesIO(image_bytes))
    img = _prepare_rgb(img)
    w, h = img.size
    target_aspect = 1200 / 630

    current_aspect = w / h
    if current_aspect > target_aspect:
        new_w = int(h * target_aspect)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_aspect < target_aspect:
        new_h = int(w / target_aspect)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    img = img.resize((1200, 630), RESAMPLING)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


async def update_db_keys(old_to_new: dict[str, str], dry_run: bool) -> int:
    """Update image_urls and cover_image_key in products table."""
    from sqlalchemy import text

    from prosell.infrastructure.database.session import async_engine

    updated = 0
    async with async_engine.begin() as conn:
        result = await conn.execute(text("SELECT id, image_urls, cover_image_key FROM products"))
        rows = result.fetchall()

        for row in rows:
            product_id, image_urls, cover_key = row
            changed = False
            new_urls = []

            if image_urls:
                for url in image_urls:
                    if url in old_to_new:
                        new_urls.append(old_to_new[url])
                        changed = True
                    else:
                        new_urls.append(url)

            new_cover = cover_key
            if cover_key and cover_key in old_to_new:
                new_cover = old_to_new[cover_key]
                changed = True

            if changed:
                if dry_run:
                    log.info(f"  DB: product {product_id} would be updated")
                else:
                    await conn.execute(
                        text("""
                            UPDATE products
                            SET image_urls = :urls, cover_image_key = :cover
                            WHERE id = :id
                        """),
                        {"urls": new_urls, "cover": new_cover, "id": product_id},
                    )
                updated += 1

    return updated


async def main():
    parser = argparse.ArgumentParser(description="Migrate images: vehicles/ -> products/")
    parser.add_argument("--dry-run", action="store_true", help="Don't change anything")
    parser.add_argument("--limit", type=int, default=0, help="Limit images to process")
    parser.add_argument("--cleanup", action="store_true", help="Delete old vehicles/ files")
    parser.add_argument("--skip-db", action="store_true", help="Skip DB updates")
    args = parser.parse_args()

    from prosell.infrastructure.services.do_spaces_service import DOSpacesService

    spaces = DOSpacesService()
    s3 = spaces.s3_client

    log.info("Scanning for images in orgs/*/vehicles/...")

    old_keys: list[str] = []
    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=spaces.bucket, Prefix="orgs/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # Only original images in vehicles/, not OG files
            is_vehicle_img = "/vehicles/" in key and not key.endswith("-og.jpg")
            is_valid_ext = key.endswith((".webp", ".jpg", ".jpeg"))
            if is_vehicle_img and is_valid_ext:
                old_keys.append(key)

    log.info(f"Found {len(old_keys)} images in vehicles/")

    if args.limit:
        old_keys = old_keys[: args.limit]
        log.info(f"Limited to {args.limit}")

    processed = 0
    errors = 0
    total_saved = 0
    old_to_new: dict[str, str] = {}

    for old_key in old_keys:
        # New path: vehicles/ -> products/, normalize to .webp
        base = old_key.rsplit(".", 1)[0]  # Remove extension
        new_key = base.replace("/vehicles/", "/products/") + ".webp"
        og_key = new_key.replace(".webp", "-og.jpg")

        try:
            # Check if already migrated
            try:
                s3.head_object(Bucket=spaces.bucket, Key=new_key)
                log.info(f"SKIP (exists): {new_key}")
                old_to_new[old_key] = new_key  # Still track for DB update
                processed += 1
                continue
            except s3.exceptions.ClientError:
                pass  # Not migrated yet

            # Download original
            resp = s3.get_object(Bucket=spaces.bucket, Key=old_key)
            original_bytes = resp["Body"].read()
            original_size = len(original_bytes)

            # Optimize to WebP
            webp_bytes = optimize_webp(original_bytes)
            saved = original_size - len(webp_bytes)
            total_saved += max(0, saved)

            # Generate OG JPEG
            og_bytes = generate_og_jpeg(original_bytes)

            orig_kb = original_size // 1024
            new_kb = len(webp_bytes) // 1024
            og_kb = len(og_bytes) // 1024

            if args.dry_run:
                log.info(f"DRY-RUN: {old_key}")
                log.info(f"  -> {new_key} ({orig_kb}KB -> {new_kb}KB)")
                log.info(f"  -> {og_key} ({og_kb}KB)")
            else:
                # Upload new WebP to products/
                s3.put_object(
                    Bucket=spaces.bucket,
                    Key=new_key,
                    Body=webp_bytes,
                    ContentType="image/webp",
                )
                # Upload OG JPEG
                s3.put_object(
                    Bucket=spaces.bucket,
                    Key=og_key,
                    Body=og_bytes,
                    ContentType="image/jpeg",
                )
                log.info(f"OK: {old_key} -> {new_key} ({orig_kb}KB -> {new_kb}KB)")

            old_to_new[old_key] = new_key
            processed += 1

        except Exception as e:
            log.error(f"ERROR: {old_key} - {e}")
            errors += 1

    # Update DB
    if not args.skip_db and old_to_new:
        log.info(f"\nUpdating DB keys for {len(old_to_new)} images...")
        db_updated = await update_db_keys(old_to_new, args.dry_run)
        log.info(f"DB: {db_updated} products updated")

    # Cleanup old files (only with --cleanup flag)
    if args.cleanup and not args.dry_run and old_to_new:
        log.info(f"\nCleaning up {len(old_to_new)} old files from vehicles/...")
        for old_key in old_to_new:
            try:
                s3.delete_object(Bucket=spaces.bucket, Key=old_key)
            except Exception as e:
                log.error(f"Failed to delete {old_key}: {e}")
        log.info("Cleanup complete")
    elif args.cleanup and args.dry_run:
        log.info(f"\nDRY-RUN: Would delete {len(old_to_new)} old files from vehicles/")

    mb, kb = total_saved // 1024 // 1024, total_saved // 1024
    log.info(f"\nDone: {processed} processed, {errors} errors")
    log.info(f"Space saved: {mb}MB ({kb}KB)")


if __name__ == "__main__":
    asyncio.run(main())
