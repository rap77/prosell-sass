#!/usr/bin/env python3
"""Verify that all response DTOs match OpenAPI schema."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prosell.infrastructure.api.main import app

openapi_schema = app.openapi()

# Expected response DTOs from contract tests
expected_response_dtos = {
    # Lead DTOs
    "LeadResponse",
    "LeadDetailResponse",
    "LeadListResponse",
    "LeadAuditLogResponse",
    # Appointment DTOs
    "AppointmentResponse",
    # Team DTOs
    "TeamResponse",
    "TeamMemberResponse",
    "TeamListResponse",
    # Product DTOs
    "ProductResponse",
    "ProductListResponse",
}

# Extract actual schemas from OpenAPI
actual_schemas = set()
components = openapi_schema.get("components", {}).get("schemas", {})

for schema_name in components.keys():
    if "Response" in schema_name or "List" in schema_name:
        actual_schemas.add(schema_name)

print("=" * 80)
print("RESPONSE DTO VERIFICATION REPORT")
print("=" * 80)

print(f"\nExpected response DTOs: {len(expected_response_dtos)}")
for dto in sorted(expected_response_dtos):
    status = "✅" if dto in actual_schemas else "❌"
    print(f"  {status} {dto}")

missing = expected_response_dtos - actual_schemas

if missing:
    print(f"\n❌ Missing DTOs ({len(missing)}):")
    for dto in sorted(missing):
        print(f"  - {dto}")
    print("\n❌ VERIFICATION FAILED")
    sys.exit(1)
else:
    print("\n✅ All response DTOs present in OpenAPI schema")
    print("✅ VERIFICATION PASSED")
    sys.exit(0)
