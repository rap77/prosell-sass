"""
Schema matching tests for Vehicle DTOs.

Validates that backend Pydantic models match frontend TypeScript types.
"""

from typing import Any, Union, get_type_hints

from pydantic import BaseModel

from prosell.application.dto.vehicle.create import DecodeVinResponse, VehicleData


def extract_pydantic_fields(model_class: type[BaseModel]) -> dict[str, str]:
    """
    Extract field names and types from a Pydantic model.

    Args:
        model_class: Pydantic BaseModel subclass

    Returns:
        Dict mapping field names to their TypeScript-like type representation
    """
    fields = {}
    type_hints = get_type_hints(model_class)

    for field_name, _field_info in model_class.model_fields.items():
        field_type = type_hints.get(field_name, "Any")
        type_str = _type_to_string(field_type)
        fields[field_name] = type_str

    return fields


def _type_to_string(python_type: type | Any) -> str:
    """Convert Python type to TypeScript-like string."""
    if python_type is type(None):
        return "None"

    type_map = {
        str: "string",
        int: "number",
        float: "number",
        bool: "boolean",
    }

    if python_type in type_map:
        return type_map[python_type]

    # Handle forward references (string annotations)
    if isinstance(python_type, str):
        return python_type

    # Check if it's a BaseModel subclass
    try:
        if isinstance(python_type, type) and issubclass(python_type, BaseModel):
            return python_type.__name__
    except TypeError:
        pass  # Not a class type

    if hasattr(python_type, "__origin__"):
        origin = python_type.__origin__

        if origin is list:
            inner = _type_to_string(python_type.__args__[0])
            return f"{inner}[]"

        if origin is dict:
            return "Record<string, any>"

        if origin is Union:
            return " | ".join(_type_to_string(arg) for arg in python_type.__args__)

    return "any"


class TestVehicleDTOSchemaMatching:
    """Validate backend DTOs match frontend TypeScript types."""

    def test_decode_vin_response_schema_complete(self):
        """
        Validate DecodeVinResponse has all expected fields.

        This test ensures the backend DTO structure matches
        what the frontend expects based on VehicleForm.tsx usage.

        Expected fields based on frontend VIN decode usage:
        - vin: string (17 characters)
        - vehicle: VehicleData (nullable in practice)
        - raw_data: dict with NHTSA response
        - cached: boolean flag for cache hit/miss
        """
        backend_fields = extract_pydantic_fields(DecodeVinResponse)

        # Expected fields based on frontend usage
        expected_fields = {
            "vin": "string",
            "vehicle": "VehicleData",  # Nested object
            "raw_data": "Record<string, any>",  # NHTSA raw response
            "cached": "boolean",
        }

        # Verify all expected fields exist
        for field_name, _expected_type in expected_fields.items():
            assert field_name in backend_fields, f"Missing field: {field_name}"

            # Type checking is relaxed - we mainly care about field presence
            # Exact type matching is difficult due to TypeScript vs Python differences
            actual_type = backend_fields[field_name]
            assert actual_type is not None, f"Field {field_name} has None type"

    def test_vehicle_data_schema_complete(self):
        """
        Validate VehicleData has all expected fields.

        Expected fields from frontend fbVehicleOptions.ts and VehicleForm.tsx:
        - year: number (4-digit year)
        - make: string (manufacturer)
        - model: string (vehicle model)
        - trim: string (trim level)
        - body_type: string (SUV, Sedan, etc.)
        - drivetrain: string (FWD, AWD, 4WD, RWD)
        - transmission: string (Automatic, Manual, CVT)
        - engine: string (engine description)
        - fuel_type: string (Gasoline, Electric, Hybrid)
        """
        backend_fields = extract_pydantic_fields(VehicleData)

        # Expected fields from frontend fbVehicleOptions.ts
        expected_fields = [
            "year",
            "make",
            "model",
            "trim",
            "body_type",
            "drivetrain",
            "transmission",
            "engine",
            "fuel_type",
        ]

        # Verify all expected fields exist
        for field_name in expected_fields:
            assert field_name in backend_fields, f"VehicleData missing field: {field_name}"

    def test_decode_vin_response_field_types(self):
        """
        Validate DecodeVinResponse field types are reasonable.

        This is a relaxed type check - we verify basic type categories
        match (string vs string, number vs number, etc.).
        """
        backend_fields = extract_pydantic_fields(DecodeVinResponse)

        # VIN should be string-like
        assert "string" in backend_fields["vin"].lower() or backend_fields["vin"] == "string"

        # cached should be boolean-like
        is_boolean = (
            "boolean" in backend_fields["cached"].lower() or backend_fields["cached"] == "boolean"
        )
        assert is_boolean

        # vehicle should be a complex type (not primitive)
        assert backend_fields["vehicle"] not in ["string", "number", "boolean", "any"]

        # raw_data should be a dict/record type
        is_record = (
            "record" in backend_fields["raw_data"].lower()
            or "dict" in backend_fields["raw_data"].lower()
        )
        assert is_record

    def test_vehicle_data_field_types(self):
        """
        Validate VehicleData field types are reasonable.

        All fields should be optional (nullable) in practice since
        NHTSA API may not return all fields for all vehicles.
        """
        backend_fields = extract_pydantic_fields(VehicleData)

        # year should be number-like
        assert "number" in backend_fields["year"].lower() or backend_fields["year"] == "number"

        # All other fields should be string-like or nullable
        string_fields = [
            "make",
            "model",
            "trim",
            "body_type",
            "drivetrain",
            "transmission",
            "engine",
            "fuel_type",
        ]

        for field_name in string_fields:
            assert field_name in backend_fields
            # Allow for nullable strings (string | None, string | None, etc.)
            field_type = backend_fields[field_name].lower()
            assert "string" in field_type or "any" in field_type
