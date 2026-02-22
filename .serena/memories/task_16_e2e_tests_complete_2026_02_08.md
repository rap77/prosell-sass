# Frontend Auth Sprint 1-2 - Task #16 Complete ✅

**Date:** 2026-02-08
**Status:** Task #16: E2E Tests (Playwright) Complete ✅ | 16/17 tasks (~94%)

## Task #16: E2E Tests (Playwright) - Complete ✅

### Files Created

#### Base Infrastructure

- **`tests/e2e/base-page.ts`** - Base class for all Page Objects
  - Common methods: goto(), waitForNotification(), verifyUrl(), screenshot()
  - All Page Objects extend this class

- **`tests/e2e/helpers.ts`** - Test data generation utilities
  - `generateUniqueEmail()` - Creates unique email for each test
  - `generateTestPassword()` - Returns password meeting requirements
  - `generateTestUser()` - Returns full test user object
  - `getExistingUser()` - Loads test credentials from env vars

#### Login E2E Tests (12 tests)

- **`tests/e2e/auth/login-page.ts`** - LoginPage Page Object
  - Locators: emailInput, passwordInput, submitButton, OAuth buttons
  - Methods: login(), verifyPageLoaded(), verifyErrorMessage()

- **`tests/e2e/auth/login.spec.ts`** - Login E2E test suite
  - Page Layout: Elements display, accessibility (3 tests)
  - Form Validation: Email, password errors (3 tests)
  - Auth Flow: Success, error, loading (3 tests)
  - Navigation: Forgot password, register, home (3 tests)

- **`tests/e2e/auth/login.md`** - Test documentation
  - Test cases with IDs (LOGIN-E2E-001 through LOGIN-E2E-012)
  - Priority, tags, flow steps, expected results

#### Register E2E Tests (10 tests)

- **`tests/e2e/auth/register-page.ts`** - RegisterPage Page Object
  - Locators: fullName, email, password, confirmPassword, terms checkbox
  - Methods: register(), verifyPageLoaded(), clickSignIn()

- **`tests/e2e/auth/register.spec.ts`** - Register E2E test suite
  - Page Layout: Elements display, accessibility (2 tests)
  - Form Validation: Name, email, password, mismatch, terms (5 tests)
  - Registration Flow: Success, loading (2 tests)
  - Navigation: Sign in link (1 test)

#### Middleware E2E Tests (13 tests)

- **`tests/e2e/auth/middleware.spec.ts`** - Route protection tests
  - Protected Routes: Dashboard, profile, settings, 2FA redirect (5 tests)
  - Public Routes: Home, login, register, forgot-password, reset-password, verify-email (6 tests)
  - API/Static bypass: API routes, static files (2 tests)

#### Configuration

- **`tests/e2e/playwright.config.ts`** - Updated
  - Changed `testDir: "./"` to include both `specs/` and `auth/`
  - Removed API webServer (only need Next.js dev server)
  - Configured for Chromium, Firefox, WebKit

## Implementation Details

### Page Object Model Pattern

```typescript
// BasePage - parent class for all pages
export class BasePage {
  constructor(protected page: Page) {}
  async goto(path: string): Promise<void> {
    /* ... */
  }
  async waitForNotification(): Promise<void> {
    /* ... */
  }
  async verifyUrl(path: string): Promise<void> {
    /* ... */
  }
}

// LoginPage extends BasePage
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: /sign in/i });
  }

  async login(data: LoginData): Promise<void> {
    /* ... */
  }
}
```

### Selector Strategy (Playwright Best Practices)

```typescript
// ✅ GOOD - getByRole for interactive elements
this.submitButton = page.getByRole("button", { name: /sign in/i });
this.navLink = page.getByRole("link", { name: "Dashboard" });

// ✅ GOOD - getByLabel for form controls
this.emailInput = page.getByLabel("Email");
this.passwordInput = page.getByLabel("Password");

// ✅ SPARINGLY - getByText for static content only
this.errorMessage = page.getByText("Invalid credentials");

// ❌ AVOID - fragile selectors
this.button = page.locator(".btn-primary"); // NO
this.input = page.locator("#email"); // NO
```

### Test Tags

```typescript
test(
  "should login successfully with valid credentials",
  { tag: ["@critical", "@e2e", "@login", "@LOGIN-E2E-007"] },
  async ({ page }) => {
    // test implementation
  },
);
```

**Tag Categories:**

- Priority: `@critical`, `@high`, `@medium`, `@low`
- Type: `@e2e`
- Feature: `@login`, `@register`, `@middleware`
- Test ID: `@LOGIN-E2E-007`, `@REGISTER-E2E-008`
- Accessibility: `@a11y`

## GGA Review - Required Fixes

### 1. Missing `expect` import

**Files:** `login-page.ts`, `register-page.ts`
**Fix:** Added `expect` to Playwright imports

### 2. Hardcoded credentials

**File:** `helpers.ts`
**Original Issue:** Fallback values `test@example.com / password123`
**Fix:** Removed fallbacks, now requires env vars:

```typescript
export function getExistingUser() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set",
    );
  }

  return { email, password };
}
```

### 3. Sleep function

**File:** `helpers.ts`
**Original Issue:** `sleep()` function encourages bad practices
**Fix:** Removed entirely - use proper waits (waitForSelector, waitForURL)

### 4. Custom screenshot method

**File:** `base-page.ts`
**Original Issue:** Custom screenshot path not managed by Playwright
**Fix:** Removed `screenshot()` method - use Playwright's built-in screenshot management

## Test Commands

```bash
# Run all E2E tests
cd tests/e2e && pnpm test

# Run specific test file
pnpm test auth/login.spec.ts

# Run with UI mode
pnpm test:ui

# Run specific browser
pnpm test --project=chromium

# Run with debugging
pnpm test:debug

# Show HTML report
pnpm report
```

## Environment Variables Required

```bash
# For E2E tests with existing user
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password123"
```

## Progress: 16/17 tasks (~94%)

### Completed (16/17):

1. ✅ Environment Setup
2. ✅ authStore (Zustand)
3. ✅ useAuth Hook
4. ✅ authApi Client
5. ✅ PasswordInput Component
6. ✅ OAuthButtons Component
7. ✅ TwoFactorInput Component
8. ✅ LoginForm Component
9. ✅ RegisterForm Component
10. ✅ Login Page
11. ✅ Register Page
12. ✅ Verify-email Page
13. ✅ Forgot-password & Reset-password Pages
14. ✅ 2FA-setup Page
15. ✅ Route Protection Middleware
16. ✅ **E2E Tests (Playwright)**

### Pending (1/17):

17. ⏳ Final validation >80% coverage

## Commit

**Hash:** 189d8f4
**Message:** feat(e2e): implement auth flow E2E tests with Playwright
**Files:** 9 files changed, 1007 insertions(+), 15 deletions(-)
