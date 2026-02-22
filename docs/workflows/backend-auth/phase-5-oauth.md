# Phase 5: OAuth Implementation (Task #18)

> **Priority**: P1 (High) | **Tasks**: 8
> **Dependency**: Phase 4 complete
> **Estimated Tests**: ~91
> **PRP Reference**: Section 10.1 - Tarea #18
> **Status**: [ ] Pending

---

## Objective

Implement complete OAuth flow for Google and Facebook providers, following the PRP Section 10.1 specification. This is the largest single feature addition.

---

## Tasks

### 5.1 - OAuth Domain Entities

- **Files**:
  - `apps/api/src/prosell/domain/entities/oauth.py` - `OAuthConnection`, `OAuthState`
  - Verify/extend `apps/api/src/prosell/domain/repositories/oauth_repository.py`
- **Test File**: `apps/api/tests/unit/domain/test_oauth_entities.py` (~8 tests)
- **Details**:
  ```
  OAuthConnection: id, user_id, provider, provider_user_id, email,
                   access_token, refresh_token, token_expires_at, timestamps
  OAuthState: state_token, provider, redirect_uri, expires_at
  ```

### 5.2 - OAuth State Manager Service

- **File**: `apps/api/src/prosell/infrastructure/services/oauth/state_manager.py`
- Implement `generate_state()` with Redis storage (CSRF protection)
- Implement `verify_state()` with expiration check
- Cleanup for expired states
- **Test File**: `apps/api/tests/unit/services/test_oauth_state_manager.py` (~10 tests)

### 5.3 - Google OAuth Service

- **File**: `apps/api/src/prosell/infrastructure/services/oauth/google_service.py`
- `get_authorization_url()` - Build Google OAuth URL
- `exchange_code_for_token()` - Exchange auth code for access token (httpx)
- `get_user_info()` - Get user profile from Google
- **Test File**: `apps/api/tests/unit/services/test_google_oauth.py` (~15 tests, mocked httpx)

### 5.4 - Facebook OAuth Service

- **File**: `apps/api/src/prosell/infrastructure/services/oauth/facebook_service.py`
- Same pattern as Google service
- **Test File**: `apps/api/tests/unit/services/test_facebook_oauth.py` (~15 tests, mocked httpx)

### 5.5 - OAuth SQLAlchemy Model & Migration

- Verify existing `oauth_account_model.py` matches PRP spec
- Create Alembic migration if schema changes needed
- Implement `SqlAlchemyOAuthConnectionRepository` (verify/extend existing)
- Add indexes on `(user_id, provider)` and `provider_user_id`
- **Test File**: `apps/api/tests/integration/repositories/test_oauth_repository.py` (~8 tests)

### 5.6 - OAuth Use Cases

- **Files**:
  - `apps/api/src/prosell/application/use_cases/oauth/get_oauth_url.py`
  - `apps/api/src/prosell/application/use_cases/oauth/oauth_callback.py`
  - `apps/api/src/prosell/application/use_cases/oauth/link_oauth.py`
- **Callback Logic**:
  1. Verify state token (CSRF protection)
  2. Exchange code for provider access token
  3. Get user info from provider
  4. Check if OAuth connection exists
  5. If exists: get user, generate tokens
  6. If not: check email exists -> link or create new user
  7. Generate JWT tokens
- **Test Files**:
  - `apps/api/tests/unit/use_cases/test_get_oauth_url.py` (~5 tests)
  - `apps/api/tests/unit/use_cases/test_oauth_callback.py` (~15 tests)
  - `apps/api/tests/unit/use_cases/test_link_oauth.py` (~5 tests)

### 5.7 - OAuth API Router

- **File**: `apps/api/src/prosell/infrastructure/api/routers/oauth_router.py`
- **Endpoints**:
  - `GET /api/auth/oauth/google/url` - Get authorization URL
  - `GET /api/auth/oauth/facebook/url` - Get authorization URL
  - `POST /api/auth/oauth/google/callback` - Handle callback
  - `POST /api/auth/oauth/facebook/callback` - Handle callback
  - `POST /api/auth/oauth/link` - Link OAuth to authenticated user
- Register router in `main.py`
- Add DI dependencies in `dependencies.py`
- **Test File**: `apps/api/tests/integration/api/test_oauth_endpoints.py` (~10 tests)

### 5.8 - OAuth Environment Configuration

- Add OAuth env vars to `.env.example`, `.env.staging.example`, `.env.production.example`
- Update `core/config.py` if needed for new OAuth settings
- Environment variables needed:
  ```
  GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
  FACEBOOK_OAUTH_APP_ID, FACEBOOK_OAUTH_APP_SECRET, FACEBOOK_OAUTH_REDIRECT_URI
  ```

---

## Checkpoint Gate 5

- [ ] All OAuth tests pass (~91 tests)
- [ ] OAuth state tokens work with Redis
- [ ] Google OAuth flow works end-to-end (mocked provider)
- [ ] Facebook OAuth flow works end-to-end (mocked provider)
- [ ] User linking logic works (new user, existing email, existing OAuth)
- [ ] CSRF protection via state tokens validated
- [ ] OAuth router registered and documented in Swagger
