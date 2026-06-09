"""Integration — category mutation use cases enforce platform-admin on GLOBAL
templates (defense in depth, independent of the router gate).

The router already gates these endpoints to super_admin, but the use cases
must not rely solely on that: loading a global category via
``get_by_id_or_global`` widened their reach, so the role check lives in the
use case too. A future caller that forgets the router gate still cannot
mutate a global template.

Requires the test DB on localhost:5433.
"""

from uuid import uuid4

import pytest
from fastapi import HTTPException

from prosell.application.dto.category.update import UpdateCategoryRequest
from prosell.application.use_cases.category.delete_category import DeleteCategoryUseCase
from prosell.application.use_cases.category.update_attribute_schema import (
    UpdateCategoryAttributeSchemaUseCase,
)
from prosell.application.use_cases.category.update_category import UpdateCategoryUseCase
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)


async def _seed_global_category(db_session):
    model = CategoryModel(
        id=uuid4(),
        name=f"Global {uuid4().hex[:8]}",
        slug=f"global-{uuid4().hex[:8]}",
        tenant_id=None,  # GLOBAL template
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(model)
    await db_session.flush()
    return model


@pytest.mark.asyncio
async def test_update_global_category_denied_without_platform_admin(db_session, test_organization):
    global_cat = await _seed_global_category(db_session)
    use_case = UpdateCategoryUseCase(SqlAlchemyCategoryRepository(db_session))

    with pytest.raises(HTTPException) as exc:
        await use_case.execute(
            global_cat.id,
            test_organization.tenant_id,
            UpdateCategoryRequest(description="hack"),
            is_platform_admin=False,
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_update_global_category_allowed_for_platform_admin(db_session, test_organization):
    global_cat = await _seed_global_category(db_session)
    use_case = UpdateCategoryUseCase(SqlAlchemyCategoryRepository(db_session))

    result = await use_case.execute(
        global_cat.id,
        test_organization.tenant_id,
        UpdateCategoryRequest(description="maintained"),
        is_platform_admin=True,
    )
    assert result.description == "maintained"


@pytest.mark.asyncio
async def test_delete_global_category_denied_without_platform_admin(db_session, test_organization):
    global_cat = await _seed_global_category(db_session)
    use_case = DeleteCategoryUseCase(SqlAlchemyCategoryRepository(db_session))

    with pytest.raises(HTTPException) as exc:
        await use_case.execute(global_cat.id, test_organization.tenant_id, is_platform_admin=False)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_update_attribute_schema_global_denied_without_platform_admin(
    db_session, test_organization
):
    global_cat = await _seed_global_category(db_session)
    use_case = UpdateCategoryAttributeSchemaUseCase(SqlAlchemyCategoryRepository(db_session))

    with pytest.raises(HTTPException) as exc:
        await use_case.execute(
            global_cat.id,
            test_organization.tenant_id,
            {"x": {"type": "string"}},
            is_platform_admin=False,
        )
    assert exc.value.status_code == 403
