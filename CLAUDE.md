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

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Python 3.13+ | Free-threading |
| Backend | FastAPI | 0.115+ |
| Backend | Pydantic | 2.12+ |
| Backend | SQLAlchemy | 2.0.36+ (async) |
| Database | PostgreSQL | 17 |
| Database | Redis | 7.4+ |
| ORM | SQLAlchemy 2.0 | `Mapped`, `mapped_column`, `select()` |
| Scraping | Playwright | async |
| Auth | JWT + OAuth2 + TOTP | 2FA |
| Frontend | Next.js | 16.1+ (Turbopack) |
| Frontend | React | 19.2 (Server Components) |
| Frontend | TypeScript | 5.5+ (strict) |
| Styling | TailwindCSS | 4.0 |
| State | Zustand | 5.x |
| Data Fetching | TanStack Query | v5 |
| Forms | React Hook Form + Zod | 3.x |
| Testing | pytest, Vitest, Playwright | |
| Infra | Docker, GitHub Actions | |

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

## Reference Documentation

Detailed specs in `docs/`:
- `06_PROMPT_CLAUDE_CODE_2026_v2.md` - **PRIMARY**: Stack 2026, structure, patterns
- `01_ARQUITECTURA_PROSELL_SAAS_V2.md` - Full architecture details
- `02_REQUISITOS_PRD_PROSELL_SAAS_V2.md` - User stories, acceptance criteria
- `04_ROADMAP_PROSELL_SAAS_V2.md` - Development phases
- `PLAN-monorepo-setup.md` - Monorepo setup guide
