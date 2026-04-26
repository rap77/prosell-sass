# Smoke Tests - Quick Reference

## Overview

Smoke tests are critical path tests that verify the core functionality of the application. They run quickly (~2 minutes) and catch regressions early.

## Running Smoke Tests

### Run all smoke tests:
```bash
cd tests/e2e
pnpm test --grep @smoke
```

### Run smoke tests in specific file:
```bash
cd tests/e2e
pnpm test vehicle-form-vin.spec.ts --grep @smoke
```

### Run smoke tests with UI (for debugging):
```bash
cd tests/e2e
pnpm test --grep @smoke --ui
```

## Smoke Test Coverage (20 tests)

### Auth Flow (3 tests)
1. `@smoke should display login page elements correctly` - Verifies login form loads
2. `@smoke should login successfully with valid credentials` - Verifies auth works
3. `@smoke should show validation error for empty email` - Verifies form validation

### Vehicle Form (5 tests)
4. `@smoke should update model field after VIN decode` - VIN decode populates fields
5. `@smoke should update make select field after VIN decode` - Select fields update correctly
6. `@smoke should display selected make value in trigger without placeholder` - Selected values display
7. `@smoke should decode all fields simultaneously and maintain consistency` - All fields populate together
8. `@smoke should update engine field after VIN decode` - Engine field populates

### DataGrid (4 tests)
9-12. [TODO] DataGrid smoke tests to be added

### CSV Upload (3 tests)
13-15. [TODO] CSV upload smoke tests to be added

### Categories (2 tests)
16. `@smoke GET /api/v1/categories - should list categories` - Categories API works
17. [TODO] Category dropdown loads options

### API Contracts (3 tests)
18. `@smoke GET /api/v1/categories - should list categories` - Categories API
19. [TODO] POST /api/v1/products creates product+vehicle
20. [TODO] GET /api/v1/vehicles returns paginated results

## Adding New Smoke Tests

To tag a test as a smoke test, simply add `@smoke` at the beginning of the test name:

```typescript
test("@smoke should do something critical", async ({ page }) => {
  // test implementation
});
```

Or use the tag format:

```typescript
test(
  "should do something critical",
  { tag: ["@smoke", "@critical"] },
  async ({ page }) => {
    // test implementation
  }
);
```

## Criteria for Smoke Tests

A test should be tagged as @smoke if it:
1. Tests a critical user path (login, create vehicle, view catalog)
2. Executes quickly (< 10 seconds per test)
3. Covers high-risk functionality (auth, API contracts, data integrity)
4. Provides fast feedback on regressions

## CI/CD Integration

Smoke tests should run:
- On every PR (before full E2E suite)
- After every deployment to staging
- As a quick health check before full regression testing

Expected execution time: ~2 minutes for all 20 smoke tests.
