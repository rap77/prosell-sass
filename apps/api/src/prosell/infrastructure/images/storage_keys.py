"""Helpers for normalizing `product.image_urls` entries to raw storage keys.

`image_urls` accepts two shapes (see `CreateProductRequest._validate_image_urls_format`):
an `orgs/<tenant-uuid>/...`-style bare key, or a legacy full URL. Anything that
signs these values must extract the bare key first — feeding a full URL
straight into `IDOSpacesService.generate_download_url` treats the whole URL as
the S3 object key and produces a doubled, invalid presigned URL.
"""

from urllib.parse import urlparse


def extract_storage_key_from_value(value: str) -> str | None:
    """Extract the storage key from a value that may be a URL, a signed URL,
    or a bare key. Returns None if the value is malformed (no usable key).

    Two accepted shapes:
      1. **URL** (legacy / external form): `scheme://host/<bucket>/<key>`.
         The bucket is the first path segment; everything after `<bucket>/`
         is the storage key.
      2. **Bare key** (canonical, post-migration form):
         `orgs/<tenant-uuid>/<rest>`. The whole value is the key.

    For URLs we also drop any `?X-Amz-...` query string (signed URLs) so the
    extraction works for the legacy buggy data too.
    """
    if not value or not isinstance(value, str):
        return None
    # Drop query string (signed URLs embed their signature there).
    without_query = value.split("?", 1)[0]
    # Heuristic: bare keys start with `orgs/` and contain no scheme. URLs
    # always have a scheme separator (`://`).
    if "://" in without_query:
        parsed = urlparse(without_query)
        path = parsed.path.lstrip("/")
        if not path:
            return None
        # Strip the first path segment (the bucket) — what remains is the key.
        _, _, key = path.partition("/")
        return key or None
    # Bare key form: the whole (querystripped) value is the key.
    return without_query or None
