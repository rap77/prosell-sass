"""Integration tests for the make -> model dependent select endpoint.

Feeds `SchemaFieldRenderer`'s `options_source: "nhtsa_models"` branch —
`GET /vehicles/models?make=...`, backed by NHTSA vPIC's
`GetModelsForMake`. Mirrors `test_vin_decode_integration.py`'s mocking
approach (patch `httpx.AsyncClient` directly, no live network calls).
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from prosell.infrastructure.api.routers.vehicle_router import get_models_for_make
from prosell.infrastructure.services.nhtsa_vin_service import NHTSAVinService


@pytest.fixture
def mock_nhtsa_models_response() -> dict[str, Any]:
    """Mock NHTSA GetModelsForMake response for Toyota (trimmed)."""
    return {
        "Count": 3,
        "Message": "Response returned successfully",
        "SearchCriteria": "Make:Toyota",
        "Results": [
            {"Make_ID": 448, "Make_Name": "Toyota", "Model_ID": 2208, "Model_Name": "Corolla"},
            {"Make_ID": 448, "Make_Name": "Toyota", "Model_ID": 2209, "Model_Name": "Camry"},
            {
                "Make_ID": 448,
                "Make_Name": "Toyota",
                "Model_ID": 2211,
                "Model_Name": "Land Cruiser",
            },
        ],
    }


@pytest.fixture
def mock_nhtsa_empty_response() -> dict[str, Any]:
    """Mock NHTSA response for an unrecognized make — HTTP 200, no results."""
    return {
        "Count": 0,
        "Message": "Response returned successfully",
        "SearchCriteria": "Make:NotARealBrandXYZ",
        "Results": [],
    }


def _mock_httpx_client(json_body: dict[str, Any]) -> AsyncMock:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = json_body
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.get.return_value = mock_response
    return mock_client


class TestNHTSAVinServiceGetModelsForMake:
    """Unit tests for NHTSAVinService.get_models_for_make()."""

    @pytest.mark.asyncio
    async def test_returns_sorted_deduplicated_model_names(
        self, mock_nhtsa_models_response: dict[str, Any]
    ) -> None:
        service = NHTSAVinService()
        mock_client = _mock_httpx_client(mock_nhtsa_models_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            models = await service.get_models_for_make("Toyota")

        # Sorted alphabetically, not NHTSA's original (Corolla, Camry,
        # Land Cruiser) order — and never lowercased.
        assert models == ["Camry", "Corolla", "Land Cruiser"]

    @pytest.mark.asyncio
    async def test_calls_the_get_models_for_make_endpoint(
        self, mock_nhtsa_models_response: dict[str, Any]
    ) -> None:
        service = NHTSAVinService()
        mock_client = _mock_httpx_client(mock_nhtsa_models_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            await service.get_models_for_make("Toyota")

        mock_client.get.assert_called_once()
        call_args = mock_client.get.call_args
        assert "GetModelsForMake" in str(call_args)
        assert "Toyota" in str(call_args)

    @pytest.mark.asyncio
    async def test_returns_empty_list_for_unrecognized_make(
        self, mock_nhtsa_empty_response: dict[str, Any]
    ) -> None:
        """NHTSA answers HTTP 200 with an empty Results array for a make
        it doesn't recognize — never an error status."""
        service = NHTSAVinService()
        mock_client = _mock_httpx_client(mock_nhtsa_empty_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            models = await service.get_models_for_make("NotARealBrandXYZ")

        assert models == []


class TestGetModelsForMakeEndpoint:
    """Integration tests for GET /vehicles/models."""

    @pytest.mark.asyncio
    async def test_returns_models_for_a_known_make(
        self, mock_nhtsa_models_response: dict[str, Any]
    ) -> None:
        mock_client = _mock_httpx_client(mock_nhtsa_models_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            response = await get_models_for_make(make="Toyota", vin_service=NHTSAVinService())

        assert response.make == "Toyota"
        assert response.models == ["Camry", "Corolla", "Land Cruiser"]
        assert response.cached is False

    @pytest.mark.asyncio
    async def test_second_call_for_the_same_make_is_served_from_cache(
        self, mock_nhtsa_models_response: dict[str, Any]
    ) -> None:
        from prosell.infrastructure.api.routers.vehicle_router import _models_cache

        _models_cache.clear()
        mock_client = _mock_httpx_client(mock_nhtsa_models_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            first = await get_models_for_make(make="Toyota", vin_service=NHTSAVinService())
            second = await get_models_for_make(
                make="toyota", vin_service=NHTSAVinService()
            )  # case-insensitive cache key

        assert first.cached is False
        assert second.cached is True
        assert second.models == first.models
        # NHTSA was only actually called once — the second call hit cache.
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_unrecognized_make_returns_empty_list_not_an_error(
        self, mock_nhtsa_empty_response: dict[str, Any]
    ) -> None:
        from prosell.infrastructure.api.routers.vehicle_router import _models_cache

        _models_cache.clear()
        mock_client = _mock_httpx_client(mock_nhtsa_empty_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            response = await get_models_for_make(
                make="NotARealBrandXYZ", vin_service=NHTSAVinService()
            )

        assert response.models == []
