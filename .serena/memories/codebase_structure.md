# Codebase Structure - ProSell SaaS

## Monorepo Layout

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # Business logic, entities, interfaces
│   │   │   ├── application/    # Use cases, orchestration, DTOs
│   │   │   └── infrastructure/ # FastAPI, SQLAlchemy, scrapers
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── pyproject.toml
│   │
│   └── web/                    # Frontend Next.js 16 + React 19
│       ├── src/
│       │   ├── app/            # App Router
│       │   ├── components/
│       │   ├── lib/
│       │   └── stores/
│       ├── tests/
│       │   ├── unit/
│       │   └── components/
│       └── package.json
│
├── packages/                   # Shared code (future)
│   └── shared-types/
│
├── tests/e2e/                  # Playwright E2E tests
│   ├── specs/
│   └── fixtures/
│
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── docker-compose.yml
│
└── .github/workflows/ci.yml
```

## Key Directories

- `apps/api/src/prosell/domain/` - Clean Architecture domain layer (no dependencies)
- `apps/api/src/prosell/application/` - Use cases and orchestration
- `apps/api/src/prosell/infrastructure/` - FastAPI endpoints and adapters
- `apps/web/src/app/` - Next.js 16 App Router pages
- `docs/` - Architecture specs and PRD documents

## Important Notes (2026-02-06)

**Homologación Completada**: Todos los documentos en `docs/` ahora usan la estructura correcta del monorepo:

- `docs/00_ESTRUCTURA_PROSELL_SAAS_V2.md` - NUEVO documento de referencia
- `docs/01_ARQUITECTURA_PROSELL_SAAS_V2.md` - ACTUALIZADO (estructura monorepo)
- `docs/05_TAREAS_SPRINT_PROSELL_SAAS_V2.md` - ACTUALIZADO (rutas correctas)
- `docs/06_PROMPT_CLAUDE_CODE_2026_v2.md` - ACTUALIZADO (nombre correcto)

**Rutas Correctas**:

- Backend: `apps/api/src/prosell/` (NO `src/prosell/` solo)
- Frontend: `apps/web/src/` (NO `frontend/src/`)
- Proyecto: `prosell-sass/` (NO `prosell-saas/`)

**Documentos con Rutas Correctas**:

- `CLAUDE.md` ✅
- `PRPs/auth-system.md` ✅
- `.serena/memories/codebase_structure.md` ✅
