# Technical Environment — ProSell SaaS

**Status**: Pre-filled (retroactive discovery from codebase analysis)
**Date**: 2026-08-23
**Project Type**: Brownfield (deployed MVP, monorepo)

---

## 1. Repository Structure

```
prosell-sass/                          # Monorepo (pnpm workspaces + turborepo)
├── apps/
│   ├── api/                           # Backend — FastAPI + Python 3.13
│   │   ├── src/prosell/
│   │   │   ├── domain/                # Business logic (ZERO external deps)
│   │   │   ├── application/           # Use cases, DTOs, ports
│   │   │   └── infrastructure/        # FastAPI, SQLAlchemy, external services
│   │   ├── tests/ (unit + integration)
│   │   └── pyproject.toml
│   │
│   └── web/                           # Frontend — Next.js 16 + React 19
│       ├── src/
│       │   ├── app/                   # App Router (routes)
│       │   ├── components/            # UI components
│       │   └── lib/                   # Utilities, API client, stores
│       ├── tests/ (unit + components)
│       └── package.json
│
├── tests/e2e/                         # Playwright E2E tests
├── docker/                            # Dockerfiles + compose
├── docs/                              # Documentation (dispersed — being consolidated)
├── PRPs/                              # Pull Request Proposals (implementation specs)
├── tasks/                             # MasterMind task tracking
└── scripts/                           # CI/CD + MasterMind CLI
```

---

## 2. Tech Stack

### Backend

| Component       | Technology          | Version  | Notes                               |
| --------------- | ------------------- | -------- | ----------------------------------- |
| Language        | Python              | 3.13+    | Free-threading capable              |
| Framework       | FastAPI             | 0.115+   | Async-first                         |
| ORM             | SQLAlchemy          | 2.0.36+  | Async, `Mapped[]`, `mapped_column`  |
| Validation      | Pydantic            | 2.12+    | DTOs and settings                   |
| Database        | PostgreSQL          | 17       | Primary data store                  |
| Cache/Queue     | Redis               | 7.4+     | Sessions, rate limiting, task queue |
| Task Queue      | Taskiq              | latest   | Async background jobs               |
| Auth            | JWT + OAuth2 + TOTP | -        | httpOnly cookies, 2FA               |
| Type Checker    | Pyright             | standard | 0 errors enforced                   |
| Linter          | Ruff                | 0.8+     | Format + lint                       |
| Package Manager | uv                  | latest   | Fast Python package management      |

### Frontend

| Component      | Technology              | Version | Notes                     |
| -------------- | ----------------------- | ------- | ------------------------- |
| Framework      | Next.js                 | 16.1+   | App Router, Turbopack     |
| UI Library     | React                   | 19.2    | Server Components         |
| Language       | TypeScript              | 5.5+    | Strict mode, no `any`     |
| Styling        | TailwindCSS             | 4.0     | New engine                |
| State (server) | TanStack Query          | v5      | `useQuery`, `useMutation` |
| State (client) | Zustand                 | 5.x     | Minimal client state      |
| Forms          | React Hook Form + Zod 3 | -       | Validation schemas        |
| Testing        | Vitest                  | latest  | Component + unit tests    |

### Infrastructure

| Component     | Technology                     | Notes                                 |
| ------------- | ------------------------------ | ------------------------------------- |
| Hosting       | DigitalOcean                   | Droplets + managed DB                 |
| CI/CD         | GitHub Actions                 | Pre-commit + test + deploy            |
| Monorepo      | Turborepo + pnpm               | Workspace orchestration               |
| E2E Testing   | Playwright                     | Cross-browser                         |
| Code Review   | GGA (Gentleman Guardian Angel) | AI-powered pre-commit review          |
| Dev Framework | MasterMind                     | 7 expert brains (coexists with AIDLC) |

---

## 3. Architecture Patterns

### Clean Architecture (Backend)

```
Domain (no deps) → Application (depends on domain) → Infrastructure (implements both)
```

- **Domain**: Entities, Value Objects, Domain Events, Repository Interfaces
- **Application**: Use Cases (1 class = 1 action), DTOs, Port interfaces
- **Infrastructure**: FastAPI routes, SQLAlchemy repos, external services

**Key rules**:

- Domain layer has ZERO external dependencies (pure Python)
- All external deps injected via interfaces defined in domain
- Never trust `tenant_id` from client — always use `current_user.tenant_id`

### Multi-Tenant

- All aggregates include `tenant_id` (organization isolation)
- Row-level filtering on every query
- Seeding: admin user + default org on boot

### Event-Driven

- Domain events with event bus (`IDomainEventBus`)
- Lead lifecycle events trigger notifications + assignment

---

## 4. Current State (August 2026)

### Implemented & Deployed ✅

- Auth (JWT + 2FA + OAuth + httpOnly cookies)
- Multi-tenant organizations + team invitations
- Product catalog (generic C3: categories → products → verticals)
- Vehicle vertical (VIN decode, rich forms)
- Lead capture + auto-assignment engine
- Appointments + conflict detection
- Pipeline/Kanban view
- Settings (profile, notifications, security)
- Onboarding wizard
- Publications route (entry point)
- Error pages (not-found, error, global-error)
- Landing page + public catalog
- 716 tests, >90% coverage
- CI/CD pipeline green
- Staging + Production on DigitalOcean

### In Progress 🔄

- Mobile-first responsive (Sprint 0)
- Facebook multi-account architecture
- Video upload support
- i18n infrastructure

### Health Score: 92/100

---

## 5. Development Workflow

```bash
# Setup
pnpm install                            # Frontend deps
cd apps/api && uv venv && uv pip install -e ".[dev]"  # Backend deps

# Development
pnpm dev                                # All services via Turbo
cd apps/api && fastapi dev              # Backend only
cd apps/web && pnpm dev                 # Frontend only

# Testing
cd apps/api && uv run pytest --cov      # Backend tests
cd apps/web && pnpm test                # Frontend tests
cd tests/e2e && pnpm test               # E2E

# Quality
cd apps/api && ruff check . && ruff format . && pyright  # Python
cd apps/web && pnpm lint && pnpm typecheck               # TypeScript
```

### Commit Convention

- Conventional commits: `feat(scope): description`
- Pre-commit hooks: Ruff + Pyright + ESLint + GGA review
- **NEVER** use `git commit --no-verify`

---

## 6. External Integrations

| Service             | Purpose                 | Status                                                |
| ------------------- | ----------------------- | ----------------------------------------------------- |
| Facebook Graph API  | Publishing, Lead Ads    | Partial (OAuth exists, publishing via desktop client) |
| NHTSA API           | VIN decoding            | Implemented                                           |
| DigitalOcean Spaces | Object storage (images) | Implemented                                           |
| Cloudflare R2       | CDN (future video)      | Planned                                               |
| OpenAI API          | AI title generation     | Planned (Sprint B)                                    |

---

## 7. Non-Functional Requirements

| Requirement         | Target                                      |
| ------------------- | ------------------------------------------- |
| Response time (P95) | < 500ms                                     |
| Availability        | 99.5%                                       |
| Security            | OWASP Top 10 compliance, no secrets in code |
| Accessibility       | WCAG 2.1 AA (partial)                       |
| i18n                | EN (default) + ES                           |
| Browser support     | Chrome 120+, Safari 17+, Firefox 120+       |
| Mobile              | iOS 16+, Android 12+ (PWA)                  |

---

## 8. Related Systems

| System          | Relationship                                          | Repo                 |
| --------------- | ----------------------------------------------------- | -------------------- |
| **fb-autopost** | Desktop publishing client — consumes prosell-sass API | `~/proy/fb-autopost` |
| **MasterMind**  | Development framework (7 brains, coexists)            | `~/proy/mastermind`  |
