"""Integration test — GET /products/featured must not be shadowed by GET /{product_id}.

GGA found: literal-segment route registered AFTER the path-param route, so
Starlette matches `/{product_id}` first with product_id="featured", fails
UUID coercion, and the featured endpoint is permanently unreachable (422).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_featured_products_route_is_reachable(
    async_client_as_admin: AsyncClient,
) -> None:
    """GET /products/featured must resolve to get_featured_products, not get_product."""
    resp = await async_client_as_admin.get("/api/v1/products/featured")

    assert resp.status_code == 200, resp.text
