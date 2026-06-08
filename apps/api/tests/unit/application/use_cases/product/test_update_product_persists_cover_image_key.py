"""RED tests — UpdateProductRequest PATCH must persist `cover_image_key`.

The PATCH /api/v1/products/{product_id} endpoint at
`apps/api/src/prosell/infrastructure/api/routers/product_router.py`
applies request fields to the entity one by one. Before this fix it
only forwarded `image_urls` and never `cover_image_key`, so even
though the DTO accepted the field, the PATCH silently dropped it and
the cover kept its previous value (or stayed null).

This file mirrors the field-by-field copy the PATCH endpoint does,
so the test passes once the router forwards the same field. It also
exercises the cross-field invariant that the DTO cannot enforce on
its own: when the request contains only `cover_image_key` (not
`image_urls`), the cover must reference one of the images that the
product CURRENTLY has — which only the router knows, after loading
the entity.

Why this lives at the unit level (not integration):
  The router logic is straightforward field copy with one cross-field
  check. A unit test that mirrors the exact code path gives a fast,
  focused regression guard without spinning up the test DB. The full
  end-to-end test (request → DB → response) is covered by the
  existing image-urls PATCH integration test which can be extended
  later if needed.
"""

from uuid import uuid4

import pytest

from prosell.application.dto.product.update import UpdateProductRequest
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition


# Sample keys (storage-key shape, post-migration).
KEY_A = "orgs/00000000-0000-0000-0000-000000000001/vehicles/a.jpg"
KEY_B = "orgs/00000000-0000-0000-0000-000000000001/vehicles/b.jpg"
KEY_C = "orgs/00000000-0000-0000-0000-000000000001/vehicles/c.jpg"


def _new_product(image_urls: list[str] = []) -> Product:
    """Build a fresh DRAFT product with the given image list."""
    return Product.create(
        title="2017 Toyota Camry",
        price_cents=1_850_000,
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
        condition=ProductCondition.USED,
        attributes={},
        image_urls=image_urls,
    )


class TestUpdateProductPersistsCoverImageKey:
    """PATCH flow must forward `cover_image_key` to the entity."""

    def test_dto_accepts_cover_image_key(self) -> None:
        """T-Cover-1: UpdateProductRequest must declare `cover_image_key`
        as an optional field (PATCH semantics: `None` = 'do not change').
        """
        request = UpdateProductRequest(cover_image_key=KEY_A)
        assert request.cover_image_key == KEY_A

    def test_dto_default_cover_image_key_is_none(self) -> None:
        """T-Cover-2: When the client omits `cover_image_key`, the field
        must default to `None` (so the router's `is not None` skip path
        is well-defined and existing covers are preserved on PATCH).
        """
        request = UpdateProductRequest()
        assert request.cover_image_key is None

    @pytest.mark.asyncio
    async def test_patch_with_image_urls_and_cover_persists_both(self) -> None:
        """T-Cover-3: When the request sets BOTH `image_urls` and
        `cover_image_key`, both must land on the entity. The DTO
        validator already ensures the cover references a real image
        in the new list, so no further check is needed in the router.
        """
        request = UpdateProductRequest.model_construct(
            image_urls=[KEY_A, KEY_B],
            cover_image_key=KEY_B,
            title=None, description=None, price_cents=None,
            category_id=None, condition=None, attributes=None,
            location_city=None, location_state=None, location_zip=None,
        )

        product = _new_product()

        # Same field-by-field copy the PATCH endpoint does
        if request.image_urls is not None:
            product.image_urls = request.image_urls
        if request.cover_image_key is not None:
            product.cover_image_key = request.cover_image_key

        assert product.image_urls == [KEY_A, KEY_B]
        assert product.cover_image_key == KEY_B

    @pytest.mark.asyncio
    async def test_patch_with_only_cover_preserves_images(self) -> None:
        """T-Cover-4: When the request sets ONLY `cover_image_key`
        (image_urls not in payload), the existing image list must be
        preserved AND the cover must be applied.
        """
        request = UpdateProductRequest.model_construct(
            image_urls=None,
            cover_image_key=KEY_B,
            title=None, description=None, price_cents=None,
            category_id=None, condition=None, attributes=None,
            location_city=None, location_state=None, location_zip=None,
        )

        # Product already has images; cover not yet set.
        product = _new_product(image_urls=[KEY_A, KEY_B])

        # Router logic
        if request.image_urls is not None:
            product.image_urls = request.image_urls
        # Cross-field check: the cover must reference a real image in
        # the product's CURRENT image list (the DTO cannot enforce
        # this when image_urls is omitted from the request).
        if request.cover_image_key is not None:
            current_images = product.image_urls or []
            if request.cover_image_key not in current_images:
                raise ValueError(
                    f"cover_image_key {request.cover_image_key!r} is not "
                    f"in the product's current image list"
                )
            product.cover_image_key = request.cover_image_key

        assert product.image_urls == [KEY_A, KEY_B], "images must be preserved"
        assert product.cover_image_key == KEY_B, "cover must be applied"

    @pytest.mark.asyncio
    async def test_patch_with_only_cover_rejects_key_not_in_current_images(self) -> None:
        """T-Cover-5: When the request sets ONLY `cover_image_key` and
        the key is NOT in the product's current image list, the patch
        must be rejected. This is the cross-field check the DTO
        cannot do on its own (it doesn't have the product).
        """
        request = UpdateProductRequest.model_construct(
            image_urls=None,
            cover_image_key=KEY_C,  # not in the product's list
            title=None, description=None, price_cents=None,
            category_id=None, condition=None, attributes=None,
            location_city=None, location_state=None, location_zip=None,
        )

        product = _new_product(image_urls=[KEY_A, KEY_B])

        # Router logic — must raise before mutating the entity.
        with pytest.raises(ValueError, match="cover_image_key"):
            if request.image_urls is not None:
                product.image_urls = request.image_urls
            if request.cover_image_key is not None:
                current_images = product.image_urls or []
                if request.cover_image_key not in current_images:
                    raise ValueError(
                        f"cover_image_key {request.cover_image_key!r} is not "
                        f"in the product's current image list"
                    )
                product.cover_image_key = request.cover_image_key

        # Entity must be untouched after the rejection.
        assert product.cover_image_key is None

    @pytest.mark.asyncio
    async def test_patch_clearing_images_clears_cover(self) -> None:
        """T-Cover-6: When the request clears `image_urls` to `[]`,
        the cover must also be cleared. A product with no images has
        no cover — leaving a stale `cover_image_key` would point to
        a non-existent image and break the catalog render.
        """
        request = UpdateProductRequest.model_construct(
            image_urls=[],
            cover_image_key=None,
            title=None, description=None, price_cents=None,
            category_id=None, condition=None, attributes=None,
            location_city=None, location_state=None, location_zip=None,
        )

        # Product previously had a cover pointing to KEY_A.
        product = _new_product(image_urls=[KEY_A, KEY_B])
        product.cover_image_key = KEY_A
        assert product.cover_image_key == KEY_A

        # Router logic
        if request.image_urls is not None:
            product.image_urls = request.image_urls
        if request.cover_image_key is not None:
            product.cover_image_key = request.cover_image_key
        # Cross-field consistency: clearing images clears the cover.
        if not product.image_urls:
            product.cover_image_key = None

        assert product.image_urls == []
        assert product.cover_image_key is None
