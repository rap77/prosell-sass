# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

### Python (Backend)

**Files:**
- `snake_case.py` for modules and files
- Example: `login_user.py`, `facebook_account_repository_impl.py`, `auth_middleware.py`

**Functions/Methods:**
- `snake_case` for all functions and methods
- Example: `async def get_current_user()`, `def record_failed_login()`, `async def create()`

**Classes:**
- `PascalCase` for all classes (entities, services, repositories, use cases)
- Example: `User`, `FacebookAccount`, `LoginUserUseCase`, `SqlAlchemyFacebookAccountRepository`

**Constants:**
- `SCREAMING_SNAKE_CASE` at module level
- Example: `AUTH_LIMIT = "100/minute"` in `auth_middleware.py`

**Private Methods:**
- Single underscore prefix `_private_method()`
- Example: `_model_to_entity(model)` in repository implementations

**Enums:**
- `PascalCase` for enum class names
- `SCREAMING_SNAKE_CASE` for enum values when using `StrEnum`
- Example: `class UserStatus(StrEnum): ACTIVE = "active"`

### TypeScript/React (Frontend)

**Files:**
- `camelCase.ts` for utilities, hooks, stores, API modules
- `PascalCase.tsx` for React components
- Example: `authApi.ts`, `useAuth.ts`, `authStore.ts`, `LoginForm.tsx`

**Functions/Variables:**
- `camelCase` for functions, variables, and object properties
- Example: `const login = async ()`, `const mockLogin = vi.fn()`

**Components/Classes/Types/Interfaces:**
- `PascalCase` for components, classes, types, and interfaces
- Example: `<LoginForm />`, `interface AuthState`, `type User`

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants
- Example: `const AUTH_LIMIT = "100/minute"`
- Camelcase for configuration objects: `const config = { ... }`

**Mocking:**
- `mock` prefix for mock functions: `mockLogin`, `mockClearError`, `mockApiError`
- `make` prefix for factory functions: `makeRequest()`, `makeTestStore()`

## Code Style

### Formatting

**Python:**
- Line length: 100 characters (configured in `pyproject.toml`)
- Tool: `ruff` (linter + formatter)
- Configuration in `apps/api/pyproject.toml`
- Run: `ruff check . && ruff format .`

**TypeScript:**
- Line length: 88 characters (via ESLint)
- Tool: ESLint (configured in `eslint.config.js`)
- Prettier (configured in `prettier.config.js` if exists)
- Run: `pnpm lint` and `pnpm format`

**Spacing:**
- 2 spaces for indentation (both Python and TypeScript by default in Ruff)
- Blank lines: 2 between top-level definitions, 1 between methods

### Code Quality

**Python:**
- No bare `except:` — always catch specific exceptions
- No mutable default arguments: `def foo(items=[])` is forbidden
- Use `pathlib.Path` instead of `os.path`
- Use f-strings instead of `.format()` or `%` formatting
- No `eval()` or `exec()`

**TypeScript:**
- No `any` type — use `unknown` and narrow with type guards
- No type assertions (`as Type`) without validation
- No `console.log` in committed code — use proper logging
- No `// @ts-ignore` or `// @ts-expect-error` without justification
- No Hungarian notation (`strName`, `iCount`)

## Import Organization

### Python

**Order:**
1. Standard library imports (datetime, json, uuid, etc.)
2. Third-party imports (sqlalchemy, pydantic, fastapi, etc.)
3. Local imports (from prosell.domain, prosell.application, etc.)

**Example (from `login_user.py`):**
```python
import secrets

from prosell.application.dto.auth import LoginUserRequest, LoginUserResponse, UserInfo
from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    EmailNotVerifiedException,
    InvalidCredentialsException,
)
from prosell.domain.ports import IJWTService, IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository
```

**Path Aliases:**
- First-party imports use `prosell.` prefix (configured in `pyproject.toml`)
- Example: `from prosell.domain.entities.user import User`

### TypeScript

**Order:**
1. React/Next.js imports
2. Third-party imports
3. Local imports (from `@/`)

**Path Aliases:**
- `@/` maps to `./src/` (configured in `tsconfig.json`)
- Example: `import { useAuth } from "@/hooks/useAuth"`

**Example (from `LoginForm.tsx`):**
```typescript
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "./PasswordInput";
```

## Error Handling

### Python

**Domain Exceptions:**
- All business rule violations raise domain exceptions from `prosell.domain.exceptions.*`
- Examples: `InvalidCredentialsException`, `FacebookAccountNotFoundException`, `AccountLockedException`
- Domain layer defines exceptions, infrastructure layer handles and converts to HTTP responses

**Pattern (from `login_user.py`):**
```python
user = await self.user_repository.get_by_email(request.email)
if not user:
    # Don't reveal if email exists (security)
    raise InvalidCredentialsException()

if not user.email_verified:
    raise EmailNotVerifiedException()
```

**Infrastructure Layer (HTTP):**
- Exception handlers in `apps/api/src/prosell/infrastructure/api/middleware/exception_handlers.py`
- Map domain exceptions to HTTP status codes (401, 403, 404, 422, etc.)

**Async Error Handling:**
- Use try/except in async contexts
- Never raise exceptions without proper `await` context

### TypeScript

**Error Types:**
- Define `ApiError` class for API failures with status code
- Use `instanceof` checks to narrow error types
- Catch block must handle `unknown` type (not `any`)

**Pattern (from `authStore.test.ts`):**
```typescript
vi.mocked(authApi.login).mockRejectedValue(
    new ApiError("Invalid credentials", 401),
);

await useAuthStore.getState().login({ email, password });

const state = useAuthStore.getState();
expect(state.error).not.toBeNull();
```

## Logging

### Python

**Framework:** `logging` module (standard library)

**Pattern (from `auth_router.py`):**
```python
import logging
logger = logging.getLogger(__name__)

# In routes
logger.error(f"OAuth state mismatch: expected {expected}, got {received}")
```

**Guidelines:**
- Use `logger.error()` for exceptions and critical issues
- Use `logger.warning()` for potential issues
- Use `logger.info()` for important lifecycle events
- Use `logger.debug()` for detailed diagnostic info
- Never log sensitive data (tokens, passwords, keys)

**Location:** Config in `apps/api/src/prosell/core/config.py`

### TypeScript

**Framework:** `console` (with proper logging library in production)

**Pattern (from components):**
```typescript
// Avoid console.log in committed code
// Use proper logging instead (sentry, datadog, etc.)
```

**Guidelines:**
- Avoid `console.log` in production code
- Use error boundaries for React errors
- Log errors to monitoring service (e.g., Sentry)

## Comments

### Python

**When to Comment:**
- Non-obvious business logic or domain rules
- Why something is done (not what it does — code shows what)
- Workarounds and known limitations

**Example (from `login_user.py`):**
```python
# Don't reveal if email exists (security)
raise InvalidCredentialsException()

# Generate a temporary token for 2FA verification
# This token expires in 5 minutes and only identifies the user
temp_2fa_token = secrets.token_urlsafe(32)
```

**Docstrings:**
- Google-style docstrings for all public functions/classes/methods
- Include Args, Returns, Raises sections

**Example (from `base.py`):**
```python
class DomainModel(BaseModel):
    """Base for all domain entities.

    Entities are MUTABLE by default - they represent business objects
    that can change state (e.g., User records login attempts, Listing updates
    price, Role gains permissions).

    Key features:
    - validate_assignment: Validates on EVERY field assignment (not just __init__)
    - from_attributes: Allows ORM models to populate via model_validate()
    """
```

### TypeScript

**When to Comment:**
- Complex algorithms or non-obvious logic
- Business rules and constraints
- Workarounds and known issues

**Example (from `LoginForm.tsx`):**
```typescript
/**
 * LoginForm Component
 *
 * Login form with email/password, OAuth options, remember me, and form validation.
 * Integrates with useAuth hook, PasswordInput, and OAuthButtons components.
 */
```

**JSDoc:**
- Use JSDoc for functions and React components
- Format: `/** ... */` (not `/* ... */`)

## Function Design

### Python

**Size Guidelines:**
- Prefer functions less than 50 lines (break into helpers if longer)
- Single responsibility principle

**Parameters:**
- Maximum 4-5 positional parameters
- Use dataclass or Pydantic DTO for 5+ fields
- Always type hint parameters and return type

**Example (from `login_user.py`):**
```python
async def execute(self, request: LoginUserRequest) -> LoginUserResponse:
    """Execute user login."""
    # Implementation
```

**Return Values:**
- Explicit return type annotations required
- Return domain entities from repositories
- Return DTOs from use cases and API endpoints

### TypeScript

**Size Guidelines:**
- Prefer functions less than 30 lines
- Extract repeated logic into separate functions
- Use early returns to reduce nesting

**Parameters:**
- Use object destructuring for parameters
- Type all parameters explicitly

**Example (from component test):**
```typescript
const mockLogin = vi.fn();
const mockClearError = vi.fn();

// Good: Object with multiple params
const mockUser = {
    id: "1",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
};
```

**Return Values:**
- Always type the return type
- Async functions return `Promise<T>`
- Component functions return `React.ReactElement` or JSX.Element

## Module Design

### Python

**Exports:**
- Explicit imports in module files
- No star imports (`from x import *`)
- Use `__all__` if re-exporting from submodules

**Example:**
```python
# In prosell/domain/exceptions/__init__.py
from prosell.domain.exceptions.auth_exceptions import (
    InvalidCredentialsException,
    EmailNotVerifiedException,
)

__all__ = [
    "InvalidCredentialsException",
    "EmailNotVerifiedException",
]
```

**Barrel Files:**
- Use `__init__.py` to re-export from submodules for cleaner imports
- Example: `from prosell.domain.exceptions import InvalidCredentialsException`

### TypeScript

**Exports:**
- Use named exports (not default exports)
- Example: `export const useAuth = () => { ... }`
- Exception: React components can use default exports (`export default LoginForm`)

**Barrel Files:**
- Use `index.ts` to re-export from directory
- Example: `export { LoginForm } from "./LoginForm"`
- Clean up imports: `import { LoginForm } from "@/components/auth"`

## Async Patterns

### Python

**Always Use async/await:**
- All I/O operations MUST be `async def`
- Database operations: `await self.session.execute(stmt)`
- HTTP calls: `await httpx_client.get(url)`
- Redis operations: `await redis.set(key, value)`

**Example (from `facebook_account_repository_impl.py`):**
```python
async def create(self, account: FacebookAccount) -> FacebookAccount:
    """Create a new Facebook account connection."""
    model = FacebookAccountModel(...)

    self.session.add(model)
    await self.session.flush()  # MUST await

    return self._model_to_entity(model)

async def get_by_id(self, account_id: UUID) -> FacebookAccount | None:
    """Get Facebook account by ID."""
    stmt = select(FacebookAccountModel).where(FacebookAccountModel.id == account_id)
    result = await self.session.execute(stmt)  # MUST await
    model = result.scalar_one_or_none()

    return self._model_to_entity(model) if model else None
```

**Database Queries:**
- Use SQLAlchemy 2.0 `select()` style (not ORM query style)
- Always use parameterized queries (never string concatenation)
- Use `await self.session.execute()` for all queries

**Use Case Pattern:**
```python
class LoginUserUseCase:
    def __init__(self, user_repository: AbstractUserRepository, ...):
        self.user_repository = user_repository

    async def execute(self, request: LoginUserRequest) -> LoginUserResponse:
        user = await self.user_repository.get_by_email(request.email)
        # Business logic
        return LoginUserResponse(...)
```

### TypeScript

**React Hooks:**
- Use `async` functions inside effects (not on effect itself)
- Use React Query (`@tanstack/react-query`) for server state
- Use Zustand for client state

**Pattern (from `authStore.test.ts`):**
```typescript
login: async (credentials: { email: string; password: string }) => {
    set({ isLoading: true, error: null });

    try {
        const response = await authApi.login(
            credentials.email,
            credentials.password,
        );

        set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
        });
    } catch (unknownError) {
        // Error handling
    }
},
```

## Clean Architecture Rules

### Domain Layer

**Location:** `apps/api/src/prosell/domain/`

**Rules:**
- ZERO external dependencies (no FastAPI, SQLAlchemy, Pydantic outside of `base.py`)
- Only pure Python and `domain/base.py` imports
- All entities inherit from `DomainModel` or `ValueObject`
- All exceptions are pure Python classes
- Ports (interfaces) are defined here as abstract base classes

**Pattern (from `user.py`):**
```python
from prosell.domain.base import DomainModel

class User(DomainModel):
    """User entity - Pure domain logic with no external dependencies."""
    id: UUID
    email: str = Field(..., min_length=1)
    # Business methods
    def is_locked(self) -> bool:
        """Check if account is locked."""
        return self.locked_until is not None and self.locked_until > datetime.now(UTC)
```

### Application Layer

**Location:** `apps/api/src/prosell/application/`

**Rules:**
- Use cases orchestrate domain logic and repositories
- DTOs for input/output boundaries
- Dependencies injected via `__init__`
- All methods are `async def`
- One use case = one action (CreateUser, LoginUser, not UserService)

**Pattern (from `login_user.py`):**
```python
class LoginUserUseCase:
    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
        jwt_service: IJWTService,
    ) -> None:
        self.user_repository = user_repository
        # ...

    async def execute(self, request: LoginUserRequest) -> LoginUserResponse:
        # Orchestration and domain logic
```

### Infrastructure Layer

**Location:** `apps/api/src/prosell/infrastructure/`

**Rules:**
- Implements domain ports (repositories, services)
- FastAPI routers inject use cases via dependencies
- SQLAlchemy models mapped to entities via `_model_to_entity()` methods
- External API calls wrapped in domain-aware services

**Pattern (from `facebook_account_repository_impl.py`):**
```python
class SqlAlchemyFacebookAccountRepository(IFacebookAccountRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, account: FacebookAccount) -> FacebookAccount:
        # Implementation
        return self._model_to_entity(model)

    def _model_to_entity(self, model: FacebookAccountModel) -> FacebookAccount:
        """Map SQLAlchemy model to domain entity."""
        return FacebookAccount(
            id=model.id,
            # ...
        )
```

**FastAPI Routers:**
- Use `Depends()` for dependency injection
- Use `Annotated[Type, Depends(...)]` pattern
- All route handlers have explicit response models
- All request bodies use Pydantic DTOs

---

*Convention analysis: 2026-03-14*
