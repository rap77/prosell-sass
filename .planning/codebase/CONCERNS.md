# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

### OAuth User Creation: Missing tenant_id Assignment

**Issue:** Users created via OAuth (Google/Facebook) are assigned `tenant_id=None` instead of being linked to an organization.

**Files:**
- `apps/api/src/prosell/application/use_cases/auth/oauth_login.py` (lines 62-78)
- `apps/api/src/prosell/domain/entities/user.py` (line 61)

**Impact:**
- Multi-tenancy system depends on tenant_id for data isolation
- OAuth-created users cannot access organization-scoped features
- Email-based account linking works, but new OAuth users have no organization context
- Blocks Sprint 9 Catálogo Público implementation

**Root Cause:**
- Requires Organizations to be fully implemented and selectable during OAuth flow
- Current OAuth flow has no way to assign user to tenant

**Fix Approach:**
1. Implement organization selection/auto-assignment during OAuth flow
2. Consider auto-creating a default organization for new OAuth users
3. Update OAuthLoginUseCase to accept/assign tenant_id
4. Add integration tests for tenant_id propagation

**Roadmap:** Sprint 9 (blocked until Organizations mature)

---

### SQLAlchemy echo Logging Access Tokens

**Issue:** SQLAlchemy echo mode enabled in development logs all SQL statements, including ones with access tokens embedded in parameters.

**Files:**
- `apps/api/src/prosell/infrastructure/database/session.py` (line 15)

**Current State:**
```python
echo=settings.debug and settings.environment == "development"
```

**Impact:**
- Access tokens visible in development logs
- Exposure in log files stored on disk
- Risk during code reviews or debugging session sharing

**Mitigation Applied:** Already fixed via conditional check (`and settings.environment == "development"`)

**Status:** ✅ FIXED in working tree (line 15 correctly conditional)

**Recommendation:**
- Keep conditional check in place
- Add note to development guide about SQLAlchemy logging
- Consider filtering sensitive parameters if echo=True is needed

---

### Rate Limiting Test is Vacuously True

**Issue:** E2E test for rate limiting has an assertion that always passes regardless of actual rate limiting behavior.

**Files:**
- `tests/e2e/specs/facebook-oauth.spec.ts` (lines 385-407)

**Failing Assertion:**
```typescript
const uniqueCodes = [...new Set(statusCodes)];
expect(uniqueCodes.length).toBeGreaterThan(0);  // Always true - any set has length > 0
```

**Problem:**
- Test sends 10 requests and checks if response codes are unique
- Assertion only verifies that `uniqueCodes.length > 0`, which is always true
- Doesn't actually verify rate limiting behavior (should check for 429 responses or consistent rate limiting)

**Impact:**
- False confidence in rate limiting implementation
- Cannot detect if rate limiting is actually working

**Fix Approach:**
Replace with meaningful assertions:
```typescript
// Option A: Verify rate limiting occurs
const has429 = statusCodes.includes(429);
const hasConsistency = uniqueCodes.length <= 2; // Either success or rate limit
expect(has429 || allSame(statusCodes)).toBeTruthy();

// Option B: Verify no surprises
const expectedCodes = [200, 429]; // Only these are valid
expect(statusCodes.every(code => expectedCodes.includes(code))).toBeTruthy();
```

**Status:** ⚠️ LOW PRIORITY - Rate limiting works in unit tests, only E2E verification is weak

---

## Known Bugs

### RefreshTokenUseCase Parameter Order (FIXED in unstaged work)

**Issue:** Test was failing due to parameter order mismatch in mock repository.

**Files:**
- `apps/api/tests/unit/application/facebook/test_facebook_use_cases.py`

**Status:** ✅ FIXED (unstaged changes at line 47-48)

**What was wrong:**
```python
# BEFORE:
async def get_accounts_expiring_before(self, _threshold: object)

# AFTER:
async def get_accounts_expiring_before(self, threshold: object)  # noqa: ARG002
```

---

### React Compiler Not Enabled

**Issue:** TailwindCSS v4 compatible React compiler not installed.

**Files:**
- `apps/web/next.config.ts` (line 5)

**Current State:**
```typescript
// TODO: Re-enable reactCompiler after installing babel-plugin-react-compiler
```

**Impact:**
- React compiler optimizations not active
- Potential performance gains missed
- Not blocking

**Priority:** LOW - Optional performance optimization

---

## Security Considerations

### Auth Endpoints Lack Rate Limiting (Intentional)

**Issue:** Authentication endpoints (`/register`, `/login`, `/verify-2fa`) have no rate limiting.

**Files:**
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` (lines 126-195)

**Risk:**
- Brute force attacks possible on login/registration
- Credential stuffing vulnerable
- Medium severity for public SaaS

**Current Mitigation:**
- Intentionally disabled during development
- OAuth endpoints have rate limiting via decorator
- Database-level unique constraints prevent duplicate registrations

**Status:** 🟡 TRACKED - Documented as development-only

**Recommendations:**
1. Implement token bucket rate limiting for auth endpoints before production
2. Use Redis-backed sliding window counter
3. Rate limit by IP + email combination
4. Return 429 with Retry-After header
5. Add monitoring for brute force patterns

**Timeline:** Must be done before production deployment

---

### Token Storage (RESOLVED ✅)

**Status:** ✅ RESOLVED - See security-debt-tokens-in-localstorage.md

**What was fixed:**
- Removed access/refresh tokens from localStorage
- Removed tokens from Zustand state
- Switched to httpOnly-only cookies
- All client-server communication uses `credentials: "include"`

**Current Security Posture:**
- Tokens NOT accessible to JavaScript (XSS protection)
- Tokens only sent automatically by browser
- Server components read user data via `/api/auth/state`

---

## Performance Bottlenecks

### Large Router Files - Code Organization Concern

**Issue:** Several router files are large and could benefit from refactoring.

**Files:**
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` (598 lines)
- `apps/api/src/prosell/infrastructure/api/dependencies.py` (553 lines)

**Impact:**
- Difficult to navigate and modify
- Testing requires mocking many endpoints
- Violates Single Responsibility Principle

**Improvement Path:**
1. Split auth_router.py by concern (OAuth, 2FA, basic auth)
2. Create separate routers:
   - `auth/basic_auth_router.py` (register, login, logout, refresh)
   - `auth/oauth_router.py` (Google, Facebook, callback)
   - `auth/2fa_router.py` (enable, verify, disable)
3. Keep dependencies.py centralized (OK at 553 lines) - it's dependency injection

**Priority:** MEDIUM - Refactoring opportunity, not breaking

---

### OAuth Service Initialization (Deferred Validation)

**Issue:** FacebookOAuthService validation deferred to first use rather than initialization.

**Files:**
- `apps/api/src/prosell/infrastructure/services/facebook_marketplace_oauth_service.py` (line ~30)

**Why It Matters:**
- Errors appear at first request, not startup
- Hidden configuration issues
- Harder to debug

**Current Implementation:** ✅ CORRECT
- GGA fix applied to defer validation to first use only
- Avoids trying to load files at startup

**No action needed** - This is the correct pattern.

---

## Fragile Areas

### OAuth Callback Parameter Handling

**Issue:** OAuth callback flow depends on external Facebook API responses, making tests fragile.

**Files:**
- `apps/api/src/prosell/application/use_cases/facebook/oauth_callback.py` (lines 40-80)
- `apps/api/tests/integration/test_facebook_oauth_integration.py`

**Why Fragile:**
- Mock must exactly match OAuthCallbackResponse structure
- Facebook API response schema changes break tests
- External service unavailability blocks testing

**Safe Modification:**
1. Always mock FacebookMarketplaceOAuthService, not the API
2. Create integration test fixtures with realistic Facebook responses
3. Use contract tests to verify API schema compatibility
4. Mock only at service boundary, not HTTP layer

**Test Coverage:** 7/7 integration tests passing ✅

---

### Email Service (SendGrid) Not Integrated

**Issue:** Email service uses MockEmailService in development. SendGrid not wired up.

**Files:**
- `apps/api/src/prosell/infrastructure/services/email_service.py` (lines 61, 70, 78)

**Current State:**
```python
# TODO: Implement SendGrid API call
```

**Why It's Not a Bug:**
- Feature is working in mock mode
- Intentional for development
- Clearly documented with settings.use_mock_email

**Implementation When Needed:**
1. Create SendGridEmailService adapter
2. Implement SendGrid client initialization in dependencies.py
3. Add SendGrid environment variables
4. Create integration tests with SinonJS/Playwright

**Status:** ✅ ACCEPTABLE - Documented feature gap

---

## Scaling Limits

### Database Queries Without Pagination

**Issue:** Some list endpoints may not have pagination, risking memory exhaustion at scale.

**Files to Audit:**
- `apps/api/src/prosell/infrastructure/api/routers/*.py` (product_router, team_router, wallet_router)

**Known Good:**
- Product queries have pagination via `skip`, `limit`
- Team queries have pagination implemented
- Facebook OAuth list endpoints have pagination

**Scaling Path:**
1. Audit all list endpoints for cursor-based or offset pagination
2. Add `limit` parameter with max value (e.g., max 100 items)
3. Implement database-level `LIMIT` + `OFFSET`
4. Add pagination tests with large datasets (10k+ items)

**Current Estimate:** N/A - Need audit first

---

### Task Queue Not Yet Load-Tested

**Issue:** Task queue (Taskiq + Redis) implemented in Sprint 7 Phase 1 but not load-tested.

**Files:**
- `apps/api/src/prosell/infrastructure/tasks/` (entire directory)
- `docker/docker-compose.yml` (Redis + Taskiq config)

**Current Capacity:**
- Single Redis instance, default pool size
- No documented throughput limits
- No circuit breaker load shedding

**Scaling Path:**
1. Load test task queue with 1000+ concurrent jobs
2. Measure queue depth, processing latency, failure rates
3. Adjust Redis pool size and worker count
4. Implement circuit breakers for Facebook API calls
5. Add dead letter queue for failed tasks

**Timeline:** Pre-production (Sprint 9+)

---

## Dependencies at Risk

### React Compiler (Optional, Uninstalled)

**Risk:** Next.js comment indicates React compiler not installed but comments suggest it should be.

**Impact:**
- Performance optimizations available but not used
- Optional, not blocking
- Will need install when enabled

**Migration Plan:** Install `babel-plugin-react-compiler` when ready

**Priority:** LOW

---

### SendGrid Dependency Missing

**Risk:** SendGrid SDK not installed, but email service interface expects it.

**Impact:**
- Email feature incomplete
- Can be implemented when needed
- No production impact (in dev mode)

**Migration Plan:**
1. `pip install sendgrid` in `apps/api/pyproject.toml`
2. Create SendGrid API key in environment
3. Wire up SendGridEmailService in dependencies.py

**Timeline:** Before production email launch

---

## Missing Critical Features

### E2E Test: Rate Limiting Validation

**Feature:** Need real E2E test that verifies rate limiting behavior with actual Facebook API or mock server.

**Why Missing:** Test framework difficult to set up with request timing verification.

**Blocks:** Cannot trust rate limiting protection in production

**Fix:**
```typescript
// apps/tests/e2e/specs/facebook-oauth-rate-limiting.spec.ts
test("rate limiting blocks excessive requests", async ({ request }) => {
  const requests = [];
  const startTime = Date.now();

  for (let i = 0; i < 5; i++) {
    requests.push(request.post("/api/v1/facebook/authorize", {...}));
  }

  const responses = await Promise.all(requests);
  const statusCodes = responses.map(r => r.status());

  // Verify we get rate limit responses
  const rateLimited = statusCodes.filter(code => code === 429).length;
  expect(rateLimited).toBeGreaterThan(0); // Some requests rate limited
});
```

---

## Test Coverage Gaps

### OAuth Scenario: Account Linking Multiple Providers

**What's Not Tested:**
- User registers via Google OAuth
- Same user later authorizes Facebook OAuth
- Accounts should be linked to same user

**Files:**
- `apps/api/src/prosell/application/use_cases/auth/oauth_login.py` (lines 45-59)

**Risk:**
- Could create duplicate accounts (one per provider)
- User confusion when switching providers

**Test Missing:**
```python
async def test_oauth_link_existing_user_by_email():
    """Verify new OAuth provider links to existing user with same email."""
    # 1. Create user via Google OAuth
    # 2. Attempt login via Facebook OAuth with same email
    # 3. Verify single user exists, both providers linked
    pass
```

**Priority:** MEDIUM - Security/UX concern

---

### OAuth: Token Refresh Expiration Edge Case

**What's Not Tested:**
- Token expires between check and use
- Refresh token also expired (user needs re-auth)
- Race condition in concurrent refresh requests

**Files:**
- `apps/api/src/prosell/application/use_cases/facebook/refresh_token.py`

**Risk:**
- User blocked mid-operation if token expires
- No clear error message for stale credentials

**Priority:** LOW - Rare edge case

---

### Frontend: Dashboard State on Reload

**What's Not Tested:**
- User on protected dashboard
- Page refreshes
- Auth state correctly re-initialized

**Files:**
- `apps/web/src/stores/authStore.ts`
- `apps/web/src/middleware.ts`

**Risk:**
- User sees loading/error state during valid session
- Could appear as auth broken

**Priority:** MEDIUM - User-facing issue

---

## Roadmap Debt

### Sprint 9 Blocker: tenant_id Unresolved

**Debt Item:** "Asignar tenant_id en OAuth users"

**Reason it exists:**
- OAuth flow implemented before Organizations fully mature
- Needed for multi-tenancy in Catálogo Público

**Blocking:**
- Sprint 9 Catálogo Público implementation
- Any organization-scoped features for OAuth users

**Estimated fix:** 1 day (once Organizations complete)

**Reference:** `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md` (line 195)

---

### Sprint 8.5 "Quick Win" Assumes Unused Components

**Issue:** Landing page planned to reuse Sprint 5-6 product components, but public marketplace context is different.

**Potential Problems:**
- Components assume authenticated user context
- Organization filters may fail for public listing
- Product fields differ between public/private

**Mitigation:**
- Create dedicated public-context component wrapper
- Add feature flags for public vs. org contexts
- Test public components separately

**Reference:** `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md` (lines 159-180)

---

## Code Quality Notes

### TODO Comments - Status Overview

**Acceptable TODOs (documented feature gaps):**
1. `email_service.py` (61, 70, 78) - SendGrid integration (acceptable)
2. `detect_language.py` (6, 53) - User DB language preference (low priority)
3. `refresh_facebook_tokens.py` (22) - Phase 3 DI wiring (acceptable)

**Frontend TODOs (acceptable - not impactful):**
1. `profile/page.tsx` (11) - Fetch user data (acceptable)
2. `dashboard/page.tsx` (11, 31) - Fetch data, widgets (acceptable)

**Status:** ✅ All documented, no critical gaps

---

**Last Updated:** 2026-03-14
**Reviewer:** Codebase Mapper (concerns focus)
