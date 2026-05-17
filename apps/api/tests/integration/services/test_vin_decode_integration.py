"""Integration tests for VIN decode service.

These tests verify the NHTSA VIN decode integration including:
- Successful API calls to NHTSA
- Caching behavior
- Error handling (timeout, 404, 500)
- Vehicle attribute population
- Mock NHTSA API responses

Test Strategy:
- Use unittest.mock to mock httpx.AsyncClient
- Test success scenarios with valid VINs
- Test error scenarios (timeout, 404, 500)
- Verify caching behavior
- Test vehicle attribute normalization
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import status

from prosell.infrastructure.api.routers.vehicle_router import (
    VINDecodeRequest,
    decode_vin,
)
from prosell.infrastructure.services.nhtsa_vin_service import NHTSAVinService

# =============================================================================
# TEST FIXTURES - Mock NHTSA API Responses
# =============================================================================


@pytest.fixture
def mock_nhtsa_success_response() -> dict[str, Any]:
    """Mock successful NHTSA VIN decode response for Toyota Camry."""
    return {
        "Count": 32,
        "Message": "Results returned successfully",
        "Results": [
            {"Variable": "Make", "Value": "Toyota"},
            {"Variable": "Model", "Value": "Camry"},
            {"Variable": "Model Year", "Value": "2020"},
            {"Variable": "Trim", "Value": "LE"},
            {"Variable": "Body Class", "Value": "Sedan/Saloon"},
            {"Variable": "Drive Type", "Value": "Front-Wheel Drive"},
            {"Variable": "Transmission Style", "Value": "Automatic"},
            {"Variable": "Fuel Type - Primary", "Value": "Gasoline"},
            {"Variable": "Engine", "Value": "2.5L L4 DOHC 16V"},
            {"Variable": "Vehicle Type", "Value": "PASSENGER CAR"},
        ],
    }


@pytest.fixture
def mock_nhtsa_404_response() -> dict[str, Any]:
    """Mock NHTSA 404 response for invalid VIN."""
    return {
        "Count": 0,
        "Message": "No results found",
        "Results": [],
    }


# =============================================================================
# TEST CLASS: VIN Decode Integration Tests
# =============================================================================


class TestVINDecodeIntegration:
    """Test VIN decode integration with NHTSA API."""

    # -------------------------------------------------------------------------
    # TEST: Successful VIN decode (B2.2.b)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_decode_calls_nhtsa_api_successfully(
        self,
        mock_nhtsa_success_response: dict[str, Any],
    ) -> None:
        """
        B2.2.b: Test VIN decode calls NHTSA API successfully.

        Given: A valid VIN (2020 Toyota Camry)
        When: decode_vin is called
        Then: NHTSA API is called and returns vehicle data
        """
        # Arrange
        vin = "4T1BF1FK5CU123456"  # Valid Toyota Camry VIN
        service = NHTSAVinService()

        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nhtsa_success_response
        mock_response.raise_for_status = MagicMock()

        # Create mock client
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Patch httpx.AsyncClient
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act
            result = await service.decode_vin(vin)

            # Assert
            assert result is not None
            assert "Make" in result
            assert result["Make"] == "Toyota"
            assert "Model" in result
            assert result["Model"] == "Camry"
            assert "Model Year" in result
            assert result["Model Year"] == "2020"

            # Verify the API was called
            mock_client.get.assert_called_once()
            call_args = mock_client.get.call_args
            assert "DecodeVin" in str(call_args)

    # -------------------------------------------------------------------------
    # TEST: VIN decode caching (B2.2.c, B2.2.j)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_decode_caches_results(
        self,
        mock_nhtsa_success_response: dict[str, Any],
    ) -> None:
        """
        B2.2.c, B2.2.j: Test VIN decode caches results.

        Given: A valid VIN
        When: decode_vin is called twice with the same VIN
        Then: Second call should return cached result (cached=True)
        """
        # Arrange
        vin = "4T1BF1FK5CU123456"
        request = VINDecodeRequest(vin=vin)

        # Clear cache before test using public testing utility
        from prosell.infrastructure.api.routers.vehicle_router import (
            clear_vin_cache_for_testing,
        )

        clear_vin_cache_for_testing()

        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nhtsa_success_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Act - First call (should hit API)
        with patch("httpx.AsyncClient", return_value=mock_client):
            response1 = await decode_vin(request)

        # Act - Second call (should use cache, no API call)
        with patch("httpx.AsyncClient", return_value=mock_client):
            response2 = await decode_vin(request)

        # Assert
        assert response1.cached is False
        assert response2.cached is True
        assert response1.vehicle.make == response2.vehicle.make
        assert response1.vehicle.model == response2.vehicle.model

        # Verify API was called only once (first call)
        assert mock_client.get.call_count == 1

    # -------------------------------------------------------------------------
    # TEST: VIN decode handles API errors (B2.2.d, B2.2.i)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_decode_handles_404_error(self) -> None:
        """
        B2.2.d, B2.2.i: Test VIN decode handles API 404 error.

        Given: An invalid VIN
        When: decode_vin is called and NHTSA returns 404
        Then: Should raise HTTPStatusError
        """
        # Arrange
        vin = "00000000000000000"  # Invalid VIN
        service = NHTSAVinService()

        # Create mock 404 response
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Not Found", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Act & Assert
        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await service.decode_vin(vin)

    @pytest.mark.asyncio
    async def test_vin_decode_handles_500_error(self) -> None:
        """
        B2.2.d, B2.2.i: Test VIN decode handles API 500 error.

        Given: A valid VIN
        When: decode_vin is called and NHTSA returns 500
        Then: Should raise HTTPStatusError
        """
        # Arrange
        vin = "4T1BF1FK5CU123456"
        service = NHTSAVinService()

        # Create mock 500 response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Internal Server Error", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Act & Assert
        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await service.decode_vin(vin)

    # -------------------------------------------------------------------------
    # TEST: VIN decode timeout (B2.2.e)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_decode_timeout_error(self) -> None:
        """
        B2.2.e: Test VIN decode timeout error.

        Given: A valid VIN
        When: decode_vin is called and NHTSA times out
        Then: Should raise TimeoutException
        """
        # Arrange
        vin = "4T1BF1FK5CU123456"
        service = NHTSAVinService()

        # Create mock client that raises timeout
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.side_effect = httpx.TimeoutException("Request timed out")

        # Act & Assert
        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.TimeoutException):
                await service.decode_vin(vin)

    # -------------------------------------------------------------------------
    # TEST: VIN decode populates vehicle attributes (B2.2.f, B2.2.h)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_decode_populates_vehicle_attributes(
        self,
        mock_nhtsa_success_response: dict[str, Any],
    ) -> None:
        """
        B2.2.f, B2.2.h: Test VIN decode populates vehicle attributes.

        Given: A valid VIN with complete NHTSA data
        When: decode_vin is called via the endpoint
        Then: All vehicle attributes should be populated and normalized
        """
        # Arrange
        vin = "4T1BF1FK5CU123456"
        request = VINDecodeRequest(vin=vin)

        # Clear cache using public testing utility
        from prosell.infrastructure.api.routers.vehicle_router import (
            clear_vin_cache_for_testing,
        )

        clear_vin_cache_for_testing()

        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_nhtsa_success_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Act
        with patch("httpx.AsyncClient", return_value=mock_client):
            response = await decode_vin(request)

        # Assert - All fields populated
        assert response.vehicle is not None
        assert response.vehicle.year == 2020
        assert response.vehicle.make == "toyota"  # Normalized to lowercase
        assert response.vehicle.model == "camry"  # Normalized to lowercase
        assert response.vehicle.trim == "LE"
        assert response.vehicle.body_type == "sedan"  # Normalized from "Sedan/Saloon"
        assert response.vehicle.drivetrain == "FWD"  # Normalized to UPPERCASE
        assert response.vehicle.transmission == "automatic"  # Normalized to lowercase
        assert response.vehicle.fuel_type == "gasoline"  # Normalized to lowercase
        assert response.vehicle.engine == "2.5L L4 DOHC 16V"

    # -------------------------------------------------------------------------
    # TEST: VIN validation (B2.2.g - Mock NHTSA API responses)
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_vin_validation_rejects_invalid_characters(self) -> None:
        """
        B2.2.g: Test VIN validation rejects invalid characters.

        Given: A VIN with invalid characters (I, O, Q)
        When: decode_vin is called via the endpoint
        Then: Should raise HTTPException with 422 Unprocessable Entity
        """
        # Arrange
        from fastapi import HTTPException

        vin_with_invalid_chars = "4T1BF1FK5CU12I45O"  # Contains I and O
        request = VINDecodeRequest(vin=vin_with_invalid_chars)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await decode_vin(request)

        assert exc_info.value.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "Invalid VIN characters" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_vin_validation_rejects_wrong_length(self) -> None:
        """
        B2.2.g: Test VIN validation rejects wrong length.

        Given: A VIN with wrong length (not 17 characters)
        When: decode_vin is called via the service
        Then: Should raise ValueError
        """
        # Arrange
        service = NHTSAVinService()
        short_vin = "4T1BF1FK5"  # Too short

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid VIN format"):
            await service.decode_vin(short_vin)

    @pytest.mark.asyncio
    async def test_vin_validation_accepts_valid_vin(self) -> None:
        """
        B2.2.g: Test VIN validation accepts valid VIN.

        Given: A valid VIN format
        When: is_valid_vin is called
        Then: Should return True
        """
        # Arrange
        service = NHTSAVinService()
        valid_vin = "4T1BF1FK5CU123456"

        # Act
        result = await service.is_valid_vin(valid_vin)

        # Assert
        assert result is True


# =============================================================================
# TEST CLASS: VIN Decode Edge Cases
# =============================================================================


class TestVINDecodeEdgeCases:
    """Test VIN decode edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_vin_decode_handles_missing_optional_fields(self) -> None:
        """
        Test VIN decode handles missing optional fields gracefully.

        Given: A VIN with incomplete NHTSA data
        When: decode_vin is called
        Then: Should populate available fields and set others to None
        """
        # Arrange - Mock response with missing fields
        incomplete_response = {
            "Count": 5,
            "Message": "Results returned successfully",
            "Results": [
                {"Variable": "Make", "Value": "Ford"},
                {"Variable": "Model", "Value": "F-150"},
                {"Variable": "Model Year", "Value": "2021"},
                # Missing: Trim, Body Class, Drive Type, etc.
            ],
        }

        vin = "1FTEW1EP5MFK12345"
        request = VINDecodeRequest(vin=vin)

        # Clear cache using public testing utility
        from prosell.infrastructure.api.routers.vehicle_router import (
            clear_vin_cache_for_testing,
        )

        clear_vin_cache_for_testing()

        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = incomplete_response
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response

        # Act
        with patch("httpx.AsyncClient", return_value=mock_client):
            response = await decode_vin(request)

        # Assert - Required fields populated, optional fields are None
        assert response.vehicle.make == "ford"
        assert response.vehicle.model == "f-150"
        assert response.vehicle.year == 2021
        assert response.vehicle.trim is None  # Not in NHTSA response
        assert response.vehicle.body_type is None  # Not in NHTSA response

    @pytest.mark.asyncio
    async def test_vin_decode_case_insensitive(self) -> None:
        """
        Test VIN decode is case-insensitive.

        Given: A VIN in lowercase
        When: is_valid_vin is called
        Then: Should work correctly (VIN is normalized internally)
        """
        # Arrange
        service = NHTSAVinService()
        lowercase_vin = "4t1bf1fk5cu123456"  # Lowercase

        # Act
        is_valid = await service.is_valid_vin(lowercase_vin)

        # Assert
        assert is_valid is True
