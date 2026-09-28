"""Contract tests for the next vehicle-code endpoint."""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.api.routers.product_router import NextVehicleCodeResponse, router

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")


def test_next_vehicle_code_declares_a_pydantic_response_model() -> None:
    """The JSON endpoint must expose its response contract through OpenAPI."""
    route = next(
        route
        for route in router.routes
        if isinstance(route, APIRoute) and route.path == "/next-vehicle-code"
    )

    assert route.response_model is NextVehicleCodeResponse
    assert NextVehicleCodeResponse.model_json_schema()["properties"] == {
        "vehicle_code": {"title": "Vehicle Code", "type": "integer"}
    }


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient]:
    """Authenticated client. The product repository is patched per-test."""
    user = User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)


@pytest.mark.asyncio
async def test_get_next_vehicle_code_twice_returns_same_value_and_does_not_advance_sequence(
    async_client: AsyncClient,
) -> None:
    """Two consecutive peeks without a mutation must return the same value.

    Regression for the GGA finding that the preview endpoint was wired to
    `VehicleCodeAllocator.allocate_next()` (which calls `SELECT nextval(...)`
    on the underlying sequence). Every buyer who opened the create form —
    even one who never submitted — burned one sequence slot, so the
    `vehicle_code` projected for the next pre-fill jumped unpredictably.

    The fix routes the endpoint to `VehicleCodeAllocator.peek_next()`
    (MAX + 1, read-only). This test pins both invariants of that swap:
      1. Two consecutive GETs return the SAME integer (no nextval).
      2. The atomic allocator is never invoked from the preview path —
         only `get_max_vehicle_code` is.
    """
    with patch(
        "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
    ) as mock_repo_cls:
        mock_repo = mock_repo_cls.return_value
        # First product already has vehicle_code=99; preview should report 100.
        mock_repo.get_max_vehicle_code = AsyncMock(return_value=99)
        # If the endpoint ever regresses to the durable-allocate path,
        # this mock fires and the test fails with a clear, named error
        # instead of producing a flaky "different value each call".
        mock_repo.allocate_next_vehicle_code = AsyncMock(
            side_effect=AssertionError(
                "GET /next-vehicle-code must not call allocate_next_vehicle_code"
            )
        )

        first = await async_client.get("/api/v1/products/next-vehicle-code")
        second = await async_client.get("/api/v1/products/next-vehicle-code")

        assert first.status_code == 200, first.text
        assert second.status_code == 200, second.text
        assert first.json() == {"vehicle_code": 100}
        # Same value both calls — proves no sequence value was consumed.
        assert first.json() == second.json()

        # get_max_vehicle_code is the only repo method the endpoint may hit.
        mock_repo.get_max_vehicle_code.assert_awaited()
        mock_repo.allocate_next_vehicle_code.assert_not_awaited()
