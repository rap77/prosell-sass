# Phases 6-8: Security, Monitoring & Frontend Integration

> **Priority**: P1-P2 | **Total Tasks**: 14
> **Dependency**: Phase 4+ complete (Phase 5 for full OAuth integration)

---

## Phase 6: Security Hardening

> **Priority**: P1 (High) | **Tasks**: 5
> **PRP Reference**: Section 13 - Security Considerations

### Objective

Implement OWASP-compliant security measures. Address gaps identified in PRP.

### 6.1 - Security Headers Middleware

- **File**: `apps/api/src/prosell/infrastructure/api/middleware/security_headers.py`
- Headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security, Content-Security-Policy
- Register in `main.py`
- **Test File**: `apps/api/tests/integration/api/test_security_headers.py` (~5 tests)

### 6.2 - Rate Limiting Enhancement

- Verify `rate_limit_middleware.py` uses slowapi correctly
- Configure per-endpoint limits:
  - `/api/auth/register`: 3/hour per IP
  - `/api/auth/login`: 10/minute per IP
  - `/api/auth/2fa/verify`: 5/minute per IP
  - `/api/auth/password/reset`: 3/hour per IP
- **Test File**: `apps/api/tests/integration/api/test_rate_limiting.py` (~8 tests)

### 6.3 - Password Validation Enhancement

- Verify `password_service.py` validates:
  - Minimum 8 characters
  - At least 1 uppercase, 1 number, 1 special character
  - NOT in common password list
- **Tests**: Augment `test_password_service.py` (~5 additional tests)

### 6.4 - Email Security

- Verify `email.py` value object checks:
  - Valid format (RFC 5322)
  - Not a disposable email domain
  - Domain has MX record (optional)
- **Tests**: Augment `test_value_objects.py` (~5 additional tests)

### 6.5 - Session Security

- Session fixation prevention (regenerate on login)
- Concurrent session limits per user
- Session revocation on password change
- Secure token storage (hash refresh tokens before DB)
- **Test File**: `apps/api/tests/unit/test_session_security.py` (~8 tests)

### Checkpoint Gate 6

- [ ] Security headers on all responses
- [ ] Rate limiting configured per endpoint
- [ ] Password validation OWASP compliant
- [ ] Email validation includes disposable domain check
- [ ] Session security hardened

---

## Phase 7: Monitoring, Performance & Observability

> **Priority**: P2 (Medium) | **Tasks**: 4
> **PRP Reference**: Sections 14 and 16

### Objective

Production-grade monitoring, logging, and performance optimization.

### 7.1 - Structured Logging

- JSON format logging for auth events
- Log: login attempts, registration, password resets, 2FA events, OAuth flows
- Security event logging: failed logins, lockouts, suspicious activity
- **Pattern**: Python `structlog` or `logging` with JSON formatter
- **File**: `apps/api/src/prosell/infrastructure/logging/auth_logger.py`

### 7.2 - Health Check Enhancement

- **Endpoint**: `GET /health/auth`
- Check: database, Redis, JWT key availability
- Detailed health status with component breakdown
- **File**: Update `apps/api/src/prosell/infrastructure/api/main.py`
- **Test File**: `apps/api/tests/integration/api/test_health.py` (~5 tests)

### 7.3 - Database Performance

- Verify indexes on high-traffic columns:
  - `users.email` (unique)
  - `users.status` (filtered queries)
  - `sessions.token_hash` (unique, lookups)
  - `sessions.expires_at` (cleanup)
  - `oauth_accounts.provider, provider_user_id` (composite)
- Query optimization: no N+1 queries
- **File**: New Alembic migration if indexes missing

### 7.4 - Redis Caching Strategy

- Cache user sessions in Redis (reduce DB hits)
- Cache RBAC permissions per user (TTL: 5 min)
- Invalidate cache on role/permission changes
- **File**: `apps/api/src/prosell/infrastructure/cache/auth_cache.py`
- **Test File**: `apps/api/tests/unit/test_auth_cache.py` (~8 tests)

### Checkpoint Gate 7

- [ ] Structured logging operational
- [ ] `/health/auth` returns component health
- [ ] Database indexes verified
- [ ] Redis caching reduces DB queries
- [ ] No N+1 queries in auth flows

---

## Phase 8: Frontend-Backend Integration

> **Priority**: P1 (High) | **Tasks**: 5
> **Dependency**: Phase 4+ complete (can start before Phases 5-7)
> **Note**: This connects the already-complete frontend to the validated backend

### Objective

Connect the existing frontend (100% complete with mocks) to the real backend API. Remove all development workarounds.

### 8.1 - Remove Development Workarounds

- Remove `NEXT_PUBLIC_DEV_DISABLE_API=true` from `.env.local`
- Remove `fetchWithFallback()` wrapper in `authStore.ts`
- Update API base URL to point to FastAPI backend (`http://localhost:8000`)
- **Files**: `apps/web/.env.local`, `apps/web/src/stores/authStore.ts`

### 8.2 - API Client Configuration

- Configure API client to use FastAPI backend URL
- Add JWT token injection (Authorization: Bearer header)
- Add token refresh interceptor (auto-refresh on 401)
- Handle CORS between Next.js (3000) and FastAPI (8000)
- **Files**: `apps/web/src/lib/auth/api.ts` or similar

### 8.3 - Server Actions for Cookies

- Implement Next.js Server Actions for httpOnly cookie management
- Replace client-side cookie logic with server-side handlers
- **Files**: `apps/web/src/app/actions/auth.ts`
- **Known Issue**: `cookies.ts` uses `next/headers` but imported by Client Components

### 8.4 - OAuth Frontend Integration

- Create `apps/web/src/app/auth/callback/google/page.tsx`
- Create `apps/web/src/app/auth/callback/facebook/page.tsx`
- Update `OAuthButtons.tsx` (remove mock callbacks, call real backend)
- Handle OAuth error states (access denied, invalid state)
- **Depends On**: Phase 5 (OAuth backend)

### 8.5 - Integration E2E Validation

- Run existing Playwright E2E tests against real backend
- Fix any tests that assumed mock behavior
- Add new E2E tests for full backend integration
- Verify all 37+ existing E2E specs still pass
- **Command**: `cd tests/e2e && pnpm test`

### Checkpoint Gate 8

- [ ] Frontend connects to real FastAPI backend
- [ ] No more mock/workaround code
- [ ] Auth flow works end-to-end (register -> verify -> login -> dashboard)
- [ ] OAuth flow works end-to-end (redirect -> callback -> dashboard)
- [ ] All E2E tests pass against real backend

---

## Final Milestone

After all phases complete:

- **Backend**: ~347 tests passing, 80%+ coverage
- **Frontend**: 316 tests + E2E against real backend
- **Security**: OWASP compliant, rate limited, session hardened
- **Monitoring**: Structured logs, health checks, caching
- **Integration**: Frontend and backend connected, no mocks
