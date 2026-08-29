# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-08-28
**Commit analizado**: `3f14750e` (rama `main`, árbol de trabajo limpio salvo bookkeeping de `aidlc/`)
**Tipo de pase**: Rescan completo (full rescan) del repositorio entero — reemplaza íntegramente el store `codekb` existente (correspondiente a un pase previo de este mismo intent, anterior al fix de la familia `.5`), sintetizando el scan del link 1 (developer) para el intent `260828-fix-invalid-tailwind-spa`, scope bugfix.
**Motivo del pase**: revalidación en modo `--single` del stage `reverse-engineering` para confirmar el estado actual del repo tras el fix de las clases Tailwind `h-9.5`/`px-4.5`/`h-8.5` (familia `.5`) y detectar cualquier residuo. El rescan completo confirmó: (a) la familia `.5` está corregida y cubierta por test de regresión; (b) existe un residuo no cubierto — clases de paso de cuarto (`.25`/`.75`) en 4 archivos; (c) el drift documental de Tailwind en `CLAUDE.md` está parcialmente remediado (tabla de stack corregida, sección "Key Conventions" línea ~194 aún no).

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente. Veredicto: **COVERS** — el rescan entrante cubre todo lo que el store anterior había analizado, tal como se esperaba de un full rescan de todo el repo. Los 9 artefactos del store fueron reemplazados íntegramente por este pase.

## Developer Code Scan Results

### Scan Coverage

- **Analizado a fondo**:
  - `./` (raíz) — `package.json`, `pyproject.toml`, `pnpm-workspace.yaml`, `turbo.json`, `.pre-commit-config.yaml`, `.gga`, `.nvmrc`, `.python-version`
  - `apps/api/pyproject.toml`, `apps/api/conftest.py` (existencia/config), árbol de directorios completo de `apps/api/src/prosell/` (capas domain/application/infrastructure, enumeración completa de subdirectorios), `apps/api/src/prosell/infrastructure/api/routers/` (31 archivos de router enumerados), `apps/api/src/prosell/infrastructure/api/middleware/` (4 archivos), `apps/api/src/prosell/infrastructure/api/main.py` (conteo de registro de routers), estructura de `apps/api/tests/` (unit/integration/contract/stubs)
  - `apps/web/package.json` (lista completa de dependencias, pin exacto `tailwindcss: 3.4.17` confirmado), `apps/web/tailwind.config.ts` (contenido completo — extensión de spacing para `4.5`/`8.5`/`9.5` confirmada), `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css` (comentario de encabezado + directivas `@tailwind` v3), `apps/web/vitest.config.ts` (contenido completo, thresholds de cobertura), `apps/web/tests/unit/config/tailwind.config.test.ts` (contenido completo), estructura de directorios de `apps/web/src/{app,components,domain,hooks,i18n,lib,stores,types}`, los 30 archivos de ruta proxy BFF enumerados bajo `apps/web/src/app/api/**/route.ts`, `apps/web/src/proxy.ts` (middleware) referenciado vía el grafo del proyecto
  - `apps/app/privacy/page.tsx` — directorio orphan, confirmado sin `package.json`, no es miembro real del workspace
  - `tests/e2e/package.json` (miembro de workspace pnpm independiente `@prosell/e2e`), listado de nivel superior de `tests/e2e/`
  - `docker/` — listado completo de archivos, nombres de servicio de `docker-compose.yml` (13 servicios)
  - `.github/workflows/` — listado completo (7 workflows), primeras 60 líneas de `ci.yml` (estructura del job lint/test Python)
  - `scripts/` (raíz, 22 archivos) y `apps/api/scripts/` (24 archivos) — listado completo, propósito inferido por nombre de archivo
  - Barrido codebase-wide vía grep de clases de utilidad Tailwind con sufijo decimal (`h-`, `w-`, `p-`, `px-`, `py-`, `m-`, `gap-`, `top-`, etc. con `.25`/`.5`/`.75`) en todo archivo `.tsx`/`.jsx` bajo `apps/web/src` y `apps/app` — evidencia principal para el intent activo
  - `AGENTS.md` (grep de afirmaciones de versión Tailwind/Zod), `CLAUDE.md` (grep de menciones a Tailwind) — cruzados contra versiones realmente instaladas
  - Densidad de TODO/FIXME en `apps/api/src` y `apps/web/src`

- **Solo revisado por encima (skimmed)**:
  - Lógica de negocio interna dentro de use cases, entidades de dominio y repositorios (estructura/nombres enumerados, contenidos no leídos línea por línea)
  - Contenido de routers FastAPI individuales más allá de la lista de registro de `main.py` (enumeración endpoint-por-endpoint no realizada para los 31 routers)
  - Cuerpos de rutas proxy BFF individuales más allá de `proxy.ts` y el patrón `[...path]/route.ts` ya conocido (defecto de content-type ya documentado en codekb previo, no re-verificado línea por línea este pase)
  - `tests/e2e/{specs,pages,fixtures}/` internals (cuerpos de specs de Playwright)
  - `docs/`, `PRPs/`, `.mm-flow/`, `Product-Definition/`, `prosell-design/` (árboles grandes de documentación — fuera de la superficie de código fuente)
  - `apps/api/src/prosell/infrastructure/{images,integrations,tasks,webhook,i18n,security,services}/` internals (enumerados solo como directorios)
  - `apps/web/src/components/**` cuerpos de archivo (contados por subdirectorio, no abiertos individualmente)
  - Cuerpos de workflow de CI más allá de las primeras 60 líneas de `ci.yml` (`deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml`, `react-doctor.yml` no abiertos)
  - `node_modules`, `.venv`, directorios de caché (`.ruff_cache`, `.mypy_cache`, `.turbo`, `.pytest_cache`) — excluidos, no son código fuente

### Packages Found

Ver `dependencies.md` § Miembros reales del workspace pnpm y `component-inventory.md` para el detalle completo.

### Build System

Ver `technology-stack.md` § Infraestructura / plataforma y `dependencies.md` § Grafo de build (Turborepo).

### APIs Discovered

Ver `api-documentation.md` para el detalle completo (31 módulos de router / 30 wireados en `main.py`; 30 rutas BFF de Next.js).

### Frameworks & Libraries

Ver `technology-stack.md` para el detalle completo, incluyendo el estado actualizado del drift de versión de TailwindCSS (tabla corregida, sección "Key Conventions" aún pendiente).

### Test Coverage

Ver `code-quality-assessment.md` § Test Coverage para el detalle completo por capa.

### Code Quality Indicators

Ver `code-quality-assessment.md` para linting, CI/CD y documentación.

### Technical Debt Signals

Ver `code-quality-assessment.md` § Technical Debt Signals para las 14 señales completas, con la Signal #1 (residuo `.25`/`.75` de este intent) y Signal #2 (drift Tailwind residual en `CLAUDE.md`) dadas prominencia completa.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 260828-fix-invalid-tailwind-spa
fingerprint: 730e497ac8531e54313eafd72b4dc41e1622a1b4
analyzed:
  paths:
    - ./
    - package.json
    - pyproject.toml
    - pnpm-workspace.yaml
    - turbo.json
    - .pre-commit-config.yaml
    - .gga
    - .nvmrc
    - .python-version
    - AGENTS.md
    - CLAUDE.md
    - apps/api/pyproject.toml
    - apps/api/conftest.py
    - apps/api/src/prosell/
    - apps/api/src/prosell/infrastructure/api/routers/
    - apps/api/src/prosell/infrastructure/api/middleware/
    - apps/api/src/prosell/infrastructure/api/main.py
    - apps/api/tests/
    - apps/api/scripts/
    - apps/web/package.json
    - apps/web/tailwind.config.ts
    - apps/web/postcss.config.mjs
    - apps/web/src/app/globals.css
    - apps/web/vitest.config.ts
    - apps/web/tests/unit/config/tailwind.config.test.ts
    - apps/web/src/
    - apps/web/src/app/api/
    - apps/app/privacy/page.tsx
    - tests/e2e/package.json
    - tests/e2e/
    - docker/
    - .github/workflows/
    - scripts/
  components:
    - prosell-api (FastAPI backend)
    - prosell-web (Next.js frontend)
    - BFF proxy routes
    - apps/app (orphan micro-app)
    - tests/e2e (Playwright suite / @prosell/e2e workspace member)
shallow:
  paths:
    - apps/api/src/prosell/domain/
    - apps/api/src/prosell/application/
    - apps/api/src/prosell/infrastructure/images/
    - apps/api/src/prosell/infrastructure/integrations/
    - apps/api/src/prosell/infrastructure/tasks/
    - apps/api/src/prosell/infrastructure/webhook/
    - apps/api/src/prosell/infrastructure/i18n/
    - apps/api/src/prosell/infrastructure/security/
    - apps/api/src/prosell/infrastructure/services/
    - apps/web/src/proxy.ts
    - apps/web/src/components/
    - tests/e2e/specs/
    - tests/e2e/pages/
    - tests/e2e/fixtures/
    - docs/
    - PRPs/
    - .mm-flow/
    - Product-Definition/
    - prosell-design/
    - packages/
```
