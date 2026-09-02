# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-09-01 (última actualización: scan enfocado del intent `260901-frontend-test-debt`)
**Commit analizado**: `21eedc81` (rama `main`).
**Tipo de pase (último, el que gobierna el bloque `Scope of Analysis` final)**: **Scan enfocado**, aditivo sobre el scan enfocado del intent `260828-useeffect-to-react-query` (a su vez aditivo sobre `260831-invalid-tailwind-classes`, `260830-ci-fixes-round2`, `260830-ci-seed-data` y el full rescan de `260826-prod-bugfixes-batch`) — ver § "Motivo del pase" más abajo. Todas las secciones anteriores quedan preservadas íntegras debajo, marcadas `[PRESERVADO ÍNTEGRO]`.

## Motivo del pase

El intent `260901-frontend-test-debt` repara la deuda de tests unitarios frontend pre-existente ya catalogada en `project.md` desde el intent `260826-prod-bugfixes-batch` ("Hay 13 tests frontend pre-existentes fallando en el baseline de main... mock sin el campo `published_to_marketplace` que el schema real ya requiere"): `apps/web/tests/unit/api/products.test.tsx` (7 de 12 fallando) y `apps/web/tests/unit/lib/api/reverseTransitions.test.tsx` (4 de 9 fallando). El store existente estaba `STALE` para esta área — las rutas relevantes ya habían cambiado desde el último scan (`260828-useeffect-to-react-query`, foco onboarding/invite) y nunca se había profundizado en `apps/web/src/lib/api/products.ts` ni en los dos archivos de test objetivo. El usuario eligió explícitamente **scan enfocado** sobre rescan completo.

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco onboarding/invite/migración React Query, intent `260828-useeffect-to-react-query`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (tests unitarios de `products.ts`/transiciones de estado, no onboarding/invite). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## Developer Code Scan Results — foco tests unitarios `products.test.tsx` / `reverseTransitions.test.tsx` (intent `260901-frontend-test-debt`)

### Scan Coverage

- **Analizado en profundidad**: `apps/web/tests/unit/api/products.test.tsx` (574 líneas), `apps/web/tests/unit/lib/api/reverseTransitions.test.tsx` (234 líneas), `apps/web/src/lib/api/products.ts` (1945 líneas: `productSchema`, `parseProductResponse`, `createProductWithVehicle`, `useCreateProduct`, `useReverseProduct`/`useResubmitProduct`/`useRestoreProduct`/`useRevertSaleProduct`, `postReverseTransition`, `useAvailableTransitions`, `useProductAuditLogs`), backend `apps/api/src/prosell/domain/entities/product.py` + `apps/api/src/prosell/infrastructure/models/product_model.py` (diff del commit que lo introdujo solamente), historial git (`git log -S "published_to_marketplace"`, `git show 7315fdf2` diff completo), archivo hermano `apps/web/tests/unit/lib/api/products.test.ts` (el archivo que el mismo commit SÍ arregló, como precedente), ejecución en vivo de `pnpm vitest run` sobre ambos archivos objetivo (los 21 tests), `apps/web/vitest.config.ts`, script de test de `apps/web/package.json`, job `test-node` de `.github/workflows/ci.yml`.
- **Skimmed only**: `AvailableTransitions.tsx`/`CatalogDetailView.tsx` (consumidores, no implicados en la falla), `apps/web/tests/unit/components/upload/setProductCover.test.ts` (confirmada su existencia, no abierto — señalado como pregunta abierta fuera de alcance).
- **No tocado**: resto del repositorio (scan enfocado, no full rescan) — el store previo sobre onboarding/invite, auth, batch review, bulk upload, appointments, fb-sync, Tailwind y el resto de la arquitectura backend/frontend sigue vigente tal cual, sin re-verificar en este pase.

### Root cause (única, compartida, confirmada por ejecución de test en vivo)

`productSchema` en `apps/web/src/lib/api/products.ts` (línea ~88 del scan del developer; graphify ubica la declaración en L56 — discrepancia de línea entre herramientas, no de archivo/contenido) exige `published_to_marketplace: z.boolean()` (sin `.optional()`). El backend (`apps/api/src/prosell/domain/entities/product.py`, `apps/api/src/prosell/infrastructure/models/product_model.py`, columna `nullable=False, default=False`) siempre envía este campo — el schema frontend refleja correctamente el contrato real del backend (según la convención Zod-mirror ya establecida del equipo). La ruptura se introdujo en el commit `7315fdf2` (2026-08-22), que endureció el campo de opcional a requerido y arregló un TERCER archivo hermano (`apps/web/tests/unit/lib/api/products.test.ts`, nota: `.ts`, no `.tsx`) pero omitió estos dos archivos `.tsx`. Es deuda de mocks de test desactualizados, NO un bug de código fuente — backfill mecánico, sin ambigüedad de diseño.

### Hallazgo por archivo

- **`apps/web/tests/unit/api/products.test.tsx`**: resultado en vivo: 12 tests, 7 fallando, 5 pasando. Las 7 fallas están todas en el camino feliz (los mocks alimentan `parseProductResponse` → `ZodError`); los 5 tests que pasan son todos de camino de error, que nunca llega a `parseProductResponse`. 7 objetos mock sin el campo (líneas ~54, 115, 174, 298, 357, 408, y uno inline ~512-533).
- **`apps/web/tests/unit/lib/api/reverseTransitions.test.tsx`**: resultado en vivo: 9 tests, 4 fallando, 5 pasando. Un único helper compartido `mockProductResponse()` (líneas 38-58) sin el campo — un solo punto de fix resuelve las 4 fallas. Los 5 tests que pasan usan esquemas no relacionados (`availableTransitionSchema`, `productAuditLogSchema`) o el camino de error.

### Deuda técnica señalada, fuera de alcance

Un tercer archivo, `apps/web/tests/unit/components/upload/setProductCover.test.ts`, probablemente comparte el mismo síntoma pero no fue nombrado en la descripción verbatim del intent ni fue abierto/verificado en este pase. NO expandir alcance de oficio — queda como pregunta abierta para Requirements Analysis (ver también `code-quality-assessment.md` Signal #6/histórico y `component-inventory.md`).

Ver `api-documentation.md`, `architecture.md` § Interaction Diagrams (diagrama 10), `component-inventory.md`, `code-structure.md` y `code-quality-assessment.md` (hallazgos #43-44) para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260828-useeffect-to-react-query`)

El intent `260828-useeffect-to-react-query` migra dos flujos de negocio sensibles (`onboarding/page.tsx`, `invite/[token]/page.tsx`) de `useEffect` para fetch/mutación a React Query, corrigiendo la violación explícita de `AGENTS.md:333` ya catalogada en `project.md` como aprendizaje de un pase anterior. El store existente cubría el área de Tailwind/config a profundidad (intent `260831-invalid-tailwind-classes`) pero no había profundizado en `orgApi.ts`/`teamApi.ts`/`notificationsApi.ts`/`fetchWithAuth.ts` ni en las dos páginas objetivo — se decidió un scan enfocado adicional en vez de reuse (el store era `STALE` para esta área) o full rescan.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260828-useeffect-to-react-query`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco Tailwind config/clases inválidas, intent `260831-invalid-tailwind-classes`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (frontend onboarding/invite/cliente API, no Tailwind). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco onboarding / invite / migración React Query (intent `260828-useeffect-to-react-query`)

### Scan Coverage

- **Analizado en profundidad**: `apps/web/src/app/onboarding/page.tsx`, `apps/web/src/app/invite/[token]/page.tsx`, `apps/web/src/app/invite/org/[token]/page.tsx` (flujo hermano, solo contraste), `apps/web/src/lib/api/orgApi.ts`, `apps/web/src/lib/api/teamApi.ts`, `apps/web/src/lib/api/schemas/orgApi.ts`, `apps/web/src/lib/api/schemas/teamApi.ts` (solo shape de `TeamMemberSchema`), `apps/web/src/lib/api/notificationsApi.ts`, `apps/web/src/lib/api/fetchWithAuth.ts`, `apps/web/src/lib/api/extractErrorMessage.ts`, `apps/web/src/components/providers/ReactQueryProvider.tsx`, `apps/web/src/lib/api/leads.test.tsx` (solo patrón de test), `apps/web/src/components/leads/TeamLeadList.test.tsx` (solo patrón de test), `apps/web/tests/app/auth/login/page.test.tsx` (solo patrón de test), `apps/web/package.json`, `AGENTS.md` línea 333 (texto verbatim de la regla).
- **Skimmed only**: `apps/web/src/hooks/useAuth.ts`, `apps/web/src/stores/authStore.ts` (grep de `useEffect`, sin hallazgos relevantes), `apps/web/src/lib/auth/deriveRole.ts` (ubicación confirmada, fuera del call path de ambas páginas), `apps/web/src/lib/api/leads.ts` (firmas de hooks vía graphify solamente).
- **No tocado**: resto del repositorio (scan enfocado, no full rescan).

Ver `api-documentation.md`, `architecture.md` § Interaction Diagrams (diagramas 8 y 9), `component-inventory.md`, `code-structure.md`, `dependencies.md` y `code-quality-assessment.md` (hallazgos #36-42) para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260831-invalid-tailwind-classes`)

El intent `260831-invalid-tailwind-classes` continúa el seguimiento de deuda de clases Tailwind inválidas ya catalogada en pases previos (`code-quality-assessment.md` Signal #3, `component-inventory.md` § "Inventario de bug — clases Tailwind inválidas"). El foco de este pase fue re-verificar el estado ACTUAL de esa deuda tras el fix de escala de spacing (`624819e3`) ya mergeado a `main` antes de que este intent arrancara: confirmar cuáles de las clases previamente catalogadas siguen siendo inválidas hoy, y cuáles quedaron resueltas por la extensión de `theme.extend.spacing`.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260831-invalid-tailwind-classes`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco batch review/bulk upload/appointments/fb-sync, intent `260830-ci-fixes-round2`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área distinta (frontend Tailwind/config, no backend). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco Tailwind config / clases inválidas (intent `260831-invalid-tailwind-classes`)

### Scan Coverage

- **Analizado en profundidad**:
  - `apps/web/src/app/privacy/page.tsx`
  - `apps/web/src/app/terms/page.tsx`
  - `apps/web/src/app/(seller)/publications/page.tsx`
  - `apps/web/src/components/onboarding/OnboardingStep3.tsx`
  - `apps/web/src/components/appointments/AppointmentForm.tsx`
  - `apps/web/tailwind.config.ts`
  - `apps/web/tests/unit/config/tailwind.config.test.ts`
  - `apps/web/package.json` (bloque de dependencia `tailwindcss` solamente)
- **Skimmed / no analizado este pase**: el resto del repositorio (scan enfocado, no full rescan).

### Hallazgo principal — reencuadre de la deuda catalogada

El commit `624819e3` ("fix(web): extend Tailwind spacing scale for invalid h-9.5/px-4.5/h-8.5 classes"), ya mergeado a `main` antes de que este intent arrancara, agregó a `apps/web/tailwind.config.ts`:

```ts
spacing: {
  "4.5": "1.125rem",
  "8.5": "2.125rem",
  "9.5": "2.375rem",
},
```

con test de respaldo en `apps/web/tests/unit/config/tailwind.config.test.ts`. Esto **resuelve** las clases `h-9.5`/`px-4.5`/`h-8.5` en `privacy/page.tsx`, `terms/page.tsx`, `OnboardingStep3.tsx` y `AppointmentForm.tsx` — ya NO son deuda, compilan correctamente. Este pase confirma directamente (lectura de línea) que esas 4 páginas/componentes usan exclusivamente clases ahora cubiertas por la escala extendida.

El único archivo con clases genuinamente inválidas hoy es `apps/web/src/app/(seller)/publications/page.tsx` (nota: la ruta real usa el route group `(seller)/`, no `apps/web/src/app/publications/page.tsx` como asumía la descripción original del intent) — 5 clases inválidas de la familia `.25`/`.75`, ya catalogada como "residuo NO cubierto" en el pase anterior pero sin verificación línea por línea; este pase la verifica con exactitud:

- `gap-1.25` — líneas 208, 488
- `p-0.75` — línea 479
- `mt-0.25` — línea 524
- `mb-0.75` — línea 594

Estos pasos fraccionarios (`.25`/`.75`) no están en la escala de half-step default de Tailwind 3 (`0.5, 1.5, 2.5, 3.5` solamente) ni en `theme.extend.spacing`, por lo que compilan a CSS vacío. Si son valores de diseño intencionales o typos de los enteros vecinos (`gap-1`, `p-1`, `mt-1`/`mb-1`) queda como pregunta abierta para Requirements Analysis — no se resuelve en este pase de reverse engineering.

Ver `code-quality-assessment.md` § "Actualización del scan enfocado `260831-invalid-tailwind-classes`" y `component-inventory.md` § "Inventario de bug — clases Tailwind inválidas" (actualizado) para el detalle completo.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260830-ci-fixes-round2`)

El intent `260830-ci-fixes-round2` continúa reparando fallas de CI en `main` tras el fix parcial del intent `260830-ci-seed-data` (que resolvió el root cause de seed data de categorías y el patrón de fixture `shared_session`). Quedan fallas adicionales sin cubrir por el scan anterior: violación de FK por `category_id=uuid4()` en `test_batch_review_api.py`, un bug de diseño en `bulk_upload_vehicles.py` (fallback de organización ignorado por el chequeo de "unknown codes"), una docstring desactualizada en `test_appointment_api.py`, y una asignación de estado implícita (vía `server_default`) en `fb_sync_router.py::unpublish_callback`. El store existente (`kind: partial`, foco CI seed data/schema) no cubría estas áreas a profundidad — se decidió un scan enfocado adicional en vez de reuse o full rescan.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260830-ci-fixes-round2`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco seed data/schema de test de CI, intent `260830-ci-seed-data`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado (el nuevo scan no re-cubre todas las rutas del store anterior, aunque sí agrega profundidad nueva en un área distinta). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco batch review / bulk upload / appointments / fb-sync (intent `260830-ci-fixes-round2`)

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
intent: 260901-frontend-test-debt
fingerprint: 4b825dc642cb6eb9a060e54bf8d69288fbee4904
analyzed:
  paths:
    - apps/web/tests/unit/api/products.test.tsx
    - apps/web/tests/unit/lib/api/reverseTransitions.test.tsx
    - apps/web/src/lib/api/products.ts
    - apps/api/src/prosell/domain/entities/product.py
    - apps/api/src/prosell/infrastructure/models/product_model.py
  components:
    - productSchema
    - parseProductResponse
    - useReverseProduct
    - useResubmitProduct
    - useRestoreProduct
    - useRevertSaleProduct
    - postReverseTransition
shallow:
  paths:
    - apps/web/src/components/admin/AvailableTransitions.tsx
    - apps/web/src/components/catalog/CatalogDetailView.tsx
    - apps/web/tests/unit/components/upload/setProductCover.test.ts
    - apps/web/tests/unit/lib/api/products.test.ts
    - apps/web/vitest.config.ts
    - apps/web/package.json
    - .github/workflows/ci.yml
    - apps/web/src/hooks/useAuth.ts
    - apps/web/src/stores/authStore.ts
    - apps/web/src/lib/auth/deriveRole.ts
    - apps/web/src/lib/api/leads.ts
    - apps/web/src/app/onboarding/page.tsx
    - apps/web/src/app/invite/[token]/page.tsx
    - apps/web/src/app/invite/org/[token]/page.tsx
    - apps/web/src/lib/api/orgApi.ts
    - apps/web/src/lib/api/teamApi.ts
    - apps/web/src/lib/api/schemas/orgApi.ts
    - apps/web/src/lib/api/schemas/teamApi.ts
    - apps/web/src/lib/api/notificationsApi.ts
    - apps/web/src/lib/api/fetchWithAuth.ts
    - apps/web/src/lib/api/extractErrorMessage.ts
    - apps/web/src/components/providers/ReactQueryProvider.tsx
    - apps/web/src/app/privacy/page.tsx
    - apps/web/src/app/terms/page.tsx
    - apps/web/src/app/(seller)/publications/page.tsx
    - apps/web/src/components/onboarding/OnboardingStep3.tsx
    - apps/web/src/components/appointments/AppointmentForm.tsx
    - apps/web/tailwind.config.ts
    - apps/web/tests/unit/config/tailwind.config.test.ts
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
