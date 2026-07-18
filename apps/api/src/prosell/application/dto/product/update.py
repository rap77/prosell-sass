"""Product update DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from prosell.application.dto.product.create import _validate_image_urls_format
from prosell.domain.value_objects.product_condition import ProductCondition


class UpdateProductRequest(BaseModel):
    """DTO for product update request."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    price_cents: int | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    condition: ProductCondition | None = None
    attributes: dict[str, object] | None = None
    image_urls: list[str] | None = None
    # First-class pointer to the cover image. Single source of truth
    # for "which image is the cover" (replaces the old implicit
    # "first entry of image_urls" convention). Must reference an
    # entry that exists in `image_urls` — enforced by `_check_cover_in_images`
    # below. The cross-field invariant cannot be expressed with
    # `field_validator` (it operates on a single field at a time);
    # `model_validator(mode="after")` runs after the full model is
    # built and can see both fields.
    cover_image_key: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    # Gated behind Permission.MARKETPLACE_PUBLISH at the router boundary —
    # the DTO accepts the field unconditionally; the permission check
    # depends on the auth context, not the request shape.
    published_to_marketplace: bool | None = None
    # ponytail: tenant cascade — ProSell transfers a product to another
    # organization by sending a new organization_id. The router enforces
    # ORG_ADMIN_VIEW_ALL; the use case clears broker shares on change
    # because they belong to the previous organization, not the product.
    organization_id: UUID | None = None

    # Reuse the format validator from create.py. None means
    # "do not change this field" (PATCH semantics); an empty list means
    # "clear all image_urls".
    _validate_image_urls = field_validator("image_urls")(_validate_image_urls_format)

    @model_validator(mode="after")
    def _check_cover_in_images(self) -> "UpdateProductRequest":
        """Cross-field invariant: cover_image_key must reference a real image.

        When BOTH `cover_image_key` and `image_urls` are present in the
        same request, the cover must point to one of the images in the
        list. This catches the obvious bug at the API boundary:
        "I changed the cover to X but X is not one of my images".

        When only `cover_image_key` is sent (PATCH semantics for the
        cover, with the image list unchanged), the DTO cannot validate
        against the current product state — that check moves to the
        use case, which loads the product and validates against the
        live list. See `UpdateProduct` use case.
        """
        if self.cover_image_key is None:
            return self
        # image_urls was not sent in this request — defer to use case.
        if self.image_urls is None:
            return self
        # image_urls is sent and is empty — there are no images, so
        # the cover cannot reference any.
        if not self.image_urls:
            raise ValueError(
                "cover_image_key cannot be set when image_urls is empty: "
                "a product with no images has no cover"
            )
        if self.cover_image_key not in self.image_urls:
            raise ValueError(
                f"cover_image_key {self.cover_image_key!r} is not in image_urls. "
                f"Set cover_image_key to one of the existing image keys, "
                f"or add the new key to image_urls first."
            )
        return self
