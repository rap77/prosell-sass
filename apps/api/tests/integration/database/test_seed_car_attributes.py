"""Integration — car leaf categories carry the automotive attribute_schema
and presentation template, and products classified there validate + compose
their title server-side.

Reference implementation of the per-leaf attribute spec (Vehículos → Carros
y Camionetas). Other branches/niches follow this pattern once confirmed.

Requires the test DB on localhost:5433.
"""

import pytest
from sqlalchemy import select

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.services.presentation_resolver import filter_fields
from prosell.infrastructure.database.seed_categories import seed_vehicles_vertical
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


async def _get(db_session, slug):
    stmt = select(CategoryModel).where(
        CategoryModel.slug == slug, CategoryModel.tenant_id.is_(None)
    )
    return (await db_session.execute(stmt)).scalar_one_or_none()


@pytest.mark.asyncio
async def test_car_leaf_has_attribute_schema_and_presentation(db_session):
    await seed_vehicles_vertical(db_session)

    suvs = await _get(db_session, "suvs")
    assert suvs is not None
    assert suvs.attribute_schema["make"]["required"] is True
    assert suvs.attribute_schema["model"]["required"] is True
    assert suvs.attribute_schema["year"]["type"] == "number"
    assert suvs.presentation["title_template"] == "{year} {make} {model}"

    filterables = {f["key"] for f in filter_fields(suvs.attribute_schema)}
    assert {"make", "model", "year"} <= filterables


@pytest.mark.asyncio
async def test_create_product_under_car_leaf_validates_and_composes_title(
    db_session, test_organization
):
    await seed_vehicles_vertical(db_session)
    suvs = await _get(db_session, "suvs")

    response = await CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        CreateProductRequest(
            title="IGNORED CLIENT TITLE",
            price_cents=2_500_000,
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=suvs.id,
            attributes={"make": "Toyota", "model": "RAV4", "year": 2022},
            image_urls=[],
        )
    )

    assert response.title == "2022 Toyota RAV4"


@pytest.mark.asyncio
async def test_create_product_under_car_leaf_rejects_missing_required(
    db_session, test_organization
):
    await seed_vehicles_vertical(db_session)
    suvs = await _get(db_session, "suvs")

    with pytest.raises(ValueError, match="make"):
        await CreateProductUseCase(
            SqlAlchemyProductRepository(db_session),
            SqlAlchemyCategoryRepository(db_session),
        ).execute(
            CreateProductRequest(
                title="x",
                price_cents=2_500_000,
                tenant_id=test_organization.tenant_id,
                organization_id=test_organization.id,
                category_id=suvs.id,
                attributes={"model": "RAV4", "year": 2022},  # missing make
                image_urls=[],
            )
        )
