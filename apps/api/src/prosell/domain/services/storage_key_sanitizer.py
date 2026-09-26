"""Shared storage-key alphabet sanitizer.

Single source of truth for the `[A-Za-z0-9._-]` normalization applied to
a full (multi-segment) object-storage key -- as opposed to
`csv_image_mapper.py::CSVImageMapper._sanitize_filename`, which sanitizes
a single ZIP-entry filename and raises on path traversal/empty input.
This one never raises: it's applied defensively at every write boundary
(CreateProductUseCase, UpdateProductUseCase) and by the one-time
production cleanup script (`scripts/sanitize_broken_image_keys.py`), so
it always returns a string, sanitized or passed through unchanged.

Domain layer: zero external dependencies (stdlib `re` only), per the
project's Clean Architecture rule -- importable from application,
infrastructure, or a standalone script without pulling in anything else.

Background: a real-world phone-cam filename like
``WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg`` lands in
`image_urls`/`cover_image_key`/`thumbnail_image_key` with spaces and
parens, which the DTO storage-key regex rejects on the next PATCH --
making the product uneditable (422 on every save). Fixed at the source
(CSV import) in commit 072bfa10; this module is the defense-in-depth
copy applied again at every write, so a client POST/PATCH that bypasses
the CSV path can't re-introduce the same bad shape.
"""

from __future__ import annotations

import re

_NORMALIZE_RE = re.compile(r"[^A-Za-z0-9._\-]")
_COLLAPSE_RE = re.compile(r"_+")


def is_url(key: str) -> bool:
    """True for a full http(s) URL. The bulk-upload flow writes those
    directly into `image_urls`/`cover_image_key` -- confirmed against
    real data, most rows are `http://host/bucket/vehicles/...`, not bare
    keys. A URL's `://` and host `:`/`.` always fall outside the safe
    alphabet, so callers must skip sanitization for it -- otherwise every
    healthy URL row gets misclassified as broken and its scheme mangled
    (`http://` -> `http_//`)."""
    return key.startswith("http://") or key.startswith("https://")


def sanitize_storage_key(key: str) -> str:
    """Apply the post-fix alphabet sanitizer to a full storage key.

    Tenant UUID, vehicle UUID, and VIN path segments are already in the
    safe alphabet (a subset of `[A-Za-z0-9._-]`) so they pass through
    unchanged; only a segment with a disallowed char (typically the
    trailing filename) gets rewritten. A full http(s) URL passes through
    unchanged (see `is_url`) -- the signer treats the whole string as a
    URL, and rewriting `:` would break the scheme.

    Idempotent: a key that's already clean passes through byte-identical,
    and running it twice yields the same result.
    """
    if not key or is_url(key):
        return key
    parts = key.split("/")
    normalized = [_NORMALIZE_RE.sub("_", p) for p in parts]
    collapsed = [_COLLAPSE_RE.sub("_", p).strip("_") for p in normalized]
    return "/".join(collapsed)
