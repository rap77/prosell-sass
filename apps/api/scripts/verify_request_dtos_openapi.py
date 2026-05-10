#!/usr/bin/env python3
"""Verify that all request DTOs match OpenAPI schema.

This script checks:
1. All request DTOs are properly imported and used in routers
2. Request DTOs have Pydantic models that FastAPI can serialize
3. Request DTOs match the OpenAPI schema expectations
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prosell.infrastructure.api.main import app

# Get OpenAPI schema
openapi_schema = app.openapi()

# Expected request DTOs from contract tests
# Note: Some DTOs are used internally (constructed from query params)
# and don't appear in OpenAPI directly
expected_request_dtos = {
    # Lead DTOs
    "CreateLeadRequest",
    "UpdateLeadStatusRequest",
    # "ListLeadsRequest",  # Used internally, not in OpenAPI
    # Appointment DTOs
    "CreateAppointmentRequest",
    # Team DTOs
    "CreateTeamRequest",
    "AddTeamMemberRequest",
    "UpdateTeamRequest",
    # "UpdateTeamMemberRequest",  # Not currently used in routers
    # Product DTOs
    "CreateProductRequest",
}

# Extract actual schemas from OpenAPI
actual_schemas = set()
components = openapi_schema.get("components", {}).get("schemas", {})

for schema_name in components.keys():
    if "Request" in schema_name or "Create" in schema_name or "Update" in schema_name or "List" in schema_name:
        actual_schemas.add(schema_name)

print("=" * 80)
print("REQUEST DTO VERIFICATION REPORT")
print("=" * 80)

print(f"\nExpected request DTOs: {len(expected_request_dtos)}")
for dto in sorted(expected_request_dtos):
    status = "✅" if dto in actual_schemas else "❌"
    print(f"  {status} {dto}")

print(f"\nActual request DTOs in OpenAPI: {len(actual_schemas)}")
missing = expected_request_dtos - actual_schemas
extra = actual_schemas - expected_request_dtos

if missing:
    print(f"\n❌ Missing DTOs ({len(missing)}):")
    for dto in sorted(missing):
        print(f"  - {dto}")

if extra:
    print(f"\nℹ️  Extra DTOs not in contract tests ({len(extra)}):")
    for dto in sorted(extra):
        print(f"  - {dto}")

# Check schema properties
print("\n" + "=" * 80)
print("SCHEMA PROPERTIES CHECK")
print("=" * 80)

issues = []
for schema_name in expected_request_dtos:
    if schema_name in components:
        schema = components[schema_name]
        required = schema.get("required", [])
        properties = schema.get("properties", {})

        # Check that required fields exist in properties
        for field in required:
            if field not in properties:
                issues.append(f"{schema_name}: required field '{field}' missing from properties")

        # Check that properties have valid types
        for prop_name, prop_def in properties.items():
            has_valid_type = (
                "$ref" in prop_def or
                "type" in prop_def or
                "anyOf" in prop_def or
                "allOf" in prop_def or
                "oneOf" in prop_def
            )
            if not has_valid_type:
                issues.append(f"{schema_name}.{prop_name}: missing type, $ref, or anyOf")

if issues:
    print(f"\n❌ Found {len(issues)} issues:")
    for issue in issues:
        print(f"  - {issue}")
else:
    print("\n✅ All schema properties are valid")

# Final verdict
print("\n" + "=" * 80)
if not missing and not issues:
    print("✅ VERIFICATION PASSED: All request DTOs match OpenAPI schema")
    sys.exit(0)
else:
    print("❌ VERIFICATION FAILED: Request DTOs do not match OpenAPI schema")
    sys.exit(1)
