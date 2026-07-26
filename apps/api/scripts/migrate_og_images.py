#!/usr/bin/env python3
"""Migrate existing images: reoptimize WebP + generate OG JPEG.

Run: uv run python scripts/migrate_og_images.py [--dry-run] [--limit N] [--skip-optimize]

ponytail: one-off migration, delete after all images processed.
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

# Resampling constant
try:
    RESAMPLING = Image.Resampling.LANCZOS
except AttributeError:
    RESAMPLING = Image.LANCZOS  # type: ignore


def _prepare_rgb(img: Image.Image) -> Image.Image:
    """Convert image to RGB mode."""
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        return bg
    if img.mode not in ("RGB", "L"):
        return img.convert("RGB")
    return img


def _resize_to_fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Resize to fit within max dimensions, maintaining aspect ratio."""
    w, h = img.size
    if w <= max_w and h <= max_h:
        return img
    aspect = w / h
    if w > h:
        new_w, new_h = max_w, int(max_w / aspect)
    else:
        new_h, new_w = max_h, int(max_h * aspect)
    return img.resize((new_w, new_h), RESAMPLING)


def optimize_webp(
    image_bytes: bytes, max_w: int = 1920, max_h: int = 1080, quality: int = 82
) -> bytes:
    """Reoptimize image to WebP with target dimensions and quality.

    ponytail: reusable function for batch optimization.
    """
    img = Image.open(BytesIO(image_bytes))
    img = _prepare_rgb(img)
    img = _resize_to_fit(img, max_w, max_h)

    buf = BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()


def generate_og_jpeg(image_bytes: bytes) -> bytes:
    """Generate OG JPEG 1200x630 with center crop.

    ponytail: reusable function for OG image generation.
    """
    img = Image.open(BytesIO(image_bytes))
    img = _prepare_rgb(img)

    w, h = img.size
    target_aspect = 1200 / 630  # ~1.9

    # Center crop to OG aspect ratio
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


async def main():
    parser = argparse.ArgumentParser(description="Migrate WebP images: reoptimize + generate OG")
    parser.add_argument("--dry-run", action="store_true", help="Don't upload, just log")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of images")
    parser.add_argument(
        "--skip-optimize", action="store_true", help="Skip WebP reoptimization, only generate OG"
    )
    args = parser.parse_args()

    from prosell.infrastructure.services.do_spaces_service import DOSpacesService

    spaces = DOSpacesService()
    s3 = spaces.s3_client

    log.info("Scanning for WebP images in orgs/*/vehicles/...")

    webp_keys: list[str] = []
    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=spaces.bucket, Prefix="orgs/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith(".webp") and "/vehicles/" in key:
                webp_keys.append(key)

    log.info(f"Found {len(webp_keys)} WebP images")

    if args.limit:
        webp_keys = webp_keys[: args.limit]
        log.info(f"Limited to {args.limit} images")

    processed = 0
    errors = 0
    total_saved = 0

    for key in webp_keys:
        og_key = key.replace(".webp", "-og.jpg")
        try:
            # Download original
            resp = s3.get_object(Bucket=spaces.bucket, Key=key)
            original_bytes = resp["Body"].read()
            original_size = len(original_bytes)

            # Check if OG already exists
            og_exists = False
            try:
                s3.head_object(Bucket=spaces.bucket, Key=og_key)
                og_exists = True
            except s3.exceptions.ClientError:
                pass

            # Reoptimize WebP (unless skipped or already small)
            webp_bytes = original_bytes
            webp_action = "SKIP"
            if not args.skip_optimize and original_size > 200_000:  # >200KB
                webp_bytes = optimize_webp(original_bytes)
                saved = original_size - len(webp_bytes)
                total_saved += saved
                orig_kb, new_kb, saved_kb = (
                    original_size // 1024,
                    len(webp_bytes) // 1024,
                    saved // 1024,
                )
                webp_action = f"OPTIMIZE ({orig_kb}KB -> {new_kb}KB, saved {saved_kb}KB)"

            # Generate OG
            og_bytes = generate_og_jpeg(original_bytes)
            og_action = f"OG ({len(og_bytes) // 1024}KB)"
            if og_exists:
                og_action = "OG-SKIP (exists)"

            if args.dry_run:
                log.info(f"DRY-RUN: {key}")
                log.info(f"  WebP: {webp_action}")
                log.info(f"  OG:   {og_action}")
            else:
                # Upload reoptimized WebP (if changed)
                if webp_action != "SKIP":
                    s3.put_object(
                        Bucket=spaces.bucket,
                        Key=key,
                        Body=webp_bytes,
                        ContentType="image/webp",
                    )

                # Upload OG (if not exists)
                if not og_exists:
                    s3.put_object(
                        Bucket=spaces.bucket,
                        Key=og_key,
                        Body=og_bytes,
                        ContentType="image/jpeg",
                    )

                log.info(f"OK: {key} | {webp_action} | {og_action}")

            processed += 1

        except Exception as e:
            log.error(f"ERROR: {key} - {e}")
            errors += 1

    log.info(f"\nDone: {processed} processed, {errors} errors")
    mb, kb = total_saved // 1024 // 1024, total_saved // 1024
    log.info(f"Total space saved from WebP reoptimization: {mb}MB ({kb}KB)")


if __name__ == "__main__":
    asyncio.run(main())
