"""Integration — the ProSell admin creates GLOBAL category templates.

Foundation Plan 2 (B1): the category taxonomy is global/platform-managed.
POST /categories (super_admin-gated) creates global categories (tenant_id
NULL), including nested children (multi-level niches). No tenant_id is
required in the payload — categories never belong to a tenant.

Requires the test DB on localhost:5433.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_super_admin_creates_global_root_category(
    async_client_as_admin: AsyncClient,
):
    """POST without tenant_id creates a GLOBAL root category (level 0)."""
    resp = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Vehiculos {uuid4().hex[:8]}",
            "slug": f"vehiculos-{uuid4().hex[:8]}",
        },
    )

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["tenant_id"] is None
    assert data["level"] == 0


@pytest.mark.asyncio
async def test_super_admin_creates_global_child_category(
    async_client_as_admin: AsyncClient,
):
    """A child under a global parent is global and one level deeper."""
    root = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Vehiculos Terrestres {uuid4().hex[:8]}",
            "slug": f"vehiculos-terrestres-{uuid4().hex[:8]}",
        },
    )
    assert root.status_code == 201, root.text
    root_id = root.json()["id"]

    child = await async_client_as_admin.post(
        "/api/v1/categories",
        json={
            "name": f"Carros y Camionetas {uuid4().hex[:8]}",
            "slug": f"carros-y-camionetas-{uuid4().hex[:8]}",
            "parent_id": root_id,
        },
    )

    assert child.status_code == 201, child.text
    data = child.json()
    assert data["tenant_id"] is None
    assert data["level"] == 1
    assert data["parent_id"] == root_id


@pytest.mark.asyncio
async def test_global_category_slug_uniqueness_enforced(
    async_client_as_admin: AsyncClient,
):
    """Two global categories cannot share a slug (NULL-aware uniqueness)."""
    slug = f"unique-{uuid4().hex[:8]}"
    first = await async_client_as_admin.post(
        "/api/v1/categories", json={"name": "First", "slug": slug}
    )
    assert first.status_code == 201, first.text

    dup = await async_client_as_admin.post(
        "/api/v1/categories", json={"name": "Second", "slug": slug}
    )
    assert dup.status_code == 422, dup.text
