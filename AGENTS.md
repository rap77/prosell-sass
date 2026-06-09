# ProSell SaaS — Agent Context

## Project Overview

ProSell SaaS is a **multi-tenant B2B SaaS** for vehicle dealerships. Vehicles is the first vertical; the catalog model is generic (categories → products → vehicles).

**Core workflow:** catalog → publish to Facebook Marketplace → capture leads → schedule appointments.

## Stack

| Layer        | Tech                                                 |
| ------------ | ---------------------------------------------------- |
| Frontend     | Next.js 16 App Router + React 19 + TypeScript strict |
| Styling      | TailwindCSS 4 (no `var()` in className)              |
| State        | TanStack Query v5 + Zustand 5                        |
| Backend      | FastAPI + Python 3.13                                |
| ORM          | SQLAlchemy 2.0 async (`Mapped[]`)                    |
| DB           | PostgreSQL 17 + Redis 7.4                            |
| Auth         | JWT in httpOnly cookies                              |
| Type checker | Pyright standard (0 errors enforced)                 |

## Architecture

**Backend — Clean Architecture:**

- `domain/` — entities, value objects, interfaces (ZERO external deps)
- `application/` — use cases, DTOs
- `infrastructure/` — FastAPI, SQLAlchemy, external services

**Security:** Never trust `tenant_id` from the client — always use `current_user.tenant_id`.

## Current Work

```bash
cat tasks/todo.md | grep "\[ \]"      # pending tasks
grep -A 30 "^## M3:" tasks/plan.md   # task details
```

**After implementing:**

1. `cd apps/api && uv run pytest` + `pnpm --prefix apps/web test run`
2. `cd apps/api && uv run pyright` (must be 0 errors)
3. `cd apps/api && uv run ruff check src`
4. Commit with conventional commits: `feat(scope): description`
5. Mark done in `tasks/todo.md`

## Available Skills

Use `$skill-name`:

- `$mm/safe-commit` — commit with validation gates
- `$nextjs-15`, `$react-19`, `$tailwind-4`, `$typescript`
- `$pytest`, `$playwright`, `$zod-4`, `$zustand-5`
- `$test-driven-development`, `$debugging-and-error-recovery`

---

# Code Review Rules

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

## MasterMind Codex Compatibility

For Codex sessions, the canonical compatibility entry point is:

```bash
bash scripts/mm/mm.sh <command> [args...]
```

Use this wrapper instead of assuming Claude-native `/mm:*` runtime support.

### Handler-backed commands

- `init`
- `discover`
- `complete-task`
- `closeout`
- `review`
- `safe-commit`
- `verify-criteria`
- `ship`
- `status`
- `next-task`
- `brain-plan`

### Complete-task execution model

- User-facing execution is by parent block/task (for example `M3`)
- Internally, the worker must execute each pending subtask sequentially with checkpoints
- After each subtask checkpoint, update progress artifacts and run `bash scripts/mm/mm.sh closeout <TASK_ID>` for time tracking + sound
- Use completion sound at the end of the parent block, not every micro-step
- Finish the block with `review` → `verify-criteria` → final Codex review → post-review fixes → update source-of-truth docs → revalidation → `safe-commit`
- If the final review raises confirmed findings, fix them before attempting the commit
- If GGA fails during `safe-commit`, fix the issues, revalidate, and retry until clean
- Before closing the block, synchronize the canonical project docs (`tasks/todo.md`, `tasks/plan.md`, and any equivalent source-of-truth artifact affected by the work)

### Sound notification integration

In Codex, notifications are not implicit. The canonical way to preserve Claude's sound behavior is:

```bash
bash scripts/mm/mm.sh closeout <TASK_ID>
```

That command runs the original `update-todo-times.py` flow and ensures `notify-complete.py` fires when the parent block reaches completion.

### Workflow-doc commands

If a command does not have a handler-backed wrapper, read its source markdown from:

```text
.claude/commands/mm/<command>.md
```

The Codex compatibility notes live in:

```text
scripts/mm/README.md
```

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
