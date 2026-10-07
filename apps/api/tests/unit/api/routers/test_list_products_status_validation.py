"""Contract tests for list-product status validation."""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user import User
from prosell.domain.value_objects.permission_scope import OwnScope
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.api.routers.product_router import get_cookie_effective_scope
from prosell.infrastructure.database.session import get_async_session

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient]:
    """Create an authenticated client without a database connection."""
    user = User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )
    db = AsyncMock(spec=AsyncSession)

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_async_session] = override_session
    # Bypass the new permission engine's real get_role_repository() DB
    # query — `db` here is a plain AsyncMock with no real role/grant rows
    # behind it, and this test only checks query-param validation (422),
    # not cross-org scope.
    app.dependency_overrides[get_cookie_effective_scope] = lambda: OwnScope()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_async_session, None)
    app.dependency_overrides.pop(get_cookie_effective_scope, None)


@pytest.mark.asyncio
async def test_list_products_rejects_an_unknown_status(async_client: AsyncClient) -> None:
    """The query boundary rejects invalid values before reaching the use case."""
    response = await async_client.get("/api/v1/products?status=failed")

    assert response.status_code == 422
