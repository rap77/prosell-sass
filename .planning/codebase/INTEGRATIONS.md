# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**Authentication (OAuth 2.0):**
- Google OAuth - User social login
  - SDK/Client: `python-jose[cryptography]`, `httpx`
  - Implementation: `apps/api/src/prosell/infrastructure/services/oauth_service_impl.py`
  - Auth env vars: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
  - Redirect URI: `http://localhost:8000/api/auth/oauth/google/callback`
  - Endpoints: `POST /api/v1/auth/oauth/google/auth-url`, `POST /api/v1/auth/oauth/google/callback`

- Facebook OAuth - User social login & marketplace scraping
  - SDK/Client: `httpx`
  - Implementation: `apps/api/src/prosell/infrastructure/services/facebook_marketplace_oauth_service.py`
  - Auth env vars: `FACEBOOK_OAUTH_APP_ID`, `FACEBOOK_OAUTH_APP_SECRET`
  - Encryption: `FACEBOOK_ENCRYPTION_KEY` (32-byte AES encryption for access tokens)
  - Redirect URI: `http://localhost:8000/api/auth/oauth/facebook/callback`
  - Endpoints: `POST /api/v1/auth/oauth/facebook/auth-url`, `POST /api/v1/auth/oauth/facebook/callback`
  - Token refresh: Scheduled task refreshes tokens 48 hours before expiry

**Payments:**
- Stripe - Payment processing for token packages
  - SDK/Client: `stripe>=11.0.0`
  - Auth env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Price IDs: `STRIPE_PRICE_ID_TOKENS_100`, `STRIPE_PRICE_ID_TOKENS_500`, `STRIPE_PRICE_ID_TOKENS_1000`
  - Used for wallet prepaid tokens (100, 500, 1000 packages)
  - Webhook endpoint: Stripe signature verification via `STRIPE_WEBHOOK_SECRET`

**Email:**
- SendGrid - Transactional email service
  - SDK/Client: `sendgrid>=6.11.0`
  - Auth: `SENDGRID_API_KEY`
  - Implementation: `apps/api/src/prosell/infrastructure/services/email_service.py`
  - From address: `noreply@prosell.saas` (configurable via `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`)
  - Features: Verification emails, password reset, 2FA notifications
  - Mock mode: `USE_MOCK_EMAIL=true` (logs to console in development)

**AI Services:**
- Anthropic Claude - Conversational AI agents
  - SDK/Client: `anthropic>=0.40.0`
  - Used for AI assistant features (conversation, recommendations)
  - Auth: Environment variable (specific name not detected in current codebase)

**VIN Decoding:**
- NHTSA API - Vehicle identification number decoding
  - SDK/Client: `httpx` (async HTTP client)
  - Implementation: `apps/api/src/prosell/infrastructure/services/nhtsa_vin_service.py`
  - Public API (no authentication required)
  - Used for vehicle data enrichment

## Data Storage

**Databases:**
- PostgreSQL 17 (Primary relational database)
  - Connection: `DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/prosell_dev`
  - Client: SQLAlchemy 2.0.36+ with async support
  - Driver: `asyncpg>=0.30.0` for async connections
  - Pool size: Default 10, max overflow 20 (configurable)
  - Location: Docker service `prosell-db` on port 5432
  - Migrations: Alembic in `apps/api/alembic/`

**File Storage:**
- DigitalOcean Spaces (S3-compatible object storage)
  - Provider: DigitalOcean (S3-API compatible)
  - SDK/Client: `boto3>=1.35.0` (AWS SDK, works with S3-compatible APIs)
  - Implementation: `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`
  - Interface: `apps/api/src/prosell/application/ports/ido_spaces.py`
  - Auth env vars: `DO_ACCESS_KEY_ID`, `DO_SECRET_ACCESS_KEY`
  - Region: `DO_REGION` (default: `nyc3`)
  - Bucket: `DO_BUCKET_NAME` (default: `prosell-assets`)
  - CDN: Optional CDN endpoint via `DO_CDN_ENDPOINT`
  - Features: Presigned upload URLs for direct browser uploads (CORS)

**Caching:**
- Redis 7.4+ (In-memory cache and session store)
  - Connection: `REDIS_URL=redis://localhost:6379/0`
  - Location: Docker service `prosell-redis` on port 6379
  - Uses:
    - Session storage (JWT refresh tokens, OAuth state tokens)
    - General caching layer
    - Task queue broker (Taskiq)
  - Max connections: 50 (configurable)
  - Persistence: Redis Append-Only File (AOF) enabled in docker-compose

**Task Queue:**
- Taskiq 0.12.1 with Redis broker - Async background job processing
  - Broker: `taskiq-redis>=1.2.2` (Redis transport)
  - Connection: Uses `REDIS_URL` from main settings
  - Configuration: `apps/api/src/prosell/infrastructure/tasks/broker.py`
  - Worker: `apps/api/src/prosell/infrastructure/tasks/worker.py`
  - Use cases:
    - Email sending
    - Token refresh scheduling
    - Data scraping (Facebook Marketplace)
    - Cleanup tasks
  - Timeout: 300 seconds default (configurable)
  - Retries: 3 attempts (configurable)
  - Max workers: 4 (configurable)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `apps/api/src/prosell/infrastructure/security/`
  - Token type: JWT with RSA-256 signing
  - Keys: Private key at `keys/private.pem`, public key at `keys/public.pem`
  - Access token expiry: 60 minutes (configurable)
  - Refresh token expiry: 7 days (configurable)
  - Storage: Cookies with `httpOnly` flag (parsed from request cookies)

**2FA:**
- TOTP (Time-based One-Time Password)
  - SDK/Client: `pyotp>=2.9.0`
  - User generates QR code via `qrcode[pil]>=8.0`
  - Feature flag: `FEATURE_2FA_ENABLED` (default: true)

**Rate Limiting:**
- slowapi framework
  - SDK/Client: `slowapi>=0.1.9`
  - Storage backend: Memory (default) or Redis
  - Config: `RATE_LIMIT_STORAGE` (redis/memory)
  - Default limit: 60 requests per minute
  - Burst size: 10 requests
  - By IP: `RATE_LIMIT_BY_IP` (enabled)
  - By user: `RATE_LIMIT_BY_USER` (enabled)
  - Trust proxy headers: `RATE_LIMIT_TRUST_PROXY` (enabled)

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional integration)
  - SDK: Not explicitly detected in dependencies
  - Config: `SENTRY_DSN` environment variable (optional)
  - Not currently configured in code

**Logs:**
- Console/stdout logging
  - Implementation: Python `logging` module
  - Format: JSON or text (configurable via `LOG_FORMAT`)
  - Level: DEBUG, INFO, WARNING, ERROR (configurable via `LOG_LEVEL`)
  - Settings: `apps/api/src/prosell/core/config.py`

**Health Checks:**
- FastAPI health endpoint
  - `GET /api/v1/health` - Basic health check
  - `GET /api/v1/health/integrations` - Integration status (Redis, PostgreSQL, etc.)
  - Circuit breaker pattern for integration health (OPEN/CLOSED/HALF_OPEN states)

## CI/CD & Deployment

**Hosting:**
- Docker containers (production-ready)
  - API: `docker/api.Dockerfile` - Python 3.13 + FastAPI
  - Web: `docker/web.Dockerfile` - Node.js 22 + Next.js
  - Orchestration: Docker Compose for local dev/testing

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
  - Python linting: Ruff check and format
  - Python type checking: Pyright strict mode
  - Python testing: pytest with coverage reporting
  - JavaScript linting: ESLint + Prettier
  - JavaScript testing: Vitest with coverage
  - Build: Turborepo full build
  - E2E tests: Playwright (chromium browser)
  - Triggers: Push to main, pull requests to main

**Deployment:**
- Environment: Docker + Docker Compose
- Services orchestrated:
  - PostgreSQL 17 (database)
  - Redis 7.4 (cache/queue)
  - FastAPI API (port 8000)
  - Next.js web (port 3000)
  - Ngrok tunnel (port 4040) - For OAuth HTTPS tunnel in development

## Environment Configuration

**Required env vars (non-secret):**
- `ENVIRONMENT` - App environment (development/staging/production/testing)
- `DEBUG` - Debug mode (true/false)
- `API_HOST` - API bind address (default: 0.0.0.0)
- `API_PORT` - API port (default: 8000)
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARNING/ERROR)
- `FEATURE_2FA_ENABLED` - Toggle 2FA (default: true)
- `FEATURE_OAUTH_GOOGLE` - Toggle Google OAuth (default: true)
- `FEATURE_OAUTH_FACEBOOK` - Toggle Facebook OAuth (default: false)
- `FEATURE_REGISTRATION_ENABLED` - Toggle registration (default: true)
- `FEATURE_PASSWORD_RESET` - Toggle password reset (default: true)
- `NEXT_PUBLIC_API_URL` - Frontend API URL (default: http://localhost:8000)

**Secrets location:**
- `.env` file (git-ignored, load via Pydantic BaseSettings)
- Environment variables at runtime (preferred for production)
- GitHub Actions secrets (for CI/CD)

**Required secrets:**
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `FACEBOOK_OAUTH_APP_ID` / `FACEBOOK_OAUTH_APP_SECRET`
- `FACEBOOK_ENCRYPTION_KEY` (32-byte AES key for token encryption)
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `DO_ACCESS_KEY_ID` / `DO_SECRET_ACCESS_KEY`
- `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` (paths to RSA key files)

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks - Payment events
  - Endpoint: To be configured in Stripe dashboard
  - Verification: `STRIPE_WEBHOOK_SECRET` signature verification
  - Events: payment_intent.succeeded, payment_intent.failed, etc.

- OAuth callbacks - Social login completion
  - Google: `http://localhost:8000/api/v1/auth/oauth/google/callback`
  - Facebook: `http://localhost:8000/api/v1/auth/oauth/facebook/callback`
  - Handled by use cases: `OAuthCallbackUseCase` with CSRF token validation (state parameter)

**Outgoing:**
- Email notifications (SendGrid)
  - Verification emails
  - Password reset emails
  - 2FA enabled notifications
  - No webhooks; direct API calls

- Scheduled token refresh (Taskiq workers)
  - Facebook token refresh before expiry
  - Runs periodically via background task queue

---

*Integration audit: 2026-03-14*
