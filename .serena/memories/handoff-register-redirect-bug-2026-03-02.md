# Handoff: Register Redirect Bug + CORS/UUID Fixes
**Date**: 2026-03-02
**Branch**: `feature/oauth-backend-callbacks`

## Session Summary

Continued from previous session investigating CORS 405 on `/api/auth/register`. Fixed 3 bugs this session and discovered 1 new frontend bug.

---

## Fixes Applied This Session

### Fix 1: CORS Middleware Ordering (DONE ✅)

**File**: `apps/api/src/prosell/infrastructure/api/main.py`

**Problem**: OPTIONS preflight → 405 Method Not Allowed

**Root Cause**: In Starlette/FastAPI, `add_middleware()` inserts at position 0, and `@app.middleware("http")` also calls `add_middleware()`. The `security_headers_middleware` decorator (defined AFTER `add_middleware(CORSMiddleware)`) was becoming the outermost middleware, wrapping CORS. This caused BaseHTTPMiddleware to interfere with CORSMiddleware's OPTIONS preflight handling.

**Fix**: Moved `app.add_middleware(CORSMiddleware, ...)` to AFTER the `@app.middleware("http")` decorator definition. Now CORSMiddleware is outermost:
```
Request → CORSMiddleware → BaseHTTPMiddleware(security) → SlowAPI → Router
```

**Verified**: `curl -X OPTIONS http://localhost:8000/api/auth/register -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST"` → 200 OK with correct CORS headers.

---

### Fix 2: UserTokenModel UUID Type Mismatch (DONE ✅)

**File**: `apps/api/src/prosell/infrastructure/models/user_token_model.py`

**Problem**: Registration failed with UUID type error when creating email verification token.

**Root Cause**: DB has `user_tokens.id` and `user_tokens.user_id` as `UUID` type, but model used `mapped_column(String(36), ...)`.

**Fix**:
```python
# BEFORE
id: Mapped[UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
user_id: Mapped[UUID] = mapped_column(String(36), index=True, nullable=False)

# AFTER
id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
user_id: Mapped[UUID] = mapped_column(index=True, nullable=False)
```

---

### Fix 3: UserRepository UUID String Conversion (DONE ✅)

**File**: `apps/api/src/prosell/infrastructure/repositories/user_repository_impl.py` (line ~217)

**Fix**: Changed `user_id=str(user_id)` → `user_id=user_id` when creating UserTokenModel.

---

## Verified Working

- Registration end-to-end via curl: `POST http://localhost:8000/api/auth/register` → 201 Created
- Backend logs show: mock email sent + `201 Created`
- `user_id` is a proper UUID: `"7efed970-9701-4241-8610-510f55283a81"`
- Frontend Playwright test also shows `POST http://localhost:8000/api/auth/register => [201] Created`

---

## Pending Issue: RegisterForm Redirect Bug 🐛

**Symptom**: After successful registration (backend returns 201), the frontend stays on `/auth/register` instead of redirecting to `/auth/verify-email`.

**File**: `apps/web/src/components/auth/RegisterForm.tsx` (lines 237-243)

**Redirect logic**:
```typescript
useEffect(() => {
  if (justSubmitted.current && !isLoading && !error) {
    justSubmitted.current = false;
    router.push("/auth/verify-email");
  }
}, [isLoading, error, router]);
```

**Expected behavior**:
1. `justSubmitted.current = true` (set before await)
2. `register` sets `isLoading = true` → effect runs but `!isLoading = false` → no redirect
3. `register` sets `isLoading = false, error = null` → effect should fire → redirect

**What actually happens**:
- Network shows `POST http://localhost:8000/api/auth/register => [201] Created` ✅
- No JS errors in console ✅
- URL stays at `/auth/register` ❌
- Form fields reset to blank (form component re-rendered) 🤔

**Investigation Status**: NOT YET RESOLVED

**Theories to investigate**:
1. Race condition with `initializeAuth` resetting `isLoading` after register sets it to false
2. `router.push` is called but causes navigation that middleware immediately redirects back
3. React 19 compiler optimization affecting the `useEffect` dependencies
4. Store's `isLoading` not changing (already `false` before register) — though we see `isLoading: true` in initial state

**Key test**: The form fields going blank suggests the component re-rendered (possibly due to a remount). This could mean `router.push` DID happen but redirected back, causing unmount/remount.

**Next debugging step**: Add `console.log` to the useEffect to see if it's firing. Or evaluate the store state via Playwright `browser_evaluate`:
```javascript
// In Playwright:
window.__ZUSTAND_STORE_DEBUG = true
```

Actually, the better approach:
1. Check if `router.push` is being called by using `browser_evaluate` to add a debug listener
2. OR: Look at the `authStore`'s initial state being `isLoading: true` and whether `initializeAuth` interferes

**Simplest fix to try**: Change the useEffect dependencies and add a callback approach:
```typescript
const onSubmit = async (data: RegisterFormValues) => {
  const { firstName, lastName } = splitName(data.fullName);
  await registerUser(data.email.trim(), data.password, firstName, lastName);
  // Direct redirect after successful registration
  const { error: currentError } = useAuthStore.getState();
  if (!currentError) {
    router.push("/auth/verify-email");
  }
};
```

Or even simpler - redirect inline after the await instead of via useEffect:
```typescript
const onSubmit = async (data: RegisterFormValues) => {
  if (isDisabled) return;
  const { firstName, lastName } = splitName(data.fullName);
  await registerUser(data.email.trim(), data.password, firstName, lastName);
  // If no error after registration, redirect
  const storeState = useAuthStore.getState();
  if (!storeState.error) {
    router.push("/auth/verify-email");
  }
};
```

---

## Test Status

| Suite | Status |
|-------|--------|
| Backend (without org tests) | 308/308 ✅ |
| Frontend | 331/331 ✅ |

---

## Uncommitted Changes

These files have changes not yet committed:
- `apps/api/src/prosell/infrastructure/api/main.py` (CORS fix)
- `apps/api/src/prosell/infrastructure/models/user_token_model.py` (UUID fix)
- `apps/api/src/prosell/infrastructure/repositories/user_repository_impl.py` (UUID fix)
- `apps/web/src/lib/api/authApi.ts` (from previous session: handleResponse + full_name fix)
- `apps/web/tests/middleware.test.ts` (from previous session)
- `apps/web/tests/components/auth/OAuthButtons.test.tsx` (from previous session)

All should be committed together before merging to main.

---

## Next Steps

1. Fix RegisterForm redirect bug (see above)
2. Complete E2E verification checklist (section 5.3 of PRP)
3. Commit all changes
4. Merge `feature/oauth-backend-callbacks` → `main`
