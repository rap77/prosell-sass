#!/usr/bin/env python3
"""Verify that validation rules are documented in OpenAPI schema."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prosell.infrastructure.api.main import app

openapi_schema = app.openapi()

# Expected validation rules for key fields
expected_validations = {
    "CreateLeadRequest": {
        "buyer_name": {"minLength": 1, "maxLength": 255},
        "buyer_email": {"format": "email"},
        "buyer_phone": {"maxLength": 50},
        "message": {"maxLength": 2000},
    },
    "CreateAppointmentRequest": {
        "notes": {"maxLength": 2000},
    },
    "CreateTeamRequest": {
        "name": {"minLength": 1, "maxLength": 255},
    },
    "AddTeamMemberRequest": {
        "role": {"pattern": "^(manager|vendor)$"},
        "commission_rate": {"minimum": 0, "maximum": 100},
    },
}

print("=" * 80)
print("VALIDATION RULES VERIFICATION REPORT")
print("=" * 80)

components = openapi_schema.get("components", {}).get("schemas", {})
issues = []
checked_count = 0

for schema_name, field_validations in expected_validations.items():
    if schema_name not in components:
        issues.append(f"{schema_name}: Schema not found")
        continue

    schema = components[schema_name]
    properties = schema.get("properties", {})

    for field_name, expected_rules in field_validations.items():
        if field_name not in properties:
            issues.append(f"{schema_name}.{field_name}: Field not found")
            continue

        field_def = properties[field_name]

        # Check each expected validation rule
        for rule_name, rule_value in expected_rules.items():
            # Handle optional fields with anyOf
            if "anyOf" in field_def:
                # Check the non-null variant
                for variant in field_def["anyOf"]:
                    if "type" in variant and variant["type"] != "null":
                        field_def = variant
                        break

            if rule_name in field_def:
                actual_value = field_def[rule_name]
                if actual_value == rule_value:
                    checked_count += 1
                else:
                    issues.append(f"{schema_name}.{field_name}: {rule_name}={actual_value}, expected={rule_value}")
            else:
                issues.append(f"{schema_name}.{field_name}: Missing {rule_name} validation")

print(f"\nChecked {checked_count} validation rules")

if issues:
    print(f"\n❌ Found {len(issues)} issues:")
    for issue in issues[:20]:  # Limit output
        print(f"  - {issue}")
    if len(issues) > 20:
        print(f"  ... and {len(issues) - 20} more")
    print("\n❌ VERIFICATION FAILED")
    sys.exit(1)
else:
    print("✅ All expected validation rules are documented")
    print("✅ VERIFICATION PASSED")
    sys.exit(0)
