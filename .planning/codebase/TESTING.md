# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

### Python Backend

**Runner:**
- `pytest` 8.3.0+
- Config: `apps/api/pyproject.toml` (section `[tool.pytest.ini_options]`)

**Assertion Library:**
- Built-in `assert` statements (pytest native)

**Async Support:**
- `pytest-asyncio` 0.24.0+
- Mode: `asyncio_mode = "auto"` (all async tests run automatically)
- All async test functions are `async def test_...`

**Run Commands:**
```bash
# Run all tests
cd apps/api && uv run pytest

# Watch mode (requires pytest-watch)
cd apps/api && uv run pytest --looponfail

# Coverage report
cd apps/api && uv run pytest --cov=prosell --cov-report=html
```

**Config (from `pyproject.toml`):**
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
addopts = "-v --tb=short"
```

### Frontend Tests

**Runner:**
- `vitest` 2.1.0+
- Config: `apps/web/vitest.config.ts`

**Assertion Library:**
- `@testing-library/jest-dom` (for DOM assertions)
- Built-in vitest `expect()` (same as Jest)

**Testing Library:**
- `@testing-library/react` 16.1.0+ (for component testing)
- `@testing-library/user-event` (for realistic user interactions)

**Run Commands:**
```bash
# Run all tests
cd apps/web && pnpm test

# Watch mode
cd apps/web && pnpm test --watch

# UI mode (opens browser)
cd apps/web && pnpm test:ui

# Coverage report
cd apps/web && pnpm test:coverage
```

**Config (from `vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
    },
  },
});
```

### E2E Tests

**Framework:**
- Playwright 1.49.0+
- Config: `playwright.config.ts` (at project root)

**Run Commands:**
```bash
# Run all E2E tests
cd tests/e2e && pnpm test

# Watch mode
cd tests/e2e && pnpm test --watch

# UI mode
cd tests/e2e && pnpm test --ui
```

---

## Test File Organization

### Python Test Structure

**Location Pattern:**
- Unit tests: `apps/api/tests/unit/`
- Integration tests: `apps/api/tests/integration/`
- Test files mirror source structure

**Example Structure:**
```
apps/api/tests/
├── unit/
│   ├── application/
│   │   ├── facebook/
│   │   │   └── test_facebook_use_cases.py
│   │   ├── test_organization_use_cases.py
│   │   └── test_team_use_cases.py
│   ├── infrastructure/
│   │   ├── middleware/
│   │   │   └── test_auth_middleware.py
│   │   └── tasks/
│   │       ├── test_broker.py
│   │       └── test_circuit_breaker.py
│   └── services/
│       └── test_do_spaces_service.py
├── integration/
│   ├── test_facebook_oauth_integration.py
│   ├── test_organization_api.py
│   ├── tasks/
│   │   └── test_circuit_breaker_integration.py
│   └── i18n/
│       └── test_translator.py
└── conftest.py
```

**Naming Convention:**
- `test_*.py` or `*_test.py` (project uses `test_*.py`)
- Example: `test_facebook_use_cases.py`, `test_auth_middleware.py`

### Frontend Test Structure

**Location Pattern:**
- Component tests: `apps/web/tests/components/`
- Unit tests: `apps/web/tests/unit/`
- Integration/page tests: `apps/web/tests/app/`

**Example Structure:**
```
apps/web/tests/
├── components/
│   ├── auth/
│   │   ├── LoginForm.test.tsx
│   │   ├── RegisterForm.test.tsx
│   │   ├── PasswordInput.test.tsx
│   │   └── OAuthButtons.test.tsx
│   ├── ui/
│   │   ├── OptimizedList.test.tsx
│   │   └── WalletCard.test.tsx
│   └── forms/
│       ├── OrganizationForm.test.tsx
│       └── TeamForm.test.tsx
├── unit/
│   ├── hooks/
│   │   └── useAuth.test.ts
│   ├── stores/
│   │   ├── authStore.test.ts
│   │   └── featureFlagStore.test.ts
│   └── api/
│       └── authApi.test.ts
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.test.tsx
│   │   └── verify-email/
│   │       └── page.test.tsx
├── setup.ts
└── middleware.test.ts
```

**Naming Convention:**
- `*.test.ts` or `*.test.tsx` or `*.spec.ts`
- Example: `LoginForm.test.tsx`, `authStore.test.ts`

### E2E Test Structure

**Location:** `tests/e2e/`

**Example Structure:**
```
tests/e2e/
├── auth/
│   ├── login.spec.ts
│   ├── register.spec.ts
│   ├── login-page.ts
│   ├── register-page.ts
│   └── forgot-password.spec.ts
├── dashboard/
│   ├── org/
│   │   ├── organizations.spec.ts
│   │   ├── teams.spec.ts
│   │   └── wallet.spec.ts
├── helpers.ts
├── fixtures/
│   └── users.ts
└── playwright.config.ts
```

**Naming Convention:**
- `*.spec.ts` for Playwright tests
- Page Objects (POMs): `*-page.ts`
- Example: `login.spec.ts`, `login-page.ts`

---

## Test Structure

### Python Test Class Organization

**Pattern (from `test_auth_middleware.py`):**
```python
"""Unit tests for auth_middleware.py — cookie-based JWT verification."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def mock_jwt_service():
    return MagicMock()

def make_request(cookies: dict) -> MagicMock:
    """Build a mock FastAPI Request with the given cookies dict."""
    request = MagicMock()
    request.cookies = cookies
    return request

# =============================================================================
# Test Classes (one per function or closely related group)
# =============================================================================

class TestGetCurrentUser:
    """Tests for get_current_user function."""

    async def test_valid_access_cookie_returns_payload(self, mock_jwt_service):
        """Should return JWT payload when valid token is in cookie."""
        request = make_request({"access_token": "valid.jwt.token"})
        mock_jwt_service.verify_token.return_value = {
            "sub": "user-123",
            "type": "access",
        }

        result = await get_current_user(request, mock_jwt_service)

        assert result["sub"] == "user-123"
        mock_jwt_service.verify_token.assert_called_once_with("valid.jwt.token")

    async def test_missing_cookie_raises_401(self, mock_jwt_service):
        """Should raise HTTPException with status 401 when cookie missing."""
        request = make_request({})

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request, mock_jwt_service)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"
```

**Key Patterns:**
- `# ===` comments to organize sections
- Test classes group related tests (one per function)
- Docstrings explain what is being tested and why
- Fixtures at top with `@pytest.fixture` decorator
- Helper functions (e.g., `make_request()`) follow fixtures

### TypeScript Test Structure

**Pattern (from `LoginForm.test.tsx`):**
```typescript
/**
 * TDD: LoginForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// MOCKS
// =============================================================================

const mockLogin = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

// Import after mocking
import { useAuth } from "@/hooks/useAuth";

// =============================================================================
// TEST SUITE
// =============================================================================

describe("LoginForm Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockLogin.mockResolvedValue(undefined);
    mockLogin.mockClear();
    mockClearError.mockClear();
  });

  describe("Basic Rendering", () => {
    it("should render email input", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/^Email$/)).toBeInTheDocument();
    });

    it("should render password input", () => {
      render(<LoginForm />);

      const passwordLabel = screen.getByText("Password");
      expect(passwordLabel).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call login with credentials on form submit", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText(/^Email$/), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });
});
```

**Key Patterns:**
- `describe()` blocks organize related tests
- `it()` describes each test case with clear intent
- Setup/teardown with `beforeEach()` and `afterEach()`
- Mocks set up before imports (hoisted due to vitest)
- Import mocked modules after mock setup

### Zustand Store Tests

**Pattern (from `authStore.test.ts`):**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Create test store with skipHydration to avoid act() warnings
const createTestAuthStore = () =>
  create<AuthState>()(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        error: null,
        initialized: false,

        login: async (credentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.login(
              credentials.email,
              credentials.password,
            );
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (unknownError) {
            // Error handling
          }
        },
      }),
      {
        name: "auth-storage",
        skipHydration: true, // Key: prevents async hydration on mount
      },
    ),
  );

const useAuthStore = createTestAuthStore();

// Setup and cleanup
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useAuthStore.getState().reset();
});

afterEach(() => {
  useAuthStore.getState().reset();
  localStorage.clear();
  cleanup();
});

describe("authStore - Login Action", () => {
  it("should set user on successful login", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password123",
    });

    const state = useAuthStore.getState();
    expect(state.user).not.toBeNull();
    expect(state.isAuthenticated).toBe(true);
  });
});
```

**Key Patterns:**
- Create isolated test store instance per test suite
- Use `skipHydration: true` to avoid async hydration warnings
- Clear localStorage in `afterEach()`
- Call `vi.clearAllMocks()` in setup/teardown
- Use `getState()` to access store state in tests

### E2E Test Structure

**Pattern (from `login.spec.ts`):**
```typescript
/**
 * Login E2E Tests
 *
 * Tests for user login flow including form validation,
 * authentication, and error handling.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { LoginPage } from "./login-page";
import { getExistingUser, generateTestUser } from "../helpers";

test.describe("Login", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe("Page Layout", () => {
    test(
      "should display login page elements correctly",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-001"] },
      async ({ page }) => {
        await expect(loginPage.heading).toBeVisible();
        await expect(loginPage.emailInput).toBeVisible();
        await expect(loginPage.submitButton).toBeVisible();
      },
    );

    test(
      "should pass accessibility checks",
      { tag: ["@e2e", "@login", "@a11y", "@LOGIN-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({
          page,
        }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      },
    );
  });

  test.describe("Form Validation", () => {
    test(
      "should show validation error for empty email",
      { tag: ["@e2e", "@login", "@validation", "@LOGIN-E2E-004"] },
      async ({ page }) => {
        await loginPage.fillPassword("password123");
        await loginPage.clickSubmit();

        const emailError = page.getByText(/email is required/i);
        await expect(emailError).toBeVisible();
      },
    );
  });
});
```

**Key Patterns:**
- Page Objects (POMs) encapsulate element selectors and navigation
- Test tags for filtering (`@e2e`, `@login`, `@a11y`)
- Test IDs in tags (`@LOGIN-E2E-001`)
- `test.describe()` groups related tests
- `test.beforeEach()` for setup
- Accessibility testing via Axe integration
- Use `expect()` with Playwright matchers

### Page Object Pattern

**Pattern (from `login-page.ts`):**
```typescript
import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  get heading() {
    return this.page.getByRole("heading", { name: /sign in/i });
  }

  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get submitButton() {
    return this.page.getByRole("button", { name: /sign in/i });
  }

  get googleButton() {
    return this.page.getByRole("button", { name: /google/i });
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }
}
```

**Key Patterns:**
- Encapsulate element selectors as getters
- Provide action methods (`fillEmail()`, `clickSubmit()`)
- Page object reused across multiple test cases
- Selectors use `getByRole()` > `getByLabel()` > `getByTestId()` > `getByText()`

---

## Mocking Patterns

### Python Mocking

**Framework:** `unittest.mock`

**Basic Pattern (from `test_auth_middleware.py`):**
```python
from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def mock_jwt_service():
    return MagicMock()

# In test
mock_jwt_service.verify_token.return_value = {"sub": "user-123"}
mock_jwt_service.verify_token.assert_called_once_with("token")
```

**Async Mocking (from `test_facebook_oauth_integration.py`):**
```python
mock_redis_service = MagicMock()
mock_redis_service.set = AsyncMock()  # Mark async methods with AsyncMock
mock_redis_service.get = AsyncMock(return_value=str(uuid4()))

# In test
await mock_redis_service.set("key", "value")
mock_redis_service.set.assert_called_once_with("key", "value")
```

**What to Mock:**
- External services (email, SMS, payments)
- Database repositories (use mocks in unit tests)
- HTTP clients
- Redis/cache services

**What NOT to Mock:**
- Domain entities and value objects
- Domain exceptions
- Pydantic validation
- Built-in Python functions

### TypeScript Mocking

**Framework:** `vitest.mock()`

**Basic Pattern (from `LoginForm.test.tsx`):**
```typescript
const mockLogin = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  })),
}));

// In test
mockLogin.mockResolvedValue(undefined);
expect(mockLogin).toHaveBeenCalledWith(expectedArgs);
```

**Async Mocking (from `authStore.test.ts`):**
```typescript
vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

await useAuthStore.getState().login({ email, password });

expect(useAuthStore.getState().user).not.toBeNull();
```

**Mock Reset Pattern:**
```typescript
beforeEach(() => {
  mockLogin.mockClear();        // Clear call history
  mockLogin.mockResolvedValue(undefined);  // Reset return value
  vi.clearAllMocks();            // Clear all mocks
});

afterEach(() => {
  cleanup();                     // Clean up DOM
  vi.clearAllMocks();            // Clear mock state
});
```

**What to Mock:**
- API calls (`authApi`, `organizationApi`)
- Custom hooks
- Next.js components
- External libraries (when testing integration)

**What NOT to Mock:**
- Testing Library functions (`render`, `screen`)
- Zustand store logic itself
- React components being tested
- Browser APIs like `localStorage` (unless testing behavior)

---

## Fixtures and Test Data

### Python Fixtures

**Location:** `apps/api/tests/unit/` and `apps/api/tests/integration/conftest.py`

**Pattern (from `test_facebook_use_cases.py`):**
```python
@pytest.fixture
def seller_user_id() -> str:
    """Return a test seller user ID."""
    return str(uuid4())

@pytest.fixture
def facebook_account() -> FacebookAccount:
    """Return a test Facebook account."""
    return FacebookAccount(
        id=str(uuid4()),
        seller_user_id=str(uuid4()),
        facebook_user_id="123456789",
        access_token_encrypted="encrypted_token",
        token_expires_at=None,
        status=FacebookAccountStatus.ACTIVE,
        scopes=["pages_manage_posts"],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

@pytest.fixture
def facebook_page() -> FacebookPage:
    """Return a test Facebook page."""
    return FacebookPage(
        id=str(uuid4()),
        facebook_account_id=str(uuid4()),
        page_id="987654321",
        page_name="Test Dealership",
        # ...
    )
```

**Fixture Scope:**
- `function` (default): New instance per test
- `module`: One instance per module
- `session`: One instance for entire test session

**Global Fixtures (conftest.py):**
```python
@pytest.fixture(autouse=True)
def disable_rate_limiting(monkeypatch):
    """Disable rate limiting during integration tests."""
    from prosell.infrastructure.api.middleware.rate_limit_middleware import limiter

    if hasattr(limiter, "enabled"):
        monkeypatch.setattr(limiter, "enabled", False)
```

### TypeScript Test Data

**Pattern (from `authStore.test.ts`):**
```typescript
const createMockUserResponse = (overrides = {}) => ({
  user: {
    id: "1",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    role: "sales_agent",
    is_email_verified: true,
    ...overrides,
  },
});

// In test
vi.mocked(authApi.login).mockResolvedValue(
  createMockUserResponse({ email: "persist@example.com" })
);
```

**Mock HTTP Responses:**
```typescript
// From test setup
export const getExistingUser = async () => {
  // Return pre-existing test user
  return {
    id: "existing-user-id",
    email: "existing@example.com",
    // ...
  };
};

export const generateTestUser = () => {
  // Generate new test user with unique credentials
  return {
    id: uuid(),
    email: `test-${Date.now()}@example.com`,
    password: "SecurePassword123!",
  };
};
```

---

## Coverage

### Requirements

**Python:**
- Target: Maintain above 80% line coverage
- Track via: `pytest --cov=prosell`
- Reports: `coverage/index.html` generated in CI

**TypeScript:**
- Target: Above 75% for critical paths
- Track via: `pnpm test:coverage`
- Reports: `coverage/` directory

### View Coverage

**Python:**
```bash
cd apps/api
uv run pytest --cov=prosell --cov-report=html
open htmlcov/index.html
```

**TypeScript:**
```bash
cd apps/web
pnpm test:coverage
open coverage/index.html
```

---

## Test Types

### Unit Tests

**Scope:**
- Test single function or class in isolation
- Mock all external dependencies
- No database, no HTTP, no file I/O

**Location:**
- Python: `apps/api/tests/unit/`
- TypeScript: `apps/web/tests/unit/`

**Examples:**
- `test_auth_middleware.py` — middleware logic
- `authStore.test.ts` — Zustand store state management
- `useAuth.test.ts` — custom hook logic

**Pattern:**
```python
async def test_valid_access_cookie_returns_payload(self, mock_jwt_service):
    """Single assertion per test, mocks all dependencies."""
    request = make_request({"access_token": "valid.jwt.token"})
    mock_jwt_service.verify_token.return_value = {"sub": "user-123"}

    result = await get_current_user(request, mock_jwt_service)

    assert result["sub"] == "user-123"
```

### Integration Tests

**Scope:**
- Test multiple layers together (use case + repository + service)
- Mock external services (Redis, S3, email)
- Real database (via test database)
- Real FastAPI dependency injection

**Location:**
- Python: `apps/api/tests/integration/`
- TypeScript: E2E tests are the integration test layer

**Examples:**
- `test_facebook_oauth_integration.py` — Full OAuth endpoint flow
- `test_organization_api.py` — API endpoint with database

**Pattern (from `test_facebook_oauth_integration.py`):**
```python
@pytest.fixture
def mock_redis_service() -> MagicMock:
    """Mock Redis service for state token storage."""
    redis = MagicMock()
    redis.set = AsyncMock()
    redis.get = AsyncMock(return_value=str(uuid4()))
    return redis

async def test_oauth_authorize_flow(mock_redis_service, mock_facebook_service):
    """Test full OAuth authorize endpoint with mocked external services."""
    # Override dependencies
    app.dependency_overrides[get_redis_service] = lambda: mock_redis_service
    app.dependency_overrides[get_facebook_service] = lambda: mock_facebook_service

    # Make HTTP request to actual endpoint
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/oauth/authorize?provider=facebook")

    assert response.status_code == 200
    mock_redis_service.set.assert_called_once()
```

### E2E Tests

**Scope:**
- Test entire user workflow (UI → API → Database)
- Real database and API
- Real browser automation
- No mocking (except external services like payment)

**Location:**
- `tests/e2e/`

**Examples:**
- `login.spec.ts` — Full login flow (UI form → API → redirect)
- `organizations.spec.ts` — Create organization workflow

**Pattern (from `login.spec.ts`):**
```typescript
test.describe("Login", () => {
  test("should login user with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = await getExistingUser();

    await loginPage.goto();
    await loginPage.fillEmail(user.email);
    await loginPage.fillPassword(user.password);
    await loginPage.clickSubmit();

    // Verify redirect and dashboard loaded
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });
});
```

---

## Common Patterns

### Async Testing (Python)

**Pattern (from `test_facebook_use_cases.py`):**
```python
import pytest

class TestOAuthCallbackUseCase:
    @pytest.mark.asyncio  # Optional with asyncio_mode=auto
    async def test_successful_oauth_callback(self):
        """Test async use case execution."""
        # Setup
        use_case = OAuthCallbackUseCase(
            user_repo=mock_user_repo,
            account_repo=mock_account_repo,
        )
        request = FacebookOAuthCallbackRequest(
            code="test_code",
            state="test_state",
        )

        # Execute
        result = await use_case.execute(request)

        # Assert
        assert result.user.id is not None
        assert result.account.status == FacebookAccountStatus.ACTIVE
```

**Key Points:**
- Use `async def` for test function
- Use `await` for async operations
- `@pytest.mark.asyncio` optional with `asyncio_mode = "auto"`
- Always await use case execution

### Error Testing (Python)

**Pattern (from `test_auth_middleware.py`):**
```python
async def test_invalid_token_raises_401(self, mock_jwt_service):
    """Should raise HTTPException when token is invalid."""
    request = make_request({"access_token": "invalid.token"})
    mock_jwt_service.verify_token.side_effect = ValueError("Token expired")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, mock_jwt_service)

    assert exc_info.value.status_code == 401
    assert "Token expired" in exc_info.value.detail
```

### Error Testing (TypeScript)

**Pattern (from `authStore.test.ts`):**
```typescript
it("should set error on login failure", async () => {
  vi.mocked(authApi.login).mockRejectedValue(
    new ApiError("Invalid credentials", 401),
  );

  await useAuthStore.getState().login({
    email: "wrong@example.com",
    password: "wrongpassword",
  });

  const state = useAuthStore.getState();
  expect(state.user).toBeNull();
  expect(state.error).not.toBeNull();
  expect(state.error?.message).toContain("Invalid credentials");
});
```

### DOM Interaction Testing

**Pattern (from `LoginForm.test.tsx`):**
```typescript
it("should submit form with user input", async () => {
  const user = userEvent.setup();  // Realistic user events
  render(<LoginForm />);

  // Type into fields
  await user.type(
    screen.getByLabelText(/^Email$/),
    "test@example.com"
  );
  await user.type(
    screen.getByLabelText("Password"),
    "password123"
  );

  // Click submit
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  // Assert
  expect(mockLogin).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
});
```

**Key Points:**
- Use `userEvent` (not `fireEvent`) for realistic interactions
- Query by accessible attributes: `getByRole()` > `getByLabel()` > `getByTestId()`
- Wait for async updates with `waitFor()`

---

## Test Configuration Files

**Python:**
- `apps/api/pyproject.toml` - pytest config and dependencies

**TypeScript:**
- `apps/web/vitest.config.ts` - vitest config
- `apps/web/tests/setup.ts` - global setup (mocks ResizeObserver, etc.)

**E2E:**
- `tests/e2e/playwright.config.ts` - Playwright config
- `tests/e2e/helpers.ts` - Shared test data functions

---

*Testing analysis: 2026-03-14*
