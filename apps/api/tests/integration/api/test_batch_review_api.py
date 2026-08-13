"""Integration tests for batch review API endpoints."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.product import Product, ProductStatus
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


def _user_with_permission(base: User, has_marketplace_publish: bool = True) -> User:
    """Create user with specific role."""
    # Use ADMIN role which has MARKETPLACE_PUBLISH, or SALES_AGENT which doesn't
    role_type = RoleType.ADMIN if has_marketplace_publish else RoleType.SALES_AGENT
    return User(
        id=base.id,
        email=base.email,
        full_name=base.full_name,
        tenant_id=base.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[
            Role(
                id=uuid4(),
                role_type=role_type,
                name=role_type.value,
                is_system_role=True,
                tenant_id=base.tenant_id,
            )
        ],
    )


async def _client_for(user: User, db_session) -> AsyncClient:
    """Create async client with user override."""

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_async_session] = override_session
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_batch_approve_requires_marketplace_publish_permission(
    test_user,
    db_session,
):
    """Should return 403 without MARKETPLACE_PUBLISH permission."""
    # User without permission (sales_agent doesn't have MARKETPLACE_PUBLISH)
    sales_user = _user_with_permission(test_user, has_marketplace_publish=False)

    async with await _client_for(sales_user, db_session) as client:
        response = await client.post(
            "/api/v1/products/batch/approve",
            json={"product_ids": [str(uuid4())]},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_batch_reject_requires_marketplace_publish_permission(
    test_user,
    db_session,
):
    """Should return 403 without MARKETPLACE_PUBLISH permission."""
    sales_user = _user_with_permission(test_user, has_marketplace_publish=False)

    async with await _client_for(sales_user, db_session) as client:
        response = await client.post(
            "/api/v1/products/batch/reject",
            json={
                "product_ids": [str(uuid4())],
                "reason": "Test rejection",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_batch_approve_success(test_user, test_organization, db_session):
    """Should approve multiple pending products."""
    # User with permission (ADMIN has MARKETPLACE_PUBLISH)
    reviewer = _user_with_permission(test_user, has_marketplace_publish=True)
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 2 pending products
    products = []
    for i in range(2):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Test Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PENDING,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Batch approve
    async with await _client_for(reviewer, db_session) as client:
        response = await client.post(
            "/api/v1/products/batch/approve",
            json={"product_ids": [str(p.id) for p in products]},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["approved_count"] == 2
    assert data["failed_count"] == 0
    assert len(data["results"]) == 2


@pytest.mark.asyncio
async def test_batch_reject_success(test_user, test_organization, db_session):
    """Should reject multiple pending products."""
    reviewer = _user_with_permission(test_user, has_marketplace_publish=True)
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 2 pending products
    products = []
    for i in range(2):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Test Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PENDING,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Batch reject
    reason = "Falta documentación"
    async with await _client_for(reviewer, db_session) as client:
        response = await client.post(
            "/api/v1/products/batch/reject",
            json={
                "product_ids": [str(p.id) for p in products],
                "reason": reason,
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["rejected_count"] == 2
    assert data["failed_count"] == 0
    assert len(data["results"]) == 2

    # Verify products are rejected
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.REJECTED
        assert updated.rejection_reason == reason


@pytest.mark.asyncio
async def test_batch_approve_partial_failure(test_user, test_organization, db_session):
    """Should return partial success for mixed statuses."""
    reviewer = _user_with_permission(test_user, has_marketplace_publish=True)
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 1 pending + 1 draft
    pending = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Pending Product",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PENDING,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    draft = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Draft Product",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    pending = await repo.create(pending)
    draft = await repo.create(draft)

    # Batch approve both
    async with await _client_for(reviewer, db_session) as client:
        response = await client.post(
            "/api/v1/products/batch/approve",
            json={"product_ids": [str(pending.id), str(draft.id)]},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["approved_count"] == 1
    assert data["failed_count"] == 1

    # Find draft result
    draft_result = next(r for r in data["results"] if r["product_id"] == str(draft.id))
    assert draft_result["status"] == "failed"
    assert draft_result["error_code"] == "invalid_transition"
