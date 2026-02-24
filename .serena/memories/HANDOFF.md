# Handoff: Sprint 3-4 Organizations - Phases 1-4 ~65% COMPLETADAS

**Fecha**: 2026-02-23
**Rama**: `sprint-3-4-organizations`
**Estado**: Phases 1-3 COMPLETADAS, Phase 4 (Frontend) ~30% completada
**Tests Backend**: 281/281 passing ✅
**Tests Frontend**: 353/353 passing ✅

---

## 🎯 LO QUE SE COMPLETÓ ESTA SESIÓN

### ✅ Phase 1: Domain Layer (COMPLETA)
**Commit**: `1b20c2e` (ya mergeado)

Entidades implementadas:
- `Organization` + `OrganizationStatus` (PENDING_VERIFICATION, ACTIVE, SUSPENDED, REJECTED)
- `Team`, `TeamMember` + `TeamMemberRole` (MANAGER, VENDOR)
- `Wallet`, `WalletTransaction` + `TransactionType` (CREDIT, DEBIT)

Interfaces de repositorios creadas:
- `AbstractOrganizationRepository` (8 métodos)
- `AbstractTeamRepository` + `AbstractTeamMemberRepository`
- `AbstractWalletRepository` + `AbstractWalletTransactionRepository`

**Tests**: 82 passing → `tests/unit/domain/`

---

### ✅ Phase 2: Backend Infrastructure + API (COMPLETA)

**DTOs creados**:
- `application/dto/org/` → create, response, update, __init__

**Use Cases**:
- CreateOrganization, GetOrganization, ListOrganizations
- UpdateOrganization, VerifyOrganization, RejectOrganization, SuspendOrganization

**Infraestructura**:
- SQLAlchemy models: `organization_model.py`, `team_model.py`, `wallet_model.py`
- Repository implementations: org, team, wallet

**API Router**: `org_router.py` (8 endpoints):
```
POST   /api/v1/org              → Create organization
GET    /api/v1/org              → List organizations (paginado)
GET    /api/v1/org/me           → Get current user's org
GET    /api/v1/org/{id}          → Get org by ID
PATCH  /api/v1/org/{id}          → Update org
POST   /api/v1/org/{id}/verify  → Verify org (SUPER_ADMIN)
POST   /api/v1/org/{id}/reject   → Reject org (SUPER_ADMIN)
POST   /api/v1/org/{id}/suspend   → Suspend org
```

**Tests**: 33 tests (18 unit + 15 integration)

---

### ✅ Phase 3: Teams & Wallet Backend (COMPLETA)

**DTOs creados**:
- `application/dto/team/` → create, response, update, __init__
- `application/dto/wallet/` → response, __init__

**Use Cases - Teams**:
- `CreateTeamUseCase` → Validación de nombre único
- `GetTeamUseCase`, `GetTeamsByOrganizationUseCase`
- `UpdateTeamUseCase`
- `AddTeamMemberUseCase` → Añade manager/vendor con comisión

**Use Cases - Wallet**:
- `GetWalletBalanceUseCase`
- `CreditWalletUseCase` → Recarga tokens (Stripe)
- `DebitWalletUseCase` → Gasta tokens (listing fees)
- `GetWalletTransactionsUseCase` → Historial

**DO Spaces Service**:
- `infrastructure/services/do_spaces_service.py`
- Presigned URLs para upload directo desde browser
- Helper functions: `generate_logo_path`, `generate_banner_path`, `generate_product_image_path`
- Puerto: `application/ports/ido_spaces.py`

**API Routers - Teams** (`team_router.py`):
```
POST   /api/v1/teams                       → Create team
GET    /api/v1/teams/org/{org_id}          → List teams by org
GET    /api/v1/teams/{team_id}              → Get team by ID
PATCH  /api/v1/teams/{team_id}              → Update team
POST   /api/v1/teams/{team_id}/members      → Add member
```

**API Routers - Wallet** (`wallet_router.py`):
```
GET    /api/v1/wallet/org/{org_id}                 → Get balance
GET    /api/v1/wallet/org/{org_id}/transactions    → Get transactions
POST   /api/v1/wallet/credit                       → Credit tokens
POST   /api/v1/wallet/debit                        → Debit tokens
```

**Configuraciones agregadas a `core/config.py`**:
```bash
# DigitalOcean Spaces
DO_REGION=nyc3
DO_BUCKET_NAME=prosell-assets
DO_ACCESS_KEY_ID=
DO_SECRET_ACCESS_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_TOKENS_100=
STRIPE_PRICE_ID_TOKENS_500=
STRIPE_PRICE_ID_TOKENS_1000=
```

**Tests**: 25 nuevos tests (9 Team + 7 Wallet + 9 DO Spaces)

---

## 📊 ESTADO DEL PROYECTO

### Tests Backend: 281/281 passing ✅
```
Domain (Phase 1):                 82 passing
Application Unit (Phase 2):      18 passing
Integration API (Phase 2):       15 passing
Application Unit (Phase 3):      16 passing (Team: 9, Wallet: 7)
Services Unit (Phase 3):          9 passing (DO Spaces)
Auth Backend:                    139 passing
=========================================
Total:                           281 passing ✅
```

### Fases Sprint 3-4
| Fase | Estado | Tests | Archivos clave |
|------|--------|-------|----------------|
| **Phase 1**: Domain | ✅ COMPLETA | 82 | entities/team.py/wallet.py |
| **Phase 2**: Org API | ✅ COMPLETA | 33 | org_router.py + use cases |
| **Phase 3**: Teams/Wallet | ✅ COMPLETA | 25 | team_router.py + wallet_router.py |
| **Phase 4**: Frontend | 🔄 ~30% | 353 | orgApi.ts + organizationStore.ts + pages |
| **Phase 5**: Integration | ⏳ PENDIENTE | - | E2E + Stripe webhook |

### ✅ Phase 4: Frontend (En progreso ~30%)

**Completado**:
- `lib/api/orgApi.ts` - API client para organizaciones (9 métodos)
- `stores/organizationStore.ts` - Zustand store con CRUD completo
- `components/forms/OrganizationForm.tsx` - Formulario create/edit con RHF + Zod
- `app/dashboard/org/page.tsx` - Lista de organizaciones con paginación
- `app/dashboard/org/new/page.tsx` - Crear nueva organización
- `app/dashboard/org/[id]/page.tsx` - Detalle de organización

**Pendiente**:
- `teamStore.ts` - Manage teams/members
- `walletStore.ts` - Balance + transactions
- `TeamForm.tsx` - Create/edit team
- `MemberForm.tsx` - Add vendor/manager
- `LogoUpload.tsx` - DO Spaces upload con Uppy
- `app/dashboard/org/[id]/wallet/page.tsx` - Wallet balance + recharge
- `WalletCard.tsx` - Balance display
- Tests para componentes nuevos
| **Phase 5**: Integration | ⏳ PENDIENTE | - | E2E + Stripe webhook |

---

## 📁 ARCHIVOS STAGED/LISTOS PARA COMMIT

```
alembic/versions/
  └── 20260222_0000-2a3b4c5d6e7f_organizations_teams_wallet_schema.py

apps/api/src/prosell/
├── application/
│   ├── dto/
│   │   ├── org/ (create, response, update, __init__.py)
│   │   ├── team/ (create, response, update, __init__.py)
│   │   └── wallet/ (response, __init__.py)
│   ├── ports/
│   │   └── ido_spaces.py
│   └── use_cases/
│       ├── org/ (create, get, update, verify, __init__.py)
│       ├── team/ (create_team, get_team, update_team, add_team_member, __init__.py)
│       └── wallet/ (wallet_operations, __init__.py)
├── core/
│   └── config.py (actualizado con DO Spaces + Stripe settings)
├── domain/
│   ├── exceptions/
│   │   └── org_exceptions.py
│   └── repositories/
│       └── __init__.py (exports actualizados)
├── infrastructure/
│   ├── api/
│   │   ├── main.py (routers registrados)
│   │   └── routers/
│   │       ├── org_router.py
│   │       ├── team_router.py (NUEVO)
│   │       └── wallet_router.py (NUEVO)
│   ├── models/
│   │   ├── organization_model.py
│   │   ├── team_model.py
│   │   └── wallet_model.py
│   ├── repositories/
│   │   ├── organization_repository_impl.py
│   │   ├── team_repository_impl.py
│   │   └── wallet_repository_impl.py
│   └── services/
│       └── do_spaces_service.py (NUEVO)
└── tests/
    ├── unit/
    │   ├── domain/ (Phase 1 tests)
    │   └── application/
    │       ├── test_organization_use_cases.py
    │       ├── test_team_use_cases.py (NUEVO)
    │       └── test_wallet_use_cases.py (NUEVO)
    ├── integration/
    │   └── test_organization_api.py
    └── unit/
        └── services/
            └── test_do_spaces_service.py (NUEVO)
```

---

## 🚀 PRÓXIMA SESIÓN - Phase 4: Frontend

### ✅ COMPLETADO - Phase 4 (Organizations):
- `lib/api/orgApi.ts` - API client con 9 métodos (create, list, get, update, verify, reject, suspend)
- `stores/organizationStore.ts` - Zustand store con CRUD completo + persist
- `components/forms/OrganizationForm.tsx` - RHF + Zod validation form
- `app/dashboard/org/page.tsx` - Lista organizaciones con paginación
- `app/dashboard/org/new/page.tsx` - Crear nueva organización
- `app/dashboard/org/[id]/page.tsx` - Detalle de organización

### ⏳ PENDIENTE - Phase 4 (Teams/Wallet):

**Teams Frontend:**
- `lib/api/teamApi.ts` - API client (5 métodos: create, list, get, update, add_member)
- `stores/teamStore.ts` - Zustand store para teams
- `TeamForm.tsx` - Formulario create/edit team
- `MemberForm.tsx` - Formulario añadir vendor/manager
- `app/dashboard/org/[id]/teams/page.tsx` - Página teams de la org

**Wallet Frontend:**
- `lib/api/walletApi.ts` - API client (4 métodos: balance, transactions, credit, debit)
- `stores/walletStore.ts` - Zustand store para wallet
- `app/dashboard/org/[id]/wallet/page.tsx` - Página wallet
- `WalletCard.tsx` - Componente balance display + recarga

**DO Spaces Upload (Opcional):**
- `LogoUpload.tsx` - Uppy Dashboard para logo/banner

### Referencia
- **PRP**: `PRPs/sprint-3-4-organizations.md`
- **Config**: `CLAUDE.md` → Tech Stack 2026
- **Frontend**: `apps/web/` (Next.js 16 + React 19)

---

## 💾 CÓMO CONTINUAR EN NUEVA VENTANA

```bash
# 1. Activar proyecto
cd /home/rpadron/proy/prosell-sass
mcp__serena__activate_project(project="/home/rpadron/proy/prosell-sass")
mcp__serena__read_memory("HANDOFF")
mcp__serena__read_memory("MEMORY.md")

# 2. Verificar estado
git branch  # debe ser sprint-3-4-organizations
git log --oneline -5

# 3. Tests
uv run pytest tests/ -q  # 281 tests backend
cd apps/web && pnpm test --run  # 353 tests frontend

# 4. PRÓXIMO PASO - Phase 4 Teams Frontend
# Copiar patrón de orgApi.ts → teamApi.ts
# Copiar patrón de organizationStore.ts → teamStore.ts
# Copiar patrón de OrganizationForm.tsx → TeamForm.tsx
```

---

**Proyecto**: ProSell SaaS
**Monorepo**: Clean Architecture (Domain → Application → Infrastructure)
**Stack**: Python 3.13, FastAPI, PostgreSQL | Next.js 16, React 19, Zustand 5
**Confidence**: 9/10**: 9/10
