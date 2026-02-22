# Frontend Sprint 1-2 Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 161 TypeScript errors, eliminate security vulnerabilities, remove dead code, and align with React 19 best practices in the ProSell SaaS frontend auth system.

**Architecture:** Atomic phases with independent commits. Each phase is reversible and verifiable. Security fixes first, then TypeScript alignment, then React 19 patterns, then over-engineering removal.

**Tech Stack:** React 19, Next.js 16, TypeScript 5.5+, Zustand 5, Vitest

**Estimated Time:** 10-14 hours across 11 atomic phases

---

## Phase 1: Security - Remove Passwords from Cache Keys (CRITICAL)

**Why First:** Passwords in plaintext as Map keys is an immediate security risk.

**Files:**

- Modify: `apps/web/src/lib/api/authApi.ts:172,220`
- Modify: `apps/web/src/lib/cache/cache-utils.ts:47-52`
- Test: `apps/web/tests/lib/api/authApi.test.ts`

**Rollback:** `git revert HEAD`

---

### Step 1.1: Write failing test for password exclusion from cache

**File:** `apps/web/tests/lib/api/authApi.test.ts`

```typescript
describe("authApi - cache security", () => {
  it("should NOT include password in cache key", () => {
    const credentials = {
      email: "test@example.com",
      password: "SecretPassword123!",
    };

    // Act: Create cache key for login
    const cacheKey = createAuthCacheKey("login", credentials);

    // Assert: Password should NOT be in the cache key
    expect(cacheKey).not.toContain("SecretPassword123!");
    expect(cacheKey).not.toContain("password");
  });

  it("should NOT include newPassword in cache key", () => {
    const resetData = {
      token: "reset-token-123",
      newPassword: "NewSecret456!",
    };

    const cacheKey = createAuthCacheKey("reset-password", resetData);

    expect(cacheKey).not.toContain("NewSecret456!");
    expect(cacheKey).not.toContain("newPassword");
  });
});
```

**Step 1.2: Run test to verify it fails**

```bash
cd apps/web && pnpm test authApi.test.ts --cache-security
```

**Expected:** FAIL - passwords are currently in cache keys

---

### Step 1.3: Fix createAuthCacheKey to exclude sensitive fields

**File:** `apps/web/src/lib/cache/cache-utils.ts`

```typescript
// Sensitive field names that should NEVER be in cache keys
const SENSITIVE_FIELDS = [
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "accessToken",
  "refreshToken",
];

export function createAuthCacheKey(endpoint: string, data?: unknown): string {
  const key = `${CACHE_CONFIG.prefixes.auth}${endpoint}`;

  if (!data || typeof data !== "object") {
    return key;
  }

  // Create safe version of data excluding sensitive fields
  const safeData = Object.entries(data as Record<string, unknown>)
    .filter(([fieldName]) => !SENSITIVE_FIELDS.includes(fieldName))
    .reduce<Record<string, unknown>>((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  // If no safe data remains, return just the endpoint
  const dataStr =
    Object.keys(safeData).length > 0 ? `:${JSON.stringify(safeData)}` : "";

  return `${key}${dataStr}`;
}
```

**Step 1.4: Run test to verify it passes**

```bash
cd apps/web && pnpm test authApi.test.ts --cache-security
```

**Expected:** PASS

---

### Step 1.5: Update TypeScript types

**File:** `apps/web/src/lib/cache/cache-utils.ts`

Add type for the function:

```typescript
export function createAuthCacheKey(
  endpoint: string,
  data?: Record<string, unknown>,
): string {
  // ... implementation
}
```

---

### Step 1.6: Commit Phase 1

```bash
git add apps/web/src/lib/cache/cache-utils.ts apps/web/tests/lib/api/authApi.test.ts
git commit -m "fix(security): remove passwords and sensitive fields from cache keys

- Passwords, tokens, and refresh tokens no longer included in cache keys
- createAuthCacheKey now filters sensitive fields before serialization
- Added tests to verify passwords are excluded from cache

Security: Prevents sensitive data exposure in memory/cache keys
Phase: 1/11 - Atomic cleanup"
```

---

## Phase 2: Security - Disable Caching for Mutations (CRITICAL)

**Why Second:** Caching mutations (login, register, etc.) returns stale tokens and violates REST semantics.

**Files:**

- Modify: `apps/web/src/lib/api/authApi.ts`
- Test: `apps/web/tests/lib/api/authApi.test.ts`

**Rollback:** `git revert HEAD`

---

### Step 2.1: Write test for mutation caching behavior

**File:** `apps/web/tests/lib/api/authApi.test.ts`

```typescript
describe("authApi - mutation caching", () => {
  it("should NOT cache login response", async () => {
    const credentials = { email: "test@test.com", password: "pass123" };

    // First call
    await authApi.login(credentials);

    // Verify cache is empty for login
    const cacheKey = createAuthCacheKey("login", { email: "test@test.com" });
    const cached = requestCache.get(cacheKey);

    expect(cached).toBeUndefined();
  });

  it("should NOT cache register response", async () => {
    const data = {
      email: "new@test.com",
      password: "pass123",
      first_name: "Test",
      last_name: "User",
    };

    await authApi.register(data);

    const cacheKey = createAuthCacheKey("register", { email: "new@test.com" });
    const cached = requestCache.get(cacheKey);

    expect(cached).toBeUndefined();
  });

  it("should cache getCurrentUser (GET request)", async () => {
    // First call
    await authApi.getCurrentUser();

    // Verify cache has the data
    const cacheKey = createAuthCacheKey("current-user");
    const cached = requestCache.get(cacheKey);

    expect(cached).toBeDefined();
  });
});
```

**Step 2.2: Run test to verify it fails**

```bash
cd apps/web && pnpm test authApi.test.ts --mutation-cache
```

**Expected:** FAIL - mutations are currently cached

---

### Step 2.3: Remove caching from all mutation endpoints

**File:** `apps/web/src/lib/api/authApi.ts`

Mutations that should NEVER be cached:

- `login`
- `register`
- `logout`
- `refresh` (token refresh)
- `verify-email`
- `forgot-password`
- `reset-password`
- `enable-2fa`
- `verify-2fa`
- `disable-2fa`

**Find each mutation endpoint and remove the caching logic:**

```typescript
// BEFORE (example for login):
login: async (credentials: LoginCredentials) => {
  const cacheKey = createAuthCacheKey("login", credentials);
  const cached = requestCache.get(cacheKey);
  if (cached) return cached;

  // ... fetch logic ...

  requestCache.set(cacheKey, response, CACHE_CONFIG.auth.login.ttl);
  return response;
};

// AFTER:
login: async (credentials: LoginCredentials) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) throw new AuthError("Login failed");

  return response.json();
};
```

**Safe GET requests that CAN be cached:**

- `getCurrentUser` - Cache for 5 minutes
- `check-auth` - Cache for 2 minutes

---

### Step 2.4: Remove shouldCacheRequest import (doesn't exist)

**File:** `apps/web/src/lib/api/authApi.ts:69`

```typescript
// DELETE THIS LINE:
import {
  apiCache,
  generateCacheKey,
  shouldCacheRequest,
} from "../cache/lru-cache";

// REPLACE WITH:
import { apiCache, generateCacheKey } from "../cache/lru-cache";
```

---

### Step 2.5: Run test to verify it passes

```bash
cd apps/web && pnpm test authApi.test.ts --mutation-cache
```

**Expected:** PASS

---

### Step 2.6: Commit Phase 2

```bash
git add apps/web/src/lib/api/authApi.ts apps/web/tests/lib/api/authApi.test.ts
git commit -m "fix(security): disable caching for mutation endpoints

- Login, register, and other mutations no longer cached
- Only idempotent GET requests (getCurrentUser) are cached
- Removed shouldCacheRequest import (function doesn't exist)
- Added tests to verify mutations are not cached

Security: Prevents stale token issues and violations of REST semantics
Phase: 2/11 - Atomic cleanup"
```

---

## Phase 3: Security - Remove Tokens from localStorage Persist (CRITICAL)

**Why Third:** Tokens in localStorage is a well-known XSS attack vector. The comment says no localStorage but code does opposite.

**Files:**

- Modify: `apps/web/src/stores/authStore.ts:597-607`
- Test: `apps/web/tests/stores/authStore.test.ts`

**Rollback:** `git revert HEAD`

---

### Step 3.1: Write test for localStorage token exclusion

**File:** `apps/web/tests/stores/authStore.test.ts`

```typescript
describe("authStore - token security", () => {
  it("should NOT persist accessToken to localStorage", () => {
    const { localStorage } = window;

    // Act: Login to set token
    useAuthStore.getState().login({
      email: "test@test.com",
      password: "pass123",
    });

    // Get localStorage content
    const stored = localStorage.getItem("auth-storage");
    const parsed = JSON.parse(stored!);

    // Assert: accessToken should NOT be in localStorage
    expect(parsed.state.accessToken).toBeUndefined();
    expect(parsed.state.refreshTokenValue).toBeUndefined();
  });

  it("should persist user and isAuthenticated for optimistic UI", () => {
    const { localStorage } = window;

    useAuthStore.getState().login({
      email: "test@test.com",
      password: "pass123",
    });

    const stored = localStorage.getItem("auth-storage");
    const parsed = JSON.parse(stored!);

    // These SHOULD be persisted
    expect(parsed.state.user).toBeDefined();
    expect(parsed.state.isAuthenticated).toBe(true);
  });
});
```

**Step 3.2: Run test to verify it fails**

```bash
cd apps/web && pnpm test authStore.test.ts --token-security
```

**Expected:** FAIL - tokens are currently persisted

---

### Step 3.3: Update partialize to exclude tokens

**File:** `apps/web/src/stores/authStore.ts:597-607`

```typescript
{
  name: "auth-storage",
  storage: createJSONStorage(() => localStorage),

  // SECURITY: Only persist non-sensitive data for optimistic UI
  // Tokens are stored in httpOnly cookies by the backend
  partialize: (state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    // DO NOT persist tokens to localStorage (XSS risk)
    // accessToken: state.accessToken,           // REMOVED
    // refreshTokenValue: state.refreshTokenValue, // REMOVED
  }),
}
```

**Step 3.4: Update file header comment to match reality**

**File:** `apps/web/src/stores/authStore.ts:18-25`

```typescript
/**
 * SECURITY NOTE:
 *
 * Token Storage:
 * - Access and refresh tokens are stored in httpOnly cookies by the backend
 * - This store only maintains non-sensitive state in memory
 * - localStorage persists ONLY: user object and isAuthenticated flag for optimistic UI
 *
 * This prevents XSS attacks from stealing tokens via localStorage access.
 *
 * Implementation:
 * - Backend: FastAPI sets httpOnly cookies on login/register
 * - Frontend: This store reads cookies via middleware for route protection
 * - Hydration: Store hydrates from server state, not localStorage tokens
 */
```

---

### Step 3.5: Run test to verify it passes\*\*

```bash
cd apps/web && pnpm test authStore.test.ts --token-security
```

**Expected:** PASS

---

### Step 3.6: Commit Phase 3

```bash
git add apps/web/src/stores/authStore.ts apps/web/tests/stores/authStore.test.ts
git commit -m "fix(security): remove tokens from localStorage persist

- accessToken and refreshToken no longer persisted to localStorage
- Only user object and isAuthenticated persisted for optimistic UI
- Tokens stored in httpOnly cookies by backend (XSS prevention)
- Updated header comment to match actual implementation
- Added tests to verify tokens excluded from localStorage

Security: Prevents XSS attacks from stealing auth tokens
Phase: 3/11 - Atomic cleanup

Note: Future Phase will migrate to Server Actions for complete cookie handling"
```

---

## Phase 4: TypeScript - Delete Dead Code Files

**Why Fourth:** These 3 files have TypeScript errors and are never imported. Removing them fixes ~30 compilation errors.

**Files:**

- Delete: `apps/web/src/hooks/useSWRAuth.ts`
- Delete: `apps/web/src/lib/api/parallelApi.ts`
- Delete: `apps/web/src/components/auth/examples/SuspenseExample.tsx`
- Delete: `apps/web/src/components/auth/examples/` (if empty after)

**Rollback:** `git revert HEAD`

---

### Step 4.1: Verify files are not imported

```bash
cd apps/web && grep -r "useSWRAuth" src/ --exclude-dir=node_modules
cd apps/web && grep -r "parallelApi" src/ --exclude-dir=node_modules
cd apps/web && grep -r "SuspenseExample" src/ --exclude-dir=node_modules
```

**Expected:** No results (files are not used)

---

### Step 4.2: Delete dead code files

```bash
rm apps/web/src/hooks/useSWRAuth.ts
rm apps/web/src/lib/api/parallelApi.ts
rm apps/web/src/components/auth/examples/SuspenseExample.tsx
rmdir apps/web/src/components/auth/examples/ 2>/dev/null || true
```

---

### Step 4.3: Verify TypeScript error count reduced

```bash
cd apps/web && pnpm typecheck 2>&1 | grep -c "error TS"
```

**Expected:** Error count reduced from 161 to ~130

---

### Step 4.4: Commit Phase 4

```bash
git add -A
git commit -m "refactor(typescript): delete unused dead code files

- Deleted useSWRAuth.ts (150 lines, never imported)
- Deleted parallelApi.ts (90 lines, never imported)
- Deleted SuspenseExample.tsx (170 lines, broken imports)
- These files had TypeScript errors and added no value

TypeScript: Reduced compilation errors from 161 to ~130
Phase: 4/11 - Atomic cleanup"
```

---

## Phase 5: TypeScript - Create Domain Types Layer

**Why Fifth:** Eliminates type duplication and aligns with Clean Architecture. Domain types become single source of truth.

**Files:**

- Create: `apps/web/src/domain/auth/types.ts`
- Modify: `apps/web/src/stores/authStore.ts` (import from domain)
- Modify: `apps/web/src/types/auth.ts` (re-export from domain)
- Modify: `apps/web/src/middleware.ts` (import from domain)
- Modify: All test files using User type

**Rollback:** `git revert HEAD`

---

### Step 5.1: Create domain auth types

**File:** `apps/web/src/domain/auth/types.ts`

```typescript
/**
 * Domain Types for Authentication
 *
 * These are the business entity types for authentication.
 * They are NOT coupled to any external API or store implementation.
 *
 * Single source of truth for auth types across the application.
 */

/**
 * User entity representing an authenticated user
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly role: string;
  readonly is_email_verified: boolean;
  readonly is_2fa_enabled: boolean;
  readonly organization_id?: string | null;
}

/**
 * Authentication tokens (NOT stored in localStorage)
 */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

/**
 * Registration data
 */
export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly first_name: string;
  readonly last_name: string;
}

/**
 * Auth error response
 */
export interface AuthError {
  readonly message: string;
  readonly code?: string;
  readonly field?: string;
}

/**
 * 2FA setup data
 */
export interface TwoFactorSetup {
  readonly secret: string;
  readonly qr_code: string;
  readonly backup_codes: readonly string[];
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  readonly email: string;
}

/**
 * Password reset with token
 */
export interface PasswordReset {
  readonly token: string;
  readonly newPassword: string;
}

/**
 * Email verification
 */
export interface EmailVerification {
  readonly token: string;
}

/**
 * 2FA verification
 */
export interface TwoFactorVerification {
  readonly code: string;
  readonly accessToken: string;
}
```

---

### Step 5.2: Update types/auth.ts to re-export from domain

**File:** `apps/web/src/types/auth.ts`

```typescript
/**
 * Auth Types - Re-exports from domain layer
 *
 * DEPRECATED: Import from @/domain/auth/types instead
 * This file exists for backward compatibility during migration
 *
 * @deprecated Use domain types directly
 */

export type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthError,
  TwoFactorSetup,
  PasswordResetRequest,
  PasswordReset,
  EmailVerification,
  TwoFactorVerification,
} from "@/domain/auth/types";
```

---

### Step 5.3: Update authStore to use domain types

**File:** `apps/web/src/stores/authStore.ts`

**Replace the duplicated type definitions (lines ~108-130) with:**

```typescript
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthError,
} from "@/domain/auth/types";
```

**DELETE the duplicate interfaces:**

- `interface User { ... }`
- `interface AuthTokens { ... }`
- `interface LoginCredentials { ... }`
- `interface RegisterData { ... }`
- `interface AuthError { ... }`

---

### Step 5.4: Update middleware to use domain types

**File:** `apps/web/src/middleware.ts:87-95`

```typescript
// DELETE the inline UserData type definition

// REPLACE WITH:
import type { User } from "@/domain/auth/types";

// Update usage: UserData -> User
```

---

### Step 5.5: Fix test files to include required fields

**The main issue:** Tests create User objects without `is_email_verified` and `is_2fa_enabled` fields.

**Find and fix all mock User objects in tests:**

```bash
cd apps/web && grep -r "id:.*email:" tests/ --include="*.ts" --include="*.tsx"
```

**Update each mock User to include required fields:**

```typescript
// BEFORE:
const mockUser = {
  id: "1",
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
  role: "user",
};

// AFTER:
import type { User } from "@/domain/auth/types";

const mockUser: User = {
  id: "1",
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
  role: "user",
  is_email_verified: true,
  is_2fa_enabled: false,
};
```

**Files to update:**

- `apps/web/tests/stores/authStore.test.ts` (18 occurrences)
- `apps/web/tests/hooks/useAuth.test.ts` (3 occurrences)
- `apps/web/tests/lib/testStore.ts` (3 occurrences)

---

### Step 5.6: Run TypeScript check

```bash
cd apps/web && pnpm typecheck
```

**Expected:** Major reduction in errors (161 → ~50 or less)

---

### Step 5.7: Run tests

```bash
cd apps/web && pnpm test
```

**Expected:** All tests pass

---

### Step 5.8: Commit Phase 5

```bash
git add -A
git commit -m "refactor(typescript): create domain types layer for auth

- Created apps/web/src/domain/auth/types.ts as single source of truth
- Re-exported from types/auth.ts for backward compatibility
- Updated authStore to import from domain (removed duplicate types)
- Updated middleware to use domain User type
- Fixed all test mocks to include required User fields

TypeScript: Reduced errors from ~130 to <50
Architecture: Aligned with Clean Architecture (domain-first)
Phase: 5/11 - Atomic cleanup"
```

---

## Phase 6: TypeScript - Fix `any` Types and Import Order

**Why Sixth:** Replace `any` with proper types and fix import ordering issues.

**Files:**

- Modify: `apps/web/src/lib/utils.ts`
- Modify: `apps/web/src/lib/cache/cache-utils.ts`
- Modify: `apps/web/src/app/auth/login/page.tsx`
- Modify: `apps/web/src/stores/authStore.ts`

**Rollback:** `git revert HEAD`

---

### Step 6.1: Fix cache-utils.ts `as any` cast

**File:** `apps/web/src/lib/cache/cache-utils.ts:98`

```typescript
// BEFORE:
(CACHE_CONFIG.auth as any).prefixes;

// AFTER:
const authConfig = CACHE_CONFIG.auth as {
  prefixes: {
    auth: string;
    user: string;
  };
  ttl: {
    [key: string]: number;
  };
};
authConfig.prefixes.auth;
```

---

### Step 6.2: Fix utils.ts `any` types

**File:** `apps/web/src/lib/utils.ts`

**Line 136 - Replace `any` with `unknown`:**

```typescript
// BEFORE:
let mappedItem: any = item;

// AFTER:
let mappedItem: unknown = item;
```

**Line 154 - Add proper array type:**

```typescript
// BEFORE:
function withArrayLengthCheck<T>(
  array: any[],
  minLength: number,
  operation: () => T,
): T | undefined;

// AFTER:
function withArrayLengthCheck<T>(
  array: readonly unknown[],
  minLength: number,
  operation: () => T,
): T | undefined;
```

**For cache-related `any` - acceptable as generic cache:**

```typescript
// These are OK - generic cache storage
const stateCache = new Map<string, unknown>();
```

---

### Step 6.3: Fix login page import order

**File:** `apps/web/src/app/auth/login/page.tsx`

```typescript
// Move this from line 108 to the top:
import Link from "next/link";

// Also replace <a href="/"> with <Link href="/">

// BEFORE (line 36-42):
<a
  href="/"
  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
>

// AFTER:
<Link
  href="/"
  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
>
```

---

### Step 6.4: Run TypeScript check

```bash
cd apps/web && pnpm typecheck
```

**Expected:** Further error reduction

---

### Step 6.5: Commit Phase 6

```bash
git add -A
git commit -m "refactor(typescript): replace any types and fix import order

- Replaced 'any' with 'unknown' or proper types in utils.ts
- Fixed cache-utils.ts 'as any' cast with proper type definition
- Fixed login page import order (Link import at top)
- Replaced <a href=\"/\"> with <Link href=\"/\"> for Next.js optimization

TypeScript: Improved type safety, reduced any usage from 24 to <10
Phase: 6/11 - Atomic cleanup"
```

---

## Phase 7: React 19 - Remove Manual Memoization (useMemo/useCallback/memo)

**Why Seventh:** React 19 Compiler handles optimization automatically. Manual memoization adds unnecessary complexity.

**Files:**

- Modify: `apps/web/src/components/auth/LoginForm.tsx`
- Modify: `apps/web/src/components/auth/RegisterForm.tsx`
- Modify: `apps/web/src/components/auth/TwoFactorSetupForm.tsx`
- Modify: `apps/web/src/stores/authStore.ts`
- Modify: `apps/web/src/lib/api/authApi.ts`

**Rollback:** `git revert HEAD`

**Reference:** @react-19 skill (No Manual Memoization REQUIRED)

---

### Step 7.1: Remove useMemo/useCallback/memo from LoginForm

**File:** `apps/web/src/components/auth/LoginForm.tsx`

**Remove ALL instances of:**

- `useMemo`
- `useCallback`
- `memo` wrapper

**Example transformations:**

```typescript
// BEFORE:
const isDisabled = useMemo(
  () => isSubmitting || Object.keys(errors).length > 0,
  [isSubmitting, errors],
);

const handleInputChange = useCallback(
  (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    // ...
  },
  [],
);

// AFTER:
const isDisabled = isSubmitting || Object.keys(errors).length > 0;

const handleInputChange =
  (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    // ...
  };
```

**Remove imports:**

```typescript
// DELETE these lines:
import { useMemo, useCallback, memo } from "react";
```

---

### Step 7.2: Remove useMemo/useCallback/memo from RegisterForm

**File:** `apps/web/src/components/auth/RegisterForm.tsx`

**Same process as LoginForm - remove all memoization.**

**Also remove the memo-wrapped sub-components:**

```typescript
// DELETE:
const RegisterHeading = memo(() => { ... });
const RegisterDivider = memo(() => { ... });
const RegisterFooter = memo(() => { ... });

// REPLACE with regular functions:
const RegisterHeading = () => { ... };
const RegisterDivider = () => { ... };
const RegisterFooter = () => { ... };
```

---

### Step 7.3: Remove useMemo/useCallback/memo from TwoFactorSetupForm

**File:** `apps/web/src/components/auth/TwoFactorSetupForm.tsx`

**Remove all memoization. Also move sub-components outside function body:**

```typescript
// BEFORE (sub-components defined INSIDE component):
export function TwoFactorSetupForm() {
  const CheckIcon = memo(() => ...);
  const ShieldIcon = memo(() => ...);
  // ...
}

// AFTER (sub-components at module scope):
const CheckIcon = () => ...;
const ShieldIcon = () => ...;
const XIcon = () => ...;

export function TwoFactorSetupForm() {
  // ...
}
```

---

### Step 7.4: Remove memoization from authStore

**File:** `apps/web/src/stores/authStore.ts`

**Remove `useMemo` for computed values - Zustand handles this:**

```typescript
// DELETE useMemo wrappers - let Zustand handle computed state
```

---

### Step 7.5: Remove memoization from authApi

**File:** `apps/web/src/lib/api/authApi.ts`

**Remove all `useCallback` wrappers from API methods:**

```typescript
// BEFORE:
login: useCallback(async (credentials) => { ... }, []),

// AFTER:
login: async (credentials) => { ... },
```

---

### Step 7.6: Run tests

```bash
cd apps/web && pnpm test
```

**Expected:** All tests pass (React Compiler optimizes automatically)

---

### Step 7.7: Run build check

```bash
cd apps/web && pnpm build
```

**Expected:** Build succeeds (React 19 Compiler active)

---

### Step 7.8: Commit Phase 7

```bash
git add -A
git commit -m "refactor(react-19): remove manual memoization (useMemo/useCallback/memo)

- Removed all useMemo, useCallback, and memo from auth components
- Moved sub-components from function body to module scope
- Removed memoization from authStore and authApi
- React Compiler handles optimization automatically in React 19

React 19: Aligned with React 19 patterns (Compiler handles optimization)
Simplification: Reduced ~200 lines of unnecessary memoization code
Phase: 7/11 - Atomic cleanup"
```

---

## Phase 8: React 19 - Replace forwardRef with ref-as-prop

**Why Eighth:** React 19 supports `ref` as a regular prop. forwardRef is unnecessary.

**Files:**

- Modify: `apps/web/src/components/auth/PasswordInput.tsx`
- Note: UI components from shadcn/ui will be updated separately

**Rollback:** `git revert HEAD`

**Reference:** @react-19 skill (ref as Prop section)

---

### Step 8.1: Replace forwardRef in PasswordInput

**File:** `apps/web/src/components/auth/PasswordInput.tsx:131`

```typescript
// BEFORE:
import { forwardRef } from 'react';

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    // ...
  }
);

PasswordInput.displayName = 'PasswordInput';

// AFTER:
export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Add ref to props interface
  ref?: React.RefObject<HTMLInputElement>;
}

export const PasswordInput = ({ ref, className, ...props }: PasswordInputProps) => {
  return (
    <div className="relative">
      <input
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      {/* ... rest of component */}
    </div>
  );
};

// No displayName needed with ref-as-prop
```

---

### Step 8.2: Update PasswordInput.test.tsx

**File:** `apps/web/tests/components/auth/PasswordInput.test.tsx`

**Update ref access pattern:**

```typescript
// BEFORE (forwardRef):
const { result } = renderHook(() => render(<PasswordInput />));
const input = result.current.container.querySelector('input');

// AFTER (ref-as-prop):
const ref = { current: null as HTMLInputElement | null };
render(<PasswordInput ref={ref} />);
expect(ref.current).toBeInstanceOf(HTMLInputElement);
```

---

### Step 8.3: Run tests

```bash
cd apps/web && pnpm test PasswordInput.test.tsx
```

**Expected:** All tests pass

---

### Step 8.4: Commit Phase 8

```bash
git add -A
git commit -m "refactor(react-19): replace forwardRef with ref-as-prop in PasswordInput

- Removed forwardRef wrapper (unnecessary in React 19)
- Added ref to PasswordInputProps interface
- Updated tests to use ref-as-prop pattern
- Removed displayName (not needed with ref-as-prop)

React 19: Using ref as regular prop (no forwardRef needed)
Phase: 8/11 - Atomic cleanup

Note: shadcn/ui components will be updated in future PR"
```

---

## Phase 9: Cleanup - Remove Premature Optimizations Layer

**Why Ninth:** These "optimization" functions add complexity without measurable benefit. Many are dead code.

**Files:**

- Modify: `apps/web/src/lib/utils.ts`
- Modify: Components that import these functions

**Rollback:** `git revert HEAD`

---

### Step 9.1: Identify which optimization functions are used

```bash
cd apps/web && grep -r "cacheFunction\|batchCSS\|createLookupMap\|hoistRegExp\|createLookupSet\|earlyExit\|useMemoize\|immutableSort" src/ --include="*.ts" --include="*.tsx"
```

**Expected:** Most are imported but never meaningfully used

---

### Step 9.2: Delete unused optimization functions from utils.ts

**File:** `apps/web/src/lib/utils.ts`

**DELETE these functions:**

- `cacheFunction` (if unused)
- `batchCSS` (DOM manipulation - anti-pattern in React)
- `createLookupMap` (O(1) on 3 items is premature)
- `createLookupSet` (O(1) on 3 items is premature)
- `hoistRegExp` (actually creates new RegExp every call - broken)
- `earlyExit` (trivial wrapper)
- `useMemoize` (React Compiler handles this)
- `immutableSort` (use [...arr].sort() directly)
- `withArrayLengthCheck` (trivial check)

**KEEP:**

- `cn()` - used everywhere for Tailwind class merging
- `getErrorMessage()` - genuinely useful error handling

---

### Step 9.3: Remove empty scroll handler from LoginForm

**File:** `apps/web/src/components/auth/LoginForm.tsx:282-293`

```typescript
// DELETE the empty scroll handler and event listener setup:
const handleScroll = () => {
  // Passive event listener for scroll
  // Can be used for scroll-triggered animations or calculations
};

useEffect(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

---

### Step 9.4: Fix storageCache.clear() to not wipe all localStorage

**File:** `apps/web/src/lib/utils.ts:306-314`

```typescript
// BEFORE:
clear(): void {
  cache.clear();
  try {
    localStorage.clear(); // DANGEROUS
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

// AFTER:
clear(): void {
  cache.clear();
  try {
    // Only remove auth-related keys, not everything
    localStorage.removeItem('auth-storage');
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}
```

---

### Step 9.5: Run tests

```bash
cd apps/web && pnpm test
```

**Expected:** All tests pass

---

### Step 9.6: Commit Phase 9

```bash
git add -A
git commit -m "refactor(cleanup): remove premature optimization layer

- Deleted 10+ unused 'optimization' functions from utils.ts
- Removed empty scroll handler from LoginForm
- Fixed storageCache.clear() to only remove auth-storage key
- Kept: cn() and getErrorMessage() as they are genuinely useful

Simplification: Removed ~300 lines of unnecessary/counterproductive code
Philosophy: YAGNI - React Compiler handles optimization
Phase: 9/11 - Atomic cleanup"
```

---

## Phase 10: Final Validation - TypeScript and Tests

**Why Tenth:** After all changes, verify everything compiles and all tests pass.

**Files:** All modified files

---

### Step 10.1: Run TypeScript check

```bash
cd apps/web && pnpm typecheck
```

**Expected:** ZERO errors

**If errors remain:** Fix them individually and commit as Phase 10.1, 10.2, etc.

---

### Step 10.2: Run all tests

```bash
cd apps/web && pnpm test
```

**Expected:** All 316+ tests pass

---

### Step 10.3: Run build

```bash
cd apps/web && pnpm build
```

**Expected:** Build succeeds

---

### Step 10.4: Run linter

```bash
cd apps/web && pnpm lint
```

**Expected:** No linter errors

---

### Step 10.5: Commit Phase 10

```bash
git add -A
git commit -m "test(validation): final validation - all checks passing

TypeScript: ZERO errors
Tests: All 316+ passing
Build: Success
Lint: No errors

Ready for Phase 11: Server Actions migration (future work)
Phase: 10/11 - Atomic cleanup"
```

---

## Phase 11: Documentation - Update README and Handoff Notes

**Why Eleventh:** Document what was changed and future work needed.

**Files:**

- Modify: `apps/web/README.md` (or create)
- Create: `docs/frontend-cleanup-summary.md`

---

### Step 11.1: Create cleanup summary

**File:** `docs/frontend-cleanup-summary.md`

```markdown
# Frontend Sprint 1-2 Cleanup Summary

**Date:** 2026-02-11
**Commits:** 10 atomic phases
**Files Changed:** ~50 files
**Lines Removed:** ~800 lines (mostly dead code and premature optimizations)

## Issues Fixed

### Security (CRITICAL)

1. ✅ Passwords removed from cache keys
2. ✅ Caching disabled for all mutation endpoints
3. ✅ Tokens removed from localStorage persist

### TypeScript

4. ✅ Dead code deleted (3 files, ~400 lines)
5. ✅ Domain types layer created (single source of truth)
6. ✅ All `any` types replaced with proper types
7. ✅ Import order fixed

### React 19 Alignment

8. ✅ All useMemo/useCallback/memo removed (~200 lines)
9. ✅ forwardRef replaced with ref-as-prop

### Over-engineering Removal

10. ✅ Premature optimization layer deleted (~300 lines)

## Final Stats

- **TypeScript Errors:** 161 → 0
- **Test Pass Rate:** 316/316 (100%)
- **Bundle Size:** Reduced (~50KB from dead code removal)
- **Maintainability:** Significantly improved

## Future Work (Server Actions Migration)

The auth system still needs migration to Next.js Server Actions:

### Current State

- Tokens stored in httpOnly cookies by backend (good)
- Frontend uses fetch() to API routes (works)
- localStorage persists only non-sensitive data (good)

### Desired State

- Server Actions for all mutations (login, register, etc.)
- Direct cookie setting in Server Actions
- No API routes needed for auth mutations

### Migration Plan (Future Sprint)

1. Create `app/actions/auth.ts` with Server Actions
2. Update authStore to use Server Actions instead of fetch()
3. Remove API route handlers for auth mutations
4. Update tests to mock Server Actions

## References

- Code Review: See commit with code review results
- React 19 Skill: @react-19
- Clean Architecture: `docs/01_ARQUITECTURA_PROSELL_SAAS_V2.md`
```

---

### Step 11.2: Commit Phase 11

```bash
git add docs/
git commit -m "docs: add frontend cleanup summary and handoff notes

- Created docs/frontend-cleanup-summary.md
- Documented all 10 phases of cleanup
- Listed future work (Server Actions migration)
- Final stats: 161 TypeScript errors → 0

Phase: 11/11 - Atomic cleanup (COMPLETE)"
```

---

## Verification Commands

After each phase, run these commands:

```bash
# TypeScript check
cd apps/web && pnpm typecheck

# Run tests
cd apps/web && pnpm test

# Lint
cd apps/web && pnpm lint

# Build (final check)
cd apps/web && pnpm build
```

---

## Rollback Strategy

Each phase is an independent commit. To rollback any phase:

```bash
# Rollback specific phase (e.g., Phase 3)
git revert <commit-hash-of-phase-3>

# Rollback to before cleanup started
git revert <commit-range-of-all-phases>

# Or reset entirely (if not pushed)
git reset --hard <commit-before-phase-1>
```

---

## Next Steps After This Plan

1. **Execute this plan** using superpowers:executing-plans or superpowers:subagent-driven-development
2. **Create PR** with all 11 atomic commits
3. **Merge to main** after review
4. **Future Sprint:** Migrate to Server Actions (Phase 2 of security cleanup)

---

**End of Plan**
