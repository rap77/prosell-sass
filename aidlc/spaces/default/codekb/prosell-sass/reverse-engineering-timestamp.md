# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-08-30 (última actualización: scan enfocado del intent `260830-ci-fixes-round2`, mismo día)
**Commit analizado**: `3414ec3f` (rama `main`) — 1 commit nuevo desde el scan enfocado previo (`fix(tests): resolve CI seed data and FK constraint failures in backend tests`).
**Tipo de pase (último, el que gobierna el bloque `Scope of Analysis` final)**: **Scan enfocado**, aditivo sobre el scan enfocado del intent `260830-ci-seed-data` (que a su vez fue aditivo sobre el full rescan de `260826-prod-bugfixes-batch`) — ver § "Scan enfocado adicional — intent `260830-ci-fixes-round2`" más abajo. Las secciones anteriores (full rescan + scan enfocado `260830-ci-seed-data`) quedan preservadas íntegras debajo.

## Motivo del pase

El intent `260830-ci-fixes-round2` continúa reparando fallas de CI en `main` tras el fix parcial del intent `260830-ci-seed-data` (que resolvió el root cause de seed data de categorías y el patrón de fixture `shared_session`). Quedan fallas adicionales sin cubrir por el scan anterior: violación de FK por `category_id=uuid4()` en `test_batch_review_api.py`, un bug de diseño en `bulk_upload_vehicles.py` (fallback de organización ignorado por el chequeo de "unknown codes"), una docstring desactualizada en `test_appointment_api.py`, y una asignación de estado implícita (vía `server_default`) en `fb_sync_router.py::unpublish_callback`. El store existente (`kind: partial`, foco CI seed data/schema) no cubría estas áreas a profundidad — se decidió un scan enfocado adicional en vez de reuse o full rescan.

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco seed data/schema de test de CI, intent `260830-ci-seed-data`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado (el nuevo scan no re-cubre todas las rutas del store anterior, aunque sí agrega profundidad nueva en un área distinta). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## Developer Code Scan Results — foco batch review / bulk upload / appointments / fb-sync (intent `260830-ci-fixes-round2`)

### Scan Coverage

- **Analizado en profundidad** (graphify-first, luego lectura directa de líneas exactas):
  - `apps/api/tests/integration/api/test_batch_review_api.py`
  - `apps/api/tests/integration/use_cases/test_batch_approve_products.py` (patrón ya arreglado, comparado línea a línea)
  - `apps/api/tests/integration/conftest.py` (fixtures `test_organization`, `test_user`, `test_category`, `system_roles`, `db_session`)
  - `apps/api/tests/integration/bulk_upload/conftest.py`
  - `apps/api/tests/integration/bulk_upload/test_bulk_upload_with_images.py`
  - `apps/api/tests/integration/bulk_upload/test_bulk_upload_preview.py`
  - `apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`
  - `apps/api/src/prosell/application/use_cases/product/bulk_upload_preview.py`
  - `apps/api/src/prosell/domain/services/csv_field_mapper.py` (incl. `map_row()`, `MappedCSVRow`)
  - `apps/api/src/prosell/infrastructure/models/organization_model.py`
  - `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (secciones `/bulk-upload/preview` L1908-1980, `/bulk-upload/with-images` L1982-2085, y dos handlers `/brokers`+`/ownership` como contraste, L2190-2290)
  - `apps/api/tests/integration/api/test_appointment_api.py`
  - `apps/api/src/prosell/infrastructure/api/routers/appointment_router.py`
  - `apps/api/src/prosell/infrastructure/api/main.py` (registro de routers, L385-399)
  - `apps/api/tests/integration/api/routers/test_fb_sync_router.py` (fixture `shared_session`/`setup_override` L1-100, `test_failed_callback_keeps_request_queued_with_capped_attempt_count` L769-824, `test_...unpublish...` L700-767)
  - `apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py` (`unpublish_callback` L324-415)
  - `apps/api/src/prosell/infrastructure/models/fb_unpublish_request_model.py`
  - `.github/workflows/ci.yml` (job `test-python`, Postgres de test, `create_test_schema.py`)

- **BLOQUEADO por política de permisos local (no analizado por el developer)**:
  - `apps/api/tests/integration/api/test_fb_credential_migration_router.py`
  - `apps/api/src/prosell/infrastructure/api/routers/fb_credential_migration_router.py`
  - Motivo: `.claude/settings.local.json` tiene `"deny": ["Read(**/*credential*)"]`, bloquea Read y Bash sobre cualquier ruta con "credential". Límite de permisos real, no un bug — no se intentó rodear. Este gap queda registrado como conocimiento NO cubierto en este scan (solo estructura vía graphify) en `code-quality-assessment.md` y aquí.

- **Skimmed only**:
  - `apps/api/src/prosell/application/dto/appointment/request.py` / `response.py` (solo existencia confirmada)
  - `apps/api/src/prosell/infrastructure/repositories/appointment_repository_impl.py`
  - Resto del repo (frontend `apps/web`, resto de routers) — cubierto por el store previo, NO re-escaneado.

Ver `code-quality-assessment.md` § "Hallazgos del scan enfocado `260830-ci-fixes-round2`" para el detalle completo de Technical Debt Signals nuevos, y `api-documentation.md`/`component-inventory.md`/`architecture.md` para el resto de las secciones estándar del scan.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (full rescan `260826-prod-bugfixes-batch`)

Revalidación de `260826-prod-bugfixes-batch` (intent en curso, estado `in-flight`) antes de retomar Deployment Execution — el store existente estaba `UNVERIFIED` (no se pudo calcular el fingerprint del árbol actual contra el store previo) y, además, ese store solo cubría el área auth/OAuth de un intent distinto. Se decidió un rescan completo del repo en vez de reuse o scan enfocado.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite del full rescan (codekb-scope-diff)

Antes de escribir el full rescan se ejecutó `codekb-scope-diff --compare` contra un borrador de ese scope, comparado contra el store existente (`kind: partial`, foco auth/OAuth, intent `260829-auth-navigation-refactor`). Veredicto: **NARROWER**.

Esto fue honesto y esperado dado el alcance real de ese pase: el developer scan del full rescan cubrió en profundidad `apps/api/` (domain, application/use_cases, infrastructure/api, infrastructure/services, infrastructure/tasks) y la capa de auth/BFF general de `apps/web/` (`lib/api/`, `stores/`, `app/api/`, `proxy.ts`, `deriveRole.ts`, `useAuth.ts`), pero **no releyó línea por línea** los archivos de página específicos que el store anterior sí había analizado en detalle: `apps/web/src/app/auth/login/LoginPageContent.tsx`, `apps/web/src/app/auth/register/RegisterPageContent.tsx`, `apps/web/src/components/layout/NavigationCleanup.tsx`, `apps/web/src/hooks/useOAuthPreload.ts`, y el directorio `apps/web/src/app/auth/` a nivel de archivo por archivo.

**El conocimiento sustantivo no se perdió**: los hechos ya documentados sobre esos archivos (consolidación del handler OAuth, `useOAuthPreload.ts` como código muerto, JSDoc desactualizado de `proxy.ts`) fueron preservados y trasladados a `code-quality-assessment.md` (Signals #16–#18) porque ya estaban registrados como aprendizaje de equipo en `project.md`.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — full rescan `260826-prod-bugfixes-batch`

### Scan Coverage

- **Analizado en profundidad**:
  - `apps/api/src/prosell/domain/` (entities, value_objects, repositories, ports, services, exceptions, events)
  - `apps/api/src/prosell/application/use_cases/` (18 subdominios, 97 archivos)
  - `apps/api/src/prosell/infrastructure/api/routers/` (28 routers)
  - `apps/api/src/prosell/infrastructure/api/middleware/` (auth, rbac, rate-limit, exception_handlers)
  - `apps/api/src/prosell/infrastructure/services/` y `tasks/` (email, Facebook Graph API, publishers, taskiq)
  - `apps/web/src/lib/api/`, `apps/web/src/stores/`, `apps/web/src/app/api/**/route.ts` (BFF proxies), `apps/web/src/proxy.ts`, `apps/web/src/lib/auth/deriveRole.ts`, `apps/web/src/hooks/useAuth.ts`
  - `apps/web/package.json`, `apps/api/pyproject.toml` (versiones exactas)
  - `apps/web/vitest.config.ts` (thresholds), `.github/workflows/ci.yml` (jobs), `.pre-commit-config.yaml` (hooks)
  - Verificación puntual de deuda técnica ya documentada en `project.md` (clases Tailwind inválidas, `useEffect` para fetching, `.passthrough()` Zod 3-style)
- **Solo relevado (a nivel directorio, sin lectura profunda)**:
  - `apps/api/src/prosell/infrastructure/models/` (29 modelos SQLAlchemy — contados, no leídos uno a uno)
  - `apps/api/alembic/versions/` (71 migraciones — solo contadas)
  - `apps/web/src/components/**` (22 subcarpetas — inventariadas por directorio)
  - `apps/api/tests/` (243 archivos) y `apps/web/tests/` (161 archivos) — contados y clasificados por carpeta
  - `tests/e2e/specs/` (34 specs Playwright — contados)
  - `docker/` (compose files, Dockerfiles — listados)
  - `apps/api/scripts/` (22 scripts — contados)
- **Fuera de alcance de código** (no tocados): `docs/`, `PRPs/`, `.archive/`

## [PRESERVADO ÍNTEGRO] Scan enfocado — intent `260830-ci-seed-data` (2026-08-30)

**Tipo de pase**: **Scan enfocado** (aditivo sobre el full rescan anterior de esta misma fecha, no lo reemplaza). Motivo: reparar el CI de `main`, en rojo consistente en varios pushes no relacionados (patrón ya aprendido en `project.md`: rojo sistemático = bloqueo de infraestructura de pipeline, no regresión del último commit). El store previo no había cubierto a profundidad el área de seed data/schema de test de CI — solo relevada a nivel de directorio (`apps/api/scripts/`, `apps/api/tests/`).

**Verificación de overwrite (`codekb-scope-diff --compare`)**: veredicto **COVERS** — el scan entrante cubrió todo lo que el store anterior ya había analizado (unión aditiva, sin pérdida de cobertura previa).

### Developer Code Scan Results — foco CI seed data

**Analizado en profundidad este pase**:

- `apps/api/scripts/create_test_schema.py`
- `apps/api/src/prosell/infrastructure/database/base.py`
- `apps/api/src/prosell/infrastructure/database/session.py`
- `apps/api/tests/conftest.py`
- `apps/api/tests/integration/conftest.py`
- `apps/api/tests/integration/api/routers/test_fb_sync_router.py` (fixtures + 3 tests relevantes)
- `apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py` (`_get_active_fb_account`, `unpublish_callback`)
- `apps/api/tests/integration/database/test_seed_categories.py`
- `apps/api/tests/integration/database/test_seed_car_attributes.py`
- `apps/api/src/prosell/infrastructure/database/seed_categories.py`
- `apps/api/src/prosell/infrastructure/models/product_model.py`
- `apps/api/tests/integration/use_cases/test_batch_approve_products.py` (grep dirigido)
- `apps/api/tests/integration/bulk_upload/conftest.py` (fixtures)
- `apps/api/scripts/init_data.py`
- `apps/api/alembic/versions/` (listado + búsqueda de FK/enum drift)
- Git history: `apps/api/scripts/`, `apps/api/tests/conftest.py`, `apps/api/src/prosell/infrastructure/database/`, `apps/api/tests/integration/conftest.py`, `apps/api/src/prosell/infrastructure/models/product_model.py`, `apps/api/tests/integration/database/*`, commit `2166f142`
- Runs de CI reales: `gh run list` (últimos 15) + `gh run view 33292657961 --log-failed` (log completo, 23499 líneas)

**Solo relevado (skimmed) este pase**: `apps/api/scripts/seed_dev.py`, `seed_marketplace_inventory.py`, `seed_dealers.py`, `seed_test_vehicles.py`, `audit_schema_drift.py`, `test_data_cleanup.py`; `apps/api/alembic/versions/20260601_recreate_facebook_tables.py` (solo referenciado por el docstring de `create_test_schema.py`); job `test-python` de `.github/workflows/ci.yml` (ya cubierto por un pase previo, no releído).

**Fuera de alcance de este scan** (store previo aún vigente sobre esas áreas, no reescaneado): `apps/api/src/prosell/domain/`, `apps/api/src/prosell/application/use_cases/`, `apps/api/src/prosell/infrastructure/api/routers/` (excepto `fb_sync_router.py`), `apps/api/src/prosell/infrastructure/api/middleware/`, `apps/api/src/prosell/infrastructure/services/`, `apps/api/src/prosell/infrastructure/tasks/`, `apps/web/**`, `apps/api/pyproject.toml`, `apps/web/vitest.config.ts`, `.pre-commit-config.yaml`.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 260830-ci-fixes-round2
fingerprint: 8dcb01313c0abb47271a0162803255386b206a32
analyzed:
  paths:
    - apps/api/tests/integration/api/test_batch_review_api.py
    - apps/api/tests/integration/use_cases/test_batch_approve_products.py
    - apps/api/tests/integration/conftest.py
    - apps/api/tests/integration/bulk_upload/conftest.py
    - apps/api/tests/integration/bulk_upload/test_bulk_upload_with_images.py
    - apps/api/tests/integration/bulk_upload/test_bulk_upload_preview.py
    - apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py
    - apps/api/src/prosell/application/use_cases/product/bulk_upload_preview.py
    - apps/api/src/prosell/domain/services/csv_field_mapper.py
    - apps/api/src/prosell/infrastructure/models/organization_model.py
    - apps/api/src/prosell/infrastructure/api/routers/product_router.py
    - apps/api/tests/integration/api/test_appointment_api.py
    - apps/api/src/prosell/infrastructure/api/routers/appointment_router.py
    - apps/api/src/prosell/infrastructure/api/main.py
    - apps/api/tests/integration/api/routers/test_fb_sync_router.py
    - apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py
    - apps/api/src/prosell/infrastructure/models/fb_unpublish_request_model.py
    - .github/workflows/ci.yml
  components:
    - prosell-api (FastAPI backend)
    - prosell-web (Next.js frontend)
    - BFF proxy routes
    - Navegación Auth (frontend)
    - Publicación a Facebook Marketplace (backend)
    - CI test-schema bootstrap (seed/test infra)
    - Batch Review (product batch approve/reject)
    - Bulk Upload CSV (CSV vehicle import)
    - Appointments
    - FB Sync (bot↔backend unpublish callback)
    - FB Credential Migration (estructura solamente, bloqueado por permisos)
shallow:
  paths:
    - apps/api/src/prosell/infrastructure/models/
    - apps/web/src/components/
    - apps/api/tests/
    - apps/web/tests/
    - tests/e2e/specs/
    - docker/
    - apps/api/scripts/
    - apps/api/src/prosell/application/dto/appointment/
    - apps/api/src/prosell/infrastructure/repositories/appointment_repository_impl.py
blocked:
  paths:
    - apps/api/tests/integration/api/test_fb_credential_migration_router.py
    - apps/api/src/prosell/infrastructure/api/routers/fb_credential_migration_router.py
  reason: ".claude/settings.local.json deny rule blocks Read/Bash on any path matching '*credential*' — local permissions limit, not a bug"
```
