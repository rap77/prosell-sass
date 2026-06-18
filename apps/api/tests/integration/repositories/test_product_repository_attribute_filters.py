"""Integration tests: `get_all` translates `attribute_filters` to JSONB SQL.

Subsystem B — generic `Product.attributes` (JSONB) filtering on the
product repository's listing method. Covers the five filter_type
behaviors: range (both bounds), select (OR within values), text (ilike),
missing-attribute exclusion, and AND across multiple filters.

Requires the test DB running on port 5433 (same fixtures as
test_product_repository_cover.py: db_session, test_organization,
test_category).
"""

from collections.abc import AsyncGenerator
from dataclasses import dataclass
from decimal import Decimal
from typing import cast
from uuid import UUID

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.attribute_filter import AttributeFilter
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)

pytestmark = pytest.mark.asyncio


@dataclass
class SeededProducts:
    """Handle for products seeded by the `seed_products` fixture."""

    tenant_id: UUID
    category_id: UUID
    products: list[Product]


@pytest_asyncio.fixture
async def product_repo(db_session: AsyncSession) -> SqlAlchemyProductRepository:
    """Real repository backed by the test DB session."""
    return SqlAlchemyProductRepository(db_session)


@pytest_asyncio.fixture
async def seed_products(
    product_repo: SqlAlchemyProductRepository,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> AsyncGenerator[SeededProducts]:
    """Seed products carrying `attributes` dicts for JSONB filter tests.

    - 3 Toyota Corolla products with years 2012, 2018, 2024
    - 1 Honda Civic with year 2022
    - 1 product with NO "year" attribute at all (missing-attribute case)
    """
    tenant_id = test_organization.tenant_id

    specs: list[dict[str, object]] = [
        {"year": 2012, "make": "Toyota", "model": "Corolla"},
        {"year": 2018, "make": "Toyota", "model": "Corolla"},
        {"year": 2024, "make": "Toyota", "model": "Corolla"},
        {"year": 2022, "make": "Honda", "model": "Civic"},
        {"make": "Ford", "model": "Fiesta"},  # no "year" key
    ]

    created: list[Product] = []
    for i, attrs in enumerate(specs):
        product = Product.create(
            title=f"Seed product {i}",
            price_cents=1_000_000 + i,
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            condition=ProductCondition.USED,
            attributes=attrs,
        )
        created.append(await product_repo.create(product))

    yield SeededProducts(tenant_id=tenant_id, category_id=test_category.id, products=created)


async def test_range_filter_both_bounds(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    # seed_products: years 2012, 2018, 2024 in attributes["year"]
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("2015"), max=Decimal("2020"))
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert {p.attributes["year"] for p in result} == {2018}


async def test_select_filter_or_within_values(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    f = AttributeFilter(key="make", filter_type="select", values=["Toyota", "Honda"])
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all(p.attributes["make"] in ("Toyota", "Honda") for p in result)
    assert {p.attributes["make"] for p in result} == {"Toyota", "Honda"}


async def test_text_filter_ilike(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    f = AttributeFilter(key="model", filter_type="text", value="coro")
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all("coro" in str(p.attributes["model"]).lower() for p in result)
    assert len(result) == 3


async def test_missing_attribute_excluded(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    # a product without "year" must not match a year range
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("1900"))
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all("year" in p.attributes for p in result)
    assert len(result) == 4


async def test_and_across_filters(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    fs = [
        AttributeFilter(key="make", filter_type="select", values=["Toyota"]),
        AttributeFilter(key="year", filter_type="range", min=Decimal("2020")),
    ]
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=fs)
    assert all(
        p.attributes["make"] == "Toyota" and cast(int, p.attributes["year"]) >= 2020 for p in result
    )
    assert len(result) == 1


async def test_distinct_attribute_values(
    product_repo: SqlAlchemyProductRepository, seed_products: SeededProducts
) -> None:
    out = await product_repo.distinct_attribute_values(
        tenant_id=seed_products.tenant_id,
        category_id=seed_products.category_id,
        keys=["make"],
    )
    # seed_products also includes a Ford with no "year" (missing-attribute case);
    # "make" is present on every seeded product, so it shows up here too.
    assert set(out["make"]) == {"Toyota", "Honda", "Ford"}
    assert None not in out["make"]
