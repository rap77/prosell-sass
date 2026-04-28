"""Unit tests for FacebookGraphApiClient."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx

from prosell.infrastructure.services.facebook_graph_api_client import (
    FacebookGraphApiClient,
    FacebookBuyerProfile,
)
from prosell.domain.exceptions.facebook_exceptions import (
    FacebookUserInfoFetchException,
)


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_httpx_client():
    """Return a mocked httpx.AsyncClient."""
    client = AsyncMock(spec=httpx.AsyncClient)
    return client


@pytest.fixture
def facebook_graph_api_client(mock_httpx_client):
    """Return a FacebookGraphApiClient instance with mocked HTTP client."""
    # Create the client and replace the real httpx.AsyncClient with our mock
    client = FacebookGraphApiClient()
    client.client = mock_httpx_client
    yield client


@pytest.fixture
def sample_facebook_buyer_response():
    """Return a sample Facebook Graph API response for buyer profile."""
    return {
        "id": "1234567890",
        "name": "John Doe",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "profile_pic": "https://platform-lookaside.fbsbx.com/profile_pic.jpg"
    }


@pytest.fixture
def sample_facebook_buyer_response_minimal():
    """Return a minimal Facebook Graph API response (no email)."""
    return {
        "id": "1234567890",
        "name": "Jane Smith",
    }


# =============================================================================
# TESTS: get_buyer_profile
# =============================================================================


@pytest.mark.asyncio
async def test_get_buyer_profile_success(
    facebook_graph_api_client,
    mock_httpx_client,
    sample_facebook_buyer_response,
):
    """Test successful buyer profile retrieval from Facebook Graph API."""
    # Arrange
    sender_id = "1234567890"
    page_access_token = "test_page_token"

    mock_response = AsyncMock()
    mock_response.json = MagicMock(return_value=sample_facebook_buyer_response)
    mock_response.raise_for_status = MagicMock()
    mock_httpx_client.get = AsyncMock(return_value=mock_response)

    # Act
    profile = await facebook_graph_api_client.get_buyer_profile(sender_id, page_access_token)

    # Assert
    assert profile.sender_id == "1234567890"
    assert profile.name == "John Doe"
    assert profile.email == "john.doe@example.com"
    assert profile.profile_url == "https://platform-lookaside.fbsbx.com/profile_pic.jpg"

    # Verify HTTP client was called correctly
    mock_httpx_client.get.assert_called_once_with(
        "https://graph.facebook.com/v22.0/1234567890",
        params={
            "fields": "id,name,email,first_name,last_name,profile_pic",
            "access_token": page_access_token,
        },
    )


@pytest.mark.asyncio
async def test_get_buyer_profile_minimal_data(
    facebook_graph_api_client,
    mock_httpx_client,
    sample_facebook_buyer_response_minimal,
):
    """Test buyer profile retrieval with minimal data (no email/profile_pic)."""
    # Arrange
    sender_id = "1234567890"
    page_access_token = "test_page_token"

    mock_response = AsyncMock()
    mock_response.json = MagicMock(return_value=sample_facebook_buyer_response_minimal)
    mock_response.raise_for_status = MagicMock()
    mock_httpx_client.get = AsyncMock(return_value=mock_response)

    # Act
    profile = await facebook_graph_api_client.get_buyer_profile(sender_id, page_access_token)

    # Assert
    assert profile.sender_id == "1234567890"
    assert profile.name == "Jane Smith"
    assert profile.email is None
    assert profile.profile_url is None


@pytest.mark.asyncio
async def test_get_buyer_profile_http_error(
    facebook_graph_api_client,
    mock_httpx_client,
):
    """Test buyer profile retrieval with HTTP error."""
    # Arrange
    sender_id = "1234567890"
    page_access_token = "invalid_token"

    mock_httpx_client.get = AsyncMock(
        side_effect=httpx.HTTPStatusError(
            "Invalid token",
            request=MagicMock(),
            response=MagicMock(status_code=401, text="Unauthorized")
        )
    )

    # Act & Assert
    with pytest.raises(FacebookUserInfoFetchException) as exc_info:
        await facebook_graph_api_client.get_buyer_profile(sender_id, page_access_token)

    # Check the exception message contains the error type
    assert "http_error" in exc_info.value.message


@pytest.mark.asyncio
async def test_get_buyer_profile_network_error(
    facebook_graph_api_client,
    mock_httpx_client,
):
    """Test buyer profile retrieval with network error."""
    # Arrange
    sender_id = "1234567890"
    page_access_token = "test_token"

    mock_httpx_client.get = AsyncMock(
        side_effect=httpx.NetworkError("Connection failed")
    )

    # Act & Assert
    with pytest.raises(FacebookUserInfoFetchException) as exc_info:
        await facebook_graph_api_client.get_buyer_profile(sender_id, page_access_token)

    # Check the exception message contains the error type
    assert "unexpected_error" in exc_info.value.message


@pytest.mark.asyncio
async def test_get_buyer_profile_invalid_json(
    facebook_graph_api_client,
    mock_httpx_client,
):
    """Test buyer profile retrieval with invalid JSON response."""
    # Arrange
    sender_id = "1234567890"
    page_access_token = "test_token"

    mock_response = AsyncMock()
    mock_response.json = MagicMock(side_effect=ValueError("Invalid JSON"))
    mock_response.raise_for_status = MagicMock()
    mock_httpx_client.get = AsyncMock(return_value=mock_response)

    # Act & Assert
    with pytest.raises(FacebookUserInfoFetchException) as exc_info:
        await facebook_graph_api_client.get_buyer_profile(sender_id, page_access_token)

    # Check the exception message contains the error type
    assert "unexpected_error" in exc_info.value.message


# =============================================================================
# TESTS: refresh_access_token
# =============================================================================


@pytest.mark.asyncio
async def test_refresh_access_token_delegates_to_oauth_service(
    facebook_graph_api_client,
):
    """Test that refresh_access_token delegates to OAuth service."""
    # Arrange
    page_id = "test_page_id"
    user_access_token = "test_user_token"

    # Mock the OAuth service
    mock_oauth_service = AsyncMock()
    mock_oauth_service.refresh_page_token.return_value = "new_token_123"
    facebook_graph_api_client.oauth_service = mock_oauth_service

    # Act
    new_token = await facebook_graph_api_client.refresh_access_token(page_id, user_access_token)

    # Assert
    assert new_token == "new_token_123"
    mock_oauth_service.refresh_page_token.assert_called_once_with(page_id, user_access_token)


# =============================================================================
# TESTS: close
# =============================================================================


@pytest.mark.asyncio
async def test_close(
    facebook_graph_api_client,
    mock_httpx_client,
):
    """Test that close method closes HTTP client."""
    # Act
    await facebook_graph_api_client.close()

    # Assert
    mock_httpx_client.aclose.assert_called_once()
