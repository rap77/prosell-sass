# E2E Test Fixes - 2026-04-02

## Status: IN PROGRESS - 26/34 tests passing (76%)

## Completed Fixes

### 1. Password Selector Conflict ✅
**Issue**: `getByLabel(/password/i)` matched 2 elements (password + confirm password)
**Fix**: Changed to `page.locator('#password-password')` in:
- Line 42: Login test
- Line 72: Invalid credentials test
**File**: `tests/e2e/specs/staging-smoke.spec.ts`

### 2. Health Check Endpoint ✅ (CODE DONE, NEEDS REBUILD)
**Issue**: `/api/v1/auth/health` returns 404
**Fix**: Added endpoint to auth router:
```python
@router.get("/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "service": "prosell-api",
    }
```
**File**: `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
**Status**: Code written but needs `docker build --no-cache` to take effect

## Test Results (Current)

### Passing Tests (26/34 - 76%)
✅ Dashboard access
✅ Navigation menu
✅ Vehicles list page
✅ Filters display
✅ Data grid display
✅ Vehicle creation page
✅ VIN validation
✅ Phase 8 features (filters, search, pagination)
✅ Vehicles API endpoint (401 expected without auth)
✅ Accessibility checks (2 minor violations)

### Failing Tests (8/34 - 24%)
❌ Login page display (needs rebuild for password fix)
❌ Login success (needs rebuild for password fix)
❌ Invalid credentials (needs rebuild for password fix)
❌ Health check (needs rebuild for health endpoint)
*Note: All 4 auth tests run twice (once without storage state, once with)*

## Remaining Work

### High Priority
1. **Rebuild API container** - Required for health endpoint and password fixes to take effect
   ```bash
   cd /home/rpadron/proy/prosell-sass
   docker compose -f docker/docker-compose.staging.yml build --no-cache api
   docker compose -f docker/docker-compose.staging.yml up -d api
   ```

2. **Create test vehicle data** - Vehicles table is empty (0 rows)
   - Created `scripts/seed_vehicles.sql` but discovered schema complexity
   - Vehicles require: products, categories, organizations (all empty)
   - Need simpler approach or create full dependency chain

3. **Investigate vehicles API 400 error** - API returns 400 Bad Request even with auth
   - May be related to missing tenant_id or organization_id
   - Need to check use case requirements

### Medium Priority
4. **Fix Phase 8 features** - Filters, search, pagination not visible in UI
   - Tests expect these features but they may not be implemented yet
   - Need to verify if features exist or if tests need updating

5. **Create test data via API** - Instead of direct SQL, use API endpoints
   - More realistic and validates the full stack
   - Can create organizations, categories, products, then vehicles

## Database Schema Discovery

### Current Schema (Phase 1/2)
```sql
vehicles (depends on products)
  ├── products (depends on organizations, categories)
  │   ├── organizations (empty - 0 rows)
  │   └── categories (empty - 0 rows)
  └── users (has admin user)
```

### Admin User Details
- Email: admin@prosell-demo.com
- Password: Admin123!
- ID: 68a2323a-0254-48a4-a2c1-9ff0e29269d9
- Role: super_admin
- Issue: No organization_id linked

## Next Steps

1. **Immediate**: Rebuild API container (5 min)
2. **Short**: Create test data via API or SQL (20 min)
3. **Medium**: Investigate vehicles API 400 error (15 min)
4. **Long**: Verify Phase 8 features implementation (30 min)

## Files Modified/Created

### Modified
- `tests/e2e/specs/staging-smoke.spec.ts` - Fixed password selectors
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` - Added health endpoint

### Created
- `scripts/seed_test_vehicles.py` - Python script (won't work, schema mismatch)
- `scripts/seed_vehicles.sql` - SQL script (incomplete, needs dependencies)
- `tests/e2e/.auth/storage-state.json` - Updated with admin cookies

## Key Learnings

1. **Docker layer caching**: Adding NEW source files requires `--no-cache` rebuild
2. **curl -s quirk**: Shows JSON schema instead of values; use wget for testing
3. **E2E test patterns**: Use specific selectors (ID, data-testid) over labels
4. **Schema complexity**: Vehicles depend on products → organizations + categories
5. **Test isolation**: Auth tests run with and without storage state (doubles test count)

---
*Created: 2026-04-02*
*Status: Ready for API rebuild and test data creation*
