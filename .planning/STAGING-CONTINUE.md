---
phase: staging-deployment
task: testing
total_tasks: 5
status: blocked
last_updated: 2026-04-02T03:43:53.206Z
---

<current_state>
Testing ProSell SaaS staging deployment. All 4 Docker containers healthy (API, Web, DB, Redis).
Blocked by Pydantic 2 serialization bug where FastAPI endpoints return JSON schema instead of actual values.
</current_state>

<completed_work>

- **Docker Health Checks**: Fixed all 4 container health checks
  - API: Added /api/v1/health/ endpoint with Pydantic models
  - API: Installed curl in Dockerfile for health checks
  - Web: Changed localhost → 127.0.0.1 (IPv6 fix)
  - All containers now healthy

- **Infrastructure**: Verified all services running
  - API: http://localhost:8000
  - Web: http://localhost:3000
  - DB: PostgreSQL 17 on port 5432
  - Redis: 7.4 on port 6379

- **Redis Configuration**: Fixed REDIS_URL placeholder
  - Changed from CHANGE_ME_REDIS_PASSWORD to ${REDIS_PASSWORD}
  - Connection verified working

</completed_work>

<remaining_work>

- **BLOCKER**: Fix Pydantic 2 serialization bug
  - Symptoms: Endpoints return `{"status": "string"}` instead of `{"status": "healthy"}`
  - Affects: All endpoints using `response_model=BaseModel`
  - Workaround: Endpoints returning raw dict work (e.g., /ping)
  - Files affected: main.py, health_router.py

- **Testing E2E** (after bug fix):
  - User registration: POST /api/v1/auth/register
  - User login: POST /api/v1/auth/login
  - Vehicle CRUD: /api/v1/vehicles endpoints
  - OAuth flow verification

- **Smoke Tests** (after bug fix):
  - Create organization
  - Create vehicle with all fields
  - Bulk upload CSV
  - Dealer assignment

</remaining_work>

<decisions_made>

- Use 127.0.0.1 instead of localhost for Web health check (BusyBox wget + IPv6 issue)
- Keep response_model for proper type safety (need to fix serialization, not remove it)
- Staging runs on localhost with Docker Compose (not production domain yet)

</decisions_made>

<blockers>

- **Pydantic 2 + FastAPI serialization bug**:
  - When `response_model=BaseModel` is used, FastAPI returns schema JSON instead of values
  - Example: `{"status": "string"}` instead of `{"status": "healthy"}`
  - Workaround: Raw dict returns work (e.g., `/ping` endpoint)
  - Needs investigation: FastAPI version, Pydantic config, or middleware issue

- **Missing .env.staging configuration**:
  - REDIS_URL had placeholder that was manually fixed
  - OAuth credentials may need verification
  - SendGrid API key is configured but not tested

</blockers>

<context>

We were testing the staging deployment after completing all infrastructure setup. The health checks were all failing initially:
- API: Missing curl in Dockerfile, missing /api/v1/health endpoint
- Web: IPv6 resolution issue (localhost → ::1, Next.js only listens on IPv4 0.0.0.0)
- Redis: Placeholder password in REDIS_URL

After fixing these, we discovered a critical Pydantic 2 serialization bug affecting all endpoints. The /ping endpoint works because it returns raw dict, but endpoints with response_model=BaseModel return schema instead of values.

This is blocking all E2E testing since auth endpoints return invalid JSON.

</context>

<next_action>

1. **Investigate Pydantic serialization bug**:
   - Check FastAPI version compatibility with Pydantic 2
   - Look for custom JSON encoders or middleware
   - Test with `app.serialize = False` or similar
   - May need to downgrade Pydantic or upgrade FastAPI

2. **Once bug is fixed**, continue E2E testing:
   - Register user: POST /api/v1/auth/register
   - Login: POST /api/v1/auth/login
   - Create vehicle: POST /api/v1/vehicles
   - Verify data in PostgreSQL

3. **Files modified but not committed**:
   - apps/api/src/prosell/infrastructure/api/routers/health_router.py
   - apps/api/src/prosell/infrastructure/api/main.py
   - docker/api.Dockerfile
   - docker/docker-compose.staging.yml

</next_action>

<files_modified>
- apps/api/src/prosell/infrastructure/api/routers/health_router.py (Pydantic models added)
- apps/api/src/prosell/infrastructure/api/main.py (response_model added/removed)
- docker/api.Dockerfile (curl installed)
- docker/docker-compose.staging.yml (127.0.0.1 fix)
- .env.staging (REDIS_URL manually fixed by user)
</files_modified>
