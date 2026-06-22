"""Integration test — set_primary_image must be tenant-isolated.

GGA flagged: `set_primary_image` accepted a `tenant_id` argument but never
filtered any of its queries by it (silenced with `# noqa: ARG002`). A caller
who knew/guessed another tenant's product_id + image_id could flip that
tenant's primary image. `ProductImageModel` has no `tenant_id` column of its
own, so isolation must be enforced via a join through `ProductModel`.
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_image_model import ProductImageModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def other_tenant_product_with_image(
    db_session: AsyncSession,
) -> tuple[ProductModel, ProductImageModel]:
    """Product + primary image belonging to a SECOND, unrelated tenant."""
    org_b_id = uuid4()
    org_b = OrganizationModel(
        id=org_b_id,
        tenant_id=org_b_id,
        name="Org B Dealer",
        status="active",
        description="Second dealer for isolation tests",
        settings={},
    )
    db_session.add(org_b)
    await db_session.flush()

    category_b = CategoryModel(
        id=uuid4(),
        name="Org B Category",
        slug=f"org-b-category-{uuid4().hex[:8]}",
        tenant_id=org_b.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category_b)
    await db_session.flush()

    product = ProductModel(
        id=uuid4(),
        tenant_id=org_b.tenant_id,
        organization_id=org_b.id,
        category_id=category_b.id,
        title="Org B Product",
        price_cents=2_000_000,
    )
    db_session.add(product)
    await db_session.flush()

    image = ProductImageModel(
        id=uuid4(),
        product_id=product.id,
        url="https://example.com/org-b-photo.jpg",
        is_primary=True,
    )
    db_session.add(image)
    await db_session.flush()

    return product, image


@pytest.mark.asyncio
async def test_set_primary_image_rejects_cross_tenant_call(
    db_session: AsyncSession,
    other_tenant_product_with_image: tuple[ProductModel, ProductImageModel],
) -> None:
    """A caller from a DIFFERENT tenant cannot flip another dealer's primary image."""
    other_product, other_image = other_tenant_product_with_image
    repo = SqlAlchemyProductRepository(db_session)

    attacker_tenant_id = uuid4()  # Not org_b's tenant
    result = await repo.set_primary_image(
        product_id=other_product.id,
        image_id=other_image.id,
        tenant_id=attacker_tenant_id,
    )

    assert result is False


@pytest.mark.asyncio
async def test_set_primary_image_succeeds_for_owning_tenant(
    db_session: AsyncSession,
    other_tenant_product_with_image: tuple[ProductModel, ProductImageModel],
) -> None:
    """Regression: the owning tenant can still set its own primary image."""
    other_product, other_image = other_tenant_product_with_image
    repo = SqlAlchemyProductRepository(db_session)

    result = await repo.set_primary_image(
        product_id=other_product.id,
        image_id=other_image.id,
        tenant_id=other_product.tenant_id,
    )

    assert result is True
