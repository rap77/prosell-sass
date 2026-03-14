# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
prosell-sass/
├── apps/
│   ├── api/                            # Backend FastAPI (Python 3.13)
│   │   ├── src/prosell/                # Source code
│   │   │   ├── core/                   # Configuration
│   │   │   ├── domain/                 # Business logic (no external deps)
│   │   │   ├── application/            # Use cases and orchestration
│   │   │   └── infrastructure/         # FastAPI, DB, external services
│   │   ├── tests/                      # Test suite
│   │   │   ├── unit/                   # Unit tests
│   │   │   └── integration/            # Integration tests
│   │   ├── alembic/                    # Database migrations
│   │   ├── keys/                       # Encryption keys (non-committed)
│   │   ├── scripts/                    # Utility scripts
│   │   └── pyproject.toml              # Python package config
│   │
│   └── web/                            # Frontend Next.js 16 + React 19
│       ├── src/                        # Source code
│       │   ├── app/                    # Next.js App Router
│       │   ├── components/             # React components
│       │   ├── hooks/                  # Custom hooks
│       │   ├── lib/                    # Utilities and helpers
│       │   ├── stores/                 # Zustand state stores
│       │   ├── types/                  # TypeScript types
│       │   ├── domain/                 # Domain types (shared with API)
│       │   └── middleware.ts           # Next.js middleware
│       ├── tests/                      # Test suite
│       ├── coverage/                   # Test coverage reports
│       ├── docs/                       # Frontend documentation
│       └── package.json                # Node package config
│
├── packages/                           # Shared code across apps
│   └── shared-types/                   # TypeScript types shared by API & Web
│
├── tests/e2e/                          # End-to-end tests (Playwright)
│   ├── specs/                          # Test specifications
│   ├── auth/                           # Auth flow tests
│   └── dashboard/                      # Dashboard tests
│
├── docker/                             # Docker configuration
│   ├── api.Dockerfile                  # Backend image
│   ├── web.Dockerfile                  # Frontend image
│   └── docker-compose.yml              # Local dev composition
│
├── docs/                               # Architecture & design docs
│   ├── 00_ESTRUCTURA_PROSELL_SAAS_V2.md
│   ├── 01_ARQUITECTURA_PROSELL_SAAS_V2.md
│   ├── 02_REQUISITOS_PRD_PROSELL_SAAS_V2.md
│   ├── MODELO-ENTIDAD-RELACION.md
│   ├── 04_ROADMAP_PROSELL_SAAS_V2.md
│   └── [other design docs]
│
├── .planning/codebase/                 # GSD planning documents
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   └── [other planning docs]
│
├── scripts/                            # Root-level utility scripts
├── PRPs/                               # Pull Request templates
└── [config files]                      # turbo.json, pnpm-workspace.yaml, etc.
```

## Directory Purposes

**`apps/api/src/prosell/`** - Backend monolith with Clean Architecture

Contains three strict layers:

**Domain Layer** (`domain/`):
- Purpose: Pure business logic with ZERO external dependencies
- Contains: Entities, Value Objects, Domain Events, Port Interfaces, Repository Interfaces, Exceptions
- Key files:
  - `base.py`: `DomainModel`, `ValueObject`, `DomainEvent` base classes
  - `entities/`: User, Product, Organization, Category, Vehicle, Team, Wallet, etc.
  - `value_objects/`: Immutable concepts (Email, Money, Percentage, etc.)
  - `ports/`: Interface contracts for services (IJWTService, IPasswordService, IEncryptionService, etc.)
  - `repositories/`: Abstract repository interfaces (IUserRepository, IProductRepository, etc.)
  - `events/`: Domain events (UserRegisteredEvent, UserLoggedInEvent, etc.)
  - `exceptions/`: Domain exceptions (InvalidCredentialsException, EmailNotVerifiedException, etc.)

**Application Layer** (`application/`):
- Purpose: Use cases and business workflow orchestration
- Contains: Use Cases, DTOs, Application Ports, Orchestrators
- Key files:
  - `use_cases/`: One directory per domain concept (auth/, product/, org/, wallet/, facebook/, etc.)
  - Each use case is a single class with `execute()` method
  - `dto/`: Request/Response Pydantic models for each use case
  - `ports/`: Additional service interfaces specific to application layer

**Infrastructure Layer** (`infrastructure/`):
- Purpose: External integrations and technical details
- Contains: FastAPI setup, SQLAlchemy models, repositories, services, middleware
- Subdirectories:
  - `api/`: FastAPI application setup
    - `main.py`: FastAPI app instance, middleware, router registration
    - `routers/`: Endpoint handlers for each domain (auth_router.py, product_router.py, etc.)
    - `middleware/`: Authentication, authorization, rate limiting, exception handlers
    - `schemas/`: API request/response models
    - `dependencies.py`: Dependency injection container
  - `models/`: SQLAlchemy ORM models (user_model.py, product_model.py, etc.)
  - `repositories/`: SQLAlchemy implementations of domain repository interfaces
  - `services/`: External service implementations (JWT, OAuth, Email, Password hashing, etc.)
  - `database/`: Session management and migrations
  - `tasks/`: Background job workers (Taskiq broker)

**Configuration** (`core/`):
- `config.py`: Pydantic Settings, environment variables, feature flags

---

## Key File Locations

**Entry Points:**
- `apps/api/src/prosell/infrastructure/api/main.py` - FastAPI app startup
- `apps/api/src/prosell/infrastructure/tasks/worker.py` - Background job worker

**Core Domain:**
- `apps/api/src/prosell/domain/entities/user.py` - User entity with auth logic
- `apps/api/src/prosell/domain/entities/product.py` - Product entity with publication workflow
- `apps/api/src/prosell/domain/entities/organization.py` - Organization (tenant) entity
- `apps/api/src/prosell/domain/entities/facebook_account.py` - Facebook OAuth account
- `apps/api/src/prosell/domain/entities/facebook_page.py` - Facebook page mapped to account

**Authentication & Security:**
- `apps/api/src/prosell/application/use_cases/auth/login_user.py` - User login orchestration
- `apps/api/src/prosell/application/use_cases/auth/register_user.py` - User registration
- `apps/api/src/prosell/application/use_cases/auth/oauth_login.py` - OAuth initiation
- `apps/api/src/prosell/application/use_cases/facebook/oauth_callback.py` - OAuth callback handling
- `apps/api/src/prosell/infrastructure/api/middleware/auth_middleware.py` - JWT validation and injection
- `apps/api/src/prosell/infrastructure/services/jwt_service.py` - JWT token generation/validation
- `apps/api/src/prosell/infrastructure/services/password_service.py` - Password hashing (Argon2)
- `apps/api/src/prosell/infrastructure/services/token_encryption_service.py` - Token encryption (AES-256)

**Database:**
- `apps/api/src/prosell/infrastructure/database/session.py` - Async session factory
- `apps/api/src/prosell/infrastructure/database/base.py` - SQLAlchemy Base declarative
- `apps/api/alembic/env.py` - Migration script
- `apps/api/alembic/versions/` - Versioned migrations

**API Routing:**
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` - Auth endpoints
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` - Product CRUD
- `apps/api/src/prosell/infrastructure/api/routers/org_router.py` - Organization endpoints
- `apps/api/src/prosell/infrastructure/api/routers/facebook_router.py` - Facebook OAuth endpoints
- `apps/api/src/prosell/infrastructure/api/routers/health_router.py` - Health check

**Dependency Injection:**
- `apps/api/src/prosell/infrastructure/api/dependencies.py` - DI container with factory methods

**Frontend:**
- `apps/web/src/app/page.tsx` - Homepage
- `apps/web/src/app/layout.tsx` - Root layout
- `apps/web/src/app/auth/login/page.tsx` - Login page
- `apps/web/src/app/dashboard/` - Protected dashboard routes
- `apps/web/src/middleware.ts` - Next.js middleware for auth protection
- `apps/web/src/stores/authStore.ts` - Zustand auth state
- `apps/web/src/components/auth/` - Authentication components

**Testing:**
- `apps/api/tests/unit/` - Unit tests (domain, application, services)
- `apps/api/tests/integration/` - Integration tests (with database)
- `tests/e2e/specs/` - Playwright E2E tests

---

## Naming Conventions

**Python Files:**
- `snake_case.py` (e.g., `login_user.py`, `user_repository.py`, `auth_middleware.py`)

**Python Classes:**
- `PascalCase` (e.g., `LoginUserUseCase`, `User`, `UserRepository`)
- Entity classes: `EntityName` (e.g., `User`, `Product`, `Organization`)
- Use case classes: `VerbNounUseCase` (e.g., `LoginUserUseCase`, `CreateProductUseCase`)
- Service classes: `NounService` or `INounService` (interface) (e.g., `PasswordService`, `IJWTService`)
- Repository classes: `RepositoryName` or `IRepositoryName` (interface) (e.g., `SqlAlchemyUserRepository`, `IUserRepository`)
- Model classes: `EntityNameModel` (e.g., `UserModel`, `ProductModel`)

**TypeScript/React Files:**
- `kebab-case.ts` for utilities and configs (e.g., `auth-store.ts`, `api-client.ts`)
- `PascalCase.tsx` for React components (e.g., `LoginForm.tsx`, `ProductCard.tsx`)

**Directories:**
- `snake_case/` (e.g., `use_cases/`, `repositories/`, `services/`)

**Python Imports (Backend):**
```python
# Domain imports (relative to src/prosell/)
from domain.entities.user import User
from domain.repositories.user_repository import IUserRepository
from domain.ports import IJWTService

# Application imports
from application.use_cases.auth.login_user import LoginUserUseCase
from application.dto.auth import LoginUserRequest, LoginUserResponse

# Infrastructure imports
from infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository
from infrastructure.services.jwt_service import JWTService
```

**TypeScript Imports (Frontend):**
```typescript
// Using @/ alias (configured in tsconfig.json)
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/auth";
import { api } from "@/lib/api/client";
```

---

## Where to Add New Code

**New Authentication Feature** (e.g., Social login provider):
- Domain entity: `apps/api/src/prosell/domain/entities/facebook_account.py` (extend pattern)
- Domain event: `apps/api/src/prosell/domain/events/user_events.py` (add event)
- Domain port: `apps/api/src/prosell/domain/ports/i_facebook_marketplace_service.py`
- Use case: `apps/api/src/prosell/application/use_cases/facebook/oauth_callback.py`
- Service implementation: `apps/api/src/prosell/infrastructure/services/facebook_marketplace_oauth_service.py`
- Router: `apps/api/src/prosell/infrastructure/api/routers/facebook_router.py`
- Tests: `apps/api/tests/unit/application/facebook/` and `apps/api/tests/integration/test_facebook_oauth_integration.py`

**New Product Feature** (e.g., Search, filtering):
- Domain enhancement: `apps/api/src/prosell/domain/entities/product.py` (add business logic)
- Use case: `apps/api/src/prosell/application/use_cases/product/search_products.py`
- Repository enhancement: `apps/api/src/prosell/domain/repositories/product_repository.py` (add filter method)
- Repository implementation: `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py`
- Router: `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (add endpoint)
- Tests: `apps/api/tests/unit/application/product/` and `apps/api/tests/integration/test_product_integration.py`

**New Component (Frontend)**:
- Component file: `apps/web/src/components/[feature]/ComponentName.tsx`
- Tests: `apps/web/tests/components/[feature]/ComponentName.test.tsx`
- Use Zustand for state: `apps/web/src/stores/[feature]Store.ts`
- Types: `apps/web/src/types/[feature].ts`

**Utility Functions**:
- Backend: `apps/api/src/prosell/domain/value_objects/` or `apps/api/src/prosell/infrastructure/services/`
- Frontend: `apps/web/src/lib/[category]/` (e.g., `lib/utils/format.ts`, `lib/api/client.ts`)

**Constants & Configuration**:
- Backend: `apps/api/src/prosell/core/config.py` (Pydantic Settings)
- Frontend: `apps/web/src/lib/constants.ts` or `.env.local`

---

## Special Directories

**`apps/api/alembic/`:**
- Purpose: Database schema versioning
- Generated: Yes (created by `alembic init` command)
- Committed: Yes
- Workflow: Create entity → `alembic revision --autogenerate -m "description"` → Edit migration → `alembic upgrade head`
- Key files: `env.py` (migration runner), `versions/` (version scripts)

**`apps/api/tests/`:**
- Purpose: Test suite (unit + integration)
- Generated: No (manually written)
- Committed: Yes
- Structure mirrors source: `tests/unit/domain/`, `tests/unit/application/`, `tests/integration/`
- Fixtures in `conftest.py` files

**`apps/web/src/app/api/`:**
- Purpose: Next.js Route Handlers (proxies to backend API)
- Generated: No (manually written)
- Committed: Yes
- Pattern: Each route handler forwards to backend, enables CORS bypassing and cookie handling

**`keys/`:**
- Purpose: Encryption keys for tokens (non-committed)
- Generated: Yes (by setup script or manual generation)
- Committed: No (in `.gitignore`)
- Usage: Token encryption/decryption in `infrastructure/services/token_encryption_service.py`

**`docs/`:**
- Purpose: Architecture and design documentation
- Generated: No (manually written)
- Committed: Yes
- Key docs: ARQUITECTURA_PROSELL_SAAS_V2.md (full architecture), MODELO-ENTIDAD-RELACION.md (ER diagram)

**`.planning/codebase/`:**
- Purpose: GSD mapping documents for code generation
- Generated: Yes (by GSD mappers)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md

---

## Import Path Rules

**Backend (Python):**
- All imports are relative to `apps/api/src/prosell/`
- No circular imports allowed (architecture rule: Infrastructure → Application → Domain)
- Type checking uses `TYPE_CHECKING` guard for circular reference prevention:
  ```python
  from __future__ import annotations
  if TYPE_CHECKING:
      from domain.entities.user import User
  ```

**Frontend (TypeScript):**
- Use `@/` alias for absolute imports (configured in `apps/web/tsconfig.json`)
- Avoid relative imports beyond 2 levels: `../../` is limit
- Public API routes use `/api/v1/` or `/api/` prefix

---

## Configuration Files

**Root-level:**
- `turbo.json` - Turborepo task orchestration (lint, typecheck, test, build)
- `pnpm-workspace.yaml` - pnpm workspaces configuration
- `.pre-commit-config.yaml` - Git pre-commit hooks (ruff, pyright, eslint, prettier)
- `.gga` - GGA (AI code review) configuration

**Backend:**
- `apps/api/pyproject.toml` - Python dependencies (uv-managed)
- `apps/api/.flake8` or similar - Python linter config
- `apps/api/alembic.ini` - Alembic configuration

**Frontend:**
- `apps/web/package.json` - Node dependencies
- `apps/web/tsconfig.json` - TypeScript configuration
- `apps/web/next.config.ts` - Next.js configuration
- `apps/web/vitest.config.ts` - Vitest test runner config

---

*Structure analysis: 2026-03-14*
