"""Integration tests for GET /products/{id}/audit-logs.

Prerequisite for slice 10/10 of the reverse-transitions spec: the frontend
Historial timeline needs this endpoint, which didn't exist yet (flagged as
an open question in the spec).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def product_with_history(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    test_user: UserModel,
) -> Product:
    repo = SqlAlchemyProductRepository(db_session)
    product = Product.create(
        title="2020 Toyota Corolla",
        price_cents=1_500_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
    )
    product = await repo.create(product)
    product.submit_for_approval(user_id=test_user.id)
    product = await repo.update(product, changed_by_user_id=test_user.id)
    product.reject(test_user.id, reason="Missing VIN")
    return await repo.update(product, changed_by_user_id=test_user.id, reason="Missing VIN")


@pytest.mark.asyncio
async def test_returns_every_transition_newest_first(
    async_client_as_admin: AsyncClient,
    product_with_history: Product,
    test_user: UserModel,
) -> None:
    response = await async_client_as_admin.get(
        f"/api/v1/products/{product_with_history.id}/audit-logs"
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2

    transitions = {(entry["old_status"], entry["new_status"]) for entry in body}
    assert transitions == {("draft", "pending"), ("pending", "rejected")}

    rejection = next(entry for entry in body if entry["new_status"] == "rejected")
    assert rejection["reason"] == "Missing VIN"
    assert rejection["changed_by_user_id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_requires_admin_or_super_admin(
    async_client_as_seller: AsyncClient,
    product_with_history: Product,
) -> None:
    response = await async_client_as_seller.get(
        f"/api/v1/products/{product_with_history.id}/audit-logs"
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_not_found_returns_404(
    async_client_as_admin: AsyncClient,
) -> None:
    response = await async_client_as_admin.get(f"/api/v1/products/{uuid4()}/audit-logs")

    assert response.status_code == 404
