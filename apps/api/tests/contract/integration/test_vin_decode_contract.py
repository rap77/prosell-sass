"""
Integration + Contract Test for VIN Decode Use Case

This test validates:
1. Pydantic structure validation (DecodeVinResponse)
2. Contract validation (NHTSA normalization: lowercase, UPPERCASE)
3. Multiple test scenarios (valid VIN, 2017 Buick Enclave)

VIN: 2GNALBEK8H1615946 (2017 Buick Enclave)
Expected normalized values:
- make: "buick" (lowercase)
- body_type: "suv" (lowercase)
- drivetrain: "FWD" (UPPERCASE)
- transmission: "automatic" (lowercase)
- fuel_type: "gasoline" (lowercase)
"""

import pytest

from prosell.application.dto.vehicle import DecodeVinRequest, DecodeVinResponse, VehicleData
from prosell.application.use_cases.vehicle.decode_vin import DecodeVinUseCase
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.services.nhtsa_vin_service import NHTSAVinService


class MockVehicleRepository(AbstractVehicleRepository):
    """Mock vehicle repository for testing."""

    async def get_by_vin(self, _vin: str):
        """Return None to force API call."""
        return None

    async def create(self, vehicle):
        """Mock create."""
        return vehicle

    async def get_by_id(self, _vehicle_id):
        """Mock get by ID."""
        return None

    async def get_by_product_id(self, _product_id):
        """Mock get by product ID."""
        return None

    async def update(self, vehicle):
        """Mock update."""
        return vehicle

    async def delete(self, _vehicle_id):
        """Mock delete."""
        return True

    async def exists_by_vin(self, _vin: str):
        """Mock exists by VIN."""
        return False

    async def list(self, _limit=100, _offset=0, _filters=None):
        """Mock list."""
        return []

    async def get_dealers_for_vins(self, _vins, _tenant_id):
        """Mock get dealers for VINs."""
        return {}

    async def get_with_dealer_info(self, _vehicle_id, _tenant_id):
        """Mock get with dealer info."""
        return None

    async def get_catalog_items(
        self,
        _tenant_id,
        _filters=None,
        _cursor=None,
        _limit=50,
    ):
        """Mock get catalog items."""
        return []

    async def count(self, _filters=None):
        """Mock count."""
        return 0

    async def get_catalog_for_user(
        self, _user_id, _tenant_id, _filters=None, _cursor=None, _limit=50
    ):
        """Mock get catalog for user."""
        return []

    async def get_vins_batch(self, _vins, _tenant_id):
        """Mock get VINs batch."""
        return {}

    async def search_by_make_model(self, _make, _model, _tenant_id):
        """Mock search by make/model."""
        return []


class TestDecodeVinContract:
    """Contract validation tests for VIN decode use case."""

    @pytest.mark.asyncio
    async def test_vin_decode_normalization_2017_chevrolet_equinox(self):
        """
        Test VIN decode with NHTSA normalization.

        VIN: 2GNALBEK8H1615946 (2017 Chevrolet Equinox)

        Validates:
        - make: lowercase (e.g., "chevrolet")
        - body_type: lowercase (e.g., "suv")
        - drivetrain: UPPERCASE (e.g., "FWD")
        - transmission: lowercase (e.g., "automatic")
        - fuel_type: lowercase (e.g., "gasoline")

        This test FAILS if normalizer is not connected.
        """
        # Setup
        vin_service = NHTSAVinService()
        vehicle_repository = MockVehicleRepository()
        use_case = DecodeVinUseCase(
            vin_service=vin_service,
            vehicle_repository=vehicle_repository,
        )

        # Execute
        request = DecodeVinRequest(vin="2GNALBEK8H1615946")
        response = await use_case.execute(request)

        # Validate structure
        assert isinstance(response, DecodeVinResponse)
        assert isinstance(response.vehicle, VehicleData)
        assert response.vin == "2GNALBEK8H1615946"
        assert response.cached is False

        # Validate contract: NHTSA normalization
        vehicle = response.vehicle

        # year must be 2017
        assert vehicle.year == 2017, f"year mismatch: {vehicle.year} != 2017"

        # make must be lowercase
        assert vehicle.make == "chevrolet", f"make mismatch: {vehicle.make} != chevrolet"
        assert vehicle.make.islower(), f"make must be lowercase: {vehicle.make}"

        # model must contain "equinox" (case-insensitive)
        assert vehicle.model.lower() == "equinox", f"model mismatch: {vehicle.model} != equinox"

        # body_type must be lowercase
        assert vehicle.body_type == "suv", f"body_type mismatch: {vehicle.body_type} != suv"
        assert vehicle.body_type.islower(), f"body_type must be lowercase: {vehicle.body_type}"

        # drivetrain must be UPPERCASE
        assert vehicle.drivetrain == "FWD", f"drivetrain mismatch: {vehicle.drivetrain} != FWD"
        assert vehicle.drivetrain.isupper(), f"drivetrain must be UPPERCASE: {vehicle.drivetrain}"

        # transmission must be lowercase
        assert vehicle.transmission == "automatic", (
            f"transmission mismatch: {vehicle.transmission} != automatic"
        )
        assert vehicle.transmission.islower(), (
            f"transmission must be lowercase: {vehicle.transmission}"
        )

        # fuel_type must be lowercase
        assert vehicle.fuel_type == "gasoline", (
            f"fuel_type mismatch: {vehicle.fuel_type} != gasoline"
        )
        assert vehicle.fuel_type.islower(), f"fuel_type must be lowercase: {vehicle.fuel_type}"

    @pytest.mark.asyncio
    async def test_vin_decode_handles_chevrolet_silverado(self):
        """
        Test VIN decode with Chevrolet Silverado (pickup).

        VIN: 3GCUYDED6MG192627 (2021 Chevrolet Silverado 1500)

        Validates:
        - make: "chevrolet" (lowercase)
        - body_type: "pickup" (lowercase)
        - drivetrain: "4WD" (UPPERCASE)
        """
        # Setup
        vin_service = NHTSAVinService()
        vehicle_repository = MockVehicleRepository()
        use_case = DecodeVinUseCase(
            vin_service=vin_service,
            vehicle_repository=vehicle_repository,
        )

        # Execute
        request = DecodeVinRequest(vin="3GCUYDED6MG192627")
        response = await use_case.execute(request)

        # Validate structure
        assert isinstance(response, DecodeVinResponse)
        assert isinstance(response.vehicle, VehicleData)

        # Validate contract
        vehicle = response.vehicle

        # year must be 2021
        assert vehicle.year == 2021, f"year mismatch: {vehicle.year} != 2021"

        # make must be lowercase
        assert vehicle.make == "chevrolet", f"make mismatch: {vehicle.make} != chevrolet"
        assert vehicle.make.islower(), f"make must be lowercase: {vehicle.make}"

        # body_type must be "pickup"
        assert vehicle.body_type == "pickup", f"body_type mismatch: {vehicle.body_type} != pickup"
        assert vehicle.body_type.islower(), f"body_type must be lowercase: {vehicle.body_type}"

        # drivetrain must be UPPERCASE
        assert vehicle.drivetrain in ["4WD", "AWD"], f"drivetrain mismatch: {vehicle.drivetrain}"
        assert vehicle.drivetrain.isupper(), f"drivetrain must be UPPERCASE: {vehicle.drivetrain}"
