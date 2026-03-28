---
name: session-2026-03-16-uat-round2-oauth-cookie-auth-issue
description: UAT Round 2 - OAuth cookie auth blocker, modal scroll fix, vehicle fields pattern
type: project
---

# Session 2026-03-16: UAT Round 2 + OAuth Cookie Auth Issue

## Status
Phase 1 (Hybrid Publisher): UAT Round 2 — Tests 1-5 PASS ✅ | Test 6 BLOCKED by 401 Unauthorized 🚧

## Fixes Implemented

### 1. Modal Scroll Fix (Root Cause: TypeScript, NOT CSS)
**Problem**: 7+ CSS attempts failed, modal scroll didn't work
**Real Root Cause**: TypeScript error `tenant_id: number` vs `string` prevented compilation
**Solution**: Simple pattern with `overflow-hidden`, `flex-1 min-h-0`, footer spacer

### 2. OAuth Cookie Fix (Development)
**File**: `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
**Change**: `secure=True` → `secure=settings.environment != "development"`

### 3. Vehicle Fields Mock Pattern (make vs make_key)
**Problem**: Dropdown needs FB keys ("toyota") but table needs display names ("Toyota")
**Solution**: Dual fields - `make: string` for display, `make_key: string` for FB dropdown

## Current Blocker: 401 Unauthorized

**Error**: POST /api/v1/publisher/{product_id}/publish → 401

**Implemented**: `get_current_auth_user_from_cookie` in dependencies.py
- Reads access_token from httpOnly cookie (OAuth flow)
- Validates JWT, fetches User from DB

**Symptoms**: Cookie sent, user exists in DB, SQL query succeeds, but 401 returned

**Possible causes**:
1. User missing tenant_id (multi-tenancy requirement)
2. Exception after user fetch
3. Logging level issue (debug logs not appearing)

## UAT Round 2 Status
Tests 1-5 ✅ PASS | Test 6 🚧 BLOCKED | Tests 7-10 ⬜ Pending

## Files Modified (Uncommitted)
- PublishModal.tsx — scroll + border-radius fix
- catalog/page.tsx — FB pages + vehicle fields
- auth_router.py — OAuth cookie fix
- publisher_router.py — use cookie auth
- dependencies.py — get_current_auth_user_from_cookie

## Next Actions
1. Check user tenant_id in DB
2. Add try/except for exact error logging
3. Create debug endpoint to test cookie auth
4. Fix 401, complete UAT Tests 6-10
