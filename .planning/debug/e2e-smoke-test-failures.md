---
status: awaiting_human_verify
trigger: "Debug and fix 5 failing smoke tests in Phase 13 E2E suite"
created: "2026-04-26T10:00:00Z"
updated: "2026-04-26T10:45:00Z"
---

## Current Focus

hypothesis: All fixes applied, waiting for Docker web container rebuild
test: Rebuild Docker web container and run all smoke tests
expecting: 21/21 smoke tests passing after rebuild
next_action: Rebuild Docker web container with latest VehicleForm.tsx changes

## Symptoms

expected: 21/21 smoke tests passing
actual: 16/21 passing, 5 failing
errors:
  - GET /api/v1/categories - response.ok() returns false
  - POST /api/v1/categories - response.ok() returns false
  - GET /api/v1/products - response.ok() returns false
  - POST /api/v1/products - response.ok() returns false
  - VehicleForm submit - Timeout: cannot find price input field
reproduction: Run `cd tests/e2e && pnpm test --grep @smoke`
started: After Plan 13-03 changes (product bulk API, useBulkUploadProducts)

## Eliminated

## Evidence

- timestamp: 2026-04-26T10:15:00Z
  checked: Backend API status
  found: Backend IS running (Docker containers healthy), but returns non-OK responses
  implication: Not a server issue, likely auth or routing issue

- timestamp: 2026-04-26T10:15:00Z
  checked: VehicleForm.tsx line 375
  found: `price_cents: 0, // TODO: Add price field to form` - NO PRICE INPUT FIELD
  implication: Test fails because it tries to find a price input that doesn't exist

- timestamp: 2026-04-26T10:15:00Z
  checked: Test error messages
  found: All 4 API tests return `response.ok() = false` (likely 401/403/500)
  implication: Auth tokens in tests are either invalid, not being sent correctly, or backend endpoints don't exist

- timestamp: 2026-04-26T10:20:00Z
  checked: Docker container logs
  found: `FileNotFoundError: JWT private key not found at /app/keys/private.pem`
  implication: JWT keys volume mount was empty, causing all API requests to fail with 500

- timestamp: 2026-04-26T10:22:00Z
  checked: After container restart
  found: JWT keys now accessible, API returns 401 Unauthorized (expected without auth)
  implication: Root cause #1 FOUND: Container restart fixed JWT key issue

- timestamp: 2026-04-26T10:22:00Z
  checked: API with valid auth token
  found: `/api/v1/categories` returns 200 OK with 36 categories
  implication: API is working correctly after restart

## Resolution

root_cause:
  1. JWT keys volume mount was empty in Docker container, causing all API requests to fail with 500 errors
  2. VehicleForm.tsx missing price input field (TODO comment on line 375)
  3. Docker web container running production build without latest code changes

fix:
  1. ✅ Restarted API container to pick up JWT keys volume mount
  2. ✅ Added price input field to VehicleForm.tsx (schema, form field, defaultValues, onSubmit)
  3. ⏭️ Docker web container needs rebuild with latest code - test skipped for now

verification:
  1. ✅ API endpoints tested manually - working with valid auth tokens
  2. ✅ 4/5 API smoke tests now passing (categories/products GET/POST)
  3. ⏭️ 1/5 form submit test still fails - Docker web container needs rebuild

files_changed:
  - apps/web/src/components/forms/VehicleForm.tsx: Added price field to schema and form
  - Docker: prosell-staging-api restarted to pick up JWT keys
