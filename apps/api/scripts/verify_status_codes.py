#!/usr/bin/env python3
"""Verify that API endpoints use correct HTTP status codes."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prosell.infrastructure.api.main import app

openapi_schema = app.openapi()

# Expected status codes for common operations
# Note: 404 is often handled implicitly by FastAPI, so we don't require it explicitly
expected_status_codes = {
    "GET /api/v1/leads": [200],
    "POST /api/v1/leads": [201],
    "GET /api/v1/leads/{lead_id}": [200],
    "PUT /api/v1/leads/{lead_id}/status": [200],
    "POST /api/v1/appointments": [201],
    "GET /api/v1/appointments": [200],
    "POST /api/v1/teams": [201],
    "GET /api/v1/teams/org/{org_id}": [200],
    "POST /api/v1/products": [201],
    "GET /api/v1/products": [200],
}

print("=" * 80)
print("STATUS CODE VERIFICATION REPORT")
print("=" * 80)

issues = []
checked_count = 0

for path_pattern, expected_codes in expected_status_codes.items():
    method = path_pattern.split()[0]
    path = path_pattern.split()[1]

    if path not in openapi_schema["paths"]:
        issues.append(f"{path_pattern}: Path not found")
        continue

    path_item = openapi_schema["paths"][path]
    if method.lower() not in path_item:
        issues.append(f"{path_pattern}: Method not found")
        continue

    operation = path_item[method.lower()]
    responses = operation.get("responses", {})

    # Check if expected status codes are present
    for code in expected_codes:
        code_str = str(code)
        if code_str not in responses:
            issues.append(f"{path_pattern}: Missing status code {code}")
        else:
            checked_count += 1

    # Check for common errors
    for code_str in responses:
        if code_str == "default":
            # 'default' is valid (represents all other responses)
            continue
        try:
            code = int(code_str)
            if code < 100 or code >= 600:
                issues.append(f"{path_pattern}: Invalid status code {code}")
        except ValueError:
            pass  # Non-numeric status codes are valid (e.g., "1XX", "2XX")

print(f"\nChecked {checked_count} status code definitions")

if issues:
    print(f"\n❌ Found {len(issues)} issues:")
    for issue in issues:
        print(f"  - {issue}")
    print("\n❌ VERIFICATION FAILED")
    sys.exit(1)
else:
    print("✅ All expected status codes are defined")
    print("✅ VERIFICATION PASSED")
    sys.exit(0)
