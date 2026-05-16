"""Unit tests for product attribute validation."""

import pytest
from pydantic import ValidationError

from prosell.application.dto.product.attributes import (
    GenericProductAttributes,
    RealEstateAttributes,
    VehicleAttributes,
    product_attributes_adapter,
    validate_generic_attributes,
    validate_real_estate_attributes,
    validate_vehicle_attributes,
)


class TestVehicleAttributes:
    """Test VehicleAttributes validation."""

    def test_valid_vehicle_attributes(self):
        """Valid vehicle attributes should pass validation."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000.5,
            "mileage_unit": "miles",
        }

        result = validate_vehicle_attributes(attrs)
        assert isinstance(result, VehicleAttributes)
        assert result.vin == "1HGCM82633A123456"
        assert result.make == "Honda"
        assert result.model == "Civic"
        assert result.year == 2020
        assert result.mileage == 35000.5

    def test_vehicle_attributes_auto_inject_discriminator(self):
        """Discriminator should be auto-injected if missing."""
        attrs = {
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
        }

        result = validate_vehicle_attributes(attrs)
        assert result.category == "vehicle"

    def test_vehicle_attributes_invalid_vin_format(self):
        """VIN with invalid format should fail validation."""
        attrs = {
            "category": "vehicle",
            "vin": "INVALID_VIN",  # Not 17 chars, has invalid chars
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
        }

        with pytest.raises(ValidationError) as exc_info:
            validate_vehicle_attributes(attrs)

        errors = exc_info.value.errors()
        assert any("vin" in str(err["loc"]) for err in errors)

    def test_vehicle_attributes_vin_no_ioq(self):
        """VIN cannot contain I, O, Q characters."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A12345I",  # Contains 'I'
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
        }

        with pytest.raises(ValidationError):
            validate_vehicle_attributes(attrs)

    def test_vehicle_attributes_year_range(self):
        """Year must be between 1900 and 2100."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 1899,  # Too old
            "mileage": 35000,
        }

        with pytest.raises(ValidationError):
            validate_vehicle_attributes(attrs)

    def test_vehicle_attributes_mileage_unit_enum(self):
        """Mileage unit must be 'miles' or 'km'."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
            "mileage_unit": "miles",  # Valid
        }

        result = validate_vehicle_attributes(attrs)
        assert result.mileage_unit == "miles"

    def test_vehicle_attributes_optional_fields(self):
        """Optional fields should default correctly."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
        }

        result = validate_vehicle_attributes(attrs)
        assert result.trim is None
        assert result.body_type is None
        assert result.has_sunroof is False  # Default
        assert result.has_navigation is False  # Default

    def test_vehicle_attributes_extra_ignored(self):
        """Extra fields are silently ignored to allow flexible JSONB storage."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
            "extra_field": "ignored",
        }
        result = validate_vehicle_attributes(attrs)
        assert result is not None
        assert not hasattr(result, "extra_field")


class TestRealEstateAttributes:
    """Test RealEstateAttributes validation."""

    def test_valid_real_estate_attributes(self):
        """Valid real estate attributes should pass validation."""
        attrs = {
            "category": "real_estate",
            "property_type": "House",
            "sq_meters": 250.5,
            "rooms": 4,
            "bathrooms": 2.5,
        }

        result = validate_real_estate_attributes(attrs)
        assert isinstance(result, RealEstateAttributes)
        assert result.property_type == "House"
        assert result.sq_meters == 250.5
        assert result.rooms == 4
        assert result.bathrooms == 2.5

    def test_real_estate_attributes_auto_inject_discriminator(self):
        """Discriminator should be auto-injected if missing."""
        attrs = {
            "property_type": "Apartment",
            "sq_meters": 120.0,
            "rooms": 2,
            "bathrooms": 1,
        }

        result = validate_real_estate_attributes(attrs)
        assert result.category == "real_estate"

    def test_real_estate_attributes_year_built_range(self):
        """Year built must be between 1800 and 2100."""
        attrs = {
            "category": "real_estate",
            "property_type": "House",
            "sq_meters": 250.0,
            "rooms": 4,
            "bathrooms": 2,
            "year_built": 1799,  # Too old
        }

        with pytest.raises(ValidationError):
            validate_real_estate_attributes(attrs)

    def test_real_estate_attributes_optional_features(self):
        """Optional features should default correctly."""
        attrs = {
            "category": "real_estate",
            "property_type": "House",
            "sq_meters": 250.0,
            "rooms": 4,
            "bathrooms": 2,
        }

        result = validate_real_estate_attributes(attrs)
        assert result.has_pool is False  # Default
        assert result.has_garden is False  # Default
        assert result.parking_spaces is None

    def test_real_estate_attributes_bathrooms_float(self):
        """Bathrooms can be float (e.g., 2.5)."""
        attrs = {
            "category": "real_estate",
            "property_type": "House",
            "sq_meters": 250.0,
            "rooms": 4,
            "bathrooms": 3.5,  # Valid float
        }

        result = validate_real_estate_attributes(attrs)
        assert result.bathrooms == 3.5


class TestGenericProductAttributes:
    """Test GenericProductAttributes validation."""

    def test_valid_generic_attributes(self):
        """Valid generic attributes should pass validation."""
        attrs = {
            "category": "generic",
            "brand": "Nike",
            "size": "L",
            "color": "Blue",
        }

        result = validate_generic_attributes(attrs)  # type: ignore[arg-type]
        assert isinstance(result, GenericProductAttributes)
        assert result.category == "generic"
        assert result.model_dump()["brand"] == "Nike"

    def test_generic_attributes_extra_allowed(self):
        """Generic attributes should allow extra fields."""
        attrs = {
            "category": "generic",
            "any_field": "allowed",
            "another_field": 123,
            "nested": {"key": "value"},
        }

        result = validate_generic_attributes(attrs)
        assert result.model_dump()["any_field"] == "allowed"


class TestProductAttributesUnion:
    """Test ProductAttributes discriminated union."""

    def test_discriminated_union_vehicle(self):
        """Should validate vehicle attributes via union."""
        attrs = {
            "category": "vehicle",
            "vin": "1HGCM82633A123456",
            "make": "Honda",
            "model": "Civic",
            "year": 2020,
            "mileage": 35000,
        }

        result = product_attributes_adapter.validate_python(attrs)
        assert isinstance(result, VehicleAttributes)

    def test_discriminated_union_real_estate(self):
        """Should validate real estate attributes via union."""
        attrs = {
            "category": "real_estate",
            "property_type": "House",
            "sq_meters": 250.0,
            "rooms": 4,
            "bathrooms": 2,
        }

        result = product_attributes_adapter.validate_python(attrs)
        assert isinstance(result, RealEstateAttributes)

    def test_discriminated_union_generic(self):
        """Should validate generic attributes via union."""
        attrs = {
            "category": "generic",
            "brand": "Nike",
            "size": "L",
        }

        result = product_attributes_adapter.validate_python(attrs)
        assert isinstance(result, GenericProductAttributes)

    def test_discriminated_union_invalid_discriminator(self):
        """Invalid discriminator should fail validation."""
        attrs = {
            "category": "invalid_type",
            "some_field": "value",
        }

        with pytest.raises(ValidationError):
            product_attributes_adapter.validate_python(attrs)

    def test_discriminated_union_missing_discriminator(self):
        """Missing discriminator should fail validation."""
        attrs = {
            "vin": "1HGCM82633A123456",
            "make": "Honda",
        }

        with pytest.raises(ValidationError):
            product_attributes_adapter.validate_python(attrs)
