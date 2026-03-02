"""Unit tests for auth_middleware.py — cookie-based JWT verification."""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from prosell.infrastructure.api.middleware.auth_middleware import (
    get_current_user,
    get_optional_user,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_jwt_service():
    return MagicMock()


def make_request(cookies: dict) -> MagicMock:
    """Build a mock FastAPI Request with the given cookies dict."""
    request = MagicMock()
    request.cookies = cookies
    return request


# =============================================================================
# get_current_user
# =============================================================================


class TestGetCurrentUser:
    async def test_valid_access_cookie_returns_payload(self, mock_jwt_service):
        request = make_request({"access_token": "valid.jwt.token"})
        mock_jwt_service.verify_token.return_value = {
            "sub": "user-123",
            "type": "access",
        }

        result = await get_current_user(request, mock_jwt_service)

        assert result["sub"] == "user-123"
        mock_jwt_service.verify_token.assert_called_once_with("valid.jwt.token")

    async def test_missing_cookie_raises_401(self, mock_jwt_service):
        request = make_request({})

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request, mock_jwt_service)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"
        mock_jwt_service.verify_token.assert_not_called()

    async def test_wrong_token_type_raises_401(self, mock_jwt_service):
        request = make_request({"access_token": "refresh.jwt.token"})
        mock_jwt_service.verify_token.return_value = {
            "sub": "user-123",
            "type": "refresh",  # wrong type
        }

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request, mock_jwt_service)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token type"

    async def test_invalid_token_raises_401(self, mock_jwt_service):
        request = make_request({"access_token": "invalid.token"})
        mock_jwt_service.verify_token.side_effect = ValueError("Token expired")

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request, mock_jwt_service)

        assert exc_info.value.status_code == 401
        assert "Token expired" in exc_info.value.detail


# =============================================================================
# get_optional_user
# =============================================================================


class TestGetOptionalUser:
    async def test_valid_access_cookie_returns_payload(self, mock_jwt_service):
        request = make_request({"access_token": "valid.jwt.token"})
        mock_jwt_service.verify_token.return_value = {
            "sub": "user-456",
            "type": "access",
        }

        result = await get_optional_user(request, mock_jwt_service)

        assert result is not None
        assert result["sub"] == "user-456"

    async def test_missing_cookie_returns_none(self, mock_jwt_service):
        request = make_request({})

        result = await get_optional_user(request, mock_jwt_service)

        assert result is None
        mock_jwt_service.verify_token.assert_not_called()

    async def test_invalid_token_returns_none(self, mock_jwt_service):
        request = make_request({"access_token": "bad.token"})
        mock_jwt_service.verify_token.side_effect = ValueError("Bad token")

        result = await get_optional_user(request, mock_jwt_service)

        assert result is None

    async def test_wrong_token_type_returns_none(self, mock_jwt_service):
        request = make_request({"access_token": "refresh.jwt.token"})
        mock_jwt_service.verify_token.return_value = {
            "sub": "user-123",
            "type": "refresh",
        }

        result = await get_optional_user(request, mock_jwt_service)

        assert result is None
