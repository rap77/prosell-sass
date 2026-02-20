# Phases 1-4: Backend Testing (Critical Path)

> **Priority**: P0 (Critical) | **Total Tasks**: 18
> **Dependency**: Phase 0 complete
> **Estimated Tests**: ~212

---

## Phase 1: Domain Layer Unit Tests
> **Target Coverage**: 90%+

### Objective
Test all domain entities, value objects, and exceptions. Domain is pure Python with zero dependencies - fast and deterministic.

### 1.1 - User Entity Tests
- **File**: `apps/api/tests/unit/domain/test_user_entity.py`
- **Test Cases** (~20 tests):
  - `User.create()` factory method (default values, status, timestamps)
  - `user.is_locked()` - locked vs unlocked states
  - `user.can_login()` - all conditions (active, verified, not locked)
  - `user.record_failed_login()` - counter increment, lockout trigger
  - `user.reset_failed_attempts()` - counter reset, unlock
  - Edge cases: locked_until in past, exactly at max attempts, OAuth user (no password)
- **Pattern**: Table-driven tests with `@pytest.mark.parametrize`
- **Source**: `apps/api/src/prosell/domain/entities/user.py`

### 1.2 - Role & Permission Entity Tests
- **File**: `apps/api/tests/unit/domain/test_role_entity.py`
- **Test Cases** (~12 tests):
  - `RoleType` enum values (MASTER, MANAGER, SELLER_PROSELL, ORG_ADMIN, ORG_SELLER, CLIENT)
  - `ROLE_PERMISSIONS` mapping (each role has correct permissions)
  - Permission hierarchy (MASTER > MANAGER > ORG_ADMIN > ...)
  - Role entity creation and properties
- **Source**: `apps/api/src/prosell/domain/entities/role.py`

### 1.3 - Value Object Tests
- **File**: `apps/api/tests/unit/domain/test_value_objects.py`
- **Test Cases** (~15 tests):
  - `Email` VO: valid emails, invalid formats, disposable domain check
  - `UserStatus` enum: all status values, transitions
  - Immutability guarantees
- **Source**: `apps/api/src/prosell/domain/value_objects/`

### 1.4 - Domain Events & Exceptions Tests
- **File**: `apps/api/tests/unit/domain/test_events_exceptions.py`
- **Test Cases** (~10 tests):
  - All 7 domain events can be instantiated with correct data
  - All 10+ exceptions have correct messages and inheritance
  - Exception hierarchy (all inherit from base domain exception)
- **Source**: `apps/api/src/prosell/domain/events/`, `apps/api/src/prosell/domain/exceptions/`

### Checkpoint Gate 1
- [ ] All domain tests pass (~57 tests)
- [ ] Domain coverage >= 90%
- [ ] No domain code changes needed (or changes documented)

---

## Phase 2: Infrastructure Service Unit Tests
> **Target Coverage**: 80%+

### Objective
Test all infrastructure services in isolation. Mock external dependencies (Redis, DB, file system).

### 2.1 - Password Service Tests
- **File**: `apps/api/tests/unit/services/test_password_service.py`
- **Test Cases** (~10 tests):
  - `hash_password()` - produces valid bcrypt hash
  - `verify_password()` - correct matches, wrong fails
  - Round configuration (12 default)
  - Password validation rules (length, uppercase, number, special char)
  - Edge cases: empty password, 72+ char password (bcrypt limit), unicode
- **Source**: `apps/api/src/prosell/infrastructure/services/password_service.py`

### 2.2 - JWT Service Tests
- **File**: `apps/api/tests/unit/services/test_jwt_service.py`
- **Test Cases** (~15 tests):
  - `generate_access_token()` - payload contains sub, roles, type, exp, iat
  - `generate_refresh_token()` - correct expiration (7d default, 30d remember)
  - `verify_token()` - valid token decodes correctly
  - `verify_token()` - expired token raises ValueError
  - `verify_token()` - tampered token raises ValueError
  - `verify_token()` - wrong algorithm token fails
  - RS256 asymmetric key validation
  - Token type checking (access vs refresh)
- **Requires**: Test RSA key pair (generate in conftest.py)
- **Source**: `apps/api/src/prosell/infrastructure/services/jwt_service.py`

### 2.3 - TOTP Service Tests
- **File**: `apps/api/tests/unit/services/test_totp_service.py`
- **Test Cases** (~10 tests):
  - `generate_secret()` - produces valid base32 string
  - `generate_qr_code_uri()` - contains email and issuer
  - `generate_backup_codes()` - generates 10 unique codes
  - `verify_code()` - valid code passes within window
  - `verify_code()` - expired/invalid code fails
  - `verify_code()` - backup code verification
- **Source**: `apps/api/src/prosell/infrastructure/services/totp_service.py`

### 2.4 - Email Service Tests
- **File**: `apps/api/tests/unit/services/test_email_service.py`
- **Test Cases** (~8 tests):
  - `MockEmailService` - captures emails for testing
  - `send_verification_email()` - correct template/data
  - `send_password_reset_email()` - correct template/data
  - Service abstraction (port/adapter pattern works)
- **Source**: `apps/api/src/prosell/infrastructure/services/email_service.py`

### 2.5 - Test Configuration & Fixtures
- **File**: `apps/api/tests/conftest.py`
- **Setup**:
  - Test RSA key pair generation (in-memory, not file-based)
  - Test database URL override (SQLite async or test PostgreSQL)
  - Mock Redis client
  - Async test fixtures (`pytest-asyncio`)
  - Factory Boy factories for User, Role, Session entities
  - Common helpers (create_test_user, create_test_token)
- **File**: `apps/api/tests/unit/conftest.py` (unit-specific fixtures)

### Checkpoint Gate 2
- [ ] All service tests pass (~43 tests)
- [ ] Service coverage >= 80%
- [ ] Test infrastructure (conftest, factories) established
- [ ] No service code changes needed (or changes documented)

---

## Phase 3: Application Layer Unit Tests (Use Cases)
> **Target Coverage**: 85%+

### Objective
Test all use cases with mocked repositories and services. Verify business logic orchestration.

### 3.1 - RegisterUser Use Case Tests
- **File**: `apps/api/tests/unit/use_cases/test_register_user.py`
- **Test Cases** (~12 tests):
  - Successful registration (happy path)
  - Email already exists -> `EmailAlreadyExistsException`
  - Terms not accepted -> `ValueError`
  - Weak password -> `WeakPasswordException`
  - Email service called with verification email
  - User created with PENDING_VERIFICATION status
  - Password is hashed (not stored plain)
- **Mocks**: `user_repository`, `password_service`, `email_service`
- **Source**: `apps/api/src/prosell/application/use_cases/auth/register_user.py`

### 3.2 - LoginUser Use Case Tests
- **File**: `apps/api/tests/unit/use_cases/test_login_user.py`
- **Test Cases** (~18 tests):
  - Successful login (happy path, returns tokens)
  - User not found -> `InvalidCredentialsException`
  - Wrong password -> `InvalidCredentialsException` + failed attempts incremented
  - Account locked -> `AccountLockedException`
  - Email not verified -> `EmailNotVerifiedException`
  - 2FA enabled -> returns `requires_2fa=True` with temp token
  - Remember me -> 30-day refresh token
  - No remember me -> 7-day refresh token
  - Failed attempts counter resets on success
  - Account locks after 5 failed attempts
- **Mocks**: `user_repository`, `password_service`, `jwt_service`
- **Source**: `apps/api/src/prosell/application/use_cases/auth/login_user.py`

### 3.3 - VerifyEmail & ResetPassword Use Case Tests
- **File**: `apps/api/tests/unit/use_cases/test_verify_email.py`
- **File**: `apps/api/tests/unit/use_cases/test_reset_password.py`
- **Test Cases** (~15 tests combined):
  - Email verification: valid token -> user activated
  - Email verification: expired token -> error
  - Email verification: already verified -> idempotent or error
  - Password reset request: valid email -> sends email
  - Password reset request: unknown email -> no email sent (don't reveal)
  - Password reset confirm: valid token -> password updated
  - Password reset confirm: expired token -> error
  - Password reset confirm: used token -> error
- **Mocks**: `user_repository`, `email_service`, `password_service`

### 3.4 - 2FA Use Case Tests
- **File**: `apps/api/tests/unit/use_cases/test_2fa.py`
- **Test Cases** (~15 tests):
  - Enable 2FA: generates secret + QR URI + backup codes
  - Enable 2FA: already enabled -> error
  - Verify 2FA: valid code -> returns JWT tokens
  - Verify 2FA: invalid code -> error
  - Verify 2FA: backup code works + removes used code
  - Disable 2FA: with valid code -> clears secret
  - Disable 2FA: requires current code (security)
- **Mocks**: `user_repository`, `totp_service`, `jwt_service`

### 3.5 - RefreshToken & OAuthLogin Use Case Tests
- **File**: `apps/api/tests/unit/use_cases/test_refresh_token.py`
- **File**: `apps/api/tests/unit/use_cases/test_oauth_login.py`
- **Test Cases** (~12 tests combined):
  - Token refresh: valid refresh token -> new access token
  - Token refresh: expired refresh token -> error
  - Token refresh: revoked session -> error
  - OAuth login: new user -> creates account, skips email verification
  - OAuth login: existing email -> links account
  - OAuth login: invalid provider -> error

### Checkpoint Gate 3
- [ ] All use case tests pass (~72 tests)
- [ ] Use case coverage >= 85%
- [ ] Business logic validated end-to-end (mocked)
- [ ] All error paths tested

---

## Phase 4: API Integration Tests
> **Target Coverage**: 70%+

### Objective
Test FastAPI endpoints with TestClient against a real (test) database. Verify HTTP contracts, status codes, and error responses.

### 4.1 - Integration Test Infrastructure
- **File**: `apps/api/tests/integration/conftest.py`
- **Setup**:
  - Test database (separate PostgreSQL schema or SQLite async)
  - `AsyncClient` from `httpx` for async FastAPI testing
  - Database cleanup between tests (truncate or rollback)
  - Seed data fixtures (test user, test roles)
  - Override FastAPI dependencies for test DB session
- **Pattern**: Use `app.dependency_overrides` for DI in tests

### 4.2 - Auth Endpoint Integration Tests
- **File**: `apps/api/tests/integration/api/test_auth_endpoints.py`
- **Test Cases** (~20 tests):
  - `POST /api/auth/register` - 201 Created with valid data
  - `POST /api/auth/register` - 400 Bad Request (duplicate email)
  - `POST /api/auth/register` - 422 Validation Error (invalid email format)
  - `POST /api/auth/login` - 200 OK with tokens
  - `POST /api/auth/login` - 401 Unauthorized (wrong password)
  - `POST /api/auth/login` - 401 Unauthorized (unverified email)
  - `POST /api/auth/login` - 423 Locked (too many attempts)
  - `POST /api/auth/refresh` - 200 OK with new access token
  - `POST /api/auth/refresh` - 401 with expired refresh token
  - `GET /api/auth/me` - 200 OK with user data (authenticated)
  - `GET /api/auth/me` - 401 without token
  - `POST /api/auth/logout` - 200 OK
  - CORS headers present in responses
  - Content-Type is application/json

### 4.3 - 2FA Endpoint Integration Tests
- **File**: `apps/api/tests/integration/api/test_2fa_endpoints.py`
- **Test Cases** (~10 tests):
  - `POST /api/auth/2fa/enable` - 200 with QR code URI and backup codes
  - `POST /api/auth/2fa/verify` - 200 with JWT tokens
  - `POST /api/auth/2fa/disable` - 200 with valid code
  - Login flow with 2FA enabled
  - Full 2FA lifecycle: enable -> login -> verify -> disable

### 4.4 - Middleware & Security Integration Tests
- **File**: `apps/api/tests/integration/api/test_middleware.py`
- **Test Cases** (~10 tests):
  - JWT middleware: valid token passes
  - JWT middleware: expired token rejected
  - JWT middleware: tampered token rejected
  - RBAC middleware: correct role passes
  - RBAC middleware: insufficient role rejected
  - Rate limiting: requests within limit pass
  - Rate limiting: exceeded limit returns 429
  - Exception handlers: domain exceptions -> correct HTTP status codes

### Checkpoint Gate 4
- [ ] All integration tests pass (~40 tests)
- [ ] API coverage >= 70%
- [ ] HTTP contracts validated (status codes, response shapes)
- [ ] Middleware behavior verified

**MILESTONE**: After Phase 4, the backend is tested and validated. Phase 8 (Frontend Integration) can begin.
