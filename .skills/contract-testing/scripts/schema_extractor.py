"""Extract field information from Pydantic models."""

from typing import Any, Union, get_type_hints

from pydantic import BaseModel


def extract_pydantic_fields(model_class: type[BaseModel]) -> dict[str, str]:
    """
    Extract field names and types from a Pydantic model.

    Args:
        model_class: Pydantic BaseModel subclass

    Returns:
        Dict mapping field names to their TypeScript-like type representation

    Example:
        >>> from prosell.application.dto.vehicle.create import DecodeVinResponse
        >>> fields = extract_pydantic_fields(DecodeVinResponse)
        >>> print(fields)
        {'vin': 'string', 'vehicle': 'VehicleData', 'raw_data': 'Record<string, string | None>', 'cached': 'boolean'}
    """
    fields = {}
    type_hints = get_type_hints(model_class)

    for field_name, _field_info in model_class.model_fields.items():
        field_type = type_hints.get(field_name, "Any")
        type_str = _type_to_string(field_type)
        fields[field_name] = type_str

    return fields


def _type_to_string(python_type: type | Any) -> str:
    """
    Convert Python type to TypeScript-like string.

    Args:
        python_type: Python type object

    Returns:
        TypeScript type string

    Examples:
        >>> _type_to_string(str)
        'string'
        >>> _type_to_string(int | None)
        'number | None'
        >>> _type_to_string(list[str])
        'string[]'
    """
    # Handle None/Optional
    if python_type is type(None):
        return "None"

    # Handle basic types
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

    # Handle generic types (list, dict, Union, etc.)
    if hasattr(python_type, "__origin__"):
        origin = python_type.__origin__

        # List types
        if origin is list:
            inner = _type_to_string(python_type.__args__[0])
            return f"{inner}[]"

        # Dict types
        if origin is dict:
            return "Record<string, any>"

        # Union types (includes Optional)
        if origin is Union:
            return " | ".join(_type_to_string(arg) for arg in python_type.__args__)

    # Fallback for complex types
    return "any"
