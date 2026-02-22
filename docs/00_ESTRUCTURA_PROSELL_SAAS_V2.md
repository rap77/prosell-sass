# Estructura del Monorepo - ProSell SaaS v2.0

**Proyecto**: ProSell SaaS
**Versión**: 2.0
**Fecha**: Febrero 2026
**Monorepo**: Turborepo + pnpm workspaces

---

## Visión General

ProSell SaaS está organizado como un **monorepo moderno** usando:

- **Turborepo**: Orquestación de builds y tareas
- **pnpm workspaces**: Gestión de dependencias
- **Clean Architecture**: Separación de dominio, aplicación e infraestructura

```
prosell-sass/
├── apps/                    # Aplicaciones desplegables
│   ├── api/                # Backend FastAPI (Python 3.13)
│   └── web/                # Frontend Next.js 16
├── packages/               # Código compartido
├── tests/e2e/              # Tests E2E centralizados
├── docker/                 # Configuración Docker
├── docs/                   # Documentación
└── [configs]               # Turborepo, pnpm, etc.
```

---

## Directorios Principales

### `/apps/` - Aplicaciones Desplegables

Contiene las aplicaciones principales del proyecto.

#### `/apps/api/` - Backend FastAPI

**Stack**: Python 3.13, FastAPI 0.115+, SQLAlchemy 2.0+, Pydantic 2.12+

```
apps/api/
├── src/prosell/            # Código fuente principal
│   ├── domain/             # Clean Architecture - Capa Dominio
│   ├── application/        # Clean Architecture - Capa Aplicación
│   └── infrastructure/     # Clean Architecture - Capa Infraestructura
├── tests/                  # Tests del backend
│   ├── unit/               # Tests unitarios
│   └── integration/        # Tests de integración
└── pyproject.toml          # Configuración Python (uv)
```

**Propósito**: API RESTful con Clean Architecture, sin dependencias externas en el dominio.

#### `/apps/web/` - Frontend Next.js

**Stack**: Next.js 16.1+, React 19, TypeScript 5.5+, TailwindCSS 4.0

```
apps/web/
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # Componentes React
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilidades
│   └── stores/             # Zustand stores
├── tests/                  # Tests del frontend
│   ├── unit/               # Tests unitarios
│   └── components/         # Tests de componentes
└── package.json            # Configuración Node (pnpm)
```

**Propósito**: UI web con Server Components y Client Components.

### `/packages/` - Código Compartido

Paquetes compartidos entre aplicaciones (para uso futuro).

```
packages/
└── shared-types/           # Tipos TypeScript compartidos
    ├── src/
    ├── package.json
    └── tsconfig.json
```

**Propósito**: Tipos, interfaces y utilidades compartidas entre API y Web.

### `/tests/e2e/` - Tests E2E

Tests end-to-end centralizados usando Playwright.

```
tests/e2e/
├── specs/                  # Especificaciones de prueba
├── fixtures/               # Datos de prueba
└── package.json
```

**Propósito**: Pruebas de integración completas del sistema.

### `/docs/` - Documentación

Documentación de arquitectura, requisitos y tareas.

```
docs/
├── 00_ESTRUCTURA_PROSELL_SAAS_V2.md     # Este archivo
├── 01_ARQUITECTURA_PROSELL_SAAS_V2.md   # Arquitectura completa
├── 02_REQUISITOS_PRD_PROSELL_SAAS_V2.md # PRD y user stories
├── 03_MODELO_DATOS_PROSELL_SAAS_V2.md   # Modelo de datos detallado
├── 04_ROADMAP_PROSELL_SAAS_V2.md        # Roadmap de desarrollo
└── 05_TAREAS_SPRINT_PROSELL_SAAS_V2.md  # Tareas por sprint
```

### `/docker/` - Configuración Docker

Archivos Docker para desarrollo y producción.

```
docker/
├── api.Dockerfile          # Imagen del backend
├── web.Dockerfile          # Imagen del frontend
└── docker-compose.yml      # Orquestación local
```

---

## Estructura Detallada: Backend

### `/apps/api/src/prosell/domain/` - Capa Dominio

**Regla de oro**: CERO dependencias externas (solo Python puro).

```
domain/
├── entities/               # Entidades y Agregados
│   ├── user/               # User, Role, Permission
│   ├── organization/       # Organization, Team
│   ├── product/            # Product, Vehicle, RealEstate
│   ├── sales/              # Appointment, Sale, Commission
│   └── wallet/             # Wallet, Transaction
├── value_objects/          # Value Objects inmutables
│   ├── email.py            # Email con validación
│   ├── money.py            # Money con currency
│   ├── phone.py            # Phone con formato
│   └── address.py          # Address normalizado
├── events/                 # Domain Events
│   ├── user_events.py      # UserRegistered, EmailVerified
│   ├── product_events.py   # ProductCreated, ProductPublished
│   └── sale_events.py      # SaleCompleted, CommissionGenerated
├── interfaces/             # Ports (contratos)
│   ├── repositories/       # IUserRepository, IProductRepository
│   ├── services/           # IEmailService, IStorageService
│   └── gateways/           # INhtsaGateway, IStripeGateway
├── services/               # Domain Services
│   └── commission_calculator.py
└── exceptions/             # Domain Exceptions
    ├── UserAlreadyExists.py
    └── InsufficientFunds.py
```

### `/apps/api/src/prosell/application/` - Capa Aplicación

**Dependencia**: Solo depende del Domain.

```
application/
├── use_cases/              # Casos de uso
│   ├── auth/               # RegisterUser, LoginUser
│   ├── users/              # GetUser, UpdateUser
│   ├── organizations/      # CreateOrganization, AddMember
│   ├── products/           # CreateProduct, PublishProduct
│   ├── sales/              # CreateAppointment, RegisterSale
│   ├── wallet/             # RechargeWallet, ConsumeTokens
│   ├── scraping/           # StartScraping, GetMarketData
│   └── analytics/          # GetPriceAnalysis, GetSalesReport
├── schemas/                # DTOs (Pydantic)
│   ├── user_schemas.py
│   ├── product_schemas.py
│   └── sale_schemas.py
├── services/               # Application Services
│   └── email_service.py
└── orchestrators/          # Workflows complejos
    └── onboarding_orchestrator.py
```

### `/apps/api/src/prosell/infrastructure/` - Capa Infraestructura

**Dependencia**: Implementa interfaces del Domain.

```
infrastructure/
├── http/                   # FastAPI
│   ├── routers/            # API endpoints
│   ├── middleware/         # Auth, CORS, RateLimit
│   └── dependencies/       # DI containers
├── websocket/              # WebSocket handlers
├── repositories/           # SQLAlchemy implementations
│   ├── user_repository_impl.py
│   └── product_repository_impl.py
├── services/               # External services
│   ├── auth/               # JWT, OAuth, TOTP
│   ├── notifications/      # Meta APIs
│   ├── storage/            # DigitalOcean Spaces
│   ├── ai/                 # Anthropic Claude
│   └── payments/           # Stripe
├── scrapers/               # Web scrapers
│   ├── facebook/           # FB Marketplace
│   ├── ebay/               # eBay Motors
│   └── craigslist/         # Craigslist
├── models/                 # SQLAlchemy models
├── database/               # DB config & migrations
│   ├── session.py
│   └── alembic/
├── cache/                  # Redis implementations
├── queue/                  # Redis Streams handlers
└── config/                 # Settings (Pydantic Settings)
```

---

## Estructura Detallada: Frontend

### `/apps/web/src/app/` - App Router

Next.js 16 usa el App Router con Server Components por defecto.

```
app/
├── (auth)/                 # Grupo de rutas de autenticación
│   ├── login/
│   ├── register/
│   └── reset-password/
├── (public)/               # Rutas públicas
│   ├── page.tsx            # Homepage
│   ├── catalog/
│   └── products/[id]/
├── dashboard/              # Dashboard protegido
│   ├── products/
│   ├── appointments/
│   ├── sales/
│   └── wallet/
├── admin/                  # Panel de admin
│   ├── organizations/
│   ├── teams/
│   └── approvals/
├── analytics/              # Análisis de mercado
└── api/                    # Route Handlers (API routes)
```

### `/apps/web/src/components/` - Componentes

```
components/
├── ui/                     # Componentes base (shadcn/ui)
├── auth/                   # LoginComponent, RegisterForm
├── products/               # ProductCard, ProductList
├── dashboard/              # StatsCard, SaleChart
└── notifications/          # NotificationCenter
```

### `/apps/web/src/stores/` - Zustand Stores

```
stores/
├── authStore.ts            # Estado de autenticación
├── productStore.ts         # Cache de productos
└── uiStore.ts              # Estado global de UI
```

---

## Convenciones

### Nombres de Archivos

- **Python**: `snake_case.py` (ej: `user_repository.py`)
- **TypeScript**: `camelCase.ts` (ej: `authStore.ts`)
- **Componentes React**: `PascalCase.tsx` (ej: `ProductCard.tsx`)

### Imports

**Backend (relativo a `apps/api/src/prosell/`)**:

```python
from domain.entities.user import User
from application.use_cases.auth import RegisterUserUseCase
from infrastructure.repositories.user_repository_impl import UserRepositoryImpl
```

**Frontend (usando alias `@/`)**:

```typescript
import { ProductCard } from "@/components/products/ProductCard";
import { useAuthStore } from "@/stores/authStore";
```

### Variables de Entorno

- **Backend**: `$DATABASE_URL`, `$REDIS_URL`, `$JWT_SECRET`
- **Frontend**: `$NEXT_PUBLIC_API_URL`, `$NEXT_PUBLIC_WS_URL`

---

## Comandos de Desarrollo

### Iniciar Todo

```bash
# Desde la raíz del monorepo
pnpm dev
```

### Solo Backend

```bash
cd apps/api
fastapi dev src/prosell/infrastructure/api/main.py --reload
```

### Solo Frontend

```bash
cd apps/web
pnpm dev
```

### Tests

```bash
# Backend
cd apps/api && uv run pytest

# Frontend
cd apps/web && pnpm test

# E2E
cd tests/e2e && pnpm test
```

### Linting

```bash
# Todos (via Turborepo)
pnpm lint
pnpm typecheck
```

---

## Referencias

- **Turborepo**: https://turbo.build/repo/docs
- **pnpm workspaces**: https://pnpm.io/workspaces
- **Next.js 16**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com
- **Clean Architecture**: Robert C. Martin

---

**Versión**: 2.0
**Última Actualización**: Febrero 2026
**Autor**: ProSell Architecture Team
