#!/usr/bin/env python3
"""
Contract Test Comparison Tool

Compares router endpoints with existing contract tests to identify coverage gaps.
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


def extract_router_endpoints(router_file: Path) -> List[Dict[str, str]]:
    """Extract all endpoints from a router file with details."""
    content = router_file.read_text()

    # Extract router prefix
    prefix_match = re.search(r'prefix\s*=\s*["\']([^"\']+)["\']', content)
    prefix = prefix_match.group(1) if prefix_match else "UNKNOWN"

    endpoints = []

    # Pattern to match route decorators with methods and paths
    # Handles: @router.get(""), @router.post("path"), @router.put("/{id}")
    route_pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']*)["\']'

    for match in re.finditer(route_pattern, content):
        method = match.group(1).upper()
        path = match.group(2)

        # Build full path
        if path and not path.startswith("/"):
            full_path = f"{prefix}/{path}" if prefix != "UNKNOWN" else path
        elif path == "":
            full_path = prefix
        else:
            full_path = f"{prefix}{path}" if prefix != "UNKNOWN" else path

        endpoints.append({
            "method": method,
            "path": path,
            "full_path": full_path,
            "router": router_file.name,
        })

    return endpoints


def extract_e2e_test_coverage(test_file: Path) -> Set[str]:
    """Extract endpoint coverage from E2E contract test file."""
    if not test_file.exists():
        return set()

    content = test_file.read_text()

    # Extract HTTP method calls from test assertions
    # Pattern: authenticatedRequest.get("/api/v1/leads")
    endpoints = set()

    # Match patterns like: request.get("/api/v1/leads")
    # or: authenticatedRequest.post("/api/v1/leads")
    patterns = [
        r'(?:authenticatedRequest|request)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']',
        r'\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']',  # chained calls
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, content):
            method = match.group(1).upper()
            path = match.group(2)
            endpoints.add(f"{method} {path}")

    return endpoints


def extract_api_test_coverage(test_file: Path) -> Set[str]:
    """Extract endpoint coverage from API contract test file."""
    if not test_file.exists():
        return set()

    content = test_file.read_text()
    endpoints = set()

    # Look for endpoint references in comments or test descriptions
    # Pattern: # GET /api/v1/organizations
    doc_pattern = r'#\s*(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)'

    for match in re.finditer(doc_pattern, content):
        method = match.group(1)
        path = match.group(2)
        endpoints.add(f"{method} {path}")

    return endpoints


def compare_coverage():
    """Generate detailed comparison report."""
    print("=" * 80)
    print("CONTRACT TEST COVERAGE COMPARISON")
    print("=" * 80)
    print()

    # Get all router files
    router_files = sorted(ROUTERS_DIR.glob("*_router.py"))

    # Collect all endpoints from routers
    all_router_endpoints = []
    for router_file in router_files:
        endpoints = extract_router_endpoints(router_file)
        all_router_endpoints.extend(endpoints)

    # Group by router
    router_endpoints_map = {}
    for endpoint in all_router_endpoints:
        router = endpoint["router"]
        if router not in router_endpoints_map:
            router_endpoints_map[router] = []
        router_endpoints_map[router].append(endpoint)

    # Get existing test coverage
    test_coverage = {}

    # E2E tests
    for test_file in E2E_CONTRACT_DIR.glob("*-contract.spec.ts"):
        coverage = extract_e2e_test_coverage(test_file)
        test_coverage[test_file.name] = {
            "type": "E2E",
            "endpoints": coverage,
        }

    # API tests
    for test_file in API_CONTRACT_DIR.glob("test_*_schema.py"):
        coverage = extract_api_test_coverage(test_file)
        test_coverage[test_file.name] = {
            "type": "API",
            "endpoints": coverage,
        }

    # Print summary
    print(f"Total routers: {len(router_endpoints_map)}")
    print(f"Total endpoints: {len(all_router_endpoints)}")
    print(f"Contract test files: {len(test_coverage)}")
    print()

    # Detailed comparison by router
    print("=" * 80)
    print("DETAILED COVERAGE COMPARISON BY ROUTER")
    print("=" * 80)
    print()

    for router_name in sorted(router_endpoints_map.keys()):
        endpoints = router_endpoints_map[router_name]

        print(f"## {router_name}")
        print()

        # Find matching test file
        test_file = None
        test_type = None

        # Check explicit mappings
        router_to_test_map = {
            "appointment_router.py": "appointments-contract.spec.ts",
            "lead_router.py": "leads-contract.spec.ts",
            "vehicle_router.py": "vehicles-contract.spec.ts",
            "org_router.py": "test_organizations_schema.py",
            "webhook_router.py": "test_webhooks_schema.py",
        }

        if router_name in router_to_test_map:
            test_file = router_to_test_map[router_name]
            test_type = "E2E" if "contract.spec.ts" in test_file else "API"

        if test_file and test_file in test_coverage:
            covered_endpoints = test_coverage[test_file]["endpoints"]

            print(f"**Test File**: {test_file} ({test_type})")
            print()

            # Compare each endpoint
            covered_count = 0
            for endpoint in endpoints:
                full_endpoint = f"{endpoint['method']} {endpoint['full_path']}"
                is_covered = any(full_endpoint in covered or
                               endpoint['full_path'] in covered
                               for covered in covered_endpoints)

                status = "✅" if is_covered else "❌"
                print(f"  {status} {endpoint['method']} {endpoint['full_path']}")

                if is_covered:
                    covered_count += 1

            coverage_percent = (covered_count / len(endpoints)) * 100 if endpoints else 0
            print()
            print(f"**Coverage**: {covered_count}/{len(endpoints)} ({coverage_percent:.0f}%)")
        else:
            print(f"**Test File**: NONE")
            print()
            print(f"  ❌ NO TEST COVERAGE")
            for endpoint in endpoints:
                print(f"     {endpoint['method']} {endpoint['full_path']}")

        print()
        print("-" * 80)
        print()

    # Print missing test summary
    print("=" * 80)
    print("MISSING CONTRACT TESTS - PRIORITY ORDER")
    print("=" * 80)
    print()

    # Priority order
    priority_routers = [
        "product_router.py",
        "category_router.py",
        "team_router.py",
        "auth_router.py",
        "publisher_router.py",
        "image_router.py",
        "user_branch_router.py",
    ]

    for priority_router in priority_routers:
        if priority_router in router_endpoints_map:
            endpoints = router_endpoints_map[priority_router]
            print(f"### {priority_router}")
            print(f"**Endpoints**: {len(endpoints)}")
            print()
            for endpoint in endpoints[:5]:  # Show first 5
                print(f"- {endpoint['method']} {endpoint['full_path']}")
            if len(endpoints) > 5:
                print(f"- ... and {len(endpoints) - 5} more")
            print()


if __name__ == "__main__":
    compare_coverage()
