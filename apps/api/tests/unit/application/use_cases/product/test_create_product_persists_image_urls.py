"""RED test — CreateProductUseCase must persist image_urls to the top-level field.

Bug reference: `.mm-flow/planning/changes/product-image-association-bug/`
The use case at `apps/api/src/prosell/application/use_cases/product/create_product.py`
calls `Product.create(...)` without forwarding `image_urls` from the request.

This test currently FAILS because:
1. The DTO `CreateProductRequest` does not declare `image_urls` (T4 fix).
2. The use case does not forward `image_urls` to the entity (T5 fix).

After both fixes (T4 + T5), the entity passed to `repo.create()` must
have `image_urls == [the URLs from the request]`, and they must NOT
live under `attributes`.
"""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.value_objects.product_condition import ProductCondition


class TestCreateProductPersistsImageUrls:
    """Verify the create use case persists image_urls at the top level."""

    @pytest.mark.asyncio
    async def test_create_persists_image_urls_to_top_level_field(self) -> None:
        """The entity handed to product_repository.create() must carry
        the request's image_urls on its top-level `image_urls` field
        (NOT nested inside `attributes`).
        """
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        image_urls = [
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/products/xyz/img1.jpg",
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/products/xyz/img2.jpg",
        ]

        # Construct the request using model_construct to bypass DTO validation
        # (the DTO does not yet declare image_urls — that's the T4 fix).
        # This isolates the test to the use-case layer, which is the actual
        # bug site: it must forward image_urls to Product.create(...).
        request = CreateProductRequest.model_construct(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
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

        # Mock category repo (use case calls validate_attributes on it)
        category_repo = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repo.get_by_id.return_value = mock_category

        # Mock product repo, capturing whatever entity is passed to create()
        product_repo = AsyncMock()
        captured: list = []

        async def capture_create(entity):
            captured.append(entity)
            return entity

        product_repo.create.side_effect = capture_create

        # Act
        use_case = CreateProductUseCase(product_repo, category_repo)
        await use_case.execute(request)

        # Assert — exactly one create call, entity has the right image_urls
        assert len(captured) == 1, "Expected one product_repository.create() call"
        persisted = captured[0]
        assert persisted.image_urls == image_urls, (
            f"Product.image_urls must equal {image_urls}, got {persisted.image_urls!r}. "
            "The use case must forward image_urls to Product.create(...)."
        )
        # And critically: not buried inside attributes
        assert "image_urls" not in persisted.attributes, (
            "image_urls must live on the top-level Product entity, not inside attributes. "
            f"Got attributes keys: {list(persisted.attributes.keys())}"
        )
