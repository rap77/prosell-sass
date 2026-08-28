# Code Structure — ProSell SaaS

## Layout del monorepo

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # Entidades, value objects, eventos, puertos — zero deps
│   │   │   ├── application/    # Use cases, DTOs, orquestación
│   │   │   └── infrastructure/ # FastAPI routers, SQLAlchemy, scrapers, tareas
│   │   └── tests/{contract,integration,unit,stubs,utils}/
│   │
│   ├── web/                    # Frontend Next.js 16 + React 19
│   │   └── src/{app,components,lib,stores,hooks,domain}/
│   │
│   └── app/                    # ⚠️ orphan — un único archivo, no wireado al build activo
│       └── privacy/page.tsx
│
├── packages/                   # ⚠️ documentado en CLAUDE.md, NO existe en disco
│
├── tests/e2e/                  # Playwright E2E (34 specs)
│
├── docker/                     # Dockerfiles + docker-compose (dev/staging/prod)
│
└── .github/workflows/          # 7 workflows de CI/CD
```

## Backend — `apps/api/src/prosell/`

Clean Architecture de 3 capas, confirmada por lectura completa del árbol (profundidad 2):

### `domain/` (zero dependencias externas)

- **24 entidades** de dominio (conteo de archivos, nombres exactos no enumerados en este pase — skimmed)
- `value_objects/` — valores inmutables (skimmed)
- `events/` — eventos de dominio (skimmed)
- `exceptions/` — excepciones de reglas de negocio (skimmed)
- `ports/` — interfaces/contratos (Repository interfaces, IEmailService, etc.) (skimmed)
- `services/` — servicios de dominio (skimmed)

### `application/`

- **20 grupos de módulos de use case** (conteo confirmado, listado detallado no leído en este pase)
- DTOs de entrada/salida por caso de uso

### `infrastructure/`

- `api/routers/` — **31 archivos de router**, 190 endpoints (`@router.get/post/put/patch/delete`)
- `database/`, `models/`, `repositories/` — adaptadores SQLAlchemy 2.0 async (skimmed en detalle)
- `services/` — integraciones externas (Stripe, storage, etc.) (skimmed)
- `tasks/` — jobs asíncronos (Taskiq + Redis) (skimmed)
- `webhook/` — receptores de webhooks (skimmed)
- `i18n/` — internacionalización backend (skimmed)
- `images/` — procesamiento de imágenes (skimmed)
- **71 migraciones Alembic** presentes

### Tests

- `apps/api/tests/{contract,integration,unit,stubs,utils}/` — 272 archivos `.py`
- `apps/api/src/prosell/tests/unit/` adicional
- `pytest.ini` presente en raíz de `apps/api` (skimmed — sin verificar thresholds de cobertura)

## Frontend — `apps/web/src/`

Estructura App Router + capas de soporte, listada a profundidad 2:

- `app/` — Next.js App Router (rutas de página + rutas API BFF bajo `app/api/{auth,v1}/**/route.ts`)
- `components/` — **28 subcarpetas de componentes** (contenido interno no leído individualmente en este pase — skimmed)
- `lib/` — utilidades transversales:
  - `lib/api/` — **27 módulos de cliente API**
  - `lib/api/schemas/` — **18 módulos de esquema Zod-mirror**
  - `lib/{admin,auth,cache,constants,filters,hooks,mocks,schemas,translations,utils}/` — presencia confirmada, contenido no leído (skimmed)
- `stores/` — estado Zustand
- `hooks/` — hooks React reutilizables (además de `lib/hooks/`)
- `domain/` — modelos/tipos de dominio del lado frontend

### Tests

- `apps/web/tests/` — 93 archivos
- 70 archivos `*.test.tsx`/`.test.ts` co-localizados junto al código fuente
- Dos patrones de ubicación de test conviven en el proyecto (memoria del proyecto): `tests/components/{module}/X.test.tsx` (histórico) y co-localizado `page.test.tsx` (más reciente, T12-T18) — ambos válidos hoy.

## Patrones de código observados

- **Dependency Rule estricta** en backend: `infrastructure → application → domain`, nunca al revés — confirmado por la ausencia de imports de `infrastructure`/`application` dentro de `domain/` reportada en escaneos previos y no contradicha en este pase.
- **DTO boundary explícito**: Pydantic en cada frontera de application/infrastructure (backend), Zod en cada frontera de UI/API client (frontend).
- **Interface-based DI**: el dominio define puertos (`ports/`), la infraestructura los implementa — inversión de dependencia clásica.
- **Multi-tenant por convención de campo**: `tenant_id` presente en agregados, no en el nombre de esquema/DB.
- **Server Components por defecto** en `apps/web/src/app/` — fetching de datos server-side salvo excepciones documentadas como deuda (ver `code-quality-assessment.md`, casos `onboarding/page.tsx` e `invite/[token]/page.tsx` que usan `useEffect` en violación de la regla `AGENTS.md:333`).

## Clasificación de archivos relevantes a este intent (bug Tailwind)

Archivos con clases de spacing Tailwind inválidas (`h-9.5`, `px-4.5`, `h-8.5` — fuera de la escala default 0–3.5 half-steps de Tailwind 3, y `tailwind.config.ts` no extiende `spacing`):

| Archivo                                                    | Tipo                                  | Instancias |
| ---------------------------------------------------------- | ------------------------------------- | ---------- |
| `apps/web/src/components/onboarding/OnboardingStep3.tsx`   | Componente de formulario (onboarding) | 3          |
| `apps/web/src/app/(seller)/publications/page.tsx`          | Página App Router (seller)            | 6          |
| `apps/web/src/components/publisher/PublishForm.tsx`        | Componente de formulario (publisher)  | 2          |
| `apps/web/src/app/privacy/page.tsx`                        | Página estática (legal)               | 1          |
| `apps/web/src/app/terms/page.tsx`                          | Página estática (legal)               | 1          |
| `apps/web/src/components/appointments/AppointmentForm.tsx` | Componente de formulario (citas)      | 1          |
| `apps/web/src/components/pipeline/KanbanBoard.tsx`         | Componente de tablero (pipeline)      | 1          |

Inventario completo con número de línea en `component-inventory.md` y `code-quality-assessment.md`.
