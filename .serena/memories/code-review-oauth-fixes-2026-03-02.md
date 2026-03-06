# Code Review Session: OAuth Security Fixes

**Date**: 2026-03-02
**Branch**: `feature/oauth-backend-callbacks`
**Status**: PRP Complete (10/10), Ready to Execute

## Session Summary

Code review identified 10 issues across Critical (5), Important (4), and Minor (1). Complete PRP generated at `PRPs/code-review-fixes-oauth-security.md`.

## Critical Issues (Blockers)

1. **C5** — BACKDOOR: `test-login/route.ts` accepts any email/password, emits mock cookies
2. **C4** — Internal error detail leaked into redirect URL (`e.detail` raw)
3. **C3** — `OAuthSettings` has duplicate Facebook fields with wrong defaults
4. **C1** — `OAuthServiceImpl` uses global `settings.redis_url` (not injected)
5. **C2** — `get_oauth_service()` creates new instance per request (no singleton)

## Important Issues

- **I3** — HTTPException in service layer (violates Clean Architecture)
- **I2** — `provider_redirect_uris` dict duplicated in router
- **I4** — E2E `storage-state.json` committed to git
- **I6** — `generate-auth-state.cjs` is duplicate of `.js`
- **I7** — `OAuthButtons` always renders `isLoading={false}`

## PRP Details

**File**: `PRPs/code-review-fixes-oauth-security.md`
**Score**: 10/10
**Estimate**: 0.5 days

### Steps (Ordered by Dependencies)

1. Delete test routes (C5)
2. Add 4 domain OAuth exceptions (I3 prereq)
3. Fix `OAuthSettings` — remove variants, add `redis_url` (C3 + C1 prereq)
4. Fix `OAuthServiceImpl` — domain exceptions, field renames (C1 + C3)
5. Add `@lru_cache` to `get_oauth_service()` (C2)
6. Fix `auth_router` — exception handling in BOTH endpoints, DRY dict, safe error codes (C4 + I2 + I3)
7. Create `tests/e2e/.gitignore` (I4)
8. Delete `generate-auth-state.cjs` (I6)
9. Fix `OAuthButtons` loading state + `API_BASE_URL` (I7 + M3)
10. Update unit tests (3 exact changes with line numbers)

### Key Gaps Identified and Fixed

- `oauth_authorize` had NO try/except — would cause 500 with domain exceptions
- `dependencies.py` has NO `lru_cache` import — must add
- `__init__.py` must re-export 4 new exceptions
- Test fixture uses `facebook_app_id` (variant B) — needs 3 changes
- `_process_facebook_callback` also uses variant B — 5 replacements table

## Files Modified This Session

- `PRPs/code-review-fixes-oauth-security.md` — Created (10/10 score)

## Next Steps

Execute PRP: `sc:implement code-review-fixes-oauth-security`
