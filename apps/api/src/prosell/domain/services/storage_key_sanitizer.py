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
from urllib.parse import SplitResult, urlsplit, urlunsplit

_NORMALIZE_RE = re.compile(r"[^A-Za-z0-9._\-]")
_COLLAPSE_RE = re.compile(r"_+")


def is_url(key: str) -> bool:
    """True for a full http(s) URL, as opposed to a bare `orgs/...` or
    `vehicles/...` storage key. The bulk-upload flow writes full URLs
    directly into `image_urls`/`cover_image_key` -- confirmed against
    real data, most rows are `http(s)://host[:port]/bucket/orgs-or-
    vehicles/...`, not bare keys. Callers must sanitize only the PATH
    of a URL, never the scheme/host (see `sanitize_storage_key`) --
    the host can legitimately contain a port's `:` or a domain's `.`,
    neither of which is a "broken filename" to fix."""
    return key.startswith("http://") or key.startswith("https://")


def _sanitize_segments(value: str) -> str:
    """Normalize each `/`-separated segment of a bare path/key to the
    safe alphabet, independently -- a segment already in
    `[A-Za-z0-9._-]` (tenant UUID, vehicle UUID, VIN, bucket name)
    passes through unchanged; only a segment with a disallowed char
    (typically the trailing filename) gets rewritten."""
    parts = value.split("/")
    normalized = [_NORMALIZE_RE.sub("_", p) for p in parts]
    collapsed = [_COLLAPSE_RE.sub("_", p).strip("_") for p in normalized]
    return "/".join(collapsed)


def url_path(key: str) -> str:
    """The path component of a URL, e.g. everything after the host in
    `https://host:port/prosell-assets/orgs/.../file.jpg`. Real broken
    rows have the bad filename here -- a raw, unencoded phone-cam name
    like `WhatsApp Image ... (1).jpeg` written straight into the URL's
    path by the bulk-upload flow, not just into a bare key. Exposed so
    a caller that only needs to CHECK for bad chars (not rewrite them)
    doesn't have to re-derive the scheme/host split itself."""
    return urlsplit(key).path


def sanitize_storage_key(key: str) -> str:
    """Apply the post-fix alphabet sanitizer to a full storage key or a
    full http(s) URL.

    For a bare key, every `/`-separated segment is normalized (tenant
    UUID / vehicle UUID / VIN segments are already clean and pass
    through; a segment with a disallowed char, typically the trailing
    filename, gets rewritten).

    For a URL, ONLY the path is sanitized this same way -- the
    scheme and host (`https://atl1.digitaloceanspaces.com:443`) are
    rebuilt untouched, since a port's `:` or a domain's `.` are not a
    "broken filename" and rewriting them would corrupt a working URL.
    Query string and fragment (never used by this app's image URLs)
    are preserved as-is too.

    Idempotent: a key/URL that's already clean passes through
    byte-identical, and running it twice yields the same result.
    """
    if not key:
        return key
    if not is_url(key):
        return _sanitize_segments(key)
    parts: SplitResult = urlsplit(key)
    new_path = _sanitize_segments(parts.path)
    return urlunsplit((parts.scheme, parts.netloc, new_path, parts.query, parts.fragment))
