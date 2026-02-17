# ProSell SaaS - Code Review Rules

You are reviewing code for a vehicle market analysis platform. The codebase is a monorepo with:
- **Backend**: Python 3.13 + FastAPI + SQLAlchemy 2.0 (Clean Architecture)
- **Frontend**: Next.js 15 + React 19 + TypeScript 5.7

## ⚠️ CRITICAL: Response Format (MANDATORY - FIRST thing you do)

**Your VERY FIRST LINE must be EXACTLY one of:**
```
STATUS: PASSED
```
```
STATUS: FAILED
```

**NOTHING else before this line. No intro, no "Here's my analysis", START with this.**

**If FAILED, then list each violation as:**
```
file:line - rule_category - issue - fix
```

**After the status line, you MAY provide detailed analysis.**

---

## Critical Rules (Block Commit)

### Security
**REJECT if:**
- Hardcoded secrets, API keys, passwords, or tokens
- SQL string concatenation - use parameterized queries only
- `eval()`, `exec()` in Python or `eval()` in JavaScript
- `dangerouslySetInnerHTML` without explicit sanitization
- Disabled security headers or CORS `*` in production code

### Architecture (Clean Architecture)
**REJECT if:**
- Domain layer (`domain/`) imports from `infrastructure/` or `application/`
- Domain entities use SQLAlchemy, FastAPI directly in entities
- Use cases (`application/`) import directly from `infrastructure/`
- External dependencies NOT injected via interfaces defined in domain

**REQUIRE:**
- Use `domain/base.py` base classes for ALL domain entities
- Pydantic is ONLY allowed in `domain/base.py` as base classes (DomainModel, ValueObject, DomainEvent)
- Domain entities MUST inherit from `domain/base.py` classes, NOT import Pydantic directly

**PREFER:**
- All external dependencies injected via interfaces defined in domain

---

## Python Rules

### Type Safety
**REJECT if:**
- Missing type hints on functions (parameters and return types)
- `Any` type without `// @type: ignore` justification
- `List[T]`, `Dict[K,V]` instead of `list[T]`, `dict[K,V]` (Python 3.9+)

**PREFER:**
- `Mapped[]` and `mapped_column()` for SQLAlchemy models (2.0 style)

### Async Patterns
**REJECT if:**
- Database operations NOT async (`async def`, `await`)
- `asyncpg` NOT used for PostgreSQL in async code
- Mixing sync and async in same function without `run_in_executor`

### Code Quality
**REJECT if:**
- Bare `except:` - always catch specific exceptions
- Mutable default arguments (`def foo(items=[])`)
- `os.path` instead of `pathlib.Path`
- `.format()` or `%` formatting instead of f-strings

### FastAPI Specifics
**REJECT if:**
- Route handlers WITHOUT explicit response models
- Pydantic NOT used for ALL request/response bodies

**REQUIRE:**
- `Depends()` for dependency injection
- `Annotated[Type, Depends(get_dep)]` pattern (FastAPI 0.100+ B008 fix)

---

## TypeScript/React Rules

### Type Safety
**REJECT if:**
- `any` type - use `unknown` and narrow with type guards
- Type assertions (`as Type`) without validation
- Components WITHOUT typed props (interface or type)

**PREFER:**
- `interface` for object shapes, `type` for unions/intersections

### React 19 Patterns
**REJECT if:**
- `useMemo`, `useCallback`, `memo()` without justification - React Compiler handles this
- `'use client'` in Server Components that don't need it
- `useEffect` for data fetching - use Server Components or React Query

**REQUIRE:**
- Server Components by default
- Event handlers: `onEvent` naming (onClick, onChange)

### Next.js 15 Patterns
**REJECT if:**
- Pages Router instead of App Router (`app/`)
- `getServerSideProps` or `getStaticProps` - use async Server Components
- Regular `<img>` tags - MUST use `next/image` with explicit width/height or fill

**PREFER:**
- Server Actions over API routes for mutations

### Code Quality
**REJECT if:**
- `console.log` in committed code (use proper logging)
- `// @ts-ignore` or `// @ts-expect-error` without justification
- Nested conditionals instead of early returns

**PREFER:**
- Destructure props in function signature

---

## Testing Rules

### Python (pytest)
**REJECT if:**
- Test files NOT named `test_*.py` or `*_test.py`
- `setUp` methods instead of `pytest.fixture`
- Async tests WITHOUT `@pytest.mark.asyncio` or `asyncio_mode = "auto"`
- Real API calls in tests - mock external services

### TypeScript (Vitest)
**REJECT if:**
- Test files NOT named `*.test.ts` or `*.spec.ts`
- `fireEvent` - use `userEvent` for realistic interactions
- Testing implementation details instead of behavior

**PREFER:**
- Testing Library queries: `getByRole` > `getByTestId` > `getByText`

---

## Naming Conventions

### Python
**REJECT if:**
- Functions/variables NOT `snake_case`
- Classes NOT `PascalCase`
- Constants NOT `SCREAMING_SNAKE_CASE`
- Private methods WITHOUT single underscore prefix (`_private_method`)

### TypeScript
**REJECT if:**
- Functions/variables NOT `camelCase`
- Components/classes/types/interfaces NOT `PascalCase`
- Constants NOT `SCREAMING_SNAKE_CASE`
- Hungarian notation (`strName`, `iCount`)

---

## Git Commit Rules

**REJECT if:**
- NOT conventional commits format: `type(scope): description`
- Types NOT: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Description NOT in imperative mood ("add feature" not "added feature")
- Commits with failing tests
- Commits with linting errors

---

## Response Format

**FIRST LINE must be exactly:**
```
STATUS: PASSED
```
**or**
```
STATUS: FAILED
```

**If FAILED, list each violation as:**
```
file:line - rule_category - issue - fix
```

**Example:**
```
STATUS: FAILED
apps/web/src/components/Button.tsx:15 - TypeScript Rule - Using `any` type - Define proper interface
apps/api/src/users/service.py:23 - Async Pattern - Sync database operation - Change to async def
```
