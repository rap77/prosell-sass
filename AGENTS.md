# ProSell SaaS - Code Review Rules

You are reviewing code for a vehicle market analysis platform. The codebase is a monorepo with:
- **Backend**: Python 3.13 + FastAPI + SQLAlchemy 2.0 (Clean Architecture)
- **Frontend**: Next.js 15 + React 19 + TypeScript 5.7

## Critical Rules (Block Commit)

### Security
- NO hardcoded secrets, API keys, passwords, or tokens
- NO SQL string concatenation - use parameterized queries only
- NO `eval()`, `exec()` in Python or `eval()` in JavaScript
- NO `dangerouslySetInnerHTML` without explicit sanitization
- NO disabled security headers or CORS `*` in production code

### Architecture (Clean Architecture)
- Domain layer (`domain/`) MUST NOT import from `infrastructure/` or `application/`
- Domain entities MUST NOT have framework dependencies (no SQLAlchemy, FastAPI, Pydantic in domain)
- Use cases (`application/`) MUST NOT import directly from `infrastructure/`
- All external dependencies MUST be injected via interfaces defined in domain

## Python Rules

### Type Safety
- ALL functions MUST have type hints (parameters and return types)
- NO `Any` type unless absolutely necessary with justification comment
- Use `Mapped[]` and `mapped_column()` for SQLAlchemy models (2.0 style)
- Prefer `list[T]` over `List[T]`, `dict[K,V]` over `Dict[K,V]` (Python 3.9+ style)

### Async Patterns
- Database operations MUST be async (`async def`, `await`)
- Use `asyncpg` for PostgreSQL, never `psycopg2` in async code
- NO mixing sync and async in the same function without `run_in_executor`

### Code Quality
- NO bare `except:` - always catch specific exceptions
- NO mutable default arguments (`def foo(items=[])`)
- Prefer `pathlib.Path` over `os.path`
- Use f-strings over `.format()` or `%` formatting

### FastAPI Specifics
- Route handlers MUST have explicit response models
- Use `Depends()` for dependency injection
- Pydantic models for ALL request/response bodies

## TypeScript/React Rules

### Type Safety
- NO `any` type - use `unknown` and narrow with type guards
- NO type assertions (`as Type`) without validation
- ALL components MUST have typed props (interface or type)
- Prefer `interface` for object shapes, `type` for unions/intersections

### React 19 Patterns
- NO `useMemo`, `useCallback`, `memo()` - React Compiler handles this
- Server Components by default, `'use client'` only when needed
- NO `useEffect` for data fetching - use Server Components or React Query
- Event handlers: `onEvent` naming (onClick, onChange)

### Next.js 15 Patterns
- Use App Router (`app/`) not Pages Router
- Prefer Server Actions over API routes for mutations
- NO `getServerSideProps` or `getStaticProps` - use async Server Components
- Images MUST use `next/image` with explicit width/height or fill

### Code Quality
- NO `console.log` in committed code (use proper logging)
- NO `// @ts-ignore` or `// @ts-expect-error` without justification
- Prefer early returns over nested conditionals
- Destructure props in function signature

## Testing Rules

### Python (pytest)
- Test files MUST be named `test_*.py` or `*_test.py`
- Use `pytest.fixture` for setup, not `setUp` methods
- Async tests MUST use `@pytest.mark.asyncio` or `asyncio_mode = "auto"`
- Mock external services, never hit real APIs in tests

### TypeScript (Vitest)
- Test files MUST be named `*.test.ts` or `*.spec.ts`
- Use Testing Library queries: `getByRole` > `getByTestId` > `getByText`
- NO `fireEvent` - use `userEvent` for realistic interactions
- Test behavior, not implementation details

## Naming Conventions

### Python
- `snake_case` for functions, variables, modules
- `PascalCase` for classes
- `SCREAMING_SNAKE_CASE` for constants
- Private: single underscore prefix (`_private_method`)

### TypeScript
- `camelCase` for functions, variables
- `PascalCase` for components, classes, types, interfaces
- `SCREAMING_SNAKE_CASE` for constants
- NO Hungarian notation (`strName`, `iCount`)

## Git Commit Rules

- Conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Description in imperative mood ("add feature" not "added feature")
- NO commits with failing tests
- NO commits with linting errors
