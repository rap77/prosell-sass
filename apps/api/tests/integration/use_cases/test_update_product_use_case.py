"""Integration: UpdateProductUseCase recomposes the product title server-side
from the category's presentation template (with fallback to the existing title).

Mirrors the create-path composition (Foundation Plan 1) for the UPDATE path
(Foundation Plan 2 §4). Requires the test DB on localhost:5433.
"""

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.update import UpdateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.domain.exceptions.product_exceptions import ProductNotFoundError
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


async def _create_product(
    db_session, test_organization, test_category, *, title, attributes
):
    return await CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        CreateProductRequest(
            title=title,
            price_cents=1_850_000,
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            attributes=attributes,
            image_urls=[],
        )
    )


@pytest.mark.asyncio
async def test_update_recomposes_title_from_template(
    db_session, test_organization, test_category
):
    """Changing an attribute that feeds the template recomposes the title."""
    test_category.presentation = {"title_template": "{year} {make} {model}"}
    await db_session.flush()

    created = await _create_product(
        db_session,
        test_organization,
        test_category,
        title="IGNORED CLIENT TITLE",
        attributes={"year": 2020, "make": "Honda", "model": "Civic"},
    )
    assert created.title == "2020 Honda Civic"

    updated = await UpdateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        created.id,
        test_organization.tenant_id,
        UpdateProductRequest(
            attributes={"year": 2020, "make": "Honda", "model": "Accord"}
        ),
    )

    assert updated.title == "2020 Honda Accord"


@pytest.mark.asyncio
async def test_update_falls_back_to_existing_title_without_template(
    db_session, test_organization, test_category
):
    """A category with no template keeps the existing title untouched."""
    test_category.presentation = None
    await db_session.flush()

    created = await _create_product(
        db_session,
        test_organization,
        test_category,
        title="2020 Honda Accord",
        attributes={"year": 2020, "make": "Honda", "model": "Accord"},
    )
    assert created.title == "2020 Honda Accord"

    updated = await UpdateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        created.id,
        test_organization.tenant_id,
        UpdateProductRequest(price_cents=999_900),
    )

    assert updated.title == "2020 Honda Accord"
    assert updated.price_cents == 999_900


@pytest.mark.asyncio
async def test_update_missing_product_raises_not_found(
    db_session, test_organization
):
    """Updating a non-existent product raises a domain error (router → 404)."""
    from uuid import uuid4

    with pytest.raises(ProductNotFoundError):
        await UpdateProductUseCase(
            SqlAlchemyProductRepository(db_session),
            SqlAlchemyCategoryRepository(db_session),
        ).execute(
            uuid4(),
            test_organization.tenant_id,
            UpdateProductRequest(price_cents=100),
        )
