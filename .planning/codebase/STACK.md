# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- Python 3.13+ (Free-threading enabled) - Backend API, task workers, database migrations
- TypeScript 5.5+ (Strict mode) - Frontend web application
- JavaScript/Node.js 22 - Node runtime for frontend build tools

**Secondary:**
- YAML - Configuration files (docker-compose, GitHub Actions)
- SQL - PostgreSQL database queries via SQLAlchemy ORM

## Runtime

**Environment:**
- Python 3.13 (via `uv` package manager)
- Node.js 22 (via `pnpm`)

**Package Managers:**
- `uv` (Rust-based) - Python dependency management (10-100x faster than pip)
  - Config: `apps/api/pyproject.toml`
  - Lockfile: `apps/api/uv.lock` (auto-managed)
- `pnpm` 9.15.1 - JavaScript/Node package manager (monorepo aware)
  - Config: Root `package.json`, `pnpm-workspace.yaml`
  - Lockfile: `pnpm-lock.yaml`

## Frameworks

**Core Backend:**
- FastAPI 0.115+ - Async REST API framework with OpenAPI/Swagger
- Uvicorn 0.30+ - ASGI server (dependency via `fastapi[standard]`)
- SQLAlchemy 2.0.36+ - Async ORM with `select()` API, async driver `asyncpg 0.30+`
- Pydantic 2.12+ - Data validation and serialization (5-50x faster than v1)
- Alembic 1.14+ - Database schema migrations with auto-generate

**Core Frontend:**
- Next.js 16.1+ - React framework with App Router, Turbopack bundler
- React 19.2+ - UI library with Server Components support
- TailwindCSS 3.4.17 - Utility-first CSS framework
- shadcn/ui (via Radix components) - Accessible component library

**State Management:**
- Zustand 5.x - Lightweight state management (React)
- TanStack Query (React Query) 5.x - Server state and data fetching
- Redux patterns (if any) - Not detected in current codebase

**Forms & Validation:**
- React Hook Form 7.x - Performant form handling
- Zod 3.x - TypeScript-first schema validation

**Testing (Backend):**
- pytest 8.3+ - Test runner with async support (`pytest-asyncio 0.24+`)
- pytest-cov 6.0+ - Coverage reporting
- factory-boy 3.3+ - Test data factories
- faker 30+ - Fake data generation
- httpx 0.28+ - Async HTTP client for testing

**Testing (Frontend):**
- Vitest 2.1+ - Vite-native unit test runner
- Playwright 1.49+ (browser automation framework for E2E tests)
- @testing-library/react 16.1+ - Component testing utilities
- @testing-library/jest-dom 6.6+ - Custom matchers
- jsdom 25+ - DOM implementation for Vitest

**Build & Dev Tools:**
- Turborepo 2.3+ - Monorepo orchestration and caching
- Turbopack (Next.js default) - Fast bundler written in Rust
- Ruff 0.8+ - Rust-based Python linter (replaces flake8, black, isort)
- ESLint 9.39+ - JavaScript/TypeScript linting
- Prettier 3.4+ - Code formatter (JavaScript, Python via pre-commit)
- TypeScript 5.5+ - Type checking
- Pyright 1.1.390+ - Static type checker for Python (strict mode)

**Utility Libraries:**
- lucide-react 0.400+ - Icon library
- sonner 2.0+ - Toast notifications
- swr 2.4+ - Data fetching hook (complementary to TanStack Query)
- class-variance-authority 0.7+ - Component variant generation
- clsx/tailwind-merge 2.x - CSS class merging utilities

## Key Dependencies

**Critical (Runtime):**
- `fastapi[standard]>=0.115.0` - Web framework with all standard extras
- `sqlalchemy[asyncio]>=2.0.36` - Async ORM
- `asyncpg>=0.30.0` - PostgreSQL async driver for SQLAlchemy
- `pydantic>=2.12.0` - Data validation and settings
- `pydantic-settings>=2.7.0` - Environment-based configuration
- `redis>=5.2.0` - Redis client for caching and sessions
- `taskiq[redis]>=0.12.1` - Async task queue broker
- `taskiq-redis>=1.2.2` - Redis transport for Taskiq

**Authentication & Security:**
- `pyjwt>=2.9.0` - JWT token handling
- `passlib[bcrypt]>=1.7.4` - Password hashing with bcrypt
- `bcrypt>=4.2.0` - Cryptographic library for password hashing
- `cryptography>=43.0.0` - Token encryption (AES-256 for OAuth tokens)
- `pyotp>=2.9.0` - TOTP/2FA authentication
- `python-jose[cryptography]>=3.3.0` - OAuth and JWT (for Google/Facebook OAuth)
- `slowapi>=0.1.9` - Rate limiting middleware

**External Integrations:**
- `httpx>=0.28.0` - Async HTTP client for OAuth flows and external APIs
- `boto3>=1.35.0` - AWS SDK for DigitalOcean Spaces (S3-compatible)
- `stripe>=11.0.0` - Stripe payments SDK
- `sendgrid>=6.11.0` - SendGrid email service SDK
- `anthropic>=0.40.0` - Anthropic Claude API for AI features

**Utilities:**
- `python-multipart>=0.0.18` - FastAPI form data parsing
- `qrcode[pil]>=8.0` - QR code generation

**Development:**
- `ruff>=0.8.0` - Rust-based linter and formatter
- `pyright>=1.1.390` - Static type checker (strict mode)
- `pre-commit>=4.0.0` - Git pre-commit hooks for CI/linting
- `pytest>=8.3.0` - Test runner
- `pytest-asyncio>=0.24.0` - Async test support
- `pytest-cov>=6.0.0` - Coverage reporting
- `factory-boy>=3.3.0` - Test factories
- `faker>=30.0.0` - Fake data generation

## Configuration

**Backend Environment:**
- `.env` file in root with application configuration
- `apps/api/src/prosell/core/config.py` - Pydantic BaseSettings class
  - Database URL (PostgreSQL with asyncpg driver)
  - Redis URL for caching and task queue
  - JWT RSA keys (paths to `keys/private.pem` and `keys/public.pem`)
  - OAuth credentials (Google, Facebook)
  - DigitalOcean Spaces credentials
  - Stripe API keys
  - SendGrid API key
  - Rate limiting settings
  - Feature flags (2FA, OAuth providers, registration, password reset)

**Frontend Environment:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:8000`)
- Configured in `apps/web/next.config.ts` with rewrites for `/api/*` proxy

**Build Configuration:**
- `turbo.json` (root) - Turborepo task orchestration
- `pnpm-workspace.yaml` - Monorepo workspace definition
- `pyproject.toml` (backend) - Python project metadata, dependencies, tool configs
- `package.json` (root, web) - JavaScript dependencies and scripts
- `tsconfig.json` (root, web) - TypeScript compiler options (strict mode)
- `next.config.ts` - Next.js configuration with API rewrites and package optimization

**Linting & Type Checking:**
- `.ruff.toml` embedded in `pyproject.toml`:
  - Python 3.13 target
  - Line length: 100 characters
  - Linters: E, W, F, I, N, UP, B, C4, SIM, ARG, PTH, RUF
  - isort plugin for import ordering
- `pyright` in `pyproject.toml`:
  - Type checking mode: `strict`
  - Python version: 3.13
- `.eslintrc` for JavaScript/TypeScript (not read due to permissions)
- `prettier` configuration for code formatting

**Test Configuration:**
- `pytest.ini_options` in `pyproject.toml`:
  - Test paths: `tests/`
  - Async mode: `auto`
  - Verbosity: `-v`, short traceback
- `vitest.config.ts` (web) - Test runner configuration
- `playwright.config.ts` (tests/e2e) - E2E test configuration

## Platform Requirements

**Development:**
- macOS/Linux/WSL2 with Docker
- Python 3.13+ with uv installed
- Node.js 22 with pnpm 9.15.1
- Docker & Docker Compose (for local database/Redis)
- Git with pre-commit hooks

**Production:**
- Docker container deployment (apps/api, apps/web)
- PostgreSQL 17 database
- Redis 7.4+ for caching and task queue
- HTTPS reverse proxy (for OAuth redirects)
- Environment variables for credentials and configuration

**External Service Requirements:**
- PostgreSQL 17 (database)
- Redis 7.4+ (caching, task queue, OAuth state token storage)
- Google OAuth 2.0 credentials (client ID, secret)
- Facebook OAuth 2.0 app credentials (app ID, secret)
- DigitalOcean Spaces credentials (access key, secret)
- Stripe API credentials (secret key, publishable key, webhook secret)
- SendGrid API key
- Anthropic Claude API key (optional, for AI features)

---

*Stack analysis: 2026-03-14*
