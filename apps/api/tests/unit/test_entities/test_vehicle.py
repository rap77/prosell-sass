"""Unit tests for Vehicle entity."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.domain.entities.vehicle import Vehicle


class TestVehicle:
    """Test Vehicle entity."""

    def test_create_vehicle(self) -> None:
        """Test creating a vehicle."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        assert vehicle.id is not None
        assert vehicle.product_id == product_id
        assert vehicle.vin == "1HGCM826712345678"
        assert vehicle.mileage_unit == "mi"

    def test_vin_validation_length(self) -> None:
        """Test VIN validation for length."""
        product_id = uuid4()

        # Pydantic raises ValidationError for validation
        with pytest.raises(ValidationError):
            Vehicle.create(
                product_id=product_id,
                vin="123",
            )

    def test_vin_validation_invalid_chars(self) -> None:
        """Test VIN validation for invalid characters."""
        product_id = uuid4()

        # VIN with I, O, or Q is invalid
        with pytest.raises(ValueError, match="VIN cannot contain I, O, or Q"):
            Vehicle.create(
                product_id=product_id,
                vin="1HGCM82633A12345I",
            )

    def test_vin_uppercase(self) -> None:
        """Test that VIN is converted to uppercase."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1hgcm826712345678",
        )

        assert vehicle.vin == "1HGCM826712345678"

    def test_update_from_vin_decode(self) -> None:
        """Test updating vehicle from VIN decode data."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        decoded_data = {
            "Make": "Honda",
            "Model": "Civic",
            "Model Year": "2020",
            "Trim": "EX",
            "Body Class": "Sedan",
        }

        vehicle.update_from_vin_decode(decoded_data)

        assert vehicle.make == "Honda"
        assert vehicle.model == "Civic"
        assert vehicle.year == 2020
        assert vehicle.trim == "EX"
        assert vehicle.body_type == "Sedan"
        assert vehicle.is_vin_decoded is True

    def test_set_mileage(self) -> None:
        """Test setting vehicle mileage."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.set_mileage(50000, "mi")

        assert vehicle.mileage == 50000
        assert vehicle.mileage_unit == "mi"

    def test_set_mileage_negative_raises_error(self) -> None:
        """Test that negative mileage raises error."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        with pytest.raises(ValueError, match="mileage must be >= 0"):
            vehicle.set_mileage(-100)

    def test_set_mileage_invalid_unit_raises_error(self) -> None:
        """Test that invalid mileage unit raises error."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        with pytest.raises(ValueError, match='mileage_unit must be "mi" or "km"'):
            vehicle.set_mileage(50000, "miles")  # Should be "mi"

    def test_update_colors(self) -> None:
        """Test updating vehicle colors."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.update_colors(
            exterior="Black",
            interior="Gray",
        )

        assert vehicle.exterior_color == "Black"
        assert vehicle.interior_color == "Gray"

    def test_update_specifications(self) -> None:
        """Test updating vehicle specifications."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.update_specifications(
            body_type="SUV",
            drivetrain="AWD",
            transmission="Automatic",
        )

        assert vehicle.body_type == "SUV"
        assert vehicle.drivetrain == "AWD"
        assert vehicle.transmission == "Automatic"

    def test_update_mpg(self) -> None:
        """Test updating fuel economy ratings."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.update_mpg(city=25, highway=35, combined=30)

        assert vehicle.mpg_city == 25
        assert vehicle.mpg_highway == 35
        assert vehicle.mpg_combined == 30

    def test_update_mpg_negative_raises_error(self) -> None:
        """Test that negative MPG raises error."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        with pytest.raises(ValueError, match="mpg_city must be >= 0"):
            vehicle.update_mpg(city=-5)

    def test_update_features(self) -> None:
        """Test updating vehicle features."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.update_features(
            has_sunroof=True,
            has_leather=True,
            seat_material="Leather",
        )

        assert vehicle.has_sunroof is True
        assert vehicle.has_leather is True
        assert vehicle.seat_material == "Leather"

    def test_verify_vin(self) -> None:
        """Test marking VIN as verified."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        assert vehicle.vin_verified is False

        vehicle.verify_vin()
        assert vehicle.vin_verified is True

    def test_set_stock_number(self) -> None:
        """Test setting stock number."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        vehicle.set_stock_number("ABC123")

        assert vehicle.stock_number == "ABC123"

    def test_is_vin_decoded_property(self) -> None:
        """Test is_vin_decoded property."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
        )

        assert vehicle.is_vin_decoded is False

        vehicle.vin_decoded_data = {"Make": "Honda"}
        assert vehicle.is_vin_decoded is True

    def test_full_name_property(self) -> None:
        """Test full_name property."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
            year=2020,
            make="Honda",
            model="Civic",
            trim="EX",
        )

        full_name = vehicle.full_name
        assert "2020" in full_name
        assert "Honda" in full_name
        assert "Civic" in full_name
        assert "EX" in full_name

    def test_short_name_property(self) -> None:
        """Test short_name property."""
        product_id = uuid4()

        vehicle = Vehicle.create(
            product_id=product_id,
            vin="1HGCM826712345678",
            year=2020,
            make="Honda",
            model="Civic",
            trim="EX",
        )

        short_name = vehicle.short_name
        assert short_name == "2020 Honda Civic"
