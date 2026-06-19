"""RED test — The product image-urls response must contain signed URLs.

This test exercises the full bug scenario:
1. Create a product via the use case WITH image_urls in the request.
2. Simulate the GET /api/v1/products/{id}/image-urls response building
   (the same logic as `product_router.py:264-271`).

The test REDs today because step 1 fails to persist image_urls (the use
case bug), so step 2 sees an empty `image_urls` and returns no signed
URLs. After T4+T5+T8 (DTO + use case + bulk upload), the response will
contain one signed URL per uploaded image.
"""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.image_urls_response import (
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
)
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.value_objects.product_condition import ProductCondition


class TestGetProductImageUrlsReturnsSigned:
    """Verify signed URLs are returned for every persisted image."""

    @pytest.mark.asyncio
    async def test_create_with_images_then_response_includes_signed_urls(self) -> None:
        """After creating a product with image_urls, the image-urls
        response must include one signed URL per image.

        Reproduces the user-visible bug: "I uploaded images, why does
        the catalog show a placeholder?" — answer: because the response
        has no signed URLs, so the frontend falls back to the placeholder.
        """
        # Arrange — request with image_urls
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        image_urls = [
            "vehicles/abc/123/1FMSK7DH7LGA77418/img1.jpg",
            "vehicles/abc/123/1FMSK7DH7LGA77418/img2.jpg",
        ]

        request = CreateProductRequest.model_construct(
            title="2020 Ford Explorer",
            price_cents=2_500_000,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            condition=ProductCondition.USED,
            currency="USD",
            attributes={},
            image_urls=image_urls,
            location_city=None,
            location_state=None,
            location_zip=None,
            slug=None,
            description=None,
        )

        category_repo = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repo.get_by_id.return_value = mock_category

        product_repo = AsyncMock()
        captured: list = []

        async def capture_create(entity):
            captured.append(entity)
            return entity

        product_repo.create.side_effect = capture_create

        # Act — Step 1: create the product
        create_uc = CreateProductUseCase(product_repo, category_repo)
        await create_uc.execute(request)

        # The persisted product is what GET /image-urls would read from
        persisted = captured[0]

        # Act — Step 2: build the response (same logic as product_router.py:264-271)
        spaces = AsyncMock()

        async def sign(key: str) -> str:
            return (
                f"https://prosell-assets.atl1.digitaloceanspaces.com/{key}?X-Amz-Signature=abc123"
            )

        spaces.generate_download_url.side_effect = sign

        image_keys = persisted.image_urls or []
        images = [
            ProductImageUrlResponse(
                key=key,
                url=await spaces.generate_download_url(key),
                expires_in=3600,
            )
            for key in image_keys
        ]
        response = ProductImageUrlsResponse(product_id=persisted.id, images=images)

        # Assert — every uploaded image has a signed URL in the response
        assert len(response.images) == len(image_urls), (
            f"Expected {len(image_urls)} signed URLs in response, got {len(response.images)}. "
            "The product's image_urls was empty after the use case — the bug. "
            f"persisted.image_urls = {persisted.image_urls!r}"
        )
        for img in response.images:
            assert (
                "X-Amz-Signature" in img.url
            ), f"Image URL must be signed (contain X-Amz-Signature). Got: {img.url}"
        # Sanity: spaces was called once per image
        assert spaces.generate_download_url.await_count == len(image_urls)
