#!/usr/bin/env python3
"""
Contract Test Coverage Analysis Tool

Analyzes all API routers and identifies missing contract test coverage.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Project structure
PROJECT_ROOT = Path("/home/rpadron/proy/prosell-sass")
ROUTERS_DIR = PROJECT_ROOT / "apps/api/src/prosell/infrastructure/api/routers"
E2E_CONTRACT_DIR = PROJECT_ROOT / "tests/e2e/layer2"
API_CONTRACT_DIR = PROJECT_ROOT / "apps/api/tests/contract"

# Existing contract tests
EXISTING_E2E_TESTS = {
    "appointments-contract.spec.ts",
    "leads-contract.spec.ts",
    "vehicles-contract.spec.ts",
}

EXISTING_API_TESTS = {
    "test_organizations_schema.py",
    "test_webhooks_schema.py",
    "test_lead_dto_schemas.py",
    "test_vehicle_dto_matching.py",
    "test_vin_decode_contract.py",
}

# Router to test mapping
ROUTER_TEST_MAPPING = {
    "appointment_router.py": ("appointments-contract.spec.ts", "E2E"),
    "lead_router.py": ("leads-contract.spec.ts", "E2E"),
    "vehicle_router.py": ("vehicles-contract.spec.ts", "E2E"),
    "org_router.py": ("test_organizations_schema.py", "API"),
    "webhook_router.py": ("test_webhooks_schema.py", "API"),
}


def extract_router_info(router_file: Path) -> Dict[str, any]:
    """Extract endpoint information from a router file."""
    content = router_file.read_text()

    # Extract router prefix
    prefix_match = re.search(r'prefix\s*=\s*["\']([^"\']+)["\']', content)
    prefix = prefix_match.group(1) if prefix_match else "UNKNOWN"

    # Extract all route decorators (handle both @router.get("") and @router.get("path"))
    get_routes = re.findall(r'@router\.get\(["\']([^"\']*)["\']', content)
    post_routes = re.findall(r'@router\.post\(["\']([^"\']*)["\']', content)
    put_routes = re.findall(r'@router\.put\(["\']([^"\']*)["\']', content)
    delete_routes = re.findall(r'@router\.delete\(["\']([^"\']*)["\']', content)
    patch_routes = re.findall(r'@router\.patch\(["\']([^"\']*)["\']', content)

    all_routes = get_routes + post_routes + put_routes + delete_routes + patch_routes

    return {
        "file": router_file.name,
        "prefix": prefix,
        "endpoints": all_routes,
        "endpoint_count": len(all_routes),
    }


def check_test_coverage(router_file: Path) -> Dict[str, any]:
    """Check if a router has contract test coverage."""
    router_name = router_file.name
    router_info = extract_router_info(router_file)

    # Check if router has explicit test mapping
    if router_name in ROUTER_TEST_MAPPING:
        test_file, test_type = ROUTER_TEST_MAPPING[router_name]
        if test_type == "E2E":
            test_path = E2E_CONTRACT_DIR / test_file
        else:
            test_path = API_CONTRACT_DIR / test_file

        return {
            **router_info,
            "has_test": True,
            "test_file": test_file,
            "test_type": test_type,
            "test_exists": test_path.exists(),
        }

    # Check for implicit test coverage by filename
    base_name = router_name.replace("_router.py", "")
    potential_e2e = E2E_CONTRACT_DIR / f"{base_name}-contract.spec.ts"
    potential_api = API_CONTRACT_DIR / f"test_{base_name}_schema.py"

    if potential_e2e.exists():
        return {
            **router_info,
            "has_test": True,
            "test_file": potential_e2e.name,
            "test_type": "E2E",
            "test_exists": True,
        }

    if potential_api.exists():
        return {
            **router_info,
            "has_test": True,
            "test_file": potential_api.name,
            "test_type": "API",
            "test_exists": True,
        }

    return {
        **router_info,
        "has_test": False,
        "test_file": None,
        "test_type": None,
        "test_exists": False,
    }


def main():
    """Generate coverage report."""
    print("=" * 80)
    print("CONTRACT TEST COVERAGE ANALYSIS")
    print("=" * 80)
    print()

    # Get all router files
    router_files = sorted(ROUTERS_DIR.glob("*_router.py"))

    if not router_files:
        print("ERROR: No router files found!")
        return

    # Analyze each router
    results = []
    for router_file in router_files:
        coverage = check_test_coverage(router_file)
        results.append(coverage)

    # Sort: routers WITHOUT tests first
    results.sort(key=lambda x: (not x["has_test"], x["file"]))

    # Print summary
    print(f"Total routers found: {len(results)}")
    routers_with_tests = sum(1 for r in results if r["has_test"])
    routers_without_tests = len(results) - routers_with_tests
    print(f"Routers with contract tests: {routers_with_tests}")
    print(f"Routers WITHOUT contract tests: {routers_without_tests}")
    print()

    # Print detailed report
    print("=" * 80)
    print("DETAILED COVERAGE REPORT")
    print("=" * 80)
    print()

    print("## 1. Routers MISSING Contract Tests")
    print()
    missing_count = 0
    for result in results:
        if not result["has_test"]:
            missing_count += 1
            print(f"❌ {result['file']}")
            print(f"   Prefix: {result['prefix']}")
            print(f"   Endpoints: {result['endpoint_count']}")
            print()

    if missing_count == 0:
        print("✅ All routers have contract tests!")
    print()

    print("=" * 80)
    print("## 2. Routers WITH Contract Tests")
    print()
    for result in results:
        if result["has_test"]:
            status = "✅" if result["test_exists"] else "⚠️ "
            print(f"{status} {result['file']}")
            print(f"   Prefix: {result['prefix']}")
            print(f"   Test: {result['test_file']} ({result['test_type']})")
            print(f"   Endpoints: {result['endpoint_count']}")
            print()

    # Print routers without tests
    print("=" * 80)
    print("## 3. Priority List: Missing Contract Tests")
    print()
    print("The following routers need contract tests (sorted by importance):")
    print()

    priority_routers = [
        "product_router.py",
        "category_router.py",
        "team_router.py",
        "auth_router.py",
        "publisher_router.py",
        "image_router.py",
        "user_branch_router.py",
        "branch_router.py",
        "vendedor_router.py",
        "wallet_router.py",
        "facebook_router.py",
        "admin_router.py",
        "health_router.py",
        "test_router.py",
    ]

    for priority_router in priority_routers:
        found = False
        for result in results:
            if result["file"] == priority_router and not result["has_test"]:
                print(f"- {result['file']} ({result['prefix']})")
                print(f"  Endpoints: {result['endpoint_count']}")
                found = True
                break
        if not found:
            # Router already has test coverage
            pass

    print()
    print("=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
