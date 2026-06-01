# Project Adapter Template

## 1. Project Identity

- **Project name:** prosell-sass
- **Project type:** SaaS monorepo (vehicle market analysis platform)
- **Primary niche:** Vehicle dealership analytics and market intelligence
- **Secondary niches:** Public marketplace (SEO), automated scraping (Facebook Marketplace), ML price predictions
- **Owner/team:** Rafael Padrón (GDE, Senior Architect)
- **Start date:** ~2025 (git history shows active development through 2026-05)

## 2. Project Goal

Provide dealerships with a unified platform that combines: (1) a public marketplace for vehicle buyers, (2) SaaS analytics with real-time market intelligence, (3) automated multi-marketplace scraping (Facebook Marketplace primary), and (4) ML-driven price prediction and recommendations — all under a multi-tenant architecture.

## 3. Why MasterMind Is Being Used Here

MasterMind is being used to orchestrate the multi-brain consultation model (7+1 specialized brains) for this complex full-stack project. The project involves:

- **Multi-project execution**: monorepo with apps/api (Python/FastAPI) and apps/web (Next.js/React) requiring coordinated evolution
- **Smart token management**: routing between Claude, OpenRouter, and z.ai backends via MM-Flow
- **Night Mode**: autonomous 8-hour execution sessions for long-running tasks (e.g., E2E test suites, alembic migrations)
- **Shared PostgreSQL**: mastermind_bd with Row-Level Security isolation between orgs/projects
- **Canonical documentation**: 8-brains architecture (Product Strategy, UX Research, UI Design, Frontend, Backend, QA/DevOps, Growth/Data, Master Interviewer) for expert consultation

## 4. Project Constraints

- **Technical constraints:**
  - Python >=3.13 (free-threaded), FastAPI 0.115+, Pydantic 2.12+, SQLAlchemy 2.0.36+ async
  - Next.js 16.1+ (Turbopack), React 19.2, TypeScript 5.5+ strict, TailwindCSS 4.0
  - PostgreSQL 17, Redis 7.4+ (async I/O everywhere)
  - Clean Architecture: Domain → Application → Infrastructure with strict dependency rule
  - Domain layer has ZERO external dependencies (pure Python)

- **Business constraints:**
  - Multi-tenant: all aggregates include tenant_id (IDOR prevention via JWT context, never request body)
  - Auth via httpOnly cookies (access_token, refresh_token) with SameSite=Lax for OAuth cross-site
  - Status updates always as body JSON, never query params

- **Regulatory constraints:**
  - JWT + OAuth2 + TOTP (2FA) for authentication
  - Security hardening: no hardcoded secrets, RLS isolation

- **Timeline constraints:**
  - MVP production-ready as of 2026-05-28 (1124 Python tests, 840 frontend tests, E2E suite green)
  - Single linear alembic timeline (head: e1f2a3b4c5d6)

- **Risk constraints:**
  - A11y: sidebar dark mode contrast 2.4:1 (WCAG AA minimum is 4.5:1) — non-blocking for go-live
  - A11y: h3 without preceding h2 in dashboard; two `<aside>` without differentiating aria-label

## 5. Selected Brains

### Core/meta-brains involved

- [x] Platform Architecture Brain — Clean Architecture enforcement, dependency rule, multi-tenant design
- [x] Agent Runtime & LLM Ops Brain — MM-Flow orchestration, token management across backends
- [x] Knowledge Distillation Brain — Canonical documentation (8-brains model), ADR patterns
- [x] Product Operations Brain — MVP readiness tracking, release hardening process
- [x] Governance & Safety Brain — Security hardening (IDOR prevention, no hardcoded secrets, 2FA)

### Niche brains involved

- Brain 1: **Frontend Brain** — Next.js 16, React 19, TailwindCSS 4, Zustand 5, TanStack Query v5
- Brain 2: **Backend Brain** — FastAPI, SQLAlchemy 2.0 async, Pydantic 2, PostgreSQL 17, Redis
- Brain 3: **QA/DevOps Brain** — pytest, Vitest, Playwright E2E, Docker, pre-commit pipeline (ruff/pyright/eslint/prettier + GGA AI review)

## 6. Project-Specific Knowledge

What knowledge is specific to this project and should not automatically be promoted to core?

- **Local rule 1:** tenant_id always from JWT context — never trust request body for tenant identification (IDOR prevention). This is a project-level security convention that should NOT be generalized as a framework rule.
- **Local rule 2:** Status updates use body JSON only — no query params. This API contract convention is project-specific to avoid bugs like the appointment status endpoint fix (query param → body JSON).
- **Local rule 3:** TailwindCSS 4 uses new engine — no `var()` in className. This is a breaking change from v3 and project-specific.
- **Local rule 4:** Alembic is sole schema authority — no `create_all` in init-db.py. This was a recent fix (remove create_all) to keep migrations as single source of truth.
- **Local rule 5:** React 19 ref forwarding pattern — refs passed as prop, not via forwardRef. This is the project convention for Server Components.

## 7. Local Integrations

- **API / service 1:** FastAPI backend (apps/api) — Python 3.13, async SQLAlchemy 2.0, Pydantic DTOs, domain-events with IDomainEventBus
- **API / service 2:** Next.js frontend (apps/web) — App Router, React 19 Server Components, Zustand state, TanStack Query
- **Broker / provider / platform:** Facebook Marketplace scraping via Playwright (async); OAuth providers (dynamic cookie domains for production); PostgreSQL mastermind_bd with RLS

## 8. Decision Model

### Which decisions are project-local?

- Alembic migration strategy (single linear timeline, no create_all)
- Auth cookie configuration (dynamic domains, SameSite=Lax)
- TailwindCSS 4 class syntax (no var() in className)
- React 19 ref pattern (prop, not forwardRef)
- E2E test structure (Playwright, global mocks in tests/setup.tsx for Radix UI)
- Seeding approach (ORM-based via init_data.py, not raw SQL)

### Which decisions should go through framework-level meta-brains?

- Clean Architecture enforcement (Platform Architecture Brain) — for any new domain/application/infrastructure layering
- MM-Flow token management changes (Agent Runtime & LLM Ops Brain) — for backend routing or quota changes
- Security patterns like IDOR prevention can be promoted as reusable doctrine
- Multi-tenant aggregate design (tenant_id propagation) can be promoted as template improvement

## 9. Memory Boundaries

### Keep local to project

**Local heuristics:**
- "If it's async I/O, use async def everywhere — never mix sync/async at the boundary"
- "If it's a domain event, use IDomainEventBus — never import infrastructure into domain"
- "If it's a Pydantic DTO, use pydantic 2.12+ with Annotated for validation"

**Local data assumptions:**
- All entities have tenant_id as first-class attribute
- PostgreSQL 17 with SQLAlchemy 2.0 async (Mapped[], mapped_column, select())
- Redis 7.4+ for caching (future)

**Local workflow decisions:**
- Pre-commit: ruff lint → pyright type-check → eslint → prettier → GGA AI review
- E2E against real staging services (docker-compose.staging.yml), not mocked
- Python tests: pytest-asyncio with asyncio_mode=auto
- Frontend tests: Vitest + Testing Library

### Candidate for promotion to core

- **Reusable protocol improvements:** IDOR prevention via JWT context (tenant_id from token, not body) — generalizable as security pattern
- **Reusable template improvements:** Appointment status endpoint contract (body JSON vs query param) — can generalize to "status mutations always as body"
- **Reusable doctrinal improvements:** Domain has zero external dependencies (pure Python) — can be doc template for Clean Architecture projects

## 10. Success Criteria

- **Success criterion 1:** Production deployment with `alembic upgrade head` executed on prod DB (pending as of 2026-05-28)
- **Success criterion 2:** All E2E suites green (integrated-critical-path 2/2, integrated-flow 4/4, staging-smoke 14/14)
- **Success criterion 3:** Zero regressions in 1124 Python tests and 840 frontend tests; no TypeScript errors; clean pre-commit on all files

## 11. Notes

- The project was in "release hardening" phase as of 2026-05-26/27 with security fixes (ADMIN_PASSWORD removed, admin email corrected, init_data hardened, ALLOWED_ORIGINS env var mapping).
- A11y issues (sidebar contrast, heading hierarchy, aside aria-labels) are documented but non-blocking for go-live.
- The 8-brains MasterMind architecture uses notebookLM for knowledge management with per-brain notebook IDs configured in .mastermind/config.yaml.
- Key reference: `docs/mvp-status.md` is the canonical executive status source; `HANDOFF-RELEASE.md` is the release hardening handoff document.
- Admin credentials for staging/prod: admin@prosell.saas / Admin123!
