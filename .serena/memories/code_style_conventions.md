# Code Style & Conventions - ProSell SaaS

## Python (Backend)

- **Async-first**: All I/O with `async def`
- **SQLAlchemy 2.0**: Use `select()`, `Mapped[]`, `asyncpg`
- **Pydantic**: All DTOs and settings with pydantic 2.12+
- **Type Hints**: Strict mode with pyright
- **Line Length**: 100 characters (ruff)
- **Naming**: snake_case for functions/variables, PascalCase for classes

## TypeScript (Frontend)

- **React 19**: Server Components by default
- **TypeScript**: Strict mode, no `any`, explicit types
- **TailwindCSS 4**: New engine, `cn()` for class merging
- **Line Length**: 100 characters (prettier)
- **Naming**: camelCase for variables/functions, PascalCase for components

## Architecture Patterns

- **Clean Architecture**: Domain → Application → Infrastructure
- **SOLID Principles**: All five principles strictly applied
- **Dependency Rule**: Infrastructure → Application → Domain
- **Event-Driven**: Domain events with event bus
- **Multi-Tenant**: All aggregates include `tenant_id`
- **Interface-Based DI**: Domain defines contracts (Ports), infrastructure implements (Adapters)

## Critical Rules

- **Domain Layer**: ZERO external dependencies - only Python pure
- **Use Cases**: One class = one action (CreateUser, AuthenticateUser)
- **Repositories**: Interface in domain, implementation in infrastructure
