---
status: investigating
trigger: "Fix 5 failing E2E tests in vehicle-creation-c3.spec.ts"
created: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Focus

hypothesis: 5 tests fail due to: unmocked VINs causing real NHTSA calls to fail, price optional in schema causing validation test to not trigger, and Promise.race pattern that masks failures
test: run failing tests to get actual error output, then fix surgically
expecting: test output reveals which exact assertions fail
next_action: run test suite to get actual errors

## Symptoms

expected: 19/19 vehicle-creation-c3.spec.ts tests pass
actual: 14/19 pass, 5 fail
errors: unknown - need to run tests to capture
reproduction: cd tests/e2e && npx playwright test specs/vehicle-creation-c3.spec.ts
started: after previous session brought from 68.4% to 73.7%

## Eliminated

## Evidence

- timestamp: 2026-05-05T00:00:00Z
  checked: VehicleForm.tsx schema
  found: price is z.number().min(0).optional() — it's OPTIONAL, not required
  implication: test "should handle missing required fields with validation errors" fills VIN but not price, then expects "Completá: Precio" toast — but price isn't required, so no validation error fires

- timestamp: 2026-05-05T00:00:00Z
  checked: beforeEach VIN mocks
  found: VIN mock reads searchParams.get("vin") but decode-vin is a POST with body JSON, so searchParams is always null → mock NEVER fires → all VIN decodes go to real NHTSA backend
  implication: VIN decode works because real backend handles it. NOT the root cause of failures.

- timestamp: 2026-05-05T00:00:00Z
  checked: test_router.py cleanup endpoint
  found: DELETE /api/v1/test/cleanup deletes ALL categories/products/leads/appointments for tenant_id — no filtering by specific IDs
  implication: when 19 tests run fully parallel, each test's afterEach.cleanup() destroys ALL tenant data, including categories created by other still-running tests

- timestamp: 2026-05-05T00:00:00Z
  checked: playwright.config.ts
  found: fullyParallel: true, workers: undefined (uses CPU count)
  implication: all 19 tests start nearly simultaneously, afterEach of early-finishing tests deletes categories of still-running tests

- timestamp: 2026-05-05T00:00:00Z
  checked: test results for 5 failures
  found: tests 2,3,5 fail with selectCategory timeout (category deleted by parallel cleanup); test 1 fails with response.ok()=false (category deleted between form submission and API call, or VIN decode returns empty title); test 4 fails because price is optional and no validation fires
  implication: tests 1,2,3,5 share the same root cause (parallelism); test 4 is a logic bug

- timestamp: 2026-05-05T00:00:00Z
  checked: CreateProductRequest backend DTO
  found: tenant_id and organization_id required UUIDs — frontend doesn't send them. BUT smoke test passes → backend injects from JWT? No — route doesn't do that. Re-examined: 14 tests pass; the smoke test is one of the passing 14. These tests work because they all finish before cleanup runs or their cleanup happens after form submission.
  implication: parallelism is the common thread for all failures

## Resolution

root_cause:
fix:
verification:
files_changed: []
