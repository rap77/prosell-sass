"""Integration tests for attribute-filter query params + filter-values endpoint.

Task 5 — Subsystem B (router wiring + security gate).
Auth: async_client_as_admin dependency_override (Brain #7).
Pattern: alias `client`/`auth_headers`/`vehicle_category` to existing fixtures.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel

# ─── Aliases to the project's canonical fixtures (brief uses these names) ────


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """No header-based auth — dependency_override covers it."""
    return {}


@pytest.fixture
async def client(async_client_as_admin: AsyncClient) -> AsyncClient:
    """Alias: the project's `async_client_as_admin` is the real authenticated client."""
    return async_client_as_admin


@pytest.fixture
async def vehicle_category(admin_user, db_session: AsyncSession) -> CategoryModel:
    """A category shaped for the vehicle-filter tests.

    Schema:
      - make: select, filterable, NO static options (so the filter-values
        endpoint exercises the dynamic DISTINCT path).
      - year: range, filterable.
      - vin: present but NOT filterable (security gate target).
    """
    suffix = uuid4().hex[:8]
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=admin_user.tenant_id,
        name=f"Vehicles-{suffix}",
        slug=f"vehicles-{suffix}",
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={
            "make": {"type": "string", "filterable": True, "filter_type": "select"},
            "year": {"type": "number", "filterable": True, "filter_type": "range"},
            "vin": {"type": "string", "filterable": False},
        },
    )
    db_session.add(cat)
    await db_session.flush()
    return cat


# ─── Tests (verbatim from brief) ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_non_filterable_key_rejected(client, auth_headers, vehicle_category):
    """`vin` is in the schema but `filterable=False` — must reject with 422."""
    resp = await client.get(
        f"/api/v1/products?category_id={vehicle_category.id}&attr.vin=ABC",
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_filterable_range_key_accepted(client, auth_headers, vehicle_category):
    """`year` is `filterable=True, filter_type=range` — must accept (200)."""
    resp = await client.get(
        f"/api/v1/products?category_id={vehicle_category.id}&attr.year_min=2015&attr.year_max=2020",
        headers=auth_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_filter_values_endpoint(client, auth_headers, vehicle_category):
    """GET /categories/{id}/filter-values returns DISTINCT values for `select` fields."""
    resp = await client.get(
        f"/api/v1/categories/{vehicle_category.id}/filter-values", headers=auth_headers
    )
    assert resp.status_code == 200
    assert "make" in resp.json()["values"]


@pytest.mark.asyncio
async def test_filter_values_endpoint_handles_global_categories(
    client, auth_headers, db_session: AsyncSession
):
    """GET /categories/{id}/filter-values must work for GLOBAL (tenant_id=NULL) templates.

    Pre-existing bug since PR #39 (Subsystem B): the endpoint used
    ``category_repo.get_by_id(category_id, tenant_id)`` which filters by
    tenant_id strictly. Global templates have tenant_id=NULL and were
    rejected with 404 "Category not found". The fix uses
    ``get_by_id_or_global`` so tenant-owned AND global templates resolve.
    Regression test: a global category with a filterable select field must
    return 200 with the expected key in the values map.
    """
    suffix = uuid4().hex[:8]
    global_cat = CategoryModel(
        id=uuid4(),
        tenant_id=None,  # GLOBAL template — the case that used to fail
        name=f"GlobalTemplate-{suffix}",
        slug=f"global-template-{suffix}",
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={
            "make": {"type": "string", "filterable": True, "filter_type": "select"},
        },
    )
    db_session.add(global_cat)
    await db_session.flush()

    resp = await client.get(
        f"/api/v1/categories/{global_cat.id}/filter-values", headers=auth_headers
    )
    assert resp.status_code == 200, (
        f"Global category not visible to filter-values; got {resp.status_code}: {resp.text}"
    )
    assert "make" in resp.json()["values"]


@pytest.mark.asyncio
async def test_filter_values_response_includes_truncated_flag(
    client, auth_headers, vehicle_category
):
    """filter-values response MUST include `truncated: []` so clients can detect capping."""
    resp = await client.get(
        f"/api/v1/categories/{vehicle_category.id}/filter-values", headers=auth_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "values" in body
    assert "truncated" in body
    assert body["truncated"] == []
    assert isinstance(body["values"], dict)


@pytest.mark.asyncio
async def test_attr_filter_without_category_id_rejected(client, auth_headers):
    """F1 fail-open: `?attr.*=...` without category_id MUST 422.

    Without a category there's no schema to validate keys against, so any
    `attr.*` key would reach the SQL filter pipeline as attacker-controlled
    JSONB column access. Reject the request.
    """
    resp = await client.get("/api/v1/products?attr.vin=foo", headers=auth_headers)
    assert resp.status_code == 422
    assert "category_id" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attr_filter_works_for_global_categories(
    client, auth_headers, db_session: AsyncSession
):
    """`GET /products?category_id=X&attr.*=Y` must work for GLOBAL (tenant_id=NULL) categories.

    Pre-existing bug, sibling of the filter-values one fixed in PR #63:
    product_router.py:476 used ``category_repo.get_by_id`` (strict tenant
    filter) when validating the attribute schema. Global templates were
    rejected with 404 "Category not found" so the catalog page filters were
    broken for ANY global category (the typical case for root verticals).
    Regression test: filter products on a global category and expect 200.
    """
    suffix = uuid4().hex[:8]
    global_cat = CategoryModel(
        id=uuid4(),
        tenant_id=None,  # GLOBAL template — the case that used to fail
        name=f"GlobalFilter-{suffix}",
        slug=f"global-filter-{suffix}",
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={
            "color": {"type": "string", "filterable": True, "filter_type": "select"},
        },
    )
    db_session.add(global_cat)
    await db_session.flush()

    resp = await client.get(
        f"/api/v1/products?category_id={global_cat.id}&attr.color=red",
        headers=auth_headers,
    )
    assert resp.status_code == 200, (
        f"Global category must resolve for product attr filter; got {resp.status_code}: {resp.text}"
    )
