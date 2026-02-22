# Plan: Configuración Monorepo ProSell SaaS 2026

## Objetivo

Configurar monorepo con Clean Architecture, SOLID principles, y stack 2026 (Python 3.13, Next.js 16, PostgreSQL 17).

## Estructura Final del Monorepo

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Clean Architecture)
│   │   ├── src/
│   │   │   └── prosell/
│   │   │       ├── domain/      # 🔴 CAPA DOMINIO (sin dependencias externas)
│   │   │       │   ├── entities/
│   │   │       │   ├── value_objects/
│   │   │       │   ├── events/
│   │   │       │   ├── exceptions/
│   │   │       │   ├── services/
│   │   │       │   └── repositories/  # Interfaces (Ports)
│   │   │       ├── application/ # 🟡 CAPA APLICACIÓN
│   │   │       │   ├── use_cases/
│   │   │       │   ├── dto/
│   │   │       │   ├── ports/    # Interfaces secundarias
│   │   │       │   └── services/
│   │   │       └── infrastructure/ # 🟢 CAPA INFRAESTRUCTURA
│   │   │           ├── api/      # FastAPI endpoints
│   │   │           ├── persistence/ # SQLAlchemy models
│   │   │           ├── external/  # Integraciones externas
│   │   │           ├── cache/
│   │   │           └── config/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── pyproject.toml
│   │
│   └── web/                    # Frontend Next.js 16
│       ├── src/
│       │   ├── app/            # App Router
│       │   ├── components/
│       │   │   ├── ui/         # shadcn/ui
│       │   │   ├── forms/
│       │   │   ├── layouts/
│       │   │   └── features/
│       │   ├── lib/
│       │   │   ├── api/
│       │   │   ├── utils/
│       │   │   └── validations/
│       │   ├── hooks/
│       │   ├── stores/
│       │   └── types/
│       ├── tests/
│       │   ├── unit/
│       │   └── components/
│       └── package.json
│
├── packages/
│   └── shared-types/           # Tipos compartidos
│
├── tests/
│   └── e2e/                    # Playwright E2E
│
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── docker-compose.yml
│
├── pyproject.toml              # Root: ruff, pyright
├── pnpm-workspace.yaml
├── turbo.json
├── .pre-commit-config.yaml
├── .python-version             # 3.13
├── .nvmrc                      # 22
├── CLAUDE.md
└── README.md
```

## Stack de Versiones 2026

| Tech           | Versión | Notas                               |
| -------------- | ------- | ----------------------------------- |
| Python         | 3.13+   | Free-threading habilitado           |
| FastAPI        | 0.115+  | Soporte Python 3.14                 |
| Pydantic       | 2.12+   | 5-50x más rápido que v1             |
| SQLAlchemy     | 2.0.36+ | Async nativo                        |
| PostgreSQL     | 17      | JSON_TABLE, incremental backup      |
| Redis          | 7.4+    | Redis Stack                         |
| Node           | 22 LTS  |                                     |
| Next.js        | 16.1+   | Turbopack default, Cache Components |
| React          | 19.2    | Server Components, Compiler         |
| TypeScript     | 5.5+    | Strict mode                         |
| TailwindCSS    | 4.0     | Nueva engine                        |
| Zustand        | 5.x     | State management                    |
| TanStack Query | v5      | Data fetching                       |
| Ruff           | 0.8+    | Linting Rust-based                  |
| Pyright        | 1.1+    | Type checking                       |

## Principios Arquitectónicos

### SOLID (Aplicado estrictamente)

- **S**: Cada clase/módulo tiene UNA sola razón para cambiar
- **O**: Abierto para extensión, cerrado para modificación
- **L**: Las clases derivadas pueden sustituir a las clases base
- **I**: Interfaces pequeñas y específicas
- **D**: Depender de abstracciones, no de implementaciones concretas

### Clean Architecture (Capas bien definidas)

```
INFRASTRUCTURE → APPLICATION → DOMAIN
```

**Regla de Dependencia**: Las dependencias SOLO apuntan hacia adentro (Domain).

## Configuración de Archivos

### apps/api/pyproject.toml

```toml
[project]
name = "prosell-api"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "pydantic>=2.12.0",
    "pydantic-settings>=2.7.0",
    "alembic>=1.14.0",
    "redis>=5.2.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.18",
    "httpx>=0.28.0",
    "boto3>=1.35.0",
    "stripe>=11.0.0",
    "anthropic>=0.40.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=6.0.0",
    "ruff>=0.8.0",
    "pyright>=1.1.390",
    "pre-commit>=4.0.0",
    "factory-boy>=3.3.0",
    "faker>=30.0.0",
]

[tool.ruff]
target-version = "py313"
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM", "ARG", "PTH", "RUF"]

[tool.pyright]
pythonVersion = "3.13"
typeCheckingMode = "strict"
venvPath = "."
venv = ".venv"

[tool.pytest.ini_options]
testpaths = ["../../tests/api"]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
addopts = "-v --tb=short"
```

### apps/web/package.json

```json
{
  "name": "@prosell/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "@hookform/resolvers": "^3.0.0",
    "zustand": "^5.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.17.0",
    "eslint-config-next": "^16.1.0",
    "prettier": "^3.4.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tests/*"
```

### docker/docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: prosell-db
    environment:
      POSTGRES_USER: prosell
      POSTGRES_PASSWORD: prosell_dev
      POSTGRES_DB: prosell
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prosell"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4-alpine
    container_name: prosell-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
    container_name: prosell-api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://prosell:prosell_dev@db:5432/prosell
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: dev-secret-key-change-in-production
      DEBUG: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ../apps/api:/app

  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile
    container_name: prosell-web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - api
    volumes:
      - ../apps/web:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
  redis_data:
```

### pyproject.toml (root)

```toml
[project]
name = "prosell-sass"
version = "0.1.0"
requires-python = ">=3.13"

[tool.ruff]
target-version = "py313"
line-length = 100
src = ["apps/api/src"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM", "ARG", "PTH", "RUF"]
ignore = ["E501"]

[tool.ruff.lint.isort]
known-first-party = ["prosell"]

[tool.pyright]
pythonVersion = "3.13"
typeCheckingMode = "strict"
```

## Comandos de Desarrollo

### Setup inicial

```bash
# Backend
cd apps/api && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"

# Frontend
pnpm install
```

### Desarrollo

```bash
# Todo el monorepo
pnpm dev

# Solo backend
cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py

# Solo frontend
cd apps/web && pnpm dev

# Con Docker
docker compose -f docker/docker-compose.yml up
```

### Testing

```bash
# Todos los tests
pnpm test

# Tests backend
pnpm test --filter=api

# Tests frontend
pnpm test --filter=web

# Tests E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Linting

```bash
# Todo
pnpm lint

# Backend
cd apps/api && ruff check . && ruff format .
cd apps/api && pyright

# Frontend
cd apps/web && pnpm lint
cd apps/web && pnpm typecheck
```

## Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: local
    hooks:
      - id: lint-staged
        name: lint-staged
        entry: pnpm exec lint-staged
        language: system
        pass_filenames: false
```

## Clean Architecture: Estructura Detallada

### Domain Layer (CERO dependencias externas)

```
domain/
├── entities/          # Objetos de negocio con comportamiento
│   ├── user.py
│   ├── organization.py
│   ├── product.py
│   └── sale.py
├── value_objects/     # Valores inmutables
│   ├── email.py
│   ├── money.py
│   └── vin.py
├── events/           # Eventos de dominio
│   ├── user_created.py
│   └── sale_completed.py
├── exceptions/       # Excepciones de negocio
│   └── domain_exceptions.py
├── services/         # Servicios de dominio
│   └── commission_calculator.py
└── repositories/     # INTERFACES (Ports)
    ├── user_repository.py
    ├── product_repository.py
    └── sale_repository.py
```

### Application Layer (Depende SOLO de Domain)

```
application/
├── use_cases/        # Un caso de uso = una acción
│   ├── users/
│   │   ├── create_user.py
│   │   ├── authenticate_user.py
│   │   └── get_user_by_id.py
│   ├── products/
│   │   ├── create_product.py
│   │   └── list_products.py
│   └── sales/
│       ├── create_sale.py
│       └── calculate_commissions.py
├── dto/              # Data Transfer Objects
│   ├── user_dto.py
│   └── product_dto.py
├── ports/            # Interfaces secundarias
│   ├── email_service.py
│   ├── storage_service.py
│   └── payment_service.py
└── services/         # Servicios de aplicación
    └── auth_service.py
```

### Infrastructure Layer (Implementa interfaces)

```
infrastructure/
├── api/              # FastAPI (Primary Adapters)
│   ├── main.py
│   ├── dependencies.py
│   ├── middleware/
│   └── v1/
│       ├── router.py
│       ├── schemas/
│       └── endpoints/
├── persistence/      # SQLAlchemy (Secondary Adapters)
│   ├── database.py
│   ├── models/
│   ├── repositories/
│   └── mappers/
├── external/         # Servicios externos
│   ├── stripe_payment_service.py
│   ├── do_spaces_storage_service.py
│   └── sendgrid_email_service.py
├── cache/            # Redis
│   └── redis_cache.py
└── config/           # Configuración
    └── settings.py
```

## Verificación

1. `uv sync` en `apps/api/` instala sin errores
2. `pnpm install` en root instala workspaces
3. `pre-commit install` configura hooks
4. `docker compose up` levanta api + web + db + redis
5. `pnpm test` ejecuta todos los tests
6. `pnpm lint` pasa sin errores
7. `pnpm typecheck` pasa sin errores
