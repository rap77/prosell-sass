"""Integration tests — POST /categories role gate (Commit 2).

Before this fix, the POST /api/v1/categories endpoint had no role check
despite its docstring claiming "Only users with MASTER role can create
categories". Any authenticated user could create categories, which led
to the "tantas categorías insertadas" bug. These tests pin the
authorization contract:

  - admin (SUPER_ADMIN role): 201
  - seller (SALES_AGENT role): 403
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient


def _payload(tenant_id: str) -> dict:
    """Return a minimal valid category payload with a unique slug."""
    suffix = uuid4().hex[:8]
    return {
        "name": f"TestCat-{suffix}",
        "slug": f"test-cat-{suffix}",
        "tenant_id": tenant_id,
        "attribute_schema": {},
    }


# ─── Happy path: admins can create ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_can_create_category(
    async_client_as_admin: AsyncClient,
    admin_user,
):
    """admin (SUPER_ADMIN role) can POST /categories → 201."""
    response = await async_client_as_admin.post(
        "/api/v1/categories",
        json=_payload(str(admin_user.tenant_id)),
    )
    assert response.status_code == 201, response.text


# ─── Sad path: non-admins denied ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_seller_cannot_create_category(
    async_client_as_seller: AsyncClient,
    seller_user,
):
    """seller (SALES_AGENT role) cannot POST /categories → 403.

    The response detail must mention "admin" so the user gets a clear,
    actionable error message.
    """
    response = await async_client_as_seller.post(
        "/api/v1/categories",
        json=_payload(str(seller_user.tenant_id)),
    )
    assert response.status_code == 403, response.text
    assert "admin" in response.json()["detail"].lower()
