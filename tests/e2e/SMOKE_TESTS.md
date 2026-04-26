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

### Auth Flow (5 tests)
1. `@smoke should display login page elements correctly` - Verifies login form loads
2. `@smoke should pass accessibility checks` - Login page WCAG compliance
3. `@smoke should show validation error for empty email` - Form validation
4. `@smoke should show validation error for invalid email format` - Email format validation
5. `@smoke should login successfully with valid credentials` - Auth flow works

### Vehicle Form (7 tests)
6. `@smoke should update model field after VIN decode` - VIN decode: model = "equinox"
7. `@smoke should update engine field after VIN decode` - Engine field populates
8. `@smoke should update make select field after VIN decode` - Select: make = "chevrolet"
9. `@smoke should update drivetrain select field after VIN decode` - Drivetrain populates
10. `@smoke should display selected make value in trigger without placeholder` - Selected values display
11. `@smoke should decode all fields simultaneously and maintain consistency` - All fields populate together
12. `@smoke should submit form and create product via POST /api/v1/products` - Form creates product+vehicle

### Middleware (1 test)
13. `@smoke should redirect to login when accessing /dashboard` - Protected routes work

### UI Components (2 tests)
14. `@smoke should display the main heading` - Home page loads
15. `@smoke should display Google OAuth button` - OAuth button visible

### Dashboard (1 test)
16. `@smoke should display organizations list page elements correctly` - Org list loads

### API Contracts (5 tests)
17. `@smoke GET /api/v1/categories - should list categories` - Categories API
18. `@smoke POST /api/v1/categories - should create category` - Create category works
19. `@smoke GET /api/v1/products - should list products` - Products API
20. `@smoke POST /api/v1/products - should create product` - Create product works
21. `@smoke POST /api/v1/vehicles/decode-vin - should decode valid VIN` - VIN decode API

Note: We have 21 tests marked (added form submission test). Target was 20.

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
