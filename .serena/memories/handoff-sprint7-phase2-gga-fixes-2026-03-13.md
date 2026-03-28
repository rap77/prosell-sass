---
name: Sprint 7 Phase 2 - GGA Fixes Handoff (2026-03-13 session 2)
description: GGA blocking commit - pre-existing auth factory violations exposed by modifying dependencies.py
type: project
---

## Status: COMMIT STILL PENDING — GGA loop on pre-existing code

**Branch**: `feature/sprint-7-phase2-facebook-oauth`

---

## Root Cause of GGA Loop

Modifying `dependencies.py` (to add Facebook factories) caused GGA to review the ENTIRE file, including pre-existing auth factories that have violations. This creates a cascade.

## Fixes ALREADY Applied (working tree, staged) ✅

- `facebook_account.py`: import from `prosell.domain.base` (not pydantic directly)
- `vehicle.py`: import from `prosell.domain.base`
- `detect_language.py`: removed `from fastapi import Request`, signature now `(query_lang: str | None, accept_language: str)`
- `facebook_exceptions.py`: `dict[str, Any]` → `dict[str, str | list[str]]`
- `refresh_token.py`: TypedDict `RefreshTokenResult` added, `dict[str, Any]` removed
- `dependencies.py`: All Facebook factories use `Annotated[Type, Depends()]` + return types
- `facebook_router.py`: All endpoints use `Annotated[Type, Depends()]`
- `main.py`: `rate_limit_exceeded_handler → JSONResponse`, `health_check → dict[str,str]`, `root → dict[str,str]`
- `set_default_facebook_page`: changed to `status_code=HTTP_204_NO_CONTENT`
- Added `from __future__ import annotations` to `dependencies.py` (TYPE_CHECKING imports for use case return types)

## Remaining GGA Violations (CRITICAL)

### 1. RefreshTokenResult → Pydantic DTO (REJECT)
- `facebook_router.py` returns `RefreshTokenResult` (TypedDict) — must use Pydantic DTO
- `RefreshTokenResponse` DTO exists in `dto/facebook/__init__.py` but has fields `accounts_refreshed`/`accounts_failed`
- Fix: Update `RefreshTokenResponse` fields to `refreshed`/`failed`/`total`, use it in router

### 2. Auth factory return types (REJECT) — PRE-EXISTING
File: `src/prosell/infrastructure/api/dependencies.py` lines ~280-350
Add `-> ReturnType:` to ALL of:
- `get_register_user_use_case -> RegisterUserUseCase`
- `get_login_user_use_case -> LoginUserUseCase`
- `get_refresh_token_use_case -> RefreshTokenUseCase` (auth, not facebook)
- `get_oauth_login_use_case -> OAuthLoginUseCase`
- `get_enable_2fa_use_case -> Enable2FAUseCase`
- `get_disable_2fa_use_case -> Disable2FAUseCase`
- `get_verify_2fa_use_case -> Verify2FAUseCase`
- `require_permission -> Callable[..., Awaitable[User]]`
- `require_role -> Callable[..., Awaitable[User]]`

### 3. Auth on admin endpoint (SECURITY — REJECT)
```python
# facebook_router.py /admin/refresh-tokens
# Add:
_admin: Annotated[User, Depends(require_role(RoleType.SUPER_ADMIN))],
```

### 4. Missing response_model= in decorators
- `@router.post("/authorize")` → add `response_model=AuthorizeFacebookAccountResponse`
- `@router.delete("/accounts/{account_id}")` → add `response_model=DisconnectFacebookAccountResponse`
- `@router.post("/admin/refresh-tokens")` → add `response_model=RefreshTokenResponse` (Pydantic)

### 5. Integration test DI wiring (REQUIRE)
`test_facebook_oauth_integration.py` lines ~149, ~170:
`mock_facebook_service` fixture is passed but never added to `app.dependency_overrides[get_facebook_oauth_service]`

### 6. SUPPORTED_LANGUAGES type (Type Safety)
`detect_language.py:32` - change to `frozenset[str] = frozenset({"es", "en"})` or remove

### 7. Vehicle.py inline import (Code Quality)
`vehicle.py` - `import contextlib` inside method body → move to top of file

### 8. Old = Depends() in auth factories (REQUIRE)
Lines ~280-350 in dependencies.py - same pattern issue as Facebook factories
These are ALL pre-existing. When they become REJECT, must fix.

## Next Session Workflow

```bash
# Read this handoff
# Read: src/prosell/infrastructure/api/dependencies.py (lines 195-350)
# Read: src/prosell/application/dto/facebook/__init__.py
# Read: src/prosell/infrastructure/api/routers/facebook_router.py

# Fix in this order:
# 1. Update RefreshTokenResponse DTO + use in router
# 2. Add return types to all auth factories
# 3. Add require_role to admin endpoint
# 4. Add response_model= to decorators
# 5. Fix integration test DI wiring
# 6. Fix SUPPORTED_LANGUAGES
# 7. Move contextlib import in vehicle.py
# 8. Add Annotated pattern to auth factories (if GGA still rejects)

# Then:
git add -u  # CRITICAL: must re-stage all modified files
gga run --no-cache  # verify before commit
git commit
```

## Test Status
- Unit: 21/21 ✅
- Integration: 7/7 ✅ (but may break after DI fix)
- E2E: 21/21 ✅
- Total backend: 397 ✅
