"""Integration tests for /api/v1/categories/{id}/schema endpoints (T7).

Tests:
  GET  /{id}/schema         → CategorySchemaResponse
  PATCH /{id}/schema        → migration warnings + force flow
  GET  /{id}/schema/template.csv
  POST /{id}/schema/clone-from/{source_id}
  GET  /{id}/schema/history

Auto-skipped when localhost:5433 is unreachable (handled by shared conftest).
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.user_model import UserModel


@pytest_asyncio.fixture
async def schema_category(
    db_session: AsyncSession,
    test_user: UserModel,
) -> CategoryModel:
    """Category with a known attribute_schema for schema endpoint tests."""
    category = CategoryModel(
        id=uuid4(),
        name=f"Schema Test {uuid4().hex[:6]}",
        slug=f"schema-test-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={"vin": {"type": "string", "required": True}},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest_asyncio.fixture
async def empty_schema_category(
    db_session: AsyncSession,
    test_user: UserModel,
) -> CategoryModel:
    """Category with empty attribute_schema — used for clone target."""
    category = CategoryModel(
        id=uuid4(),
        name=f"Empty Schema {uuid4().hex[:6]}",
        slug=f"empty-schema-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()
    return category


# ── GET /{id}/schema ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_schema_returns_attributes_and_version(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    response = await async_client_as_admin.get(f"/api/v1/categories/{schema_category.id}/schema")
    assert response.status_code == 200
    data = response.json()
    assert data["attributes"] == {"vin": {"type": "string", "required": True}}
    assert "schema_version" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_get_schema_unknown_category_404(
    async_client_as_admin: AsyncClient,
) -> None:
    response = await async_client_as_admin.get(f"/api/v1/categories/{uuid4()}/schema")
    assert response.status_code == 404


# ── PATCH /{id}/schema ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_schema_additive_field_no_force_needed(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    """Adding a new optional field has no breaking migration — no force required."""
    new_schema = {
        "vin": {"type": "string", "required": True},
        "year": {"type": "number", "required": False},
    }
    response = await async_client_as_admin.patch(
        f"/api/v1/categories/{schema_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 200
    data = response.json()
    assert "year" in data["attributes"]
    assert data["attributes"]["vin"] == {"type": "string", "required": True}


@pytest.mark.asyncio
async def test_patch_schema_type_change_without_force_returns_422(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    """Changing an existing field's type returns 422 with migration_warnings."""
    new_schema = {"vin": {"type": "number", "required": True}}
    response = await async_client_as_admin.patch(
        f"/api/v1/categories/{schema_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "migration_warnings" in detail
    assert any("vin" in w for w in detail["migration_warnings"])


@pytest.mark.asyncio
async def test_patch_schema_type_change_with_force_succeeds(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    """?force=true bypasses the 422 guard and applies the schema."""
    new_schema = {"vin": {"type": "number", "required": True}}
    response = await async_client_as_admin.patch(
        f"/api/v1/categories/{schema_category.id}/schema?force=true",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["attributes"]["vin"]["type"] == "number"


# ── GET /{id}/schema/history ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_schema_history_after_patch(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    """PATCH writes an audit entry; GET /history returns it."""
    new_schema = {
        "vin": {"type": "string", "required": True},
        "make": {"type": "string", "required": False},
    }
    await async_client_as_admin.patch(
        f"/api/v1/categories/{schema_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    response = await async_client_as_admin.get(
        f"/api/v1/categories/{schema_category.id}/schema/history"
    )
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) >= 1
    assert "changed_at" in entries[0]
    assert "change_summary" in entries[0]
    assert "make" in entries[0]["change_summary"]


# ── GET /{id}/schema/template.csv ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_template_csv_returns_headers(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
) -> None:
    response = await async_client_as_admin.get(
        f"/api/v1/categories/{schema_category.id}/schema/template.csv"
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "title" in content
    assert "price" in content
    assert "category_id" in content
    assert "vin" in content


# ── POST /{id}/schema/clone-from/{source_id} ─────────────────────────────────


@pytest.mark.asyncio
async def test_clone_schema_copies_source_attributes(
    async_client_as_admin: AsyncClient,
    schema_category: CategoryModel,
    empty_schema_category: CategoryModel,
) -> None:
    """Cloning copies source attribute_schema to target."""
    response = await async_client_as_admin.post(
        f"/api/v1/categories/{empty_schema_category.id}/schema/clone-from/{schema_category.id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["attributes"] == schema_category.attribute_schema


@pytest.mark.asyncio
async def test_clone_schema_unknown_source_404(
    async_client_as_admin: AsyncClient,
    empty_schema_category: CategoryModel,
) -> None:
    response = await async_client_as_admin.post(
        f"/api/v1/categories/{empty_schema_category.id}/schema/clone-from/{uuid4()}"
    )
    assert response.status_code == 404
