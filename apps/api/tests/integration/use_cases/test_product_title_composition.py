"""Integration: product title is composed server-side from the category's
presentation template (with fallback to the request title).

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


def _request(test_organization, test_category, *, title, attributes):
    return CreateProductRequest(
        title=title,
        price_cents=1_850_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        attributes=attributes,
        image_urls=[],
    )


@pytest.mark.asyncio
async def test_create_composes_title_from_category_template(
    db_session, test_organization, test_category
):
    test_category.presentation = {"title_template": "{year} {make} {model}"}
    await db_session.flush()

    use_case = CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    )
    response = await use_case.execute(
        _request(
            test_organization, test_category,
            title="IGNORED CLIENT TITLE",
            attributes={"year": 2020, "make": "Honda", "model": "Civic"},
        )
    )

    assert response.title == "2020 Honda Civic"


@pytest.mark.asyncio
async def test_create_falls_back_to_request_title_without_template(
    db_session, test_organization, test_category
):
    test_category.presentation = None
    await db_session.flush()

    use_case = CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    )
    response = await use_case.execute(
        _request(
            test_organization, test_category,
            title="2020 Honda Accord",
            attributes={"year": 2020, "make": "Honda", "model": "Accord"},
        )
    )

    assert response.title == "2020 Honda Accord"
