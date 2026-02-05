# 🚀 PROMPT DE INICIALIZACIÓN - PROSELL SAAS (Stack 2026)

## Copia y pega este prompt en Claude Code para iniciar el proyecto:

---

```
Eres el desarrollador principal del proyecto ProSell SaaS. Necesito que me ayudes a construir esta plataforma desde cero con el stack tecnológico más moderno de 2026, siguiendo estrictamente los principios SOLID y Clean Architecture.

## 📋 CONTEXTO DEL PROYECTO

**ProSell SaaS** es una plataforma integral de e-commerce multiproducto que incluye:

1. **Marketplace/E-commerce**: Catálogo público para múltiples organizaciones (dealers, negocios)
2. **Sistema de Ventas**: Gestión de citas con QR, registro de ventas y comisiones multinivel
3. **Análisis de Mercado**: Scraping de Facebook Marketplace y análisis de precios con IA
4. **Sistema de Prepago**: Billetera virtual con tokens para servicios (fotos, listings, WhatsApp)
5. **Agentes IA**: Asistentes conversacionales con Anthropic Claude

---

## 🏗️ STACK TECNOLÓGICO 2026

### Backend (Python):
- **Runtime**: Python 3.13+ (free-threading habilitado)
- **Framework**: FastAPI 0.115+ (soporte Python 3.14)
- **ORM**: SQLAlchemy 2.0+ (async nativo con asyncpg)
- **Validación**: Pydantic v2.12+ (5-50x más rápido que v1)
- **ASGI Server**: Granian (Rust) o Uvicorn 0.30+
- **Task Queue**: SAQ (Simple Async Queue) o Celery
- **Scraping**: Playwright (async)
- **Auth**: JWT + OAuth2 + TOTP (2FA)

### Base de Datos:
- **Principal**: PostgreSQL 17 (JSON_TABLE, incremental backups)
- **Cache**: Redis 7.4+ (Redis Stack)
- **Search**: PostgreSQL Full-Text + pgvector (embeddings)
- **Queue**: Redis Streams

### Frontend:
- **Framework**: Next.js 16.1+ (Turbopack default, Cache Components, proxy.ts)
- **Runtime**: React 19.2 (Server Components, Compiler estable, View Transitions)
- **Lenguaje**: TypeScript 5.5+ (strict mode)
- **Styling**: TailwindCSS 4.0 + shadcn/ui
- **Estado**: Zustand 5.x + TanStack Query v5
- **Formularios**: React Hook Form + Zod 3.x
- **Caching**: `use cache` directive (modelo explícito)

### Infraestructura:
- **Hosting**: DigitalOcean App Platform / Kubernetes
- **Storage**: DigitalOcean Spaces (S3) + CDN
- **CI/CD**: GitHub Actions
- **Contenedores**: Docker + Docker Compose
- **IaC**: Pulumi o Terraform

### Herramientas de Desarrollo:
- **Monorepo**: Turborepo (orquestación de builds)
- **Package Manager Backend**: uv (10-100x más rápido que pip)
- **Package Manager Frontend**: pnpm 9.x
- **Linting Backend**: Ruff (Rust, reemplaza black+flake8+isort)
- **Linting Frontend**: ESLint 9 + Prettier
- **Type Check**: Pyright (backend) + TypeScript (frontend)
- **Testing**: pytest + Vitest + Playwright

---

## 🎯 PRINCIPIOS ARQUITECTÓNICOS

### SOLID Principles (Aplicados estrictamente)

**S - Single Responsibility Principle**
- Cada clase/módulo tiene UNA sola razón para cambiar
- Separación clara: Entity ≠ Repository ≠ UseCase ≠ Controller

**O - Open/Closed Principle**
- Abierto para extensión, cerrado para modificación
- Uso de interfaces y clases abstractas para extensibilidad

**L - Liskov Substitution Principle**
- Las clases derivadas pueden sustituir a las clases base
- Contracts claros en interfaces

**I - Interface Segregation Principle**
- Interfaces pequeñas y específicas
- No forzar implementación de métodos innecesarios

**D - Dependency Inversion Principle**
- Depender de abstracciones, no de implementaciones concretas
- Inyección de dependencias en todos los niveles

### Clean Architecture (Capas bien definidas)

```
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                            │
│  (FastAPI, SQLAlchemy, Redis, External APIs, UI)            │
├─────────────────────────────────────────────────────────────┤
│                 INTERFACE ADAPTERS                           │
│  (Controllers, Presenters, Gateways, Repositories Impl)     │
├─────────────────────────────────────────────────────────────┤
│                 APPLICATION LAYER                            │
│  (Use Cases, DTOs, Application Services, Ports)             │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                              │
│  (Entities, Value Objects, Domain Services, Events)         │
│  ⚠️ CERO dependencias externas - Solo Python puro           │
└─────────────────────────────────────────────────────────────┘
```

**Regla de Dependencia**: Las dependencias SOLO apuntan hacia adentro (Domain).
- Infrastructure → Application → Domain ✅
- Domain → Application ❌ (PROHIBIDO)

---

## 📁 ESTRUCTURA MONOREPO

```
prosell-saas/
│
├── 📦 apps/                          # Aplicaciones desplegables
│   │
│   ├── 🐍 api/                       # Backend FastAPI
│   │   ├── src/
│   │   │   └── prosell/
│   │   │       │
│   │   │       ├── domain/           # 🔴 CAPA DOMINIO (sin dependencias)
│   │   │       │   ├── __init__.py
│   │   │       │   ├── entities/     # Entidades de negocio
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── user.py
│   │   │       │   │   ├── organization.py
│   │   │       │   │   ├── product.py
│   │   │       │   │   ├── sale.py
│   │   │       │   │   └── wallet.py
│   │   │       │   ├── value_objects/ # Objetos de valor inmutables
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── email.py
│   │   │       │   │   ├── money.py
│   │   │       │   │   ├── phone.py
│   │   │       │   │   └── vin.py
│   │   │       │   ├── events/       # Eventos de dominio
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── user_events.py
│   │   │       │   │   └── sale_events.py
│   │   │       │   ├── exceptions/   # Excepciones de dominio
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   └── domain_exceptions.py
│   │   │       │   ├── services/     # Servicios de dominio
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   └── commission_calculator.py
│   │   │       │   └── repositories/ # 🔌 INTERFACES (Ports)
│   │   │       │       ├── __init__.py
│   │   │       │       ├── user_repository.py      # Abstract
│   │   │       │       ├── product_repository.py   # Abstract
│   │   │       │       └── sale_repository.py      # Abstract
│   │   │       │
│   │   │       ├── application/      # 🟡 CAPA APLICACIÓN
│   │   │       │   ├── __init__.py
│   │   │       │   ├── use_cases/    # Casos de uso (1 clase = 1 acción)
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── users/
│   │   │       │   │   │   ├── __init__.py
│   │   │       │   │   │   ├── create_user.py
│   │   │       │   │   │   ├── authenticate_user.py
│   │   │       │   │   │   └── get_user_by_id.py
│   │   │       │   │   ├── products/
│   │   │       │   │   │   ├── __init__.py
│   │   │       │   │   │   ├── create_product.py
│   │   │       │   │   │   ├── list_products.py
│   │   │       │   │   │   └── approve_product.py
│   │   │       │   │   └── sales/
│   │   │       │   │       ├── __init__.py
│   │   │       │   │       ├── create_sale.py
│   │   │       │   │       └── calculate_commissions.py
│   │   │       │   ├── dto/          # Data Transfer Objects
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── user_dto.py
│   │   │       │   │   ├── product_dto.py
│   │   │       │   │   └── sale_dto.py
│   │   │       │   ├── ports/        # Puertos secundarios (interfaces)
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── email_service.py       # Abstract
│   │   │       │   │   ├── storage_service.py     # Abstract
│   │   │       │   │   └── payment_service.py     # Abstract
│   │   │       │   └── services/     # Servicios de aplicación
│   │   │       │       ├── __init__.py
│   │   │       │       └── auth_service.py
│   │   │       │
│   │   │       └── infrastructure/   # 🟢 CAPA INFRAESTRUCTURA
│   │   │           ├── __init__.py
│   │   │           │
│   │   │           ├── api/          # FastAPI (Primary Adapters)
│   │   │           │   ├── __init__.py
│   │   │           │   ├── main.py   # App entry point
│   │   │           │   ├── dependencies.py  # DI container
│   │   │           │   ├── middleware/
│   │   │           │   │   ├── __init__.py
│   │   │           │   │   ├── auth.py
│   │   │           │   │   ├── cors.py
│   │   │           │   │   └── rate_limit.py
│   │   │           │   └── v1/       # Versionado de API
│   │   │           │       ├── __init__.py
│   │   │           │       ├── router.py
│   │   │           │       ├── schemas/  # Pydantic Request/Response
│   │   │           │       │   ├── __init__.py
│   │   │           │       │   ├── user_schemas.py
│   │   │           │       │   └── product_schemas.py
│   │   │           │       └── endpoints/
│   │   │           │           ├── __init__.py
│   │   │           │           ├── auth.py
│   │   │           │           ├── users.py
│   │   │           │           ├── products.py
│   │   │           │           └── health.py
│   │   │           │
│   │   │           ├── persistence/  # SQLAlchemy (Secondary Adapters)
│   │   │           │   ├── __init__.py
│   │   │           │   ├── database.py      # Engine, Session
│   │   │           │   ├── models/          # ORM Models
│   │   │           │   │   ├── __init__.py
│   │   │           │   │   ├── base.py
│   │   │           │   │   ├── user_model.py
│   │   │           │   │   └── product_model.py
│   │   │           │   ├── repositories/    # Implementaciones concretas
│   │   │           │   │   ├── __init__.py
│   │   │           │   │   ├── sqlalchemy_user_repository.py
│   │   │           │   │   └── sqlalchemy_product_repository.py
│   │   │           │   └── mappers/         # Entity <-> Model
│   │   │           │       ├── __init__.py
│   │   │           │       └── user_mapper.py
│   │   │           │
│   │   │           ├── external/     # Servicios externos (Secondary Adapters)
│   │   │           │   ├── __init__.py
│   │   │           │   ├── stripe_payment_service.py
│   │   │           │   ├── do_spaces_storage_service.py
│   │   │           │   ├── sendgrid_email_service.py
│   │   │           │   └── nhtsa_vin_decoder.py
│   │   │           │
│   │   │           ├── cache/        # Redis
│   │   │           │   ├── __init__.py
│   │   │           │   └── redis_cache.py
│   │   │           │
│   │   │           └── config/       # Configuración
│   │   │               ├── __init__.py
│   │   │               └── settings.py
│   │   │
│   │   ├── alembic/                  # Migraciones DB
│   │   │   ├── versions/
│   │   │   ├── env.py
│   │   │   └── alembic.ini
│   │   │
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── 🌐 web/                       # Frontend Next.js
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── (auth)/           # Grupo: páginas de auth
│       │   │   │   ├── login/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── register/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (dashboard)/      # Grupo: páginas protegidas
│       │   │   │   ├── dashboard/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── products/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   └── page.tsx
│       │   │   │   │   └── new/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── sales/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (public)/         # Grupo: páginas públicas
│       │   │   │   ├── catalog/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [slug]/
│       │   │   │   │       └── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── api/              # Route Handlers (BFF)
│       │   │   │   └── [...proxy]/
│       │   │   │       └── route.ts
│       │   │   ├── layout.tsx        # Root layout
│       │   │   ├── page.tsx          # Home
│       │   │   └── globals.css
│       │   │
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui components
│       │   │   │   ├── button.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   └── ...
│       │   │   ├── forms/            # Formularios específicos
│       │   │   │   ├── login-form.tsx
│       │   │   │   └── product-form.tsx
│       │   │   ├── layouts/          # Layouts reutilizables
│       │   │   │   ├── header.tsx
│       │   │   │   ├── sidebar.tsx
│       │   │   │   └── footer.tsx
│       │   │   └── features/         # Componentes por feature
│       │   │       ├── products/
│       │   │       │   ├── product-card.tsx
│       │   │       │   └── product-list.tsx
│       │   │       └── sales/
│       │   │           └── sale-card.tsx
│       │   │
│       │   ├── lib/                  # Utilidades
│       │   │   ├── api/              # Cliente API
│       │   │   │   ├── client.ts
│       │   │   │   └── endpoints.ts
│       │   │   ├── utils/
│       │   │   │   ├── cn.ts         # classnames helper
│       │   │   │   └── formatters.ts
│       │   │   └── validations/      # Zod schemas
│       │   │       ├── user.ts
│       │   │       └── product.ts
│       │   │
│       │   ├── hooks/                # Custom hooks
│       │   │   ├── use-auth.ts
│       │   │   ├── use-products.ts
│       │   │   └── use-debounce.ts
│       │   │
│       │   ├── stores/               # Zustand stores
│       │   │   ├── auth-store.ts
│       │   │   └── cart-store.ts
│       │   │
│       │   ├── types/                # TypeScript types
│       │   │   ├── api.ts
│       │   │   ├── user.ts
│       │   │   └── product.ts
│       │   │
│       │   └── styles/               # Estilos adicionales
│       │       └── themes.css
│       │
│       ├── public/                   # Assets estáticos
│       │   ├── images/
│       │   └── favicon.ico
│       │
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── README.md
│
├── 📦 packages/                      # Paquetes compartidos
│   │
│   ├── 📘 shared-types/              # Tipos compartidos Backend/Frontend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── product.ts
│   │   │   └── api-responses.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📘 ui/                        # Componentes UI compartidos (si hay mobile)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── 📘 config/                    # Configuraciones compartidas
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── tailwind/
│           └── preset.js
│
├── 🧪 tests/                         # Tests centralizados
│   │
│   ├── api/                          # Tests del Backend
│   │   ├── unit/                     # Tests unitarios
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── test_user.py
│   │   │   │   ├── value_objects/
│   │   │   │   │   └── test_email.py
│   │   │   │   └── services/
│   │   │   │       └── test_commission_calculator.py
│   │   │   ├── application/
│   │   │   │   └── use_cases/
│   │   │   │       └── test_create_user.py
│   │   │   └── conftest.py
│   │   │
│   │   ├── integration/              # Tests de integración
│   │   │   ├── repositories/
│   │   │   │   └── test_user_repository.py
│   │   │   ├── api/
│   │   │   │   └── test_auth_endpoints.py
│   │   │   └── conftest.py           # Fixtures DB, etc.
│   │   │
│   │   └── conftest.py               # Fixtures globales
│   │
│   ├── web/                          # Tests del Frontend
│   │   ├── unit/                     # Tests unitarios (Vitest)
│   │   │   ├── components/
│   │   │   │   └── product-card.test.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-auth.test.ts
│   │   │   └── setup.ts
│   │   │
│   │   └── e2e/                      # Tests E2E (Playwright)
│   │       ├── auth.spec.ts
│   │       ├── products.spec.ts
│   │       └── playwright.config.ts
│   │
│   └── shared/                       # Tests de tipos compartidos
│       └── types.test.ts
│
├── 🐳 docker/                        # Configuración Docker
│   ├── api/
│   │   └── Dockerfile
│   ├── web/
│   │   └── Dockerfile
│   └── docker-compose.yml
│
├── 📜 scripts/                       # Scripts de utilidad
│   ├── setup.sh                      # Setup inicial
│   ├── seed-db.py                    # Seed de datos
│   └── generate-types.ts             # Generar tipos desde OpenAPI
│
├── 📄 docs/                          # Documentación
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
│
├── 🔧 Archivos de configuración raíz
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml               # pnpm workspaces
├── .env.example
├── .gitignore
├── .dockerignore
├── README.md
└── Makefile                          # Comandos útiles
```

---

## 🔄 FLUJO DE DEPENDENCIAS (Clean Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                            │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│  │  FastAPI    │    │  SQLAlchemy     │    │  External APIs  │   │
│  │  Endpoints  │    │  Repositories   │    │  (Stripe, S3)   │   │
│  └──────┬──────┘    └────────┬────────┘    └────────┬────────┘   │
│         │                    │                      │             │
│         │         ┌──────────┴──────────┐          │             │
│         │         │ Repository Impls    │          │             │
│         │         │ (Adapters)          │          │             │
│         │         └──────────┬──────────┘          │             │
└─────────┼────────────────────┼─────────────────────┼─────────────┘
          │                    │                      │
          ▼                    ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      USE CASES                               │ │
│  │  CreateUser │ AuthenticateUser │ CreateProduct │ CreateSale  │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                            │                                      │
│  ┌─────────────────────────┴───────────────────────────────────┐ │
│  │                   PORTS (Interfaces)                         │ │
│  │  IUserRepository │ IProductRepository │ IPaymentService      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                               │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │   ENTITIES    │  │ VALUE OBJECTS  │  │  DOMAIN SERVICES    │  │
│  │  User, Sale   │  │ Email, Money   │  │ CommissionCalc      │  │
│  └───────────────┘  └────────────────┘  └─────────────────────┘  │
│                                                                   │
│  ⚠️  CERO DEPENDENCIAS EXTERNAS - SOLO PYTHON PURO               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 👥 SISTEMA DE ROLES

6 roles jerárquicos con RBAC granular:
1. **MASTER**: Control total (ProSell owner)
2. **MANAGER**: Gestiona equipo de vendedores, asignado a organizaciones
3. **SELLER_PROSELL**: Vendedor de plataforma, acceso cross-organization
4. **ORG_ADMIN**: Admin de su organización/dealer
5. **ORG_SELLER**: Vendedor de su organización
6. **CLIENT**: Comprador público

---

## 💰 SISTEMA DE COMISIONES

- Comisión total: 3% del precio de venta
- Distribución default: Vendedor 40% | Manager 20% | ProSell 40%
- Porcentajes editables por Master
- Manager puede vender directamente (gana ambas comisiones)

---

## ⚙️ COMANDOS DEL MONOREPO

```bash
# ============ SETUP INICIAL ============
# Instalar dependencias de todo el monorepo
pnpm install

# Setup backend con uv
cd apps/api && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"

# ============ DESARROLLO ============
# Correr todo el monorepo
pnpm dev

# Solo backend
pnpm dev --filter=api
# O directamente:
cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py

# Solo frontend
pnpm dev --filter=web

# ============ TESTS ============
# Todos los tests
pnpm test

# Tests backend
pnpm test --filter=api
# O con pytest directamente:
cd apps/api && pytest tests/ -v --asyncio-mode=auto

# Tests frontend unit
pnpm test --filter=web

# Tests E2E
pnpm test:e2e

# Coverage
pnpm test:coverage

# ============ LINTING & FORMAT ============
# Lint todo
pnpm lint

# Backend con Ruff
cd apps/api && ruff check --fix . && ruff format .

# Frontend
pnpm lint --filter=web

# Type check
pnpm typecheck

# ============ BUILD ============
# Build todo
pnpm build

# Build específico
pnpm build --filter=api
pnpm build --filter=web

# ============ DATABASE ============
# Migraciones
cd apps/api && alembic upgrade head
cd apps/api && alembic revision --autogenerate -m "descripción"

# ============ DOCKER ============
# Levantar servicios
docker compose up -d

# Logs
docker compose logs -f api

# Rebuild
docker compose up -d --build
```

---

## 📝 ARCHIVOS DE CONFIGURACIÓN

### turbo.json (Raíz del monorepo)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
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
    "httpx>=0.28.0",
    "ruff>=0.8.0",
    "pyright>=1.1.390",
    "pre-commit>=4.0.0",
    "factory-boy>=3.3.0",
    "faker>=30.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/prosell"]

[tool.ruff]
target-version = "py313"
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # Pyflakes
    "I",      # isort
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "SIM",    # flake8-simplify
    "ARG",    # flake8-unused-arguments
    "PTH",    # flake8-use-pathlib
    "RUF",    # Ruff-specific rules
]

[tool.ruff.lint.isort]
known-first-party = ["prosell"]

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
    command: fastapi dev src/prosell/infrastructure/api/main.py --host 0.0.0.0

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
    command: pnpm dev

volumes:
  postgres_data:
  redis_data:
```

### Makefile (Raíz)
```makefile
.PHONY: install dev test lint build docker-up docker-down migrate

# Setup
install:
	pnpm install
	cd apps/api && uv venv && . .venv/bin/activate && uv pip install -e ".[dev]"

# Development
dev:
	pnpm dev

dev-api:
	cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py

dev-web:
	pnpm dev --filter=web

# Testing
test:
	pnpm test

test-api:
	cd apps/api && pytest ../../tests/api -v --asyncio-mode=auto

test-api-cov:
	cd apps/api && pytest ../../tests/api -v --cov=src/prosell --cov-report=html

test-web:
	pnpm test --filter=web

test-e2e:
	pnpm test:e2e

# Linting
lint:
	pnpm lint
	cd apps/api && ruff check . && ruff format --check .

lint-fix:
	cd apps/api && ruff check --fix . && ruff format .
	pnpm lint --filter=web -- --fix

typecheck:
	cd apps/api && pyright
	pnpm typecheck --filter=web

# Build
build:
	pnpm build

# Docker
docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

docker-logs:
	docker compose -f docker/docker-compose.yml logs -f

# Database
migrate:
	cd apps/api && alembic upgrade head

migrate-create:
	cd apps/api && alembic revision --autogenerate -m "$(name)"

# Clean
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules/.cache
```

---

## 🎯 PRIMERA TAREA

Comienza configurando el monorepo base:

1. **Crear estructura de directorios completa** (monorepo con apps/, packages/, tests/)
2. **Configurar Turborepo** (turbo.json, pnpm-workspace.yaml)
3. **Configurar apps/api** con Clean Architecture:
   - pyproject.toml con uv
   - Estructura domain/application/infrastructure
   - FastAPI app con health check
4. **Configurar apps/web** con Next.js 16:
   - App Router structure
   - TailwindCSS 4 + shadcn/ui
5. **Configurar docker/docker-compose.yml** (PostgreSQL 17, Redis 7.4)
6. **Configurar tests/** con estructura separada
7. **Crear Makefile** con comandos útiles
8. **Crear .env.example** con todas las variables

Sigue estrictamente:
- SOLID principles
- Clean Architecture
- Dependency Inversion (interfaces en domain, implementaciones en infrastructure)
- Tipado estricto (pyright strict, TypeScript strict)

¿Listo para comenzar? Responde "Sí" y empezamos con el setup del monorepo.
```

---

## 🔄 PROMPTS DE SEGUIMIENTO

### Para implementar un módulo con Clean Architecture:

```
Implementa el módulo de [USUARIOS/PRODUCTOS/VENTAS] siguiendo Clean Architecture y SOLID.

Estructura del monorepo:
- apps/api/src/prosell/domain/ → Entities, Value Objects, Interfaces
- apps/api/src/prosell/application/ → Use Cases, DTOs, Ports
- apps/api/src/prosell/infrastructure/ → FastAPI, SQLAlchemy, External Services
- tests/api/unit/ → Tests unitarios
- tests/api/integration/ → Tests de integración

Genera en este orden:
1. **Domain Layer**:
   - Entity con reglas de negocio
   - Value Objects necesarios
   - Repository Interface (Port)
   - Domain Exceptions

2. **Application Layer**:
   - Use Cases (1 clase = 1 acción)
   - DTOs para entrada/salida
   - Application Service si es necesario

3. **Infrastructure Layer**:
   - SQLAlchemy Model
   - Repository Implementation
   - FastAPI Schemas (Request/Response)
   - Endpoint

4. **Tests**:
   - Unit tests para Entity y Use Cases
   - Integration tests para Repository y Endpoint

Aplica SOLID:
- S: Cada clase tiene una sola responsabilidad
- O: Extensible sin modificar código existente
- L: Implementaciones sustituibles
- I: Interfaces pequeñas y específicas
- D: Dependencias inyectadas, no hardcodeadas
```

### Para agregar tests:

```
Agrega tests para el módulo de [NOMBRE].

Ubicación:
- tests/api/unit/domain/ → Tests de entities y value objects
- tests/api/unit/application/ → Tests de use cases (con mocks)
- tests/api/integration/ → Tests con DB real

Stack: pytest + pytest-asyncio + factory-boy + faker

Genera:
1. Fixtures en conftest.py
2. Factories para crear entidades de prueba
3. Unit tests con mocks para dependencias
4. Integration tests con TestClient y DB de prueba

Coverage objetivo: >90%
```

### Para el frontend:

```
Implementa la página/feature de [DESCRIPCIÓN] en apps/web.

Stack: Next.js 16.1, React 19.2, TypeScript 5.5, TailwindCSS 4, shadcn/ui

Estructura:
- src/app/(grupo)/ruta/page.tsx → Página
- src/components/features/[feature]/ → Componentes específicos
- src/lib/api/ → Cliente API
- src/hooks/ → Custom hooks
- src/stores/ → Zustand si necesario
- tests/web/unit/ → Tests con Vitest
- tests/web/e2e/ → Tests con Playwright

Usa:
- Server Components por defecto
- 'use client' solo cuando sea necesario
- `use cache` para datos que pueden cachearse
- TanStack Query para fetching client-side
- Zod para validación de formularios
```

---

## 💡 TIPS IMPORTANTES

1. **Domain NUNCA importa de Infrastructure** - La dirección es siempre hacia adentro
2. **Use Cases reciben interfaces, no implementaciones** - Inyección de dependencias
3. **Un Use Case = Una acción** - CreateUser, GetUserById, etc.
4. **Tests unitarios mockean las dependencias** - Solo testean la lógica
5. **Tests de integración usan DB real** - Verifican que todo funcione junto
6. **Turborepo cachea builds** - Usa `pnpm build` para aprovechar el cache
7. **Next.js 16 usa Cache Components** - `use cache` es el nuevo modelo
8. **proxy.ts reemplaza middleware** - Más claro para network boundary

---

## 📚 REFERENCIAS RÁPIDAS

| Tecnología | Versión 2026 | Notas |
|------------|--------------|-------|
| Python | 3.13+ | Free-threading |
| FastAPI | 0.115+ | Python 3.14 support |
| SQLAlchemy | 2.0+ | Async nativo |
| Pydantic | 2.12+ | 5-50x más rápido |
| PostgreSQL | 17 | JSON_TABLE, incremental backup |
| Next.js | 16.1+ | Turbopack default, Cache Components |
| React | 19.2 | Server Components, Compiler, View Transitions |
| TypeScript | 5.5+ | Strict mode |
| TailwindCSS | 4.0 | Nueva engine |
| Turborepo | Latest | Monorepo orchestration |
| uv | Latest | 10-100x más rápido que pip |
| Ruff | 0.8+ | Linting Rust-based |

---
