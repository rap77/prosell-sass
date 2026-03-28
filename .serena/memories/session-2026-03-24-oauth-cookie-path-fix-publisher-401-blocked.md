---
name: session-2026-03-24-oauth-cookie-path-fix-publisher-401-blocked
description: OAuth cookie path fix + publisher 401 blocked - Phase 1 UAT
type: project
---

# Session 2026-03-24: OAuth Cookie Path Fix + Publisher 401 Blocked

## What Was Accomplished

### 1. Database Migration Fix ✅
**Problem**: `users` table had only 5 columns (id, email, full_name, tenant_id, created_at) but SQLAlchemy model expected 18 columns.

**Root Cause**: Previous migration created incomplete schema via direct SQL, missing: password_hash, avatar_url, status, email_verified, email_verified_at, is_2fa_enabled, totp_secret, backup_codes, last_login_at, last_login_ip, failed_login_attempts, locked_until, updated_at

**Solution**:
- Created Alembic migration: `20260324_0828-20f24e79033e_recreate_users_table_complete`
- Dropped users table CASCADE
- Recreated with complete schema (18 columns)
- Inserted test user: rafael.padron@gmail.com

**Files**:
- `apps/api/alembic/versions/20260324_0828-20f24e79033e_recreate_users_table_complete.py`

### 2. OAuth Cookie Path Fix ✅
**Problem**: Cookies set without `path` parameter only available to current request path (/api/auth/*), not sent to other endpoints like /api/v1/publisher/*

**Solution**: Added `path="/"` to both `set_cookie()` calls in OAuth callback
```python
redirect.set_cookie(
    key="access_token",
    value=login_result.access_token,
    path="/",  # <-- ADDED
    httponly=True,
    secure=settings.environment != "development",
    samesite="lax",
)
```

**Files**:
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` (lines 422, 431)

### 3. OAuth Flow Verified ✅
- Google OAuth login works end-to-end
- User created in DB with correct tenant_id = user.id
- OAuth account created with Google tokens
- Cookies set correctly in browser (verified in DevTools)

## Current Blocker: Publisher 401 Unauthorized

**Symptom**:
- Modal shows "Not authenticated" when clicking "Publicar en Facebook"
- Console: `POST http://localhost:8000/api/v1/publisher/veh-001/publish 401 (Unauthorized)`

**Verified Working**:
- ✅ Cookies exist in browser (localhost, path=/, SameSite=Lax)
- ✅ Frontend has `credentials: "include"` configured
- ✅ Backend CORS has `allow_credentials=True`
- ✅ JWT token valid (exp: 2026-03-31)

**To Investigate**:
1. Does browser send Cookie header in POST request? (Network tab → Request Headers)
2. Does backend receive cookie? (API logs)
3. Is there a middleware blocking?
4. Domain issue (localhost vs 127.0.0.1)?

**Next Steps**:
1. Check DevTools Network tab for Cookie header
2. If NOT sent: browser/CORS issue
3. If sent: backend validation issue
4. Review `get_current_auth_user_from_cookie` dependency

## Technical Decisions Made

1. **Fresh schema over repair**: More reliable to recreate schema with SQL + Alembic tracking than to fix 8 broken migrations
2. **OAuth callbacks unversioned**: `/api/auth/*` without version because Google Cloud Console configured once
3. **Auth API versioned**: `/api/v1/auth/*` with version for backward-compatible evolution
4. **Development approach**: Drop/recreate acceptable in development, production would use incremental migrations

## Files Modified (Uncommitted)
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` (cookie path fix)
- `apps/api/alembic/versions/20260324_0828-20f24e79033e_recreate_users_table_complete.py` (new)
- Old migrations deleted (7 files)

## Handoff
- Handoff created: `.planning/phases/01-hybrid-publisher/.continue-here.md`
- Committed: `wip: 01-hybrid-publisher blocked - OAuth cookie auth issue (publisher 401)` (4bf6961)
- Resume with: `/gsd:resume-work`
