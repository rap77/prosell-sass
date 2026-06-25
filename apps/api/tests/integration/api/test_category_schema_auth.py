"""Auth/permission tests for category schema write endpoints (T7).

A user with ADMIN role (not SUPER_ADMIN) must be rejected on write operations.
SUPER_ADMIN (via async_client_as_admin) must succeed.

Auto-skipped when localhost:5433 is unreachable (handled by shared conftest).
"""

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.user_model import UserModel


@pytest_asyncio.fixture
async def auth_test_category(
    db_session: AsyncSession,
    test_user: UserModel,
) -> CategoryModel:
    category = CategoryModel(
        id=uuid4(),
        name=f"Auth Test {uuid4().hex[:6]}",
        slug=f"auth-test-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={"make": {"type": "string", "required": False}},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest.mark.asyncio
async def test_tenant_admin_cannot_patch_schema(
    db_session: AsyncSession,
    test_user: UserModel,
    auth_test_category: CategoryModel,
) -> None:
    """ADMIN role (not SUPER_ADMIN) → 403 on PATCH /{id}/schema."""
    admin_role = Role(
        id=uuid4(),
        role_type=RoleType.ADMIN,
        name="Admin",
        is_system_role=True,
        tenant_id=None,
    )
    tenant_admin = User(
        id=test_user.id,
        email=test_user.email,
        full_name=test_user.full_name,
        tenant_id=test_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[admin_role],
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: tenant_admin

    async def get_test_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_async_session] = get_test_db  # type: ignore[arg-type]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/categories/{auth_test_category.id}/schema",
            json={"attribute_schema": {"make": {"type": "string"}}},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_can_patch_schema(
    async_client_as_admin: AsyncClient,
    auth_test_category: CategoryModel,
) -> None:
    """SUPER_ADMIN → 200 on PATCH /{id}/schema (additive change, no force needed)."""
    response = await async_client_as_admin.patch(
        f"/api/v1/categories/{auth_test_category.id}/schema",
        json={"attribute_schema": {"make": {"type": "string", "required": False}}},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_tenant_admin_cannot_clone_schema(
    db_session: AsyncSession,
    test_user: UserModel,
    auth_test_category: CategoryModel,
) -> None:
    """ADMIN role → 403 on POST /{id}/schema/clone-from/{source_id}."""
    admin_role = Role(
        id=uuid4(),
        role_type=RoleType.ADMIN,
        name="Admin",
        is_system_role=True,
        tenant_id=None,
    )
    tenant_admin = User(
        id=test_user.id,
        email=test_user.email,
        full_name=test_user.full_name,
        tenant_id=test_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[admin_role],
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: tenant_admin

    async def get_test_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_async_session] = get_test_db  # type: ignore[arg-type]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/categories/{auth_test_category.id}/schema/clone-from/{uuid4()}"
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403
