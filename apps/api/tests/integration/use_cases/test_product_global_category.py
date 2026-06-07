"""Integration: products can reference GLOBAL category templates.

Foundation Plan 2 Task 6. After global-ization, a vertical's root and its
children are global (``tenant_id IS NULL``) and shared across organizations.
A product created/updated by a tenant must be able to reference such a
global category — the create/update use cases read it via
``get_by_id_or_global`` (own OR global), not the strict ``get_by_id``.

Requires the test DB on localhost:5433.
"""

from uuid import uuid4

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.update import UpdateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


async def _add_global_category(db_session, *, presentation):
    model = CategoryModel(
        id=uuid4(),
        name=f"Global Vehicles {uuid4().hex[:8]}",
        slug=f"global-vehicles-{uuid4().hex[:8]}",
        tenant_id=None,  # GLOBAL template
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
        presentation=presentation,
    )
    db_session.add(model)
    await db_session.flush()
    return model


@pytest.mark.asyncio
async def test_create_product_referencing_global_category(
    db_session, test_organization
):
    """Creating a product under a global category succeeds and composes the
    title from the global template."""
    global_cat = await _add_global_category(
        db_session, presentation={"title_template": "{year} {make} {model}"}
    )

    response = await CreateProductUseCase(
        SqlAlchemyProductRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
    ).execute(
        CreateProductRequest(
            title="IGNORED",
            price_cents=1_000_000,
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=global_cat.id,
            attributes={"year": 2021, "make": "Toyota", "model": "Corolla"},
            image_urls=[],
        )
    )

    assert response.title == "2021 Toyota Corolla"
    assert response.category_id == global_cat.id


@pytest.mark.asyncio
async def test_update_product_under_global_category_recomposes_title(
    db_session, test_organization
):
    """Updating an attribute recomposes the title from the global template."""
    global_cat = await _add_global_category(
        db_session, presentation={"title_template": "{year} {make} {model}"}
    )
    product_repo = SqlAlchemyProductRepository(db_session)
    category_repo = SqlAlchemyCategoryRepository(db_session)

    created = await CreateProductUseCase(product_repo, category_repo).execute(
        CreateProductRequest(
            title="IGNORED",
            price_cents=1_000_000,
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=global_cat.id,
            attributes={"year": 2021, "make": "Toyota", "model": "Corolla"},
            image_urls=[],
        )
    )
    assert created.title == "2021 Toyota Corolla"

    updated = await UpdateProductUseCase(product_repo, category_repo).execute(
        created.id,
        test_organization.tenant_id,
        UpdateProductRequest(
            attributes={"year": 2021, "make": "Toyota", "model": "Camry"}
        ),
    )

    assert updated.title == "2021 Toyota Camry"
