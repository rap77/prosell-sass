"""Integration tests for GET /api/v1/organizations/{id}/verticals.

Task 4 — Foundation Plan 2.
Auth: dependency_overrides[get_current_auth_user_from_cookie] (Brain #7).
Seed: direct via db_session so we can set tenant_id=None on global root templates.
"""

from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_vertical_model import (
    OrganizationVerticalModel,
)

# ─── Fixtures / helpers ───────────────────────────────────────────────────────


async def _create_global_root(
    db_session: AsyncSession,
    *,
    name: str,
    slug: str,
    presentation: dict | None = None,
) -> CategoryModel:
    """Insert a global root category (tenant_id=None, level=0)."""
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=None,  # global template (Plan 2)
        name=name,
        slug=slug,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
        presentation=presentation,
    )
    db_session.add(cat)
    await db_session.flush()
    return cat


async def _create_child(
    db_session: AsyncSession,
    *,
    parent_id: UUID,
    name: str,
    slug: str,
    presentation: dict | None = None,
    attribute_schema: dict | None = None,
) -> CategoryModel:
    """Insert a child category under a parent root."""
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=None,  # children of a global root are also global
        name=name,
        slug=slug,
        level=1,
        parent_id=parent_id,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema=attribute_schema or {},
        presentation=presentation,
    )
    db_session.add(cat)
    await db_session.flush()
    return cat


# ─── Happy path ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_org_verticals_returns_enabled_with_subtree(
    async_client_as_admin: AsyncClient, admin_user, db_session: AsyncSession
):
    """GET verticals returns enabled roots, each with their category subtree."""
    org_id = admin_user.tenant_id
    suffix = uuid4().hex[:8]  # global-unique slug suffix (categories.slug is globally unique)

    # Root 1: "Vehicles" with presentation; "Cars" child (no own presentation, filterable fields)
    vehicles = await _create_global_root(
        db_session,
        name=f"Vehicles-{suffix}",
        slug=f"vehicles-{suffix}",
        presentation={"title_template": "{year} {make} {model}", "card_fields": ["price"]},
    )
    await _create_child(
        db_session,
        parent_id=vehicles.id,
        name=f"Cars-{suffix}",
        slug=f"cars-{suffix}",
        presentation=None,  # must inherit from root
        attribute_schema={
            "make": {"type": "string", "filterable": True, "filter_type": "select"},
            "year": {"type": "number", "filterable": True, "filter_type": "range"},
            "color": {"type": "string"},  # present, but not filterable
        },
    )

    # Root 2: "Real Estate" without presentation
    real_estate = await _create_global_root(
        db_session,
        name=f"Real Estate-{suffix}",
        slug=f"real-estate-{suffix}",
        presentation=None,
    )

    # Enable both roots for this org
    ov_repo_model = OrganizationVerticalModel
    db_session.add(ov_repo_model(organization_id=org_id, root_category_id=vehicles.id))
    db_session.add(ov_repo_model(organization_id=org_id, root_category_id=real_estate.id))
    await db_session.flush()

    resp = await async_client_as_admin.get(f"/api/v1/organizations/{org_id}/verticals")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    slugs = {v["slug"] for v in body["verticals"]}
    assert slugs == {f"vehicles-{suffix}", f"real-estate-{suffix}"}

    # Vehicles: has its own presentation, child inherits it and exposes filter_fields
    vehicles_v = next(v for v in body["verticals"] if v["slug"] == f"vehicles-{suffix}")
    assert vehicles_v["name"] == f"Vehicles-{suffix}"
    assert vehicles_v["presentation"] == {
        "title_template": "{year} {make} {model}",
        "card_fields": ["price"],
    }
    assert len(vehicles_v["categories"]) == 1
    cars_node = vehicles_v["categories"][0]
    assert cars_node["slug"] == f"cars-{suffix}"
    assert cars_node["name"] == f"Cars-{suffix}"
    # presentation resolved (own-or-inherited) — Cars has none, falls back to root's
    assert cars_node["presentation"] == {
        "title_template": "{year} {make} {model}",
        "card_fields": ["price"],
    }
    # filter_fields: only fields marked filterable=True, in declared order
    assert cars_node["filter_fields"] == [
        {"field": "make", "filter_type": "select"},
        {"field": "year", "filter_type": "range"},
    ]

    # Real Estate: no presentation, no children
    re_v = next(v for v in body["verticals"] if v["slug"] == f"real-estate-{suffix}")
    assert re_v["presentation"] is None
    assert re_v["categories"] == []


# ─── 403 cross-org ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_org_verticals_cross_org_returns_403(
    async_client_as_admin: AsyncClient, admin_user
):
    """A user from org A cannot read org B's verticals."""
    other_org_id = uuid4()  # org B
    assert other_org_id != admin_user.tenant_id

    resp = await async_client_as_admin.get(f"/api/v1/organizations/{other_org_id}/verticals")
    assert resp.status_code == 403, resp.text
