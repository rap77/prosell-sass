"""NHTSA VIN Decoder service implementation."""

import httpx

from prosell.application.ports.ivin_decoder_service import IVINDecoderService


class NHTSAVinService(IVINDecoderService):
    """
    NHTSA VPIC API client for VIN decoding.

    Free API, no key required.
    Documentation: https://vpic.nhtsa.dot.gov/api/
    """

    BASE_URL = "https://vpic.nhtsa.dot.gov/api"

    def __init__(self, timeout: float = 10.0) -> None:
        """
        Initialize NHTSA VIN service.

        Args:
            timeout: Request timeout in seconds (default 10s)
        """
        self.timeout = timeout

    async def decode_vin(self, vin: str) -> dict[str, str]:
        """
        Decode VIN using NHTSA VPIC API.

        Args:
            vin: 17-character Vehicle Identification Number

        Returns:
            Dict with vehicle data

        Raises:
            ValueError: If VIN is invalid
            httpx.HTTPStatusError: If API request fails
        """
        import logging

        logger = logging.getLogger(__name__)

        # Validate VIN format first
        if not await self.is_valid_vin(vin):
            raise ValueError(f"Invalid VIN format: {vin}")

        url = f"{self.BASE_URL}/vehicles/DecodeVin/{vin}"
        params = {"format": "json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            # Convert Results array to dict for easier access
            # Format: [{"Variable": "Make", "Value": "Toyota"}, ...]
            results = data.get("Results", [])

            # Filter out None values and empty strings
            raw_data = {item["Variable"]: item["Value"] for item in results if item.get("Value")}

            logger.info(f"NHTSA VIN decode for {vin}: Found {len(raw_data)} fields")
            logger.debug(f"NHTSA raw data: {raw_data}")

            return raw_data

    async def get_models_for_make(self, make: str) -> list[str]:
        """
        Fetch NHTSA's model catalog for a given make (vPIC
        GetModelsForMake), for a dependent make -> model select.

        Returns model names exactly as NHTSA provides them — already
        Title Case for the overwhelming majority (e.g. "Corolla", "Land
        Cruiser", "RAV4") — matching the capitalized format Facebook
        Marketplace expects for vehicle listings. Never lowercases,
        unlike the VIN-decode normalization pipeline
        (`_normalize_model()` in vehicle_router.py), which serves a
        different purpose (canonical matching against the internal
        attribute catalog).

        Args:
            make: Vehicle make name (e.g. "Toyota", "Mercedes-Benz")

        Returns:
            Sorted, deduplicated list of model names. Empty list when
            NHTSA has no models for the given make — the vPIC API
            returns HTTP 200 with an empty `Results` array for an
            unrecognized/misspelled make, not an error.

        Raises:
            httpx.HTTPStatusError: If the API request itself fails
        """
        url = f"{self.BASE_URL}/vehicles/GetModelsForMake/{make}"
        params = {"format": "json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            results = data.get("Results", [])
            return sorted({r["Model_Name"] for r in results if r.get("Model_Name")})

    async def is_valid_vin(self, vin: str) -> bool:
        """
        Validate VIN format.

        VIN must be:
        - Exactly 17 characters
        - Alphanumeric (no I, O, Q)

        Note: This is basic format validation. Full VIN validation
        includes checksum verification which is not implemented here.

        Args:
            vin: Vehicle Identification Number

        Returns:
            True if VIN format is valid
        """
        if not vin or len(vin) != 17:
            return False

        # Check for invalid characters (I, O, Q)
        invalid_chars = {"I", "O", "Q"}
        if any(char in invalid_chars for char in vin.upper()):
            return False

        # Check alphanumeric
        return vin.isalnum()
