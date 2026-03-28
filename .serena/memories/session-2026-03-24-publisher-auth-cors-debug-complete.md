---
name: session-2026-03-24-publisher-auth-cors-debug-complete
description: Publisher endpoint 401 → 422 → CORS systematic debugging complete - Phase 1 UAT
type: project
---

# Session 2026-03-24: Publisher Auth + CORS Debugging (Complete)

## Root Causes Found & Fixed

### 1. Auth 401 → Dependency Mismatch ✅
**Problem**: `get_publish_vehicle_use_case` used `get_current_auth_user` (Bearer) but endpoint used `get_current_auth_user_from_cookie` (cookies)

**File**: `apps/api/src/prosell/infrastructure/api/dependencies.py` line 657
**Fix**: Changed to `Depends(get_current_auth_user_from_cookie)`

**Pattern**: FastAPI executes ALL dependencies in the chain. Endpoint cookie auth worked, but use case Bearer requirement failed.

---

### 2. 422 UUID → Mock Data Using Strings ✅
**Problem**: Mock data used `"veh-001"`, `"page-001"` but backend validates UUIDs

**Files**:
- `apps/web/src/app/dashboard/catalog/page.tsx` — Vehicle IDs → UUIDs
- `MOCK_FACEBOOK_PAGES` — Page IDs → UUIDs

**Pattern**: Always use proper UUID format in mock data, never "test-001" strings.

---

### 3. Missing vehicleData.id ✅
**Problem**: `PublishForm` received `vehicleData` without `id` field

**Fix**: Added `id: selectedVehicleRaw.id` to `selectedVehicle` transformation

**Pattern**: Data flow must be traced through entire component chain → Catalog creates `selectedVehicle` → Modal passes to Form → Form uses for API call.

---

### 4. CORS → 127.0.0.1 vs localhost ✅
**Problem**: API bound to `127.0.0.1:8000` but frontend calls `localhost:8000` (different origins for CORS)

**Fix**: Restart API with `--host 0.0.0.0` to allow both `localhost` and `127.0.0.1`

**Pattern**: For local development, always use `--host 0.0.0.0` so localhost works from browsers.

**Also fixed**: `.env` ALLOWED_ORIGINS format from `["url"]` to `url,url` (Pydantic CSV parsing)

---

## Files Modified (Uncommitted)

### Backend
- `apps/api/src/prosell/infrastructure/api/dependencies.py` (line 657)
- `apps/api/src/prosell/infrastructure/api/main.py` (CORS logging)
- `apps/api/.env` (ALLOWED_ORIGINS format)

### Frontend
- `apps/web/src/app/dashboard/catalog/page.tsx` (UUIDs, vehicle ID)
- `apps/web/src/components/publisher/PublishForm.tsx` (VehicleData, product_id, DEBUG logs)
- `apps/web/src/components/publisher/PublishModal.tsx` (VehicleData)

---

## Current Status

✅ **All fixes applied and verified**
- CORS works: `curl -H "Origin: http://localhost:3000" -X OPTIONS http://localhost:8000/api/v1/publisher/test/publish -v` returns `access-control-allow-origin: http://localhost:3000`
- API running on `http://0.0.0.0:8000` (accessible via localhost:8000)
- Auth via cookies working

⏸️ **Remaining**: User needs to test in fresh browser (close ALL windows, open new incognito)

---

## Next Steps

1. User closes browser, opens fresh incognito, tests publish flow
2. If successful: Remove DEBUG logs, continue UAT Tests 3-10
3. If fails: Get exact error, resume debugging

---

## Technical Decisions

1. **API Binding**: Use `--host 0.0.0.0` for local dev (localhost vs 127.0.0.1 CORS issue)
2. **Mock Data**: Always use UUIDs, never string IDs like "veh-001"
3. **Auth Dependencies**: Publisher endpoints use cookie auth, not Bearer
4. **Environment Format**: Pydantic CSV needs `val1,val2` not `["val1","val2"]`
5. **Data Flow**: Vehicle ID must be included in vehicleData object passed to form

---

## Debugging Approach Used

Systematic debugging with root cause tracing:
1. Added logging at each layer (frontend → request → backend)
2. Verified data flow: vehicleData.id → productId → URL parameter
3. Used curl to isolate CORS from browser cache
4. Traced error messages back to source (401 → dependency, 422 → validation, CORS → host binding)

**Key Insight**: Browser caches CORS failures aggressively. Even with correct server config, cached preflight responses cause persistent errors. Only fresh browser session resolves it.
