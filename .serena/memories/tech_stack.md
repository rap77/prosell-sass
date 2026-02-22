# Tech Stack 2026 - ProSell SaaS

## Backend (Python 3.13+)

- **Framework**: FastAPI 0.115+
- **Validation**: Pydantic 2.12+
- **ORM**: SQLAlchemy 2.0.36+ (async) with `Mapped`, `mapped_column`, `select()`
- **Database**: PostgreSQL 17, Redis 7.4+
- **Auth**: JWT + OAuth2 + TOTP (2FA)
- **Scraping**: Playwright (async)
- **Testing**: pytest, pytest-asyncio

## Frontend (Next.js 16 + React 19)

- **Framework**: Next.js 16.1+ (Turbopack)
- **UI**: React 19.2 (Server Components by default)
- **Language**: TypeScript 5.5+ (strict mode)
- **Styling**: TailwindCSS 4.0 (new engine, no `var()` in className)
- **State**: Zustand 5.x
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod 3.x
- **Testing**: Vitest, Testing Library

## Infrastructure

- **Monorepo**: Turborepo
- **Containers**: Docker, docker-compose
- **CI/CD**: GitHub Actions
- **Package Manager**: pnpm (Node), uv (Python)
- **Code Review**: GGA (AI) + pre-commit hooks
