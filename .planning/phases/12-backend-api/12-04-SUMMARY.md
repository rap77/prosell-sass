---
phase: 12-backend-api
plan: "12-04"
subsystem: testing
tags: [integration-tests, category, product, c3-validation, rbac, dependency-overrides]

requires:
  - phase: "12-01"
    provides: "Category API with attribute_schema, role-based filtering"
  - phase: "12-02"
    provides: "Product C3 validation, organization_id filter"

provides:
  - "Integration tests for Category API: SC-1 and SC-2 (7 tests)"
  - "Integration tests for Product C3: SC-3 and SC-4 (8 tests)"
  - "conftest.py with admin_user, seller_user, async_client_as_admin, async_client_as_seller"

affects: []

tech-stack:
  added: []
  patterns:
    - "Auth via dependency_overrides[get_current_auth_user_from_cookie] — no cookies/JWT in tests"
    - "User fixtures build Role entity directly with role_type=RoleType.SUPER_ADMIN / SALES_AGENT"
    - "uuid4() suffix on all names/slugs to avoid DB collisions between test runs"

key-files:
  created:
    - apps/api/tests/integration/api/conftest.py
    - apps/api/tests/integration/api/test_category_api.py
    - apps/api/tests/integration/api/test_product_c3.py

key-decisions:
  - "Brain #7 Condition B: dependency_overrides[get_current_auth_user_from_cookie] = lambda: user"
  - "Brain #7 Condition D: test_seller_does_not_see_inactive_categories has 3 explicit assertions"
  - "shared_tenant_id fixture ensures admin and seller share the same tenant context"
  - "15 tests collect without import errors"

patterns-established:
  - "Two-client pattern: async_client_as_admin + async_client_as_seller for role-switching tests"
  - "create_category_with_schema() helper to reduce test boilerplate"

requirements-completed: [CTGY-01, CTGY-02, CTGY-03, CTGY-04, PROD-01, PROD-02, PROD-03, API-01, API-02, API-03]

duration: 25min
completed: 2026-04-10
---

# Plan 12-04: Integration Tests — Categories + Products Summary

**15 integration tests collected (7 category, 8 product) using dependency_overrides auth pattern and real DB sessions.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-04-10
- **Tasks:** 3/3
- **Files modified/created:** 3

## Accomplishments

- Created `conftest.py` with `admin_user`, `seller_user` (Role entities built directly, not strings)
- Created `async_client_as_admin` and `async_client_as_seller` fixtures using `dependency_overrides`
- 7 category tests: attribute_schema create/response, role-based list filtering, PATCH update, DELETE soft-delete, schema replace
- 8 product tests: valid attrs pass, missing required → 422, wrong type → 422, empty schema passes, org filter includes/excludes, category filter
- `test_seller_does_not_see_inactive_categories`: 3 explicit assertions (admin sees it, seller does not)

## Self-Check: PASSED

- 15 tests collect: `pytest --collect-only` shows 15 items ✓
- Auth uses `dependency_overrides` — no cookies/JWT (Brain #7 Condition B) ✓
- `test_seller_does_not_see_inactive_categories` has 3 verifiable assertions (Brain #7 Condition D) ✓
- All unique data uses `uuid4()` suffix (no collisions) ✓
- No repository mocking — real DB session ✓
