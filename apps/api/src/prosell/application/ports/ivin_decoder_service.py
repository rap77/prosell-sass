"""VIN Decoder service interface (Port)."""

from abc import ABC, abstractmethod


class IVINDecoderService(ABC):
    """Interface for VIN decoding services."""

    @abstractmethod
    async def decode_vin(self, vin: str) -> dict[str, str]:
        """
        Decode a VIN to get vehicle information.

        Args:
            vin: 17-character Vehicle Identification Number

        Returns:
            Dict with vehicle data. Format matches NHTSA VPIC API:
            {
                "Make": "Toyota",
                "Model": "Camry",
                "Model Year": "2020",
                "Trim": "LE",
                "Body Class": "Sedan",
                ...
            }

        Raises:
            ValueError: If VIN is invalid
            httpx.HTTPStatusError: If API request fails
        """
        pass

    @abstractmethod
    async def is_valid_vin(self, vin: str) -> bool:
        """
        Validate VIN format.

        Args:
            vin: Vehicle Identification Number to validate

        Returns:
            True if VIN format is valid, False otherwise
        """
        pass
