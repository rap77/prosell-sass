# Component Inventory — ProSell SaaS

Nombres de componente en este documento son los que `reverse-engineering-timestamp.md` § Scope of Analysis referencia literalmente.

## prosell-api (FastAPI backend)

- **Responsabilidad**: lógica de negocio, orquestación de scraping/ML, persistencia, auth.
- **Dependencias**: PostgreSQL 17, Redis 7.4+, Playwright (scraping FB Marketplace), Stripe, Anthropic SDK, boto3 (storage).
- **Subcomponentes** (Clean Architecture):
  - `domain/` — 24 entidades, zero deps externas.
  - `application/` — 20 grupos de use cases.
  - `infrastructure/` — 31 routers (190 endpoints), repositorios SQLAlchemy 2.0 async, 71 migraciones Alembic, tareas Taskiq+Redis, webhooks, i18n, procesamiento de imágenes.
- **Tests**: 272 archivos `.py` en `apps/api/tests/{contract,integration,unit,stubs,utils}/` + `apps/api/src/prosell/tests/unit/`.

## prosell-web (Next.js frontend)

- **Responsabilidad**: UI admin/vendedor SaaS + frontend de marketplace público.
- **Dependencias**: prosell-api (vía BFF proxy), ninguna dependencia de build-time de `packages/*` (no existe).
- **Subcomponentes**:
  - `app/` — App Router, 28 subcarpetas de componentes bajo `components/`.
  - `lib/api/` — 27 módulos de cliente API.
  - `lib/api/schemas/` — 18 módulos Zod-mirror.
  - `stores/` (Zustand), `hooks/`, `domain/`.
- **Tests**: 93 archivos en `apps/web/tests/` + 70 co-localizados `*.test.tsx`/`.test.ts`.

## BFF proxy routes

- **Responsabilidad**: intermediar entre navegador y `prosell-api`, centralizando cookies httpOnly y auth.
- **Ubicación**: `apps/web/src/app/api/{auth,v1}/**/route.ts`, 33 archivos.
- **Dependencias**: `prosell-api` (destino de reenvío).
- **Defecto activo**: `response.json()` sin chequeo de `content-type` en los 4 proxies dinámicos (`products`, `categories`, `organizations`, `vehicles`) — ver `api-documentation.md`.

## apps/app (orphan micro-app)

- **Responsabilidad**: desconocida/no wireada — contiene únicamente `privacy/page.tsx`.
- **Dependencias**: ninguna confirmada al grafo de build activo del workspace pnpm.
- **Estado**: candidato a deuda técnica (ver `code-quality-assessment.md` signal #3).

## tests/e2e (Playwright suite)

- **Responsabilidad**: pruebas end-to-end del flujo completo (navegador real contra stack levantado).
- **Ubicación**: `tests/e2e/specs/`, 34 archivos (conteo confirmado, contenido no leído en este pase).

---

## Inventario de bug — clases Tailwind inválidas (intent `260828-fix-invalid-tailwind-spa`)

**Causa raíz confirmada**: `apps/web/tailwind.config.ts` (leído completo) NO extiende la escala `spacing` — el proyecto usa `tailwindcss: 3.4.17` (confirmado en `apps/web/package.json`, **no** Tailwind 4 como afirma la tabla de stack del `CLAUDE.md` raíz). La escala default de spacing de Tailwind 3 incluye half-steps solo hasta `3.5` (`0.5, 1.5, 2.5, 3.5`) — cualquier `*-<n>.5` con `n > 3` no existe en la escala y compila a **CSS vacío** (la clase se emite en el HTML pero no genera ninguna regla).

**Verificación de scope**: un barrido repo-wide de todo patrón `*-<n>.5` confirmó que la mayoría de las clases (`gap-1.5`, `px-2.5`, `mt-0.5`, `w-3.5`, etc.) **SON válidas** — el bug real se limita a las instancias por encima de `3.5`, listadas abajo con número de línea exacto.

### Inventario completo — 7 archivos, 13 instancias

| #   | Archivo                                                    | Línea(s)      | Clase inválida | Nota                                                                    |
| --- | ---------------------------------------------------------- | ------------- | -------------- | ----------------------------------------------------------------------- |
| 1   | `apps/web/src/components/onboarding/OnboardingStep3.tsx`   | 167, 181, 196 | `h-9.5`        | 3× — en el file list original del intent                                |
| 2   | `apps/web/src/app/(seller)/publications/page.tsx`          | 286, 297      | `h-9.5`        | 2× — en el file list original del intent                                |
| 3   | `apps/web/src/app/(seller)/publications/page.tsx`          | 443, 450      | `h-9.5`        | 2× — en el file list original del intent                                |
| 4   | `apps/web/src/app/(seller)/publications/page.tsx`          | 286, 297      | `px-4.5`       | 2× (mismas líneas que #2, clases combinadas) — en el file list original |
| 5   | `apps/web/src/components/publisher/PublishForm.tsx`        | 573, 583      | `h-9.5`        | 2× — **NO estaba en el file list original del intent**                  |
| 6   | `apps/web/src/app/privacy/page.tsx`                        | 89            | `px-4.5`       | 1× — en el file list original del intent                                |
| 7   | `apps/web/src/app/terms/page.tsx`                          | 89            | `px-4.5`       | 1× — en el file list original del intent                                |
| 8   | `apps/web/src/components/appointments/AppointmentForm.tsx` | 529           | `px-4.5`       | 1× — en el file list original del intent                                |
| 9   | `apps/web/src/components/pipeline/KanbanBoard.tsx`         | 291           | `h-8.5`        | 1× — **NO estaba en el file list original del intent**                  |

**Totales por archivo** (7 archivos):

| Archivo                 | Instancias                                 |
| ----------------------- | ------------------------------------------ |
| `OnboardingStep3.tsx`   | 3 (`h-9.5`)                                |
| `publications/page.tsx` | 6 (`h-9.5` ×4, `px-4.5` ×2)                |
| `PublishForm.tsx`       | 2 (`h-9.5`) — **fuera del scope original** |
| `privacy/page.tsx`      | 1 (`px-4.5`)                               |
| `terms/page.tsx`        | 1 (`px-4.5`)                               |
| `AppointmentForm.tsx`   | 1 (`px-4.5`)                               |
| `KanbanBoard.tsx`       | 1 (`h-8.5`) — **fuera del scope original** |
| **Total**               | **13 instancias, 7 archivos**              |

### ⚠️ Brecha de alcance frente al intent original

El intent `260828-fix-invalid-tailwind-spa` fue registrado originalmente citando 5 archivos (`privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx`, `OnboardingStep3.tsx`, `AppointmentForm.tsx`). Este rescan encontró **2 archivos y 3 instancias adicionales** no listados originalmente:

- `apps/web/src/components/publisher/PublishForm.tsx` (2× `h-9.5`, líneas 573 y 583)
- `apps/web/src/components/pipeline/KanbanBoard.tsx` (1× `h-8.5`, línea 291)

Esta brecha se traslada explícitamente a `code-quality-assessment.md` y debe considerarse en Requirements Analysis para decidir si el fix cubre los 7 archivos o se mantiene acotado a los 5 originales con un follow-up separado para los 2 nuevos.

### Fix ya aplicado como precedente (referencia, no parte de este intent)

Memoria del proyecto registra que `BulkUploadCSV.tsx` tenía el mismo patrón (`h-9.5`/`px-4.5`) y ya fue arreglado convirtiendo a valores arbitrarios explícitos: `h-[38px]`, `px-[18px]`. Ese archivo **no** aparece en el inventario de arriba porque ya está corregido.
