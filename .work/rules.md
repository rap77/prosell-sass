# ProSell SaaS - Reglas del Proyecto

## Git Rules (CRITICAL)
- NEVER use --no-verify (pre-commit hooks are mandatory)
- Feature branches only, never work on main
- Conventional commits format only
- NO "Co-Authored-By" or AI attribution

## Architecture Rules
- Clean Architecture: Domain → Application → Infrastructure
- Domain layer has ZERO external dependencies (Python puro)
- All aggregates include tenant_id (multi-tenant)
- Async-first: All I/O with async def
- Interface-Based DI: Domain defines contracts (Ports)

## Tech Stack 2026
- Python 3.13+ (free-threading)
- FastAPI 0.115+
- SQLAlchemy 2.0.36+ (async) - use select(), Mapped[], asyncpg
- Next.js 16 + React 19 (Server Components)
- TypeScript 5.5+ (strict - no any)
- TailwindCSS 4.0
- Pydantic 2.12+

## Testing Rules
- NEVER skip tests or disable failing tests
- pytest-asyncio with asyncio_mode=auto
- Test before marking task complete
- Vitest + Testing Library for frontend

## Code Quality
- Python: ruff check + ruff format + pyright
- TypeScript: ESLint + Prettier
- No mock objects / TODO comments for core features

## SOLID Principles
- Single Responsibility: One reason to change
- Open/Closed: Open for extension, closed for modification
- Liskov Substitution: Derived classes substitutable
- Interface Segregation: No unused interfaces
- Dependency Inversion: Depend on abstractions

## Anti-Patterns (FORBIDDEN)
- Any type in TypeScript
- Sync I/O in Python (use async def)
- --no-verify in git commit
- Domain layer dependencies
- Mock implementations
- "TODO: implement this" for core features
