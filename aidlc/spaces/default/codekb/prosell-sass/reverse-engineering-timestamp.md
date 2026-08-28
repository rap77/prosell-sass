# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-08-28
**Commit analizado**: `d85067f7` (rama `main`, árbol de trabajo limpio salvo bookkeeping de `aidlc/`)
**Tipo de pase**: Rescan completo — reemplaza íntegramente el store `codekb` existente (stale, del pase parcial del intent `260827-react-doctor-cleanup`), sintetizando el scan del link 1 (developer) para el intent `260828-fix-invalid-tailwind-spa`, scope bugfix.
**Motivo del pase**: bugfix de clases de espaciado Tailwind inválidas (`h-9.5`, `px-4.5`, `h-8.5`) que no existen en la escala 3.4.17 real del proyecto y compilan a CSS vacío. El rescan aprovechó el barrido completo del repo para: (a) confirmar el alcance exacto del bug (7 archivos, 13 instancias — 2 archivos y 3 instancias más de lo declarado originalmente en el intent), y (b) corregir un drift documental en `CLAUDE.md` raíz (Tailwind 4.0 declarado vs. 3.4.17 real) identificado como causa raíz plausible del bug.

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (intent previo `260827-react-doctor-cleanup`, un rescan parcial dirigido a salud de código frontend). Veredicto: **COVERS** — el rescan entrante cubre todo lo que el store anterior había analizado, tal como se esperaba de un rescan completo de todo el repo. Los 9 artefactos del store fueron reemplazados íntegramente por este pase; no se preservó contenido del pase anterior porque no fue necesario (a diferencia del pase `260827`, que sí había preservado contenido de un pase previo más amplio por ser él mismo parcial).

## Developer Code Scan Results

### Scan Coverage

- **Analizado a fondo**:
  - `./` (raíz) — `package.json`, `turbo.json`, `pnpm-lock.yaml`, `.pre-commit-config.yaml`, `AGENTS.md`, `.github/workflows/` (los 7 workflows, a nivel de nombre de job), `docker/` (todos los archivos presentes, lista de servicios de `docker-compose.yml`)
  - `apps/api/pyproject.toml` (dependencias + config de tools completa)
  - `apps/api/src/prosell/` — árbol completo de `domain/`, `application/`, `infrastructure/` (profundidad 2), nombres de routers (31), nombres de entidades de dominio (24), grupos de módulos de use case (20), conteos de repositorio/migración, listado de subárbol de security/middleware/integraciones
  - `apps/api/tests/` estructura (`contract/`, `integration/`, `unit/`, `stubs/`, `utils/`), presencia de `pytest.ini`
  - `apps/web/package.json` (completo), `apps/web/tailwind.config.ts` (completo — confirmado sin extensión de escala `spacing`), `apps/web/vitest.config.ts` (thresholds de cobertura + comentario de justificación)
  - `apps/web/src/` — árbol completo de `app/`, `components/`, `lib/`, `stores/`, `hooks/`, `domain/` (profundidad 2); listados de archivo de `lib/api/` y `lib/api/schemas/` (cliente Zod-mirror, 18 archivos de esquema)
  - `scripts/validate-tailwind.sh` (completo — confirmado que solo chequea `var(--ps-*)` en `className`, no relacionado con validez de escala de spacing)
  - Barrido repo-wide con `rg` de toda clase de utilidad de spacing fraccional (`.5`) bajo `apps/web/src` — cruzado contra la escala default de Tailwind 3 para aislar las clases genuinamente inválidas
  - `graphify-out/GRAPH_REPORT.md` — secciones Summary, Corpus Check, Community Hubs (26,658 nodos / 44,116 aristas / 1,547 comunidades, construido sobre commit `d85067f7`)
  - Artefacto codekb previo `reverse-engineering-timestamp.md` (pase parcial `260827`) — leído como baseline y re-verificado independientemente en vez de confiado
  - Estado de git: `HEAD` = `d85067f7`, rama `main`, árbol de trabajo limpio salvo bookkeeping de `aidlc/`

- **Solo revisado por encima (skimmed)**:
  - `apps/api/src/prosell/domain/{value_objects,events,exceptions,ports,services}/` internals
  - `apps/api/src/prosell/infrastructure/{database,models,repositories,services,tasks,webhook,i18n,images}/` internals
  - `apps/web/src/components/*` contenido de subcarpetas (28 subcarpetas de componente listadas, no leídas individualmente)
  - `apps/web/src/lib/{admin,auth,cache,constants,filters,hooks,mocks,schemas,translations,utils}/` internals
  - `tests/e2e/specs/` (34 archivos, solo conteo), `tests/integration/`, `tests/unit/`, `tests/apps/` (solo presencia a nivel raíz)
  - `docs/` (166 archivos md por conteo), `PRPs/` (23 archivos md), `prosell-design/`, `Product-Definition/`, `tasks/`, `patches/` — solo presencia
  - Cuerpos de `.github/workflows/*.yml` más allá de la extracción de nombres de job
  - `apps/app/` (único archivo huérfano confirmado: `privacy/page.tsx`, sin otro contenido)
  - `packages/` — confirmado **ausente** (el directorio no existe)

### Packages Found

- `@prosell/web` (`apps/web/`) — app Next.js 16 — TypeScript — UI admin/vendedor SaaS + frontend de marketplace público
- `prosell-api` (`apps/api/`) — servicio FastAPI — Python 3.13 — lógica de dominio backend, 190 endpoints REST en 31 routers, orquestación de scraping/ML
- `apps/app/` — micro-app Next.js huérfana conteniendo solo `privacy/page.tsx` — parece abandonada/no integrada, sin evidencia de estar wireada al grafo de build activo del workspace pnpm
- `prosell-sass` (raíz) — workspace pnpm + Turborepo, sin código de app propio
- `tests/e2e` — suite E2E Playwright standalone (34 archivos de spec)
- `packages/*` — **no existe**, pese a que la estructura de monorepo documentada en `CLAUDE.md` describe un paquete `packages/shared-types/`

### Build System

- **Tipo**: pnpm workspaces (`packageManager: pnpm@9.15.1`) + Turborepo en raíz; build Next.js/Turbopack para `apps/web`; `uv` + hatchling para `apps/api`
- **Config Files**: `package.json`, `turbo.json`, `pnpm-lock.yaml`, `apps/web/package.json`, `apps/web/tailwind.config.ts`, `apps/web/vitest.config.ts`, `apps/api/pyproject.toml`, `apps/api/pytest.ini`
- **Build Dependencies**: tareas Turbo (`build`, `lint`, `test`, `test:coverage`, `typecheck`, `test:e2e`) todas con `dependsOn: ["^build"]`/`["build"]`; sin dependencias cruzadas entre paquetes porque `packages/*` está vacío/ausente — `apps/web` y `apps/api` construyen de forma completamente independiente

### APIs Discovered

- REST FastAPI — `apps/api/src/prosell/infrastructure/api/routers/` — 31 archivos de router, **190 endpoints** contados directamente
- Rutas proxy BFF de Next.js — `apps/web/src/app/api/{auth,v1}/**/route.ts` — 33 archivos de ruta (incl. 2 `route.test.ts` co-localizados), reenviando al backend FastAPI; los proxies dinámicos `[...path]/route.ts` (`products`, `categories`, `organizations`, `vehicles`) son los ya marcados en memoria del proyecto con el patrón de bug `response.json()`-sin-chequeo-de-content-type
- Cliente API frontend — `apps/web/src/lib/api/` — 27 módulos de cliente + 18 módulos de esquema Zod que espejan los DTOs backend 1:1

### Frameworks & Libraries

Ver `technology-stack.md` para el detalle completo, incluyendo la corrección de versión de TailwindCSS (3.4.17 real, no 4.0).

### Test Coverage

Ver `code-quality-assessment.md` § Test Coverage para el detalle completo por capa.

### Code Quality Indicators

Ver `code-quality-assessment.md` para linting, CI/CD y documentación.

### Technical Debt Signals

Ver `code-quality-assessment.md` § Technical Debt Signals para las 8 señales completas, con la Signal #1 (bug de este intent) y Signal #8 (drift Tailwind en CLAUDE.md, causa raíz plausible) dadas prominencia completa.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 260828-fix-invalid-tailwind-spa
fingerprint: d3a72e509bb664f844889ba8679cfcb341edec8b
analyzed:
  paths:
    - ./
    - package.json
    - turbo.json
    - pnpm-lock.yaml
    - .pre-commit-config.yaml
    - AGENTS.md
    - .github/workflows/
    - docker/
    - apps/api/pyproject.toml
    - apps/api/src/prosell/
    - apps/api/tests/
    - apps/web/package.json
    - apps/web/tailwind.config.ts
    - apps/web/vitest.config.ts
    - apps/web/src/
    - apps/web/src/lib/api/
    - apps/web/src/lib/api/schemas/
    - scripts/validate-tailwind.sh
    - graphify-out/GRAPH_REPORT.md
  components:
    - prosell-api (FastAPI backend)
    - prosell-web (Next.js frontend)
    - BFF proxy routes
    - apps/app (orphan micro-app)
    - tests/e2e (Playwright suite)
shallow:
  paths:
    - apps/api/src/prosell/domain/value_objects/
    - apps/api/src/prosell/domain/events/
    - apps/api/src/prosell/domain/exceptions/
    - apps/api/src/prosell/domain/ports/
    - apps/api/src/prosell/domain/services/
    - apps/api/src/prosell/infrastructure/database/
    - apps/api/src/prosell/infrastructure/models/
    - apps/api/src/prosell/infrastructure/repositories/
    - apps/api/src/prosell/infrastructure/services/
    - apps/api/src/prosell/infrastructure/tasks/
    - apps/api/src/prosell/infrastructure/webhook/
    - apps/api/src/prosell/infrastructure/i18n/
    - apps/api/src/prosell/infrastructure/images/
    - apps/web/src/components/
    - apps/web/src/lib/admin/
    - apps/web/src/lib/auth/
    - apps/web/src/lib/cache/
    - apps/web/src/lib/constants/
    - apps/web/src/lib/filters/
    - apps/web/src/lib/hooks/
    - apps/web/src/lib/mocks/
    - apps/web/src/lib/schemas/
    - apps/web/src/lib/translations/
    - apps/web/src/lib/utils/
    - tests/e2e/specs/
    - tests/integration/
    - tests/unit/
    - tests/apps/
    - docs/
    - PRPs/
    - prosell-design/
    - Product-Definition/
    - tasks/
    - patches/
    - apps/app/
    - packages/
```
