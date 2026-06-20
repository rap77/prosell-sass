"""Integration test — POST /products/{id}/reject takes `reason` as a Pydantic
request body, not a bare query-param scalar.

GGA flagged `reject_product` as the only mutating endpoint in product_router
that didn't validate its payload through a Pydantic DTO (AGENTS.md FastAPI
rule: "Pydantic NOT used for ALL request/response bodies").
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from prosell.domain.entities.user import User


async def _create_pending_product(client: AsyncClient, tenant_id: str) -> str:
    cat_resp = await client.post(
        "/api/v1/categories",
        json={
            "name": f"Cat-{uuid4().hex[:8]}",
            "slug": f"cat-{uuid4().hex[:8]}",
            "tenant_id": tenant_id,
            "attribute_schema": {},
        },
    )
    assert cat_resp.status_code == 201, cat_resp.text
    cat_id = cat_resp.json()["id"]

    prod_resp = await client.post(
        "/api/v1/products",
        json={
            "title": f"Test Car {uuid4().hex[:4]}",
            "slug": f"test-car-{uuid4().hex[:8]}",
            "price_cents": 1500000,
            "tenant_id": tenant_id,
            "organization_id": tenant_id,
            "category_id": cat_id,
            "condition": "used",
            "attributes": {},
        },
    )
    assert prod_resp.status_code == 201, prod_resp.text
    product_id = prod_resp.json()["id"]

    submit_resp = await client.post(f"/api/v1/products/{product_id}/submit")
    assert submit_resp.status_code == 200, submit_resp.text

    return product_id


@pytest.mark.asyncio
async def test_reject_product_accepts_reason_in_json_body(
    async_client_as_admin: AsyncClient, admin_user: User
) -> None:
    """`reason` arrives as the JSON request body, not a query param."""
    product_id = await _create_pending_product(async_client_as_admin, str(admin_user.tenant_id))

    resp = await async_client_as_admin.post(
        f"/api/v1/products/{product_id}/reject",
        json={"reason": "Photos do not match the description"},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"
