# PRP: Code Review Fixes — Sprint 1-2 Auth System

> **Priority**: P0 | **Estimate**: 2 days | **Sprint**: Hotfix post-review
> **Created**: 2026-03-02 | **Status**: Draft
> **Reviewer**: superpowers:code-reviewer | **Source commit range**: b6bf601..40d596d

---

## 1. Overview

### 1.1 Summary

The Sprint 1-2 code review identified **5 critical bugs** and **5 important issues** in the auth system. This PRP covers ALL fixes in priority order. The most severe issue is that `auth_middleware.py` reads JWT from the `Authorization` header instead of the `access_token` httpOnly cookie — this means ALL protected backend endpoints are unreachable from the browser frontend.

### 1.2 Fix Inventory

**CRITICAL (must fix before any release):**
- **C1** — `auth_middleware.py`: JWT extracted from Bearer header, not cookie → all protected endpoints broken
- **C2** — `authApi.ts` + `authStore.ts`: `register()` sets `isAuthenticated: true` despite backend returning no tokens
- **C3** — `PasswordInput.tsx`: uses deprecated `forwardRef` (React 19 violation)
- **C4** — `/api/auth/state/route.ts`: trusts unsigned `user_data` cookie without JWT verification
- **C5** — `authStore.initializeAuth`: error sets `initialized: false` → infinite retry loop

**IMPORTANT (should fix before merge to main):**
- **I1** — `authApi.ts`: `verifyEmail`, `forgotPassword`, `resetPassword`, `enable2FA`, `disable2FA` are mutations but are cached
- **I2** — `RegisterForm.tsx`: `nameSplitCache` IIFE created inside component body (new Map on every render)
- **I3** — `RegisterForm.tsx`: dead code — `errorFields` array and `trigger` destructure never used
- **I4** — `oauth-login-button.tsx`: duplicate OAuth redirect with wrong path (`/api/v1/auth/oauth/`) vs correct path (`/api/auth/oauth/`) in `OAuthButtons.tsx` — consolidate
- **I5** — `RegisterForm.tsx`: `mode: "all"` validates on every keystroke — use `mode: "onTouched"` for UX consistency

### 1.3 Out of Scope

- Tailwind CSS v3.4 → v4 upgrade (separate sprint, breaking changes)
- Adding `featureFlagStore` indirection to `authStore` (architectural refactor, separate PRP)

### 1.4 Dependencies (Implementation Order)

```
C1 (backend middleware) → C4 (state route JWT verify)
C2a (authApi register type) → C2b (authStore register action) → C2c (RegisterForm redirect)
C3 (PasswordInput) → independent
C5 (initializeAuth error) → independent
I1..I5 → all independent
```

---

## 2. Technical Context

### 2.1 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend middleware | FastAPI + python-jose | 0.115+ |
| Frontend store | Zustand | 5.x |
| Frontend forms | React Hook Form + Zod | 7.x + 4.x |
| Frontend components | React 19 (ref as prop) | 19.2 |
| Auth cookies | httpOnly, SameSite=Lax (OAuth) / Strict (regular) | - |

### 2.2 Key Files

```
# Backend
apps/api/src/prosell/infrastructure/api/middleware/auth_middleware.py  ← C1
apps/api/src/prosell/application/dto/auth/register.py                  ← context only

# Frontend API client
apps/web/src/lib/api/authApi.ts                                        ← C2a, I1

# Frontend store
apps/web/src/stores/authStore.ts                                       ← C2b, C5

# Frontend components
apps/web/src/components/auth/PasswordInput.tsx                         ← C3
apps/web/src/components/auth/RegisterForm.tsx                          ← C2c, I2, I3, I5
apps/web/src/components/auth/oauth-login-button.tsx                    ← I4 (delete)

# Next.js API routes
apps/web/src/app/api/auth/state/route.ts                               ← C4

# Tests to update
apps/web/tests/components/auth/PasswordInput.test.tsx
apps/web/tests/components/auth/RegisterForm.test.tsx
apps/api/tests/unit/infrastructure/middleware/test_auth_middleware.py
```

### 2.3 Backend RegisterUserResponse (actual contract)

```python
# apps/api/src/prosell/application/dto/auth/register.py
class RegisterUserResponse(BaseModel):
    user_id: UUID
    email: str
    status: str
    message: str
    # NOTE: NO user object, NO tokens — user must verify email before login
```

### 2.4 Existing Pattern: Cookie-based auth in FastAPI (reference)

The login endpoint already sets cookies correctly:
```python
# apps/api/src/prosell/infrastructure/api/routers/auth_router.py:~162
response.set_cookie(key="access_token", value=..., httponly=True, secure=True, samesite="strict")
response.set_cookie(key="refresh_token", value=..., httponly=True, secure=True, samesite="strict")
response.set_cookie(key="user_data", value=quote(result.user.model_dump_json()), httponly=True, ...)
```

The middleware should read from `request.cookies.get("access_token")` — same pattern as the OAuth callback which already reads from cookies.

### 2.5 React 19 ref-as-prop Pattern

In React 19, `ref` is a regular prop. Do NOT use `forwardRef`. The shadcn/ui library components (`input.tsx`, `button.tsx`) still use `forwardRef` internally — that's library code we don't control. Our own components must use the React 19 pattern.

```tsx
// ✅ React 19 — ref as prop
import { type ComponentPropsWithRef } from "react";

interface Props extends ComponentPropsWithRef<"input"> { ... }

export function MyInput({ ref, ...props }: Props) {
  return <input ref={ref} {...props} />;
}

// ❌ Deprecated in React 19
export const MyInput = forwardRef<HTMLInputElement, Props>((props, ref) => { ... });
```

---

## 3. Implementation Blueprint

### Step 1 — C1: Fix `auth_middleware.py` (BLOCKER — fix first)

**File**: `apps/api/src/prosell/infrastructure/api/middleware/auth_middleware.py`

**Problem**: Uses `HTTPBearer()` which reads `Authorization: Bearer <token>` header. The browser never sends this header — tokens are in httpOnly cookies.

**Fix**:
```python
# BEFORE
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any]:
    payload = jwt_service.verify_token(credentials.credentials)
    ...

# AFTER — read from cookie
from fastapi import Request

async def get_current_user(
    request: Request,
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any]:
    """Extract JWT from access_token httpOnly cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt_service.verify_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        return payload
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e


async def get_optional_user(
    request: Request,
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any] | None:
    """Optional JWT verification — returns None if no cookie present."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt_service.verify_token(token)
        if payload.get("type") == "access":
            return payload
    except ValueError:
        pass
    return None
```

**Gotcha**: Remove `HTTPBearer` and `HTTPAuthorizationCredentials` imports entirely. Remove `security = HTTPBearer()` module-level variable. The `Request` import is from `fastapi`, not `starlette`.

**Update tests**: `apps/api/tests/unit/infrastructure/middleware/test_auth_middleware.py` — mock `request.cookies` instead of credentials object.

---

### Step 2 — C4: Fix `/api/auth/state/route.ts` (depends on C1)

**File**: `apps/web/src/app/api/auth/state/route.ts`

**Problem**: Trusts the `user_data` cookie (unsigned JSON) to determine auth state. A tampered cookie would be accepted.

**Fix**: Forward cookies to the backend's `/api/auth/me` endpoint, which verifies the JWT:

```typescript
export async function GET(): Promise<NextResponse<AuthStateResponse>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    // Fast path: no access_token cookie → not authenticated
    if (!accessToken) {
      return NextResponse.json({ isAuthenticated: false });
    }

    // Forward all cookies to backend for JWT verification
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const apiUrl = process.env.API_URL ?? "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      // No cache — auth state must be fresh
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ isAuthenticated: false });
    }

    const user = await response.json();
    return NextResponse.json({ isAuthenticated: true, user });
  } catch (error) {
    after(() => logger.error("Error getting auth state", error));
    return NextResponse.json({ isAuthenticated: false });
  }
}
```

**Gotcha**: The `API_URL` env var is server-side only (no `NEXT_PUBLIC_` prefix). Add to `docker-compose.yml` and `.env.local`:
```bash
API_URL=http://api:8000  # docker compose service
# or for local dev:
API_URL=http://localhost:8000
```

**Also**: The `/api/auth/me` backend endpoint now returns a `MeResponse` with `{ id, roles }`. We need the full user data for the auth state. Two options:
- Option A: Call `/api/auth/state` backend endpoint (returns `AuthStateResponse` with full user)
- Option B: Keep calling `/api/auth/me` and supplement with `user_data` cookie for non-sensitive display data

**Recommended (Option A)**: Call the backend's `/api/auth/state` endpoint which already returns the full `AuthStateResponse`. The backend verifies the JWT internally.

```typescript
const response = await fetch(`${apiUrl}/api/auth/state`, {
  headers: { Cookie: cookieHeader },
  cache: "no-store",
});
```

---

### Step 3 — C2: Fix Registration Flow

**C2a — Fix `authApi.ts` register return type**

**File**: `apps/web/src/lib/api/authApi.ts`

```typescript
// Add correct response type
interface RegisterResponse {
  user_id: string;
  email: string;
  status: string;
  message: string;
}

// Fix register method signature
async register(
  email: string,
  password: string,
  first_name: string,
  last_name: string,
): Promise<RegisterResponse> {
  // ... same fetch logic ...
  const result = await handleResponse<RegisterResponse>(response);

  // Mutations should NOT cache, and user_id is not a UserResponse
  // Remove: userLookupCache.set(result.user.id, result.user) — user field doesn't exist
  return result;
},
```

**C2b — Fix `authStore.ts` register action**

```typescript
register: async (data: RegisterData) => {
  if (!EMAIL_REGEX.test(data.email)) {
    set({ isLoading: false, error: { message: "Invalid email format" } });
    return;
  }

  set({ isLoading: true, error: null });

  try {
    await authApi.register(
      data.email,
      data.password,
      data.first_name,
      data.last_name,
    );

    // Registration DOES NOT authenticate the user — email verification required
    // Set loading: false, keep isAuthenticated: false, keep user: null
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: false,   // Not initialized — user must verify email then login
      error: null,
    });

    // Navigation to verify-email page is handled by the form component
    // (authStore should not import router)
  } catch (unknownError) {
    const message = unknownError instanceof ApiError
      ? unknownError.message
      : unknownError instanceof Error
        ? unknownError.message
        : "Registration failed";

    set({ isLoading: false, error: { message } });
  }
},
```

**C2c — Fix `RegisterForm.tsx` post-register redirect**

After calling `register()`, check if there's no error and redirect to verify-email:

```tsx
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  const onSubmit = async (data: RegisterFormValues) => {
    if (isDisabled) return;
    const { firstName, lastName } = splitName(data.fullName);
    await registerUser(data.email.trim(), data.password, firstName, lastName);
    // After successful registration (no error), redirect to verify-email
    // The check uses the store state — if no error was set, registration succeeded
  };

  // Watch for successful registration via useEffect
  useEffect(() => {
    if (!isLoading && !error && /* was just registering */ ...) {
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    }
  }, [isLoading, error]);
}
```

**Better pattern**: Track "just submitted" with a local ref to avoid false redirects on initial render:

```tsx
const justSubmitted = useRef(false);

const onSubmit = async (data: RegisterFormValues) => {
  justSubmitted.current = true;
  await registerUser(...);
};

useEffect(() => {
  if (justSubmitted.current && !isLoading && !error) {
    justSubmitted.current = false;
    router.push("/auth/verify-email");
  }
}, [isLoading, error, router]);
```

---

### Step 4 — C3: Fix `PasswordInput.tsx` — Remove forwardRef

**File**: `apps/web/src/components/auth/PasswordInput.tsx`

```tsx
// BEFORE
import { useState, useEffect, forwardRef, type InputHTMLAttributes } from "react";

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, ref, ...props }, ref) => {
    ...
    return <Input ref={ref} ... />;
  }
);
PasswordInput.displayName = "PasswordInput";

// AFTER — React 19: ref is a regular prop
import { useState, useEffect, type ComponentPropsWithRef } from "react";

// Keep PasswordInputProps but add ref from ComponentPropsWithRef
export interface PasswordInputProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type" | "onChange" | "value"
> {
  label: string;
  error?: string | null;
  showStrength?: boolean;
  onClearError?: () => void;
  value?: string;
  onChange?: (value: string) => void;
}

// Named function export (no forwardRef wrapper)
export function PasswordInput({
  label,
  name,
  placeholder,
  error = null,
  showStrength = false,
  onClearError,
  disabled = false,
  required = false,
  value: controlledValue,
  onChange,
  onBlur,
  className,
  ref,  // ← ref as a regular prop
  ...props
}: PasswordInputProps) {
  // ... same implementation ...
  return (
    <Input
      {...props}
      ref={ref}  // ← pass ref directly
      ...
    />
  );
}
```

**Gotcha**: The `Input` component from shadcn/ui still uses `forwardRef` internally — that's fine, it still accepts a `ref` prop. We just don't need `forwardRef` in our code.

**Note on displayName**: No longer needed since we export a named function. Remove `PasswordInput.displayName = "PasswordInput"`.

**Update tests**: Check if any test uses `createRef` + `ref` prop on `PasswordInput` — those should still work.

---

### Step 5 — C5: Fix `authStore.initializeAuth` Error Handling

**File**: `apps/web/src/stores/authStore.ts`

```typescript
// BEFORE (in catch block)
} catch (error) {
  logger.error("Failed to initialize auth state", error);
  set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    initialized: false, // ← BUG: causes infinite retry
    error: null,        // ← BUG: silenced
  });
}

// AFTER
} catch (error) {
  logger.error("Failed to initialize auth state", error);
  set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    initialized: true,  // ← Prevent retry loop
    error: {
      message: error instanceof Error ? error.message : "Failed to check authentication status",
    },
  });
}
```

---

### Step 6 — I1: Remove Cache from Mutations in `authApi.ts`

**File**: `apps/web/src/lib/api/authApi.ts`

These methods are **state-changing operations** and must NEVER be cached:
- `verifyEmail` — token is consumed server-side after first use
- `forgotPassword` — triggers email send, must always hit the API
- `resetPassword` — token is consumed, password changes on backend

```typescript
// Remove ALL of this pattern from verifyEmail, forgotPassword, resetPassword:

// ❌ Remove cache key logic
const cacheKey = createAuthCacheKey("verify-email", { token });
const cached = requestCache.get(cacheKey);
if (cached) return cached as MessageResponse;

// ❌ Remove cache set
requestCache.set(cacheKey, result);

// ✅ Keep only the fetch + handleResponse
async verifyEmail(token: string): Promise<MessageResponse> {
  if (!token || token.trim() === "") throw new ApiError("Token is required", 400);

  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return handleResponse<MessageResponse>(response);
},
```

Also remove caching from `enable2FA` and `disable2FA` — these generate/revoke TOTP secrets:
```typescript
// enable2FA generates a new QR code each time — should not be cached
// disable2FA is a mutation — should not be cached
```

---

### Step 7 — I2 + I3: Clean Up `RegisterForm.tsx`

**File**: `apps/web/src/components/auth/RegisterForm.tsx`

**I2 — Move nameSplitCache to module level**:
```typescript
// ✅ Module level — persists across renders
const nameSplitCache = new Map<string, { firstName: string; lastName: string }>();

function splitName(fullName: string): { firstName: string; lastName: string } {
  const cached = nameSplitCache.get(fullName);
  if (cached) return cached;

  const trimmed = fullName.trim();
  const parts = trimmed.split(" ");
  const result = { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
  nameSplitCache.set(fullName, result);
  return result;
}
```

**I3 — Remove dead code**:
```typescript
// ❌ Remove these entirely:
const errorFields = ["fullName", "email", "password", "confirmPassword", "acceptTerms"];
const { control, handleSubmit, trigger, register: registerInput, ... } = useForm(...);
//                              ↑ remove trigger from destructure if unused
```

**I5 — Fix validation mode**:
```typescript
// BEFORE
mode: "all",  // ← validates on every keystroke, shows errors immediately

// AFTER
mode: "onTouched",  // ← validates after field is touched/blurred (consistent with LoginForm)
```

---

### Step 8 — I4: Delete `oauth-login-button.tsx`

**File**: `apps/web/src/components/auth/oauth-login-button.tsx`

This component uses `/api/v1/auth/oauth/{provider}/authorize` (wrong path with `/v1/`). The correct path is `/api/auth/oauth/{provider}/authorize` (used in `OAuthButtons.tsx`).

```bash
# Check if oauth-login-button is imported anywhere
grep -rn "oauth-login-button" apps/web/src/
```

If no imports found → **delete the file**. If imported somewhere → replace with `OAuthButtons` usage.

---

## 4. Code Patterns & Examples

### 4.1 Backend: Reading Cookies in FastAPI Dependency

```python
# Reference: Similar pattern in oauth_callback endpoint (auth_router.py)
# The OAuth middleware already reads state from Redis using request data

from fastapi import Request, Depends

async def get_current_user(
    request: Request,
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    ...
```

### 4.2 Frontend: React 19 ref as Prop

```tsx
// Pattern used in new React 19 code
import { type ComponentPropsWithRef } from "react";

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "default" | "outline";
}

export function Button({ ref, variant = "default", ...props }: ButtonProps) {
  return <button ref={ref} {...props} />;
}
```

### 4.3 Frontend: Post-submit Redirect in Form

```tsx
// Pattern from other forms in the codebase
const router = useRouter();
const justSubmitted = useRef(false);

const onSubmit = async (data: FormValues) => {
  justSubmitted.current = true;
  await someAction(data);
};

useEffect(() => {
  if (justSubmitted.current && !isLoading && !error) {
    justSubmitted.current = false;
    router.push("/next-page");
  }
}, [isLoading, error, router]);
```

### 4.4 Zustand: Correct Error Handling Pattern

```typescript
// Pattern: initialized: true even on error prevents retry loops
} catch (error) {
  set({
    initialized: true,  // ← always true after first attempt
    isLoading: false,
    error: { message: error instanceof Error ? error.message : "Unknown error" },
  });
}
```

---

## 5. Validation Gates

### 5.1 Backend

```bash
cd apps/api

# Linting
uv run ruff check . --fix && uv run ruff format .

# Type checking
uv run pyright

# Unit tests (middleware specifically)
uv run pytest tests/unit/infrastructure/middleware/ -v

# All backend tests
uv run pytest tests/ -v --tb=short

# Integration tests
uv run pytest tests/integration/ -v
```

### 5.2 Frontend

```bash
cd apps/web

# Type checking (critical — must pass with zero errors)
pnpm typecheck

# Linting
pnpm lint

# Unit + component tests
pnpm test

# Run just auth-related tests
pnpm test -- --reporter=verbose tests/components/auth/ tests/unit/stores/ tests/unit/hooks/
```

### 5.3 Manual Verification Checklist

```
[ ] Login with email/password → reaches dashboard (no redirect loop)
[ ] Register → redirected to /auth/verify-email (NOT to dashboard)
[ ] Backend /api/auth/me → returns 200 with user data (not 403)
[ ] Backend /api/auth/2fa/enable → returns 200 (not 403)
[ ] Refresh page while logged in → stays logged in (state rehydrates)
[ ] PasswordInput: React DevTools shows no forwardRef wrapper
[ ] Network tab: register POST → response has user_id/email/status/message (no user object)
[ ] initializeAuth: server down → app shows error, no infinite fetch loop
[ ] verifyEmail with same token twice → second call hits the API (not cache)
```

---

## 6. Testing Strategy

### 6.1 Backend — auth_middleware tests

File: `apps/api/tests/unit/infrastructure/middleware/test_auth_middleware.py`

Tests to add/update:
```python
# Mock request.cookies instead of HTTPBearer credentials
async def test_get_current_user_with_valid_cookie(mock_jwt_service):
    request = MagicMock(spec=Request)
    request.cookies = {"access_token": "valid.jwt.token"}
    mock_jwt_service.verify_token.return_value = {"sub": "user-123", "type": "access"}
    result = await get_current_user(request, mock_jwt_service)
    assert result["sub"] == "user-123"

async def test_get_current_user_no_cookie_raises_401(mock_jwt_service):
    request = MagicMock(spec=Request)
    request.cookies = {}
    with pytest.raises(HTTPException) as exc:
        await get_current_user(request, mock_jwt_service)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Not authenticated"

async def test_get_optional_user_no_cookie_returns_none(mock_jwt_service):
    request = MagicMock(spec=Request)
    request.cookies = {}
    result = await get_optional_user(request, mock_jwt_service)
    assert result is None
```

### 6.2 Frontend — PasswordInput tests

File: `apps/web/tests/components/auth/PasswordInput.test.tsx`

Tests to verify (should not need changes, but verify still pass):
- `ref` forwarding test if exists — should still work
- All existing rendering tests — zero changes to component behavior

### 6.3 Frontend — authStore tests

File: `apps/web/tests/unit/stores/authStore.test.ts`

Tests to add:
```typescript
it("initializeAuth should set initialized: true on error (prevents retry loop)", async () => {
  server.use(rest.get("/api/auth/state", (req, res, ctx) =>
    res(ctx.status(500))
  ));
  await useAuthStore.getState().initializeAuth();
  const { initialized, error, isLoading } = useAuthStore.getState();
  expect(initialized).toBe(true);  // ← must be true
  expect(error).not.toBeNull();    // ← error must be surfaced
  expect(isLoading).toBe(false);
});

it("register should NOT set isAuthenticated: true", async () => {
  await useAuthStore.getState().register({
    email: "test@test.com",
    password: "Password1!",
    first_name: "Test",
    last_name: "User",
  });
  const { isAuthenticated } = useAuthStore.getState();
  expect(isAuthenticated).toBe(false);  // ← must be false
});
```

### 6.4 Frontend — RegisterForm tests

File: `apps/web/tests/components/auth/RegisterForm.test.tsx`

Tests to add:
```typescript
it("should redirect to verify-email after successful registration", async () => {
  const mockPush = vi.fn();
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

  // Mock successful registration
  server.use(rest.post("/api/auth/register", (req, res, ctx) =>
    res(ctx.json({ user_id: "uuid", email: "t@t.com", status: "pending", message: "Check your email" }))
  ));

  render(<RegisterForm />);
  // Fill and submit form
  await userEvent.type(screen.getByLabelText("Full Name"), "Test User");
  // ... fill other fields ...
  await userEvent.click(screen.getByRole("button", { name: /create account/i }));

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith("/auth/verify-email");
  });
});
```

---

## 7. Common Pitfalls

### 7.1 Backend: `Request` import conflict

```python
# WRONG — starlette Request
from starlette.requests import Request

# CORRECT — FastAPI Request (wraps starlette but has FastAPI DI integration)
from fastapi import Request
```

### 7.2 React 19 ref with shadcn/ui Input

```tsx
// The shadcn/ui Input component uses forwardRef internally.
// Passing ref to it still works — ref forwarding is handled inside the library component.
// Our job is to just NOT use forwardRef in OUR components.
<Input ref={ref} ... />  // ✅ This works — Input accepts ref via its own forwardRef
```

### 7.3 register() response type mismatch in tests

Any test that mocks `authApi.register()` and checks `authStore.user` after registration will fail because `user` should now be `null`. Update test mocks to return `RegisterResponse` shape:

```typescript
vi.mocked(authApi.register).mockResolvedValue({
  user_id: "uuid-123",
  email: "test@test.com",
  status: "pending_verification",
  message: "Check your email to verify your account",
});
```

### 7.4 C4: API_URL env var required

The state route now calls the backend. Both `API_URL` env var AND the backend running are required for auth state to work. Add to `docker-compose.yml`:
```yaml
services:
  web:
    environment:
      - API_URL=http://api:8000
```

And to `apps/web/.env.local` for local dev:
```
API_URL=http://localhost:8000
```

### 7.5 SameSite mismatch on logout

The logout endpoint in `auth_router.py` deletes cookies with `samesite="strict"` but OAuth login sets them with `samesite="lax"`. Verify the delete calls match the original set calls:

```python
# Check auth_router.py logout endpoint (~line 542)
# Cookies set via OAuth callback: samesite="lax"
# Cookies set via regular login: samesite="strict"
# → Add separate delete calls for each case, or standardize on "lax"
```

---

## 8. Implementation Order (Strict)

```
1. C1 — auth_middleware.py (backend, no deps)
2. C4 — state/route.ts (depends on C1 being deployed)
3. C5 — authStore.initializeAuth catch block (frontend, no deps)
4. C2a — authApi.ts register return type (frontend, no deps on C1)
5. C2b — authStore.ts register action (depends on C2a)
6. C2c — RegisterForm.tsx redirect (depends on C2b)
7. C3 — PasswordInput.tsx remove forwardRef (independent)
8. I1 — authApi.ts remove mutation caches (independent)
9. I2+I3+I5 — RegisterForm.tsx cleanups (independent)
10. I4 — delete oauth-login-button.tsx (independent, verify no imports first)
```

---

## 9. Rollback Plan

All changes are backwards-compatible except C1. If the backend middleware change breaks something:

1. Revert `auth_middleware.py` to HTTPBearer
2. Revert `state/route.ts` to user_data cookie parsing
3. Deploy — frontend still works (it was working before)

C2, C3, C4, C5 are all additive fixes with no breaking changes to the API contract.

---

## 10. Completion Checklist

- [ ] C1: `auth_middleware.py` reads from cookie, all protected endpoints return 200
- [ ] C2: Registration redirects to verify-email, does not set isAuthenticated
- [ ] C3: `PasswordInput` has no `forwardRef`, ref still works for RHF
- [ ] C4: `/api/auth/state` verifies JWT via backend call
- [ ] C5: `initializeAuth` sets `initialized: true` on error, surfaces error message
- [ ] I1: `verifyEmail`, `forgotPassword`, `resetPassword`, `enable2FA`, `disable2FA` not cached
- [ ] I2: `nameSplitCache` at module level
- [ ] I3: `errorFields` and unused `trigger` removed
- [ ] I4: `oauth-login-button.tsx` deleted or consolidated
- [ ] I5: `mode: "onTouched"` in RegisterForm
- [ ] All backend tests passing: `uv run pytest`
- [ ] All frontend tests passing: `pnpm test`
- [ ] TypeScript zero errors: `pnpm typecheck`
- [ ] Ruff zero errors: `uv run ruff check .`
- [ ] Manual test: full login flow works end-to-end
- [ ] Manual test: registration flow redirects to verify-email

---

## Confidence Score

**Score**: 8.5/10

**Positive factors**:
- All files identified, all root causes understood
- Clear before/after for each fix
- Implementation order respects dependencies
- Gotchas documented (import conflicts, env vars, test updates needed)
- Validation gates are executable

**Risk factors**:
- C4 requires backend+frontend coordination and `API_URL` env var setup
- C2c redirect logic needs careful state tracking to avoid false redirects
- `auth_middleware.py` change affects ALL protected endpoints — integration tests critical
- Some test files need updates and exact test mock shapes are not verified
