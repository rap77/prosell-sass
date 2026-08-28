# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-08-27
**Commit analizado**: `588f75509c259770e6fc19b6f2981bbbd87dff53` (rama `main`, autor Rafael Padrón, 2026-08-26T21:58:13-04:00) — con árbol de trabajo sucio: primer batch de 7 archivos ya corregidos por `react-doctor` + setup de la herramienta, aún sin commitear (`.pre-commit-config.yaml`, `apps/web/package.json`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/react-doctor.yml` nuevo, más 6 archivos `.tsx`/`.tsx` de fix).
**Tipo de pase**: Rescan parcial dirigido — sinteriza los resultados del scan del link 1 (developer) para el intent `260827-react-doctor-cleanup`, scope `refactor`, Minimal depth.
**Motivo del pase**: refactor de salud de código frontend para reducir el backlog de `react-doctor` (score 53/100, 371 diagnósticos) en `apps/web`, recién instalado esta sesión como devDependency + hook de pre-commit + workflow de CI.

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (intent previo `260826-prod-bugfixes-batch`, un rescan completo del dominio de negocio para un batch de bugfixes). Veredicto: **NARROWER** — el store anterior tenía lectura profunda de 4 archivos que este pase no volvió a leer (`apps/api/pytest.ini`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `docs/AUDIT-UI-UX-I18N-2026-07-21.md`) y de 11 "componentes" de dominio (routers, capas backend, App Router, componentes UI de negocio, cliente API/Zod, micro-app legal, suite E2E, infraestructura Docker/CI) que este pase tampoco revisitó.

**Decisión editorial de este pase**: en vez de sobrescribir esos artefactos con contenido más angosto, este pase **preserva el contenido del store anterior donde sigue siendo válido** (arquitectura de dominio, inventario de componentes, riesgos de negocio, dependencias) y **añade** secciones nuevas específicas al backlog de `react-doctor` (esta sección de scope, `code-quality-assessment.md` § Backlog react-doctor, `architecture.md` § Interaction Diagrams #6, `technology-stack.md` § react-doctor/Zod, `code-structure.md` § Componentes grandes, `dependencies.md` § react-doctor, `component-inventory.md` § Actualización, `business-overview.md` § Alcance actualizado). El `## Scope of Analysis` de este documento refleja honestamente solo lo que ESTE pase analizó a fondo — no reclama profundidad sobre las áreas de dominio que el pase anterior sí cubrió y que aquí solo se preservan como contexto no revalidado. Un futuro rerun que necesite esa profundidad de dominio debe volver a escanearla; este documento no la certifica como vigente más allá de lo que el pase anterior ya afirmaba.

## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**:
  - `./` (raíz del repo — presencia de `package.json`, `turbo.json`, `pnpm-lock.yaml`, `.pre-commit-config.yaml`)
  - `apps/web/package.json`, `apps/web/eslint.config.js`, `apps/web/next.config.ts`, `apps/web/vitest.config.ts`
  - `apps/web/src/` (estructura de directorio — nivel superior + subdirectorios de `components/`, conteos de `lib/api/` + `lib/api/schemas/`)
  - `.github/workflows/react-doctor.yml`, `.github/workflows/ci.yml` (lista de jobs)
  - `apps/api/pyproject.toml` (pins de dependencias core)
  - `apps/api/src/prosell/` (estructura de directorio — nivel superior)
  - Artefactos codekb previos (`code-structure.md`, `technology-stack.md`, `component-inventory.md`) leídos como baseline y re-verificados contra archivos en vivo
  - Evidencia de grep en vivo para las categorías de diagnóstico específicas del intent: `try/finally` (bailouts del React Compiler), llamadas Zod deprecadas de estilo v3, sitios de `import()` dinámico, componentes más grandes por conteo de líneas, superficie de riesgo de accesibilidad
  - Estado del árbol de trabajo git en vivo (`git status`, `git diff --stat`)

- **Skimmed only**:
  - `apps/api/src/prosell/{domain,application,infrastructure}/` internals (solo conteo de archivos de router/test)
  - `apps/web/src/hooks/`, `apps/web/src/stores/`, `apps/web/src/domain/`, `apps/web/src/i18n/`, `apps/web/src/types/` (solo presencia confirmada)
  - `tests/e2e/` (solo conteo de specs: 34 archivos)
  - `docker/`, resto de `.github/workflows/*.yml` (deploy, e2e, graphify, promote-prod, recover-prod) — solo presencia
  - `packages/` — confirmado que sigue ausente

### Packages Found

- `@prosell/web` — app Next.js — TypeScript — UI de admin/vendedor SaaS + frontend de marketplace público (`apps/web/`)
- `prosell` (apps/api) — servicio FastAPI — Python — API backend, lógica de dominio, orquestación de scraping/ML (`apps/api/`)
- `apps/app` — micro-app Next.js (solo `privacy/page.tsx` presente) — fuera de alcance para este intent
- `prosell-sass` (raíz) — workspace pnpm/Turborepo, sin código de app propio
- `tests/e2e` — suite E2E Playwright

### Build System

- **Type**: pnpm workspaces (`packageManager: pnpm@9.15.1`) + Turborepo (`turbo.json`) en la raíz; build Next.js (Turbopack) para `apps/web`; `uv` + hatchling para `apps/api`
- **Config Files**: `package.json` raíz, `turbo.json`, `pnpm-lock.yaml`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/eslint.config.js`, `apps/web/vitest.config.ts`, `apps/api/pyproject.toml`
- **Build Dependencies**: tareas Turbo (`build`, `lint`, `typecheck`, `test`, `test:coverage`, `test:e2e`) todas con `dependsOn: ["^build"]` o `["build"]`; sin dependencia cruzada entre paquetes todavía porque `packages/*` no existe

### APIs Discovered

- Routers REST FastAPI — `apps/api/src/prosell/infrastructure/api/routers/` — 31 archivos de router (creció de 25 en el scan previo, fuera del alcance de este intent)
- Rutas proxy BFF de Next.js — `apps/web/src/app/api/v1/*/[...path]/route.ts` — el scan previo marcó un patrón de bug conocido de reenvío de headers If-Match/content-type en estos proxies (arreglado para una ruta, no auditado para las demás) — irrelevante para los diagnósticos de `react-doctor` pero anotado como riesgo adyacente

### Frameworks & Libraries

Ver `technology-stack.md` (actualizado este pase con `react-doctor`, `babel-plugin-react-compiler`, `eslint-plugin-react-hooks`, y el detalle de Zod v3→v4).

### Test Coverage

- Directorios de test: `apps/web/tests/` (unit, components, app, e2e, `__mocks__`, utils) + `*.test.tsx` co-localizados bajo `apps/web/src/`; `apps/api/tests/` (272 archivos `.py`) + `apps/api/src/prosell/tests/`; `tests/e2e/specs/` (34 archivos `.ts`)
- Frameworks: Vitest + Testing Library + jsdom (frontend), pytest + pytest-asyncio (backend), Playwright (E2E)
- Coverage config: `apps/web/vitest.config.ts` — cobertura v8, umbrales `lines: 40, functions: 40, branches: 75` — ya bajados de un objetivo original de 80% en una sesión previa a medida que la superficie del catálogo superó la cobertura (justificación documentada en el propio código). Relevante para este intent: los fixes de `react-doctor` no deberían requerir mover este umbral, solo evitar regresarlo.

### Code Quality Indicators

- Linting: ESLint flat config, `max-warnings=0` en el script `lint`, PERO el hook de ESLint en pre-commit está actualmente deshabilitado/comentado ("TODO: currently disabled due to next lint issues") — `lint-staged` igual corre `eslint --fix` + `prettier --write` sobre archivos staged como sustituto parcial. Ruff + Pyright activos y forzados en pre-commit/pre-push (lado Python).
- CI/CD: `.github/workflows/ci.yml` — 7 jobs (`lint-python`, `test-python`, `lint-node`, `test-node`, `validate-specs`, `validate-code-standards`, `build`). `.github/workflows/react-doctor.yml` — nuevo, separado, advisory-only. 4 workflows más presentes, no leídos en este pase (`deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml`).
- Documentación: `CLAUDE.md` en la raíz documenta stack/convenciones, tiene al menos un punto de drift conocido (versión de Tailwind) no relacionado a este intent.

### Technical Debt Signals

Ver `code-quality-assessment.md` § "Backlog react-doctor" para el desglose completo de los 371 diagnósticos (9 errores, 362 warnings, score 53/100) y `architecture.md` § Interaction Diagrams #6 para el diagrama del pipeline advisory-only.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 260827-react-doctor-cleanup
fingerprint: 319ee907a578fa7a32d4ef0d64511e9530b0dd68
analyzed:
  paths:
    - package.json
    - turbo.json
    - pnpm-lock.yaml
    - .pre-commit-config.yaml
    - apps/web/package.json
    - apps/web/eslint.config.js
    - apps/web/next.config.ts
    - apps/web/vitest.config.ts
    - apps/web/src/
    - .github/workflows/react-doctor.yml
    - .github/workflows/ci.yml
    - apps/api/pyproject.toml
    - apps/api/src/prosell/
  components:
    - react-doctor tooling pipeline (pre-commit + CI)
    - Componentes UI (React) — Formularios, Admin, Catálogo, Público
shallow:
  paths:
    - apps/api/src/prosell/domain/
    - apps/api/src/prosell/application/
    - apps/api/src/prosell/infrastructure/
    - apps/web/src/hooks/
    - apps/web/src/stores/
    - apps/web/src/domain/
    - apps/web/src/i18n/
    - apps/web/src/types/
    - tests/e2e/
    - docker/
    - .github/workflows/
    - packages/
```
