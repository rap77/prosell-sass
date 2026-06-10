"""Integration: CreateProductUseCase must persist cover_image_key.

Regression: the use case built the product via `Product.create(...)` but
never forwarded `request.cover_image_key`, so a cover chosen at creation
time was silently dropped — even after the repository's persistence bug
was fixed. The card then fell back to image_urls[0].

Requires the test DB on localhost:5433.
"""

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_create_persists_cover_image_key(db_session, test_organization, test_category):
    tenant_id = test_organization.tenant_id
    key_a = f"orgs/{tenant_id}/vehicles/a.jpg"
    key_b = f"orgs/{tenant_id}/vehicles/b.jpg"

    use_case = CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    )

    response = await use_case.execute(
        CreateProductRequest(
            title="2020 Honda Civic",
            price_cents=1_850_000,
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            attributes={},
            image_urls=[key_a, key_b],
            cover_image_key=key_b,
        )
    )

    assert response.cover_image_key == key_b
