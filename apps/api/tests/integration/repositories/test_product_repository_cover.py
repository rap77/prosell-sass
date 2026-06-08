"""Integration tests: SqlAlchemyProductRepository must PERSIST cover_image_key.

Regression (catalog-image-perf, 2026-06): the `cover_image_key` feature
added the model column, the entity field, the DTOs and the router
forwarding — but the repository's `create()` (explicit ProductModel
constructor) and `update()` (field-by-field copy) never wrote
`model.cover_image_key`. So a PATCH that changed the cover returned 200
(the response is built from the in-memory entity) yet the DB column
stayed at its old value. On the next list read the catalog card fell
back to `image_urls[0]` and the cover change "disappeared".

These tests go through the REAL repository + test DB — the in-memory
unit tests that mirror the router logic cannot catch a persistence gap.

Requires the test DB running on port 5433.
"""

import pytest

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


def _keys(tenant_id) -> tuple[str, str]:
    base = f"orgs/{tenant_id}/vehicles"
    return f"{base}/a.jpg", f"{base}/b.jpg"


@pytest.mark.asyncio
async def test_create_persists_cover_image_key(db_session, test_organization, test_category):
    """create() must write cover_image_key to the DB column."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    key_a, key_b = _keys(tenant_id)

    product = Product.create(
        title="2017 Toyota Camry",
        price_cents=1_850_000,
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        condition=ProductCondition.USED,
        attributes={},
        image_urls=[key_a, key_b],
        cover_image_key=key_b,
    )

    await repo.create(product)

    # Read back from the DB — the in-memory entity is not enough; we
    # need to prove the column was written.
    fetched = await repo.get_by_id(product.id, tenant_id)
    assert fetched is not None
    assert fetched.cover_image_key == key_b


@pytest.mark.asyncio
async def test_update_persists_cover_image_key(db_session, test_organization, test_category):
    """update() must write a changed cover_image_key to the DB column."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    key_a, key_b = _keys(tenant_id)

    product = Product.create(
        title="2017 Toyota Camry",
        price_cents=1_850_000,
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        condition=ProductCondition.USED,
        attributes={},
        image_urls=[key_a, key_b],
        cover_image_key=key_a,
    )
    await repo.create(product)

    # Seller picks a different cover.
    product.cover_image_key = key_b
    await repo.update(product)

    fetched = await repo.get_by_id(product.id, tenant_id)
    assert fetched is not None
    assert fetched.cover_image_key == key_b, "the new cover must survive the round-trip to the DB"
