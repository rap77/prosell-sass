"""Decode VIN use case."""

from prosell.application.dto.vehicle import DecodeVinRequest, DecodeVinResponse, VehicleData
from prosell.application.ports.ivin_decoder_service import IVINDecoderService
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value


class DecodeVinUseCase:
    """Decode VIN using NHTSA VPIC API."""

    def __init__(
        self,
        vin_service: IVINDecoderService,
        vehicle_repository: AbstractVehicleRepository,
    ) -> None:
        self.vin_service = vin_service
        self.vehicle_repository = vehicle_repository

    async def execute(self, request: DecodeVinRequest) -> DecodeVinResponse:
        """
        Execute VIN decode.

        Args:
            request: DecodeVinRequest DTO

        Returns:
            DecodeVinResponse DTO

        Raises:
            InvalidVINError: If VIN is invalid
        """
        vin = request.vin.upper()

        # 1. Check if vehicle already exists in DB
        existing_vehicle = await self.vehicle_repository.get_by_vin(vin)

        if existing_vehicle and existing_vehicle.is_vin_decoded:
            # Check if cache is still fresh (< 24 hours)
            age_hours = existing_vehicle.vin_decode_age_hours
            if age_hours is not None and age_hours < 24:
                # Return cached data
                return DecodeVinResponse(
                    vin=vin,
                    vehicle=VehicleData(
                        year=existing_vehicle.year,
                        make=existing_vehicle.make,
                        model=existing_vehicle.model,
                        trim=existing_vehicle.trim,
                        body_type=existing_vehicle.body_type,
                        drivetrain=existing_vehicle.drivetrain,
                        transmission=existing_vehicle.transmission,
                        engine=existing_vehicle.engine,
                        fuel_type=existing_vehicle.fuel_type,
                    ),
                    raw_data=existing_vehicle.vin_decoded_data,
                    cached=True,
                )

        # 2. Decode VIN via API
        decoded_data = await self.vin_service.decode_vin(vin)

        # Debug: log available fields
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Available NHTSA fields: {list(decoded_data.keys())}")

        # 3. Build vehicle data from response
        # NHTSA field names can vary, so we try multiple possible names
        def get_field(data: dict[str, str], *possible_names: str) -> str | None:
            for name in possible_names:
                if value := data.get(name):
                    return value
            return None

        vehicle_data = VehicleData(
            year=_parse_int(get_field(decoded_data, "Model Year")),
            make=normalize_nhtsa_value(get_field(decoded_data, "Make", "Manufacturer"), "make"),
            model=get_field(decoded_data, "Model"),
            trim=get_field(decoded_data, "Trim"),
            body_type=normalize_nhtsa_value(
                get_field(decoded_data, "Body Class", "Body Style"), "body_type"
            ),
            drivetrain=normalize_nhtsa_value(
                get_field(decoded_data, "Drive Type", "Drivetrain"), "drivetrain"
            ),
            transmission=normalize_nhtsa_value(
                get_field(decoded_data, "Transmission", "Transmission Style"), "transmission"
            ),
            engine=get_field(decoded_data, "Engine", "Engine Model"),
            fuel_type=normalize_nhtsa_value(
                get_field(decoded_data, "Fuel Type", "Fuel Type - Primary"), "fuel_type"
            ),
        )

        return DecodeVinResponse(
            vin=vin,
            vehicle=vehicle_data,
            raw_data=decoded_data,
            cached=False,
        )


def _parse_int(value: str | None) -> int | None:
    """Safely parse int from string."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None
