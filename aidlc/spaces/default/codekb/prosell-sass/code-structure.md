# Code Structure — ProSell SaaS

## Layout del monorepo

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # Entidades, value objects, eventos, puertos — zero deps
│   │   │   ├── application/    # Use cases, DTOs, orquestación
│   │   │   └── infrastructure/ # FastAPI routers, middleware, SQLAlchemy, scrapers, tareas
│   │   ├── tests/{unit,integration,contract,stubs,utils}/
│   │   ├── scripts/             # 24 scripts (utilidades de mantenimiento/datos)
│   │   ├── conftest.py
│   │   └── pyproject.toml
│   │
│   ├── web/                    # Frontend Next.js 16 + React 19
│   │   └── src/{app,components,domain,hooks,i18n,lib,stores,types}/
│   │
│   └── app/                    # ⚠️ orphan — un único archivo, sin package.json, no es miembro del workspace
│       └── privacy/page.tsx
│
├── packages/                   # ⚠️ declarado en pnpm-workspace.yaml (glob packages/*), NO existe en disco
│
├── tests/e2e/                  # Paquete pnpm independiente @prosell/e2e — Playwright E2E
│
├── scripts/                    # 22 scripts a nivel raíz
│
├── docker/                     # Dockerfiles + docker-compose (13 servicios)
│
└── .github/workflows/          # 7 workflows de CI/CD
```

## Backend — `apps/api/src/prosell/`

Clean Architecture de 3 capas, confirmada por enumeración completa del árbol de subdirectorios:

### `domain/` (zero dependencias externas)

- Entidades, value objects, eventos, excepciones, puertos (interfaces) y servicios de dominio — enumerados a nivel de subcarpeta, contenidos no releídos línea por línea este pase.

### `application/`

- Use cases y DTOs de entrada/salida — estructura/nombres enumerados, contenidos no releídos línea por línea este pase.

### `infrastructure/`

- `api/routers/` — **31 módulos de router** enumerados por nombre de archivo.
- `api/middleware/` — **4 archivos**: `auth_middleware.py`, `rbac_middleware.py`, `rate_limit_middleware.py`, `exception_handlers.py`.
- `api/main.py` — **30 llamadas `app.include_router(...)`** (1 módulo de router menos que los 31 presentes — discrepancia no investigada a fondo este pase, ver `code-quality-assessment.md`).
- `{database,models,repositories,services,tasks,webhook,i18n,images,integrations,security}/` — presencia confirmada, contenido skimmed.

### Tests

- `apps/api/tests/{unit,integration,contract,stubs,utils}/`, con subdivisión adicional confirmada:
  - `unit/` → `api/`, `application/`, `domain/`, `dto/`, `infrastructure/`, `scripts/`, `services/`, `test_entities/`
  - `integration/` → `api/`, `bulk_upload/`, `database/`, `i18n/`, `repositories/`, `services/`, `tasks/`, `use_cases/`
  - `contract/` → `integration/`, `openapi/`, `schema_matching/`
- `apps/api/conftest.py` presente en raíz de `apps/api` (existencia/config confirmada, no releído en profundidad).

## Frontend — `apps/web/src/`

Estructura App Router + capas de soporte, enumerada a nivel de directorio de primer/segundo nivel:

- `app/` — Next.js App Router, incluyendo las 30 rutas API BFF bajo `app/api/{auth,v1}/**/route.ts` (todas enumeradas por archivo).
- `components/` — contenido interno no releído individualmente este pase (skimmed).
- `domain/`, `hooks/`, `i18n/`, `lib/`, `stores/`, `types/` — presencia confirmada al nivel de árbol; contenidos no releídos en profundidad salvo `lib/api/`/`lib/api/schemas/` referidos en `api-documentation.md`.
- `proxy.ts` — middleware de routing/auth-redirect, identificado vía el grafo del proyecto, no releído línea por línea este pase.

### Tests

- `apps/web/tests/{unit,components,app,__mocks__,utils}/`, con subdivisión adicional confirmada:
  - `unit/` → `api/`, `components/`, `config/`, `design-tokens/`, `hooks/`, `lib/`, `stores/`
  - `components/` → subcarpetas por dominio de feature: `admin/`, `appointments/`, `auth/`, `catalog/`, `filters/`, `forms/`, `ui/`
- Dos patrones de ubicación de test conviven en el proyecto (memoria del proyecto): `tests/components/{module}/X.test.tsx` (histórico) y co-localizado `page.test.tsx` (más reciente) — ambos válidos hoy. El patrón de test de nivel-config (`apps/web/tests/unit/config/<config-file>.test.ts`, importando el config con `await import(...)` y asertando directo sobre el objeto exportado) es el establecido para cualquier archivo `*.config.ts` — ver `tailwind.config.test.ts` y `next.config.test.ts`.

## `tests/e2e` — paquete standalone `@prosell/e2e`

Miembro independiente del workspace pnpm (`package.json` propio), no un simple directorio de specs. Listado a nivel raíz confirmado; internals de `specs/`, `pages/`, `fixtures/`, `factories/`, `helpers/`, `mocks/`, `layer2/` no releídos en profundidad este pase.

## Patrones de código observados

- **Dependency Rule estricta** en backend: `infrastructure → application → domain`, nunca al revés.
- **DTO boundary explícito**: Pydantic en cada frontera de application/infrastructure (backend), Zod en cada frontera de UI/API client (frontend).
- **Interface-based DI**: el dominio define puertos (`ports/`), la infraestructura los implementa.
- **Multi-tenant por convención de campo**: `tenant_id` presente en agregados, no en el nombre de esquema/DB.
- **Server Components por defecto** en `apps/web/src/app/` — con dos excepciones documentadas como deuda: `onboarding/page.tsx` e `invite/[token]/page.tsx` usan `useEffect` para fetch/mutación de datos, violando `AGENTS.md:333` (migración trackeada aparte en el intent `260828-useeffect-to-react-query`).

## Clasificación de archivos relevantes a este intent (bug Tailwind)

**Familia `.5` (`h-9.5`, `px-4.5`, `h-8.5`) — ya corregida**: `tailwind.config.ts` extiende hoy la escala `spacing` con `4.5`/`8.5`/`9.5`, confirmado por lectura completa del archivo. Existe un test de regresión dedicado (`apps/web/tests/unit/config/tailwind.config.test.ts`) que asegura que esos valores siguen presentes. 15 call-sites que usan esas clases son válidos hoy.

**Familia `.25`/`.75` — residuo no cubierto por el fix anterior, encontrado en este rescan**: clases de paso de cuarto (`gap-1.25`, `mt-0.25`, `py-0.75`, `p-0.75`, `mb-0.75`) que **no** están en la escala default de Tailwind 3 ni fueron extendidas en `tailwind.config.ts`, y por tanto compilan a CSS vacío igual que la familia `.5` antes de su fix:

| Archivo                                                   | Clases inválidas encontradas                             |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `apps/web/src/app/(seller)/publications/page.tsx`         | `gap-1.25` (×2), `mt-0.25`, `py-0.75`/`p-0.75`/`mb-0.75` |
| `apps/web/src/components/publisher/PublicationStatus.tsx` | `py-0.75`/`p-0.75`/`mb-0.75` (variante presente)         |
| `apps/web/src/components/leads/LeadStatusBadge.tsx`       | `py-0.75`/`p-0.75`/`mb-0.75` (variante presente)         |
| `apps/web/src/components/catalog/ProductImageGallery.tsx` | `py-0.75`/`p-0.75`/`mb-0.75` (variante presente)         |

Números de línea exactos no confirmados este pase (skimmed vía grep repo-wide, no releídos archivo por archivo) — inventario detallado adicional en `component-inventory.md`. Por contraste, el conjunto mucho más grande de clases con sufijo `.5` (`gap-1.5`, `py-2.5`, `w-3.5`, etc.) encontrado repo-wide **es válido** en la escala default de Tailwind 3 y no constituye defecto.
