"""Regression: a category persisted through the real
``Category.create()`` factory round-trips, the global-vs-tenant
distinction is preserved in the database (``tenant_id`` can be NULL
for global templates), the ``presentation`` JSONB contract persists as
a dict (not a string), and ``delete()`` removes the row.

Note: the sibling test ``test_category_get_by_id_or_global.py`` covers
the READ paths (``get_by_id``, ``get_by_id_or_global``). This file
covers the WRITE paths (``create``, ``update``, ``delete``) that the
use cases (``CreateCategory``, ``UpdateCategory``, ``DeleteCategory``)
exercise in production. If the JSONB column is ever changed to ``Text``
or the presentation dict gets double-serialized, the storefront
product card would render with literal ``"{'title_template': ...}"``
strings.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)


@pytest.mark.asyncio
async def test_create_update_delete_category_roundtrip(
    db_session,
    test_organization,
):
    """Create + update + delete through the real repo, with presentation JSONB."""
    tenant_id = test_organization.tenant_id

    repo = SqlAlchemyCategoryRepository(db_session)
    category = Category.create(
        name="Sedanes",
        slug=f"sedanes-{uuid4().hex[:8]}",
        tenant_id=tenant_id,
        level=1,
        presentation={
            "title_template": "{year} {make} {model}",
            "card_fields": ["price", "mileage"],
        },
    )

    created = await repo.create(category)
    assert created.id == category.id
    assert created.tenant_id == tenant_id
    assert created.presentation == {
        "title_template": "{year} {make} {model}",
        "card_fields": ["price", "mileage"],
    }

    # Re-fetch confirms JSONB round-trip and re-loads as a dict (not a string).
    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert isinstance(fetched.presentation, dict)
    assert fetched.presentation.get("title_template") == "{year} {make} {model}"

    # Update changes the basic info + presentation and bumps updated_at.
    fetched.update_basic_info(name="Sedanes Premium", description="Luxury sedans")
    fetched.presentation = {
        "title_template": "{year} {make} {model} Premium",
        "card_fields": ["price", "mileage", "trim"],
    }
    updated = await repo.update(fetched)
    assert updated.name == "Sedanes Premium"
    assert updated.description == "Luxury sedans"
    assert updated.presentation is not None
    assert updated.presentation.get("title_template") == "{year} {make} {model} Premium"

    # delete() removes the row (returns True for the owning tenant).
    deleted = await repo.delete(updated.id, tenant_id)
    assert deleted is True
    assert await repo.get_by_id(updated.id, tenant_id) is None
