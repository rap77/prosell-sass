"""Integration — global category templates are readable by tenants and
manageable by the ProSell platform admin.

Foundation Plan 2 (A): the category taxonomy is global (tenant_id NULL).
Tenants must READ globals (to classify products); the super_admin must be
able to manage (update / soft-delete / re-schema) them. Before this, the
management/read endpoints used the strict ``get_by_id`` so globals 404'd for
everyone.

Requires the test DB on localhost:5433.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from prosell.infrastructure.models.category_model import CategoryModel


async def _seed_global_category(db_session, *, is_active=True, attribute_schema=None):
    model = CategoryModel(
        id=uuid4(),
        name=f"Global Vehicles {uuid4().hex[:8]}",
        slug=f"global-vehicles-{uuid4().hex[:8]}",
        tenant_id=None,  # GLOBAL template
        level=0,
        parent_id=None,
        is_active=is_active,
        sort_order=0,
        field_config=[],
        attribute_schema=attribute_schema or {},
    )
    db_session.add(model)
    await db_session.flush()
    return model


@pytest.mark.asyncio
async def test_seller_sees_global_category_in_list(async_client_as_seller: AsyncClient, db_session):
    """A tenant (sales agent) sees global categories in the list."""
    global_cat = await _seed_global_category(db_session)

    resp = await async_client_as_seller.get("/api/v1/categories")

    assert resp.status_code == 200, resp.text
    ids = [c["id"] for c in resp.json()["categories"]]
    assert str(global_cat.id) in ids


@pytest.mark.asyncio
async def test_seller_can_get_global_category_detail(
    async_client_as_seller: AsyncClient, db_session
):
    """A tenant can fetch a global category by id (was 404 before)."""
    global_cat = await _seed_global_category(db_session)

    resp = await async_client_as_seller.get(f"/api/v1/categories/{global_cat.id}")

    assert resp.status_code == 200, resp.text
    assert resp.json()["tenant_id"] is None


@pytest.mark.asyncio
async def test_super_admin_can_update_global_category(
    async_client_as_admin: AsyncClient, db_session
):
    """The ProSell admin can PATCH a global category."""
    global_cat = await _seed_global_category(db_session)

    resp = await async_client_as_admin.patch(
        f"/api/v1/categories/{global_cat.id}",
        json={"description": "Maintained by ProSell"},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["description"] == "Maintained by ProSell"


@pytest.mark.asyncio
async def test_super_admin_can_soft_delete_global_category(
    async_client_as_admin: AsyncClient, db_session
):
    """The ProSell admin can soft-delete a global category."""
    global_cat = await _seed_global_category(db_session)

    resp = await async_client_as_admin.delete(f"/api/v1/categories/{global_cat.id}")
    assert resp.status_code == 204, resp.text

    detail = await async_client_as_admin.get(f"/api/v1/categories/{global_cat.id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["is_active"] is False


@pytest.mark.asyncio
async def test_super_admin_can_replace_global_attribute_schema(
    async_client_as_admin: AsyncClient, db_session
):
    """The ProSell admin can replace a global category's attribute_schema."""
    global_cat = await _seed_global_category(
        db_session, attribute_schema={"old": {"type": "string"}}
    )

    resp = await async_client_as_admin.patch(
        f"/api/v1/categories/{global_cat.id}/attribute-schema",
        json={"attribute_schema": {"year": {"type": "number", "required": True}}},
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "old" not in data["attribute_schema"]
    assert data["attribute_schema"]["year"]["required"] is True
