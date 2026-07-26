#!/usr/bin/env python3
"""
Make all product/vehicle images public (ACL: public-read).

Run this ONCE to fix existing images so WhatsApp can access them.
New images will be uploaded with public ACL automatically.

Usage:
    uv run python scripts/make_product_images_public.py

Environment variables required:
    DO_ACCESS_KEY_ID
    DO_SECRET_ACCESS_KEY
    DO_REGION (default: atl1)
    DO_BUCKET_NAME (default: prosell-assets)
"""

import asyncio
import os
from collections.abc import AsyncIterator

import boto3
from botocore.client import Config


async def list_all_objects(s3_client, bucket: str, prefix: str) -> AsyncIterator[dict]:
    """List all objects under prefix (handles pagination)."""
    continuation_token = None

    while True:
        params = {"Bucket": bucket, "Prefix": prefix}
        if continuation_token:
            params["ContinuationToken"] = continuation_token

        response = await asyncio.to_thread(s3_client.list_objects_v2, **params)

        if "Contents" in response:
            for obj in response["Contents"]:
                yield obj

        if not response.get("IsTruncated"):
            break

        continuation_token = response.get("NextContinuationToken")


async def make_images_public():
    """Make all product/vehicle images public."""
    region = os.getenv("DO_REGION", "atl1")
    bucket = os.getenv("DO_BUCKET_NAME", "prosell-assets")
    access_key = os.getenv("DO_ACCESS_KEY_ID")
    secret_key = os.getenv("DO_SECRET_ACCESS_KEY")

    if not access_key or not secret_key:
        raise ValueError("Missing credentials: DO_ACCESS_KEY_ID and DO_SECRET_ACCESS_KEY required")

    endpoint = f"https://{region}.digitaloceanspaces.com"

    # ponytail: no path-style - DO Spaces prefers virtual-hosted
    boto_config = Config(signature_version="s3v4")

    s3_client = boto3.client(
        "s3",
        region_name=region,
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=boto_config,
    )

    # Process all images under orgs/
    updated_count = 0
    error_count = 0

    print(f"🔍 Scanning bucket: {bucket}")
    print(f"📍 Region: {region}")
    print("🔧 Making all product/vehicle images public...\n")

    async for obj in list_all_objects(s3_client, bucket, "orgs/"):
        key = obj["Key"]

        # Only process images in vehicles/ or products/ directories
        if "/vehicles/" not in key and "/products/" not in key:
            continue

        # Only process image files
        if not key.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            continue

        try:
            # Change ACL to public-read
            await asyncio.to_thread(
                s3_client.put_object_acl, Bucket=bucket, Key=key, ACL="public-read"
            )
            updated_count += 1
            print(f"✅ {key}")
        except Exception as e:
            error_count += 1
            print(f"❌ {key}: {e}")

    print("\n📊 Summary:")
    print(f"   Updated: {updated_count}")
    print(f"   Errors: {error_count}")
    print("\n✅ Done! Product images are now public for WhatsApp sharing.")


if __name__ == "__main__":
    asyncio.run(make_images_public())
