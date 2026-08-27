# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-08-25
**Commit analizado**: `b7915083f687d0783dd490c9ac3730b886841561` (rama `main`, autor Rafael Padrón, 2026-08-24T23:07:36-04:00)
**Tipo de pase**: Rescan completo (full rescan) — reemplaza un store previo cuyo veredicto era UNVERIFIED/stale-unknown, según decisión explícita del usuario en el intent `260826-prod-bugfixes-batch`.
**Motivo del pase**: batch de 7 bugfixes de producción + 1 feature pequeña (export CSV), scope `express`.

## Verificación de overwrite (codekb-scope-diff)

Antes de sobrescribir el store existente se ejecutó `codekb-scope-diff --compare` contra un borrador de este documento. Veredicto: **NARROWER** — el store anterior (intent `260824-reverse-eng-docs`) tenía componentes con lectura profunda (routers completos, capas de dominio/aplicación/persistencia completas, componentes UI completos, stores de estado, suite E2E, infraestructura Docker, pipelines CI/CD) que este pase no volvió a leer a fondo, porque el alcance de este intent es un batch de bugfixes puntuales, no una exploración exhaustiva del dominio. El usuario autorizó explícitamente el rescan completo pese a esta reducción de profundidad relativa — la decisión de negocio es priorizar la corrección de los 4 bugs con causa raíz identificable sobre mantener la cobertura profunda previa de áreas no tocadas (auth, CRM de leads, wallet/Stripe, scraping de Facebook completo, stores de estado, infraestructura Docker/CI completa). Ver `code-structure.md` § "Áreas del árbol NO analizadas a fondo en este pase" para el detalle honesto de qué quedó fuera.

## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**:
  - `apps/web/src/app/(admin)/admin/review-queue/page.tsx`
  - `apps/web/src/components/review/ReviewQueueTable.tsx`
  - `apps/web/src/app/(seller)/catalog/page.tsx`
  - `apps/web/src/components/admin/category-schema-editor.tsx`
  - `apps/web/src/lib/api/schemas/categorySchema.ts`
  - `apps/web/src/types/category.ts`
  - `apps/api/src/prosell/application/dto/category/response.py`
  - `apps/api/src/prosell/domain/entities/category.py` (sección de validación de atributos)
  - `apps/web/src/components/forms/schema/SchemaFieldRenderer.tsx`
  - `apps/web/src/components/ui/ShareMenu.tsx`
  - `apps/api/src/prosell/domain/value_objects/organization_contact.py`
  - `apps/web/src/components/admin/ContactManager.tsx`
  - `apps/web/src/components/public/ProductPublicView.tsx`
  - `apps/web/src/app/p/[slug]/page.tsx`
  - `apps/api/src/prosell/infrastructure/api/routers/public_product_router.py`
  - `apps/web/src/lib/translations/vehicle-values.ts`
  - `apps/web/src/i18n/config.ts`
  - `apps/web/src/i18n/request.ts`
  - `apps/web/src/components/i18n/LocaleSwitcher.tsx`
  - `apps/api/src/prosell/infrastructure/i18n/translator.py`
  - `apps/web/src/components/forms/schema/VinDecodeField.tsx`
  - `apps/api/src/prosell/infrastructure/services/nhtsa_vin_service.py`
  - `apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py` (decode-vin + helpers de normalización)
  - `apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py` (sección de cabecera + mapeo MAKE/BODY_TYPE)
  - `apps/api/src/prosell/domain/services/template_composer.py`
  - `apps/web/src/lib/utils/composeSubtitle.ts`
  - `apps/web/src/components/catalog/ProductCard.tsx` (sección de renderizado de título/subtítulo)
  - `apps/api/src/prosell/domain/services/csv_product_parser.py` (columnas + `parse_csv`)
  - `apps/api/src/prosell/infrastructure/api/routers/category_router.py` (endpoint de plantilla CSV de schema)
  - `apps/api/pyproject.toml`
  - `apps/web/package.json`, `package.json` (raíz)
  - `apps/web/vitest.config.ts` (sección de cobertura)
  - `apps/api/pytest.ini` (claves de configuración)
  - `apps/web/tailwind.config.ts` / `postcss.config.mjs` (presencia) + estilo de directivas en `globals.css`
  - `docs/AUDIT-UI-UX-I18N-2026-07-21.md` (primeras ~80 líneas — sección de fortalezas y debilidad #1)
  - `.github/workflows/ci.yml` (primeras ~100 líneas — jobs `lint-python`, `test-python`, inicio de `lint-node`)
  - `.claude/knowledge/aidlc-developer-agent/re-artifacts.md` (plantilla de artefactos RE)

- **Skimmed only** (enumeración de directorio/estructura vía `fd`/`rg`/`graphify`, o listado de archivos, sin lectura completa):
  - `apps/api/src/prosell/domain/`, `application/`, `infrastructure/` (listado completo del subárbol, ~421 archivos Python totales; solo se leyeron a fondo los archivos puntuales listados arriba)
  - `apps/web/src/components/` (23 subdirectorios enumerados; solo piezas puntuales de forms/review/admin/public/ui leídas)
  - `apps/web/src/app/` (estructura de grupos de rutas enumerada: `(admin)`, `(seller)`, `api`, `auth`, `branch`, `invite`, `manager`, `onboarding`, `p`, `privacy`, `profile`, `terms`, `vendedor`)
  - `apps/web/src/lib/api/` (30 módulos API enumerados por nombre de archivo)
  - `apps/api/alembic/versions/` (71 migraciones, contadas no leídas)
  - `apps/api/tests/` (270 archivos), `apps/api/src/prosell/tests/` (8 archivos), `apps/web/tests/` (93 archivos) + co-localizados `*.test.tsx` (65 archivos), `tests/e2e/` (88 archivos) — contados, no leídos individualmente
  - `.github/workflows/*.yml` (6 archivos de workflow: `ci.yml` parcial, `deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml` — 5 de 6 sin abrir)
  - `docker/` (11 archivos: 3 compose, 4 Dockerfiles, Caddyfile, etc.) — enumerados, no abiertos
  - `docs/`, `PRPs/`, `Product-Definition/`, `prosell-design/`, `scripts/`, `tasks/`, `patches/`, `.archive/`, `aidlc/` — solo presencia de nivel superior, no explorados hacia adentro
  - `apps/app/` (tercera app mínima — solo se confirmó `privacy/page.tsx`) — presencia notada, no leída
  - `.gga`, `.pre-commit-config.yaml` — presencia confirmada, no abiertos
  - `packages/` — confirmado **inexistente** en el árbol actual (`fd . packages -d 2` sin resultados), pese a estar documentado en `CLAUDE.md` como "shared-types (future)"

### Packages Found

- `apps/api` — service — Python 3.13 — API REST de mercado de vehículos, Clean Architecture (domain/application/infrastructure)
- `apps/web` — service — TypeScript/React — dashboard de vendedor, consola de admin, páginas públicas de marketplace
- `apps/app` — service (mínimo) — TypeScript — solo se confirmó una página `privacy/`; probablemente micro-app de páginas legales, no confirmado
- `packages/shared-types` — **no presente** (documentado en `CLAUDE.md` como futuro, verificado ausente en este pase)
- `tests/e2e` — test suite — Playwright — 88 archivos
- `docker/` — packaging — Dockerfiles + 3 variantes de compose (dev/staging/prod)

### Build System

- **Type**: pnpm workspaces + Turborepo (JS/TS); uv + hatchling (Python, `build-backend = "hatchling.build"`)
- **Config Files**: `package.json` raíz, `turbo.json`, `apps/web/package.json`, `apps/web/tsconfig.json` (presente, no abierto), `apps/web/tailwind.config.ts` + `postcss.config.mjs`, `apps/web/vitest.config.ts`, `apps/web/eslint.config.js`, `apps/api/pyproject.toml`, `apps/api/pytest.ini`, `apps/api/alembic/`, `.pre-commit-config.yaml`, `.gga`
- **Build Dependencies**: `apps/web` y `apps/api` desplegables independientemente (Dockerfiles separados); scripts raíz hacen fan-out vía Turbo; `patches/@radix-ui__react-select.patch` aplicado vía `pnpm.patchedDependencies` — dependencia de terceros parcheada, deuda de mantenimiento a rastrear

### APIs Discovered

- REST (FastAPI) — `apps/api/src/prosell/infrastructure/api/routers/` — 30 `include_router()` en `main.py` sobre 25 archivos de router
- API pública (sin autenticación) — `public_product_router.py` — `GET /{slug}`, `GET /{slug}/image-urls` — no expone datos de contacto de organización
- API de schema de categoría — `category_router.py` — `PATCH /{category_id}/schema` (flujo con advertencia de migración), `GET /{category_id}/schema/template.csv`, `POST /{category_id}/schema/clone-from/{source_category_id}`
- API de decode VIN — `vehicle_router.py` — `decode_vin`, 28 campos normalizados en 10 grupos
- API de carga masiva — `product_router.py` — `bulk_upload_products`, `GET /bulk-upload/errors.csv`
- Puertos de servicio internos — `apps/api/src/prosell/application/ports/` (p. ej. `IDOSpacesService`, `IVINDecoderService`) — DI basada en interfaces

### Frameworks & Libraries

Ver `technology-stack.md` para la tabla completa con versiones exactas.

### Test Coverage

Ver `code-quality-assessment.md` — resumen: 270 (backend tests/) + 8 (backend src/tests/) + 93+65 (frontend) + 88 (E2E) = 524 archivos de test enumerados. Umbral de cobertura frontend bajado explícitamente de 80%→40% líneas/funciones, documentado inline en `vitest.config.ts`. Umbral de cobertura backend no localizado en este pase (no confirma ausencia).

### Code Quality Indicators

Ver `code-quality-assessment.md` para el detalle completo de linting, CI/CD y señales de deuda técnica.

### Technical Debt Signals

Ver `architecture.md` § Interaction Diagrams y § Improvement Opportunities, y `code-quality-assessment.md` § "Señales de deuda técnica (consolidado)" para las 10 señales trazadas, 4 de ellas con causa raíz completa hasta nivel de archivo para BUG-3/6, BUG-5, BUG-4 y BUG-7.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 260826-prod-bugfixes-batch
fingerprint: c982c89cfcf9940c6f3e03f1a4c2c14cd9add373
analyzed:
  paths:
    - apps/web/src/app/(admin)/admin/review-queue/page.tsx
    - apps/web/src/components/review/ReviewQueueTable.tsx
    - apps/web/src/app/(seller)/catalog/page.tsx
    - apps/web/src/components/admin/category-schema-editor.tsx
    - apps/web/src/lib/api/schemas/categorySchema.ts
    - apps/web/src/types/category.ts
    - apps/api/src/prosell/application/dto/category/response.py
    - apps/api/src/prosell/domain/entities/category.py
    - apps/web/src/components/forms/schema/SchemaFieldRenderer.tsx
    - apps/web/src/components/ui/ShareMenu.tsx
    - apps/api/src/prosell/domain/value_objects/organization_contact.py
    - apps/web/src/components/admin/ContactManager.tsx
    - apps/web/src/components/public/ProductPublicView.tsx
    - apps/web/src/app/p/[slug]/page.tsx
    - apps/api/src/prosell/infrastructure/api/routers/public_product_router.py
    - apps/web/src/lib/translations/vehicle-values.ts
    - apps/web/src/i18n/config.ts
    - apps/web/src/i18n/request.ts
    - apps/web/src/components/i18n/LocaleSwitcher.tsx
    - apps/api/src/prosell/infrastructure/i18n/translator.py
    - apps/web/src/components/forms/schema/VinDecodeField.tsx
    - apps/api/src/prosell/infrastructure/services/nhtsa_vin_service.py
    - apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py
    - apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py
    - apps/api/src/prosell/domain/services/template_composer.py
    - apps/web/src/lib/utils/composeSubtitle.ts
    - apps/web/src/components/catalog/ProductCard.tsx
    - apps/api/src/prosell/domain/services/csv_product_parser.py
    - apps/api/src/prosell/infrastructure/api/routers/category_router.py
    - apps/api/pyproject.toml
    - apps/web/package.json
    - package.json
    - apps/web/vitest.config.ts
    - apps/api/pytest.ini
    - apps/web/tailwind.config.ts
    - apps/web/postcss.config.mjs
    - docs/AUDIT-UI-UX-I18N-2026-07-21.md
    - .github/workflows/ci.yml
  components:
    - API Layer (FastAPI Routers)
    - Domain Layer (Entidades y Value Objects)
    - Application Layer (Use Cases y DTOs)
    - Infraestructura de Persistencia (SQLAlchemy + Alembic)
    - Infraestructura de Servicios e Integraciones
    - App Router (Next.js UI)
    - Proxy API Routes (BFF)
    - Componentes UI (React) — Formularios, Admin, Catálogo, Público
    - Cliente API y Contratos Zod
    - Componente Legal — apps/app (micro-app)
    - Suite E2E (Playwright)
    - Infraestructura Docker y CI/CD
shallow:
  paths:
    - apps/api/src/prosell/domain/
    - apps/api/src/prosell/application/
    - apps/api/src/prosell/infrastructure/
    - apps/web/src/components/
    - apps/web/src/app/
    - apps/web/src/lib/api/
    - apps/api/alembic/versions/
    - apps/api/tests/
    - apps/api/src/prosell/tests/
    - apps/web/tests/
    - tests/e2e/
    - .github/workflows/
    - docker/
    - docs/
    - PRPs/
    - Product-Definition/
    - prosell-design/
    - scripts/
    - tasks/
    - patches/
    - .archive/
    - aidlc/
    - apps/app/
```
