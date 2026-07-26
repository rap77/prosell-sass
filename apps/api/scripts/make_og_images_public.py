#!/usr/bin/env python3
"""Make all -og.jpg images public (ACL=public-read).

Run:
  docker exec prosell-prod-api python scripts/make_og_images_public.py --dry-run
  docker exec prosell-prod-api python scripts/make_og_images_public.py

ponytail: one-off script, delete after complete.
"""

import argparse

import boto3

from prosell.core.config import settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    s3 = boto3.client(
        "s3",
        region_name=settings.do_region,
        endpoint_url=f"https://{settings.do_region}.digitaloceanspaces.com",
        aws_access_key_id=settings.do_access_key_id,
        aws_secret_access_key=settings.do_secret_access_key,
    )

    print("Scanning for -og.jpg images...")

    og_keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=settings.do_bucket_name, Prefix="orgs/"):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith("-og.jpg"):
                og_keys.append(obj["Key"])

    print(f"Found {len(og_keys)} OG images")

    made_public = 0
    errors = 0

    for key in og_keys:
        try:
            if args.dry_run:
                print(f"DRY-RUN: would make public: {key}")
            else:
                s3.put_object_acl(
                    Bucket=settings.do_bucket_name,
                    Key=key,
                    ACL="public-read",
                )
                print(f"OK: {key}")
            made_public += 1
        except Exception as e:
            print(f"ERROR: {key} - {e}")
            errors += 1

    print(f"\nDone: {made_public} made public, {errors} errors")


if __name__ == "__main__":
    main()
