"""Product creation DTOs."""

import re
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator
from pydantic import ValidationError as PydanticValidationError

from prosell.domain.value_objects.product_condition import ProductCondition

_ALLOWED_IMAGE_URL_SCHEMES = frozenset({"http", "https"})

# Canonical storage key shape: `orgs/<tenant-uuid>/<rest of path>`.
# The tenant segment is a UUID-shaped string (not strictly version-validated
# here — the router layer enforces real tenant scope via
# `validate_image_urls_for_tenant`). The rest of the path permits alphanum,
# dot, underscore, dash, and forward slash (so filenames like
# `image_v1.0.jpg` are still valid). Anchored to the start, no leading
# slash. The `_has_no_traversal_segment` helper separately rejects `..`
# segments to block path-traversal attempts that the dot char allows.
_STORAGE_KEY_PATTERN = re.compile(r"^orgs/[0-9a-fA-F-]{36}/[A-Za-z0-9._/\-]+$")


def _has_no_traversal_segment(value: str) -> bool:
    """True iff no path segment in `value` is `..` or `.`.

    Defense against path traversal: a key like `orgs/<uuid>/../etc/passwd`
    passes the regex (dots are allowed for filenames) but is not a valid
    storage key — it would let a caller reference objects outside the
    tenant prefix.
    """
    return all(segment not in {"..", "."} for segment in value.split("/"))


def _is_storage_key(value: str) -> bool:
    """True iff `value` looks like a raw S3 storage key (post-migration form)."""
    return bool(_STORAGE_KEY_PATTERN.match(value)) and _has_no_traversal_segment(value)


def _is_valid_image_url(value: str) -> bool:
    """True iff `value` parses as an http(s) URL.

    http is allowed in addition to https because local dev uses
    http://minio:9000/. Production uses https only via DO Spaces.
    """
    try:
        parsed = HttpUrl(value)
    except PydanticValidationError:
        return False
    return parsed.scheme in _ALLOWED_IMAGE_URL_SCHEMES


def _validate_image_urls_format(v: list[str] | None) -> list[str] | None:
    """Accept either a raw storage key or an http(s) URL per entry.

    Defense in depth: the signer (infrastructure) and the router-level
    `validate_image_urls_for_tenant` (authorization) are the primary
    defenses. This layer rejects obvious bad input early so the use case
    and infrastructure layers can assume well-formed entries.

    Two valid shapes are accepted:
      1. **Raw storage key** (canonical, post-migration form):
         `orgs/<tenant-uuid>/vehicles/<file>`. The DB stores these and
         the `/image-urls` endpoint signs them on read.
      2. **http(s) URL** (legacy / external form): full URL with scheme.
         Kept for backward compatibility with bulk-upload flows and any
         pre-migration payloads still in flight.

    Tenant scope (orgs/{tenant_id}/ prefix) is NOT checked here because
    the DTO is parsed before the auth context (current_user.tenant_id)
    is available. See `validate_image_urls_for_tenant` in the product
    router for that check.
    """
    if v is None:
        return v
    for entry in v:
        if not isinstance(entry, str) or not entry.strip():
            raise ValueError(f"image_urls entry is empty: {entry!r}")
        if not (_is_storage_key(entry) or _is_valid_image_url(entry)):
            raise ValueError(
                f"image_urls entry must be a storage key (orgs/<uuid>/...) "
                f"or an http(s) URL: {entry!r}"
            )
    return v


class CreateProductRequest(BaseModel):
    """DTO for product creation request."""

    title: str = Field(..., min_length=1, max_length=500)
    price_cents: int = Field(..., ge=0)
    tenant_id: UUID | None = None
    organization_id: UUID | None = None
    category_id: UUID
    slug: str | None = None
    description: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    condition: ProductCondition = ProductCondition.USED
    attributes: dict[str, object] = Field(default_factory=dict)
    image_urls: list[str] = Field(default_factory=list)
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None

    _validate_image_urls = field_validator("image_urls")(_validate_image_urls_format)
