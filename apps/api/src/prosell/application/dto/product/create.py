"""Product creation DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator
from pydantic import ValidationError as PydanticValidationError

from prosell.domain.value_objects.product_condition import ProductCondition

_ALLOWED_IMAGE_URL_SCHEMES = frozenset({"http", "https"})


def _validate_image_urls_format(v: list[str] | None) -> list[str] | None:
    """Reject malformed or non-http(s) image URLs at the DTO boundary.

    Defense in depth: the signer (infrastructure) and the router-level
    `validate_image_urls_for_tenant` (authorization) are the primary
    defenses. This layer rejects obvious bad input early so the use case
    and infrastructure layers can assume well-formed URLs.

    http is allowed in addition to https because local dev uses
    http://minio:9000/. Production uses https only via DO Spaces.

    Tenant scope (orgs/{tenant_id}/ prefix) is NOT checked here because
    the DTO is parsed before the auth context (current_user.tenant_id)
    is available. See `validate_image_urls_for_tenant` in the product
    router for that check.
    """
    if v is None:
        return v
    for url in v:
        if not isinstance(url, str) or not url.strip():
            raise ValueError(f"image_urls entry is empty: {url!r}")
        try:
            parsed = HttpUrl(url)
        except PydanticValidationError as exc:
            raise ValueError(f"image_urls entry is not a valid URL: {url!r}") from exc
        if parsed.scheme not in _ALLOWED_IMAGE_URL_SCHEMES:
            raise ValueError(
                f"image_urls entry must use http or https scheme, got {parsed.scheme!r}: {url!r}"
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
