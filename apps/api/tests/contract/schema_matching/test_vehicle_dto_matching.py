"""
Schema matching tests for Vehicle DTOs.

Validates that frontend types match backend Pydantic DTOs.
This test was recreated after DTO refactoring (2026-05-07).
"""

from prosell.application.dto.lead.request import CreateLeadRequest, UpdateLeadStatusRequest
from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.vehicle.response import VehicleResponse


class TestVehicleResponseSchema:
    """Test VehicleResponse schema matches expected structure."""

    def test_vehicle_response_has_required_fields(self):
        """VehicleResponse must have all required vehicle fields."""
        # These fields are required for vehicle display in frontend
        required_fields = [
            "id",
            "product_id",
            "vin",
            "year",
            "make",
            "model",
            "body_type",
            "drivetrain",
            "transmission",
            "fuel_type",
            "mileage",
            "exterior_color",
            "interior_color",
        ]

        # Check that VehicleResponse has these fields defined
        vehicle_fields = VehicleResponse.model_fields.keys()

        for field in required_fields:
            assert field in vehicle_fields, f"VehicleResponse missing field: {field}"

    def test_vehicle_response_accepts_valid_data(self):
        """VehicleResponse should accept valid vehicle data."""
        from datetime import datetime
        from uuid import uuid4

        valid_data = {
            "id": uuid4(),
            "product_id": uuid4(),
            "vin": "2GNALBEK8H1615946",
            "year": 2021,
            "make": "chevrolet",
            "model": "equinox",
            "trim": "LT",
            "body_type": "suv",
            "drivetrain": "FWD",
            "transmission": "automatic",
            "engine": "2.0L 4-Cylinder",
            "fuel_type": "gasoline",
            "mileage": 25000,
            "mileage_unit": "miles",
            "exterior_color": "silver",
            "interior_color": "black",
            "has_sunroof": False,
            "has_navigation": False,
            "has_leather": False,
            "has_backup_camera": True,
            "has_bluetooth": True,
            "has_remote_start": False,
            "seat_material": "cloth",
            "vin_verified": True,
            "stock_number": "ABC123",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }

        # Should not raise ValidationError
        vehicle = VehicleResponse(**valid_data)
        assert vehicle.make == "chevrolet"
        assert vehicle.drivetrain == "FWD"


class TestCreateProductRequestSchema:
    """Test CreateProductRequest schema for vehicle products."""

    def test_create_product_accepts_vehicle_attributes(self):
        """CreateProductRequest should accept vehicle attributes."""
        from uuid import uuid4

        valid_product = {
            "title": "2021 Chevrolet Equinox LT",
            "price_cents": 2500000,  # $25,000.00
            "category_id": uuid4(),
            "attributes": {
                "vin": "2GNALBEK8H1615946",
                "year": 2021,
                "make": "chevrolet",
                "model": "equinox",
                "trim": "LT",
                "body_type": "suv",
                "drivetrain": "FWD",
                "transmission": "automatic",
                "fuel_type": "gasoline",
                "mileage": 25000,
                "exterior_color": "silver",
                "interior_color": "black",
            },
        }

        # Should not raise ValidationError
        product = CreateProductRequest(**valid_product)
        assert product.attributes["make"] == "chevrolet"
        assert product.price_cents == 2500000


class TestLeadRequestSchema:
    """Test Lead request DTOs match expected structure."""

    def test_create_lead_request_has_required_fields(self):
        """CreateLeadRequest must have all required lead fields."""
        required_fields = ["buyer_name", "buyer_email", "buyer_phone", "message", "source"]

        lead_fields = CreateLeadRequest.model_fields.keys()

        for field in required_fields:
            assert field in lead_fields, f"CreateLeadRequest missing field: {field}"

    def test_create_lead_request_accepts_optional_fields(self):
        """CreateLeadRequest should accept optional product_id and vendedor_id."""
        from uuid import uuid4

        valid_lead = {
            "buyer_name": "John Doe",
            "buyer_email": "john@example.com",
            "buyer_phone": "+15551234567",
            "message": "Interested in this vehicle",
            "source": "manual",
            "product_id": uuid4(),
            "vendedor_id": uuid4(),
        }

        # Should not raise ValidationError
        lead = CreateLeadRequest(**valid_lead)
        assert lead.buyer_name == "John Doe"

    def test_update_lead_status_request_uses_new_status(self):
        """UpdateLeadStatusRequest uses 'new_status' not 'status'."""
        from prosell.domain.entities.lead import LeadStatus

        valid_update = {"new_status": LeadStatus.CONTACTED, "reason": "Spoke with customer"}

        # Should not raise ValidationError
        update = UpdateLeadStatusRequest(**valid_update)
        assert update.new_status == LeadStatus.CONTACTED

    def test_update_lead_status_reason_is_optional(self):
        """UpdateLeadStatusRequest.reason should be optional."""
        from prosell.domain.entities.lead import LeadStatus

        valid_update = {"new_status": LeadStatus.QUALIFIED}

        # Should not raise ValidationError without reason
        update = UpdateLeadStatusRequest(**valid_update)
        assert update.reason is None
