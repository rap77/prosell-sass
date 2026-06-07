"""Integration — attribute_schema + presentation across all niche branches.

Representative coverage of the per-leaf spec beyond cars: motos, real estate
(incl. the 'Casa de Campo requires land surface' rule) and articles.

Requires the test DB on localhost:5433.
"""

import pytest
from sqlalchemy import select

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.infrastructure.database.seed_categories import seed_global_taxonomy
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


async def _create(db_session, test_organization, category_id, attributes):
    return await CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        CreateProductRequest(
            title="IGNORED",
            price_cents=1_000_000,
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=category_id,
            attributes=attributes,
            image_urls=[],
        )
    )


@pytest.mark.asyncio
async def test_moto_leaf_has_engine_cc_and_composes_title(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    deportivas = await _get(db_session, "deportivas")
    assert "engine_cc" in deportivas.attribute_schema

    product = await _create(
        db_session,
        test_organization,
        deportivas.id,
        {"make": "Yamaha", "model": "R3", "year": 2023, "engine_cc": 321},
    )
    assert product.title == "2023 Yamaha R3"


@pytest.mark.asyncio
async def test_apartment_leaf_composes_real_estate_title(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    penthouse = await _get(db_session, "penthouse")

    product = await _create(
        db_session,
        test_organization,
        penthouse.id,
        {"operation": "Venta", "area_m2": 180, "bedrooms": 3, "bathrooms": 2},
    )
    assert product.title == "Venta · 3 hab · 180 m²"


@pytest.mark.asyncio
async def test_country_house_requires_land_area(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    quinta = await _get(db_session, "casa-de-campo-o-quinta")
    assert quinta.attribute_schema["land_area_m2"]["required"] is True

    with pytest.raises(ValueError, match="land_area_m2"):
        await _create(
            db_session,
            test_organization,
            quinta.id,
            {"operation": "Venta", "area_m2": 200, "bedrooms": 4, "bathrooms": 3},
        )


@pytest.mark.asyncio
async def test_land_leaf_composes_title(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    residencial = await _get(db_session, "residencial")

    product = await _create(
        db_session,
        test_organization,
        residencial.id,
        {"operation": "Venta", "land_area_m2": 500},
    )
    assert product.title == "Venta · 500 m²"


@pytest.mark.asyncio
async def test_smartphone_leaf_composes_article_title(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    smartphones = await _get(db_session, "smartphones")

    product = await _create(
        db_session,
        test_organization,
        smartphones.id,
        {"brand": "Samsung", "model": "Galaxy S24", "condition": "Nuevo"},
    )
    assert product.title == "Samsung Galaxy S24"


@pytest.mark.asyncio
async def test_clothing_leaf_composes_size_title(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    camisas = await _get(db_session, "camisas-y-camisetas")

    product = await _create(
        db_session,
        test_organization,
        camisas.id,
        {"brand": "Nike", "size": "M"},
    )
    assert product.title == "Nike talla M"
