# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProSell SaaS is a **vehicle market analysis platform** that combines:

- **Public Marketplace**: E-commerce for vehicle buyers
- **SaaS Analytics**: Real-time market intelligence for dealerships
- **Automated Scraping**: Multi-marketplace scraping (Facebook Marketplace primary)
- **ML Predictions**: Price prediction and recommendation models

**Current State**: Monorepo configured, ready for implementation

## Monorepo Structure

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # Business logic, entities, interfaces
│   │   │   ├── application/    # Use cases, orchestration, DTOs
│   │   │   └── infrastructure/ # FastAPI, SQLAlchemy, scrapers
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── pyproject.toml
│   │
│   └── web/                    # Frontend Next.js 16 + React 19
│       ├── src/
│       │   ├── app/            # App Router
│       │   ├── components/
│       │   └── lib/
│       ├── tests/
│       │   ├── unit/
│       │   └── components/
│       └── package.json
│
├── packages/                   # Shared code (future)
│   └── shared-types/
│
├── tests/e2e/                  # Playwright E2E tests
│   ├── specs/
│   └── fixtures/
│
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── docker-compose.yml
│
└── .github/workflows/ci.yml
```

## Tech Stack 2026

| Layer         | Technology                 | Version                               |
| ------------- | -------------------------- | ------------------------------------- |
| Backend       | Python 3.13+               | Free-threading                        |
| Backend       | FastAPI                    | 0.115+                                |
| Backend       | Pydantic                   | 2.12+                                 |
| Backend       | SQLAlchemy                 | 2.0.36+ (async)                       |
| Database      | PostgreSQL                 | 17                                    |
| Database      | Redis                      | 7.4+                                  |
| ORM           | SQLAlchemy 2.0             | `Mapped`, `mapped_column`, `select()` |
| Scraping      | Playwright                 | async                                 |
| Auth          | JWT + OAuth2 + TOTP        | 2FA                                   |
| Frontend      | Next.js                    | 16.1+ (Turbopack)                     |
| Frontend      | React                      | 19.2 (Server Components)              |
| Frontend      | TypeScript                 | 5.5+ (strict)                         |
| Styling       | TailwindCSS                | 4.0                                   |
| State         | Zustand                    | 5.x                                   |
| Data Fetching | TanStack Query             | v5                                    |
| Forms         | React Hook Form + Zod      | 3.x                                   |
| Testing       | pytest, Vitest, Playwright |                                       |
| Infra         | Docker, GitHub Actions     |                                       |

## Development Commands

### Initial Setup

```bash
# Install Node dependencies (from root)
pnpm install

# Install Python dependencies
cd apps/api && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"
```

### Development

```bash
# Start all services with Turbo
pnpm dev

# Or individually:
cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --reload
cd apps/web && pnpm dev

# With Docker
docker compose -f docker/docker-compose.yml up
```

### Testing

```bash
# Python unit tests
cd apps/api && uv run pytest

# Python with coverage
cd apps/api && uv run pytest --cov=prosell

# Frontend tests
cd apps/web && pnpm test

# E2E tests
cd tests/e2e && pnpm test
```

### Linting

```bash
# Python
cd apps/api && ruff check . && ruff format .
cd apps/api && pyright

# Frontend
cd apps/web && pnpm lint
cd apps/web && pnpm typecheck

# All (via pre-commit)
pre-commit run --all-files

# All via Turborepo
pnpm lint
pnpm typecheck
```

### AI Code Review (GGA)

```bash
# Manual review of staged files
gga run

# Force review (bypass cache)
gga run --no-cache

# Check config
gga config

# Clear cache
gga cache clear
```

## Architecture Patterns

- **Clean Architecture**: Domain → Application → Infrastructure
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Dependency Rule**: `Infrastructure → Application → Domain`
- **Event-Driven**: Domain events with event bus (`IDomainEventBus`)
- **Multi-Tenant**: All aggregates include `tenant_id`
- **Interface-Based DI**: Domain defines contracts (Ports), infrastructure implements (Adapters)

**IMPORTANT**: Domain layer has ZERO external dependencies - only Python pure.

## Pre-commit Pipeline

On every `git commit`, the following checks run automatically:

1. **Linters (pre-commit)**: ruff, pyright, eslint, prettier
2. **AI Code Review (GGA)**: Reviews staged files against `AGENTS.md` rules

Configuration files:

- `.pre-commit-config.yaml` - Linter hooks
- `.gga` - GGA configuration
- `AGENTS.md` - AI code review rules

## Key Conventions

### Python (Backend)

- **Async-first**: All I/O with `async def`
- **SQLAlchemy 2.0**: Use `select()`, `Mapped[]`, `asyncpg`
- **Pydantic**: All DTOs and settings with pydantic 2.12+
- **pytest-asyncio**: Async tests with `asyncio_mode=auto`
- **Clean Architecture**: domain → application → infrastructure

### TypeScript (Frontend)

- **React 19**: Server Components by default
- **Next.js 16**: App Router with Turbopack
- **TailwindCSS 4**: New engine, no `var()` in className
- **Vitest**: Testing Library for component tests
- **Strict TypeScript**: No `any`, explicit types

## Skills (Auto-load based on context)

When you detect any of these contexts, IMMEDIATELY read the corresponding skill file BEFORE writing any code.

| Context                                                 | Read this file                      |
| ------------------------------------------------------- | ----------------------------------- |
| API contract bugs, testing backend-frontend integration | `.skills/contract-testing/SKILL.md` |

Read skills BEFORE writing code. Apply ALL patterns. Multiple skills can apply simultaneously.

## SOLID & Clean Architecture

### Domain Layer (No dependencies)

- **Entities**: Business objects with behavior
- **Value Objects**: Immutable values (Email, Money, VIN)
- **Domain Events**: Something that happened
- **Repository Interfaces**: Contracts (Ports)
- **Domain Exceptions**: Business rule violations

### Application Layer (Depends on Domain)

- **Use Cases**: One class = one action (CreateUser, AuthenticateUser)
- **DTOs**: Data transfer objects for boundaries
- **Ports**: Secondary interfaces (IEmailService, IStorageService)

### Infrastructure Layer (Implements Domain)

- **FastAPI**: Primary adapters (endpoints)
- **SQLAlchemy**: Secondary adapters (repositories)
- **External Services**: Stripe, SendGrid, NHTSA

## Karpathy-Inspired Coding Guidelines

Source: [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls. Bias toward caution over speed on non-trivial work; use judgment on trivial tasks.

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations, don't pick silently.
- Push back when a simpler approach exists.
- Stop and ask when confused.

### 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No speculative flexibility/configurability.
- No error handling for impossible scenarios.

### 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Mention unrelated dead code, don't delete it.

### 4. Goal-Driven Execution

- Transform tasks into verifiable goals (test-first).
- State a brief plan with verify-steps for multi-step tasks.

## Spec Status Lifecycle (MANDATORY)

Every design spec in `docs/superpowers/specs/` MUST have a `**Status**:` line in
its header with one of these values:

| Status        | Meaning                                                       | Update trigger                                  |
| ------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `DRAFT`       | Spec in writing, decisions not locked                         | Brainstorming in progress                       |
| `APPROVED`    | Decisions locked, no PR open yet                              | After brainstorm approval, before writing-plans |
| `IN PROGRESS` | PR open implementing the spec                                 | When opening the implementation PR              |
| `IMPLEMENTED` | PR merged to `main` (PR ref + merge date)                     | When the implementation PR merges               |
| `COMPLETED`   | For roadmaps only: all dependent work merged                  | When the last dependent subsystem merges        |
| `SUPERSEDED`  | Replaced by a newer spec (link to successor)                  | When the newer spec is created                  |
| `STALE`       | Items closed by other unrelated work (requires audit section) | When other work subsumes the spec's items       |

### Enforcement

1. **Pre-commit hook** `spec-status-required` runs `scripts/validate_spec_status.py`
   on every commit that touches `docs/superpowers/specs/*.md`. Blocks commits
   that are missing the Status field, have an invalid enum value, or (for STALE)
   lack an audit section.
2. **PR template** at `.github/PULL_REQUEST_TEMPLATE.md` has a "Spec status update"
   checklist that catches the case where a PR implements a spec WITHOUT touching
   the spec file directly (e.g., backend/frontend code that fulfills a design).
3. **Validator script** at `scripts/validate_spec_status.py` can be run standalone
   to audit the specs directory at any time.

### When a PR implements a spec

The PR author MUST update the spec's Status to `IMPLEMENTED (PR #<this>, merged <date>)`
in the same PR that lands the work — or in a follow-up PR explicitly for the
status update. The pre-commit hook enforces this only for direct spec file edits;
the PR template enforces it for indirect implementation (code-only PRs that fulfill
a design).

## Reference Documentation

Detailed specs in `docs/`:

- `06_PROMPT_CLAUDE_CODE_2026_v2.md` - **PRIMARY**: Stack 2026, structure, patterns
- `01_ARQUITECTURA_PROSELL_SAAS_V2.md` - Full architecture details
- `02_REQUISITOS_PRD_PROSELL_SAAS_V2.md` - User stories, acceptance criteria
- `04_ROADMAP_PROSELL_SAAS_V2.md` - Development phases
- `PLAN-monorepo-setup.md` - Monorepo setup guide

**Design specs (with Status lifecycle) live in `docs/superpowers/specs/`** —
each spec has a `**Status**:` field in its header that's updated as work
progresses (see "Spec Status Lifecycle" above). Run
`python scripts/validate_spec_status.py` to audit.
