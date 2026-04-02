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
