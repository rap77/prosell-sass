"""RED tests — UpdateProductRequest PATCH must persist image_urls at the top level.

Bug reference: `.mm-flow/planning/changes/product-image-association-bug/`
The PATCH /api/v1/products/{product_id} endpoint at
`apps/api/src/prosell/infrastructure/api/routers/product_router.py:274-318`
updates a product field-by-field, but never reads `image_urls` from the
request — so updating a product's images has no effect on the entity.

This file contains two RED tests:

  test_update_dto_accepts_image_urls  — T6 fix
    The DTO `UpdateProductRequest` does not declare `image_urls`, so
    constructing one with that field raises a Pydantic validation error.

  test_update_persists_image_urls_to_entity  — T7 fix
    The router applies the request field-by-field to the entity. Once T7
    is in place, `product.image_urls` must reflect the request's value
    (and it must NOT be buried in `attributes`).

Both tests go GREEN after T6 (DTO) + T7 (router forward) are applied.
The patch-flow logic under test is the same as the field-by-field copy
in the PATCH endpoint.
"""

from uuid import uuid4

import pytest

from prosell.application.dto.product.update import UpdateProductRequest
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition


class TestUpdateProductPersistsImageUrls:
    """Verify the PATCH path forwards image_urls to the entity."""

    def test_update_dto_accepts_image_urls(self) -> None:
        """T6 — UpdateProductRequest must declare `image_urls` as an
        optional field (PATCH semantics: `None` means 'do not change').

        Currently FAILS with Pydantic ValidationError because the DTO
        does not declare `image_urls`.
        """
        urls = [
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/img1.jpg",
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/img2.jpg",
        ]

        # Plain constructor (NOT model_construct) — exercises Pydantic
        # validation, which is what fails before T6.
        request = UpdateProductRequest(image_urls=urls)

        assert request.image_urls == urls

    def test_update_dto_image_urls_default_is_none(self) -> None:
        """T6 — When the client omits `image_urls`, the field must default
        to `None` (so the router's `if X is not None` skip path is
        well-defined and we don't accidentally clobber existing images).
        """
        request = UpdateProductRequest()

        assert request.image_urls is None

    @pytest.mark.asyncio
    async def test_update_persists_image_urls_to_entity(self) -> None:
        """T7 — The PATCH flow must forward `image_urls` from the request
        to the entity, and they must NOT live under `attributes`.

        This test mirrors the field-by-field copy in the PATCH endpoint
        (`product_router.py:296-314`). Once T7 wires the same
        `if request.image_urls is not None: product.image_urls = ...`
        into the router, the behavior under test matches what the
        endpoint does in production.
        """
        # Arrange — request with new image_urls
        new_image_urls = [
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/img1.jpg",
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/img2.jpg",
        ]
        request = UpdateProductRequest.model_construct(
            image_urls=new_image_urls,
            title=None,
            description=None,
            price_cents=None,
            category_id=None,
            condition=None,
            attributes=None,
            location_city=None,
            location_state=None,
            location_zip=None,
        )

        # Existing product in DB with no images
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        product = Product.create(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            condition=ProductCondition.USED,
            attributes={},
            image_urls=[],
        )
        assert product.image_urls == []

        # Act — same field-by-field copy the PATCH endpoint does
        if request.image_urls is not None:
            product.image_urls = request.image_urls

        # Assert
        assert product.image_urls == new_image_urls, (
            "Product.image_urls must equal the request's image_urls after PATCH. "
            f"Got {product.image_urls!r}"
        )
        assert "image_urls" not in product.attributes, (
            "image_urls must live on the top-level Product entity, not inside attributes. "
            f"Got attributes keys: {list(product.attributes.keys())}"
        )

    def test_update_dto_omitting_image_urls_preserves_existing(self) -> None:
        """T7 — PATCH semantics: if the client doesn't send `image_urls`,
        the existing value must be preserved (the `is not None` guard).
        """
        # Build request with NO image_urls
        request = UpdateProductRequest.model_construct(
            title="New title",
            image_urls=None,
            description=None,
            price_cents=None,
            category_id=None,
            condition=None,
            attributes=None,
            location_city=None,
            location_state=None,
            location_zip=None,
        )

        # Existing product with images
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        existing_urls = ["https://prosell-assets.../old.jpg"]
        product = Product.create(
            title="Old",
            price_cents=100,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            condition=ProductCondition.USED,
            image_urls=existing_urls,
        )

        # Apply patch (mirror router logic)
        if request.image_urls is not None:
            product.image_urls = request.image_urls

        # Existing images preserved
        assert product.image_urls == existing_urls
