# Phase 0: Environment Validation & Smoke Test

> **Priority**: P0 (Blocker) | **Tasks**: 5
> **Dependency**: None (first phase)
> **Status**: [ ] Pending

---

## Objective

Verify the existing backend code compiles, services start, and basic endpoints respond. This catches any rot from days of untouched code.

---

## Tasks

### 0.1 - Verify Python Environment
- Ensure `uv venv` is active with all dependencies installed
- Run `pyright` to check for type errors across all backend code
- Run `ruff check .` and `ruff format --check .` for linting
- **Pass Criteria**: Zero type errors, zero linting errors (or document known issues)
- **Files**: `apps/api/pyproject.toml`, `apps/api/src/prosell/**/*.py`

### 0.2 - Verify Docker Infrastructure
- Start PostgreSQL 17 and Redis 7.4 via Docker Compose
- Verify database connectivity (asyncpg)
- Verify Redis connectivity
- **Pass Criteria**: Both services reachable and healthy
- **Command**: `docker compose -f docker/docker-compose.yml up -d postgres redis`

### 0.3 - Run Alembic Migrations
- Apply migration `d1823b89fecb` (initial schema)
- Verify all 6 tables created: `users`, `roles`, `user_roles`, `sessions`, `user_tokens`, `oauth_accounts`
- Verify indexes are in place
- **Pass Criteria**: `alembic current` shows head revision
- **Command**: `cd apps/api && .venv/bin/alembic upgrade head`

### 0.4 - Start FastAPI Server
- Run the API server and verify health endpoint
- Verify Swagger docs load at `/docs`
- Check CORS middleware is configured
- **Pass Criteria**: `GET /health` returns `{"status": "healthy"}`
- **Command**: `cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --port 8000`

### 0.5 - Smoke Test Auth Endpoints
- Test `POST /api/auth/register` with valid data
- Test `POST /api/auth/login` with registered user
- Test `GET /api/auth/me` with JWT token
- Test `POST /api/auth/logout`
- **Pass Criteria**: All 4 endpoints respond with expected status codes
- **Validation**: Manual curl or httpie commands

---

## Checkpoint Gate 0

- [ ] Python environment clean (pyright + ruff pass)
- [ ] Docker services healthy (PostgreSQL + Redis)
- [ ] Alembic migrations applied (6 tables)
- [ ] FastAPI server running (/health responds)
- [ ] Basic auth flow works (register -> login -> me -> logout)

**Decision Point**: If smoke tests fail, fix issues before proceeding. Document any bugs found.
