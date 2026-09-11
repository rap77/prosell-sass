# Reverse Engineering Timestamp — prosell-sass

**Fecha**: 2026-09-10 (última actualización: scan enfocado del intent `260911-export-org-selector`)
**Commit analizado**: `264d99f105297456b7fe1f7fe9eecaba545b31e9` (rama `main`).
**Tipo de pase (último, el que gobierna el bloque `Scope of Analysis` final)**: **Scan enfocado**, aditivo sobre el scan enfocado del intent `260910-export-cross-org` (a su vez aditivo sobre todos los pases previos ya documentados abajo). Todas las secciones anteriores quedan preservadas íntegras debajo, marcadas `[PRESERVADO ÍNTEGRO]`.

## Motivo del pase

El intent `260911-export-org-selector` continúa cerrando el gap que el intent `260910-export-cross-org` dejó explícitamente fuera de su alcance: ese intent resolvió el permiso cross-org del **backend** (`GET /api/v1/products/export-client-format.zip` ya acepta `organization_id` y respeta `ORG_ADMIN_VIEW_ALL`/`super_admin`), pero el botón "Exportar" de `/catalog` sigue sin ningún mecanismo de **UI** para que un actor con ese permiso elija qué organización exportar — `exportCatalogClientFormat()` nunca manda `organization_id`, y no hay selector de organización en `catalog/page.tsx`. El store existente (`kind: partial`, foco modelo de permisos cross-org del backend, intent `260910-export-cross-org`) nunca había profundizado en el lado de frontend de este problema: ni en el mecanismo de selección de organización que ya existe en la app (`OrganizationPicker`/`organizationStore.viewingOrgId`), ni en por qué `catalog/page.tsx` no lo usa. Scan enfocado sobre esta área específica.

## Verificación de overwrite (codekb-scope-diff)

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco modelo de permisos cross-org del backend, intent `260910-export-cross-org`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área distinta (selector de organización de UI en frontend, no el modelo de permisos del backend en sí). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

```
NARROWER: replacing the store discards deep knowledge of:
  - apps/api/src/prosell/domain/entities/role.py
  - apps/api/src/prosell/domain/entities/user.py
  - apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py
  - apps/api/src/prosell/domain/repositories/organization_repository.py
  - apps/api/tests/integration/api/routers/test_product_router_export_client_format.py
  - aidlc/spaces/default/intents/260903-catalog-client-export/inception/user-stories/personas.md
  components: cross-org-export-permission-scope
(store intent: 260910-export-cross-org; incoming intent: 260911-export-org-selector)
```

## Developer Code Scan Results — foco selector de organización para export de catálogo (intent `260911-export-org-selector`)

### Paso 0 (graphify-first) cumplido

El developer corrió 10 queries/explain de graphify antes de cualquier lectura cruda: `exportCatalogClientFormat`, `catalog page viewingOrgId organizationStore`, `OrganizationPicker`, `organizationStore viewingOrgId`, `useAuth hook isAdmin`, `useOrganizations hook api organizations.ts`, `Permission ORG_ADMIN_VIEW_ALL enum`, `export-client-format.zip router endpoint`, `_check_org_scope_permission definition`, `TeamSwitcher.tsx`, `ExportSummaryBanner component`, `review queue organization filter selector dropdown`. Este pase de síntesis (Step 3) reconfirmó el hallazgo central vía `graphify query "OrganizationPicker organizationStore viewingOrgId"` y `graphify query "ReviewQueueTable"` antes de leer los 9 artefactos existentes.

### Scan Coverage

- **Analizado en profundidad**: `apps/web/src/app/(seller)/catalog/page.tsx` (líneas 1-70, 420-720), `apps/web/src/lib/api/products.ts` (líneas 1500-1600), `apps/web/src/components/admin/OrganizationPicker.tsx` (completo), `apps/web/src/components/admin/OrganizationPicker.test.tsx` (primeras 60 líneas), `apps/web/src/stores/organizationStore.ts` (completo), `apps/web/src/hooks/useAuth.ts` (completo), `apps/web/src/lib/auth/permissions.ts` (completo), `apps/web/src/lib/api/organizations.ts` (completo), `apps/web/src/lib/api/schemas/organizations.ts` (líneas 1-100), `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (líneas 700-799), más grep dirigido post-graphify sobre `viewingOrgId` en todo `apps/web/src`, y sobre `review-queue/page.tsx`+`ReviewQueueTable.tsx` (sin selector de org).
- **Preservado del codekb existente (`kind: partial`, no re-analizado)**: todo lo demás — backend fuera de `product_router.py`/`export_catalog_client_format.py`, resto del frontend, tests e2e, infra/docker, docs.
- **No tocado**: resto del repositorio (scan enfocado, no full rescan).

### Root cause / hallazgo principal

`organizationStore.viewingOrgId` existe con un componente selector completo, testeado y en producción (`OrganizationPicker.tsx`, renderizado en `Header.tsx`, global a toda la app) — pero está **dormido**: censo completo de `viewingOrgId` en `apps/web/src` muestra que ningún hook de datos (catálogo, review-queue) lo consume para filtrar nada; solo el propio picker lo lee/escribe. El diseño original de Subsystem D (`docs/superpowers/changes/subsystem-d-dealer-ownership/design.md:27-42`) preveía conectarlo a queries admin, pero nunca se completó más allá del picker.

Bifurcación de diseño (para Requirements/Functional Design, NO resuelta acá):

- **(a)** Cablear el export al `viewingOrgId`/`OrganizationPicker` global existente — sería su primer consumidor real.
- **(b)** Selector local independiente, acotado solo al flujo de export (ej. dentro de `ExportSummaryBanner`), sin tocar estado global del header.

También: `review-queue/page.tsx` y `ReviewQueueTable.tsx` NO tienen selector de organización propio (grep sin matches) — corrige la premisa de que "el resto de la app ya permite elegir otra organización" a nivel de UI; el único selector cross-org real hoy es `OrganizationPicker`.

Endpoints confirmados: `GET /api/v1/products/export-client-format.zip` en su forma final post-merge `264d99f1` (`organization_id: UUID | None = None`, gateado por `_check_org_scope_permission()`); `GET /api/v1/admin/organizations` (hook `useOrganizations()`), gateado server-side por `ORG_ADMIN_VIEW_ALL`, devuelve `Organization[]` (`OrganizationSchema`) — el endpoint que ya usa `OrganizationPicker` y el candidato natural a reutilizar para el nuevo selector. Distinto de `orgApi.list()` (`@/lib/api/orgApi.ts`), segunda representación de `Organization` usada para CRUD, no para "ver como".

### Deuda técnica señalada, no resuelta por este scan (fuera de alcance de reverse engineering, para Requirements Analysis / Functional Design)

- Decisión de diseño: resolver la bifurcación (a)/(b) — cablear al `viewingOrgId` global existente vs. selector local acotado al export.
- Si se elige (a): decidir si `viewingOrgId` pasa a filtrar también otras vistas admin (review-queue, etc.) como parte del mismo cambio, o si el alcance queda acotado solo al export — el diseño original de Subsystem D sugiere que el estado global fue pensado para más de un consumidor, pero eso excede el alcance verbatim de este intent.
- Precedente de test directamente reusable: `OrganizationPicker.test.tsx` (mockea `useAuth`, `useOrganizations`, `useOrganizationStore`) — patrón de referencia para el test del selector nuevo, sin importar cuál rama de la bifurcación se elija.

Ver `architecture.md` § Interaction Diagrams (diagrama 14), `code-structure.md`, `component-inventory.md`, `api-documentation.md`, `dependencies.md`, `business-overview.md` y `code-quality-assessment.md` (hallazgos #71-76) para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260910-export-cross-org`)

El intent `260910-export-cross-org` corrige una omisión de scope ya confirmada por los propios artefactos de diseño del intent `260903-catalog-client-export`: el endpoint `GET /api/v1/products/export-client-format.zip` (agregado por ese intent) resuelve `organization_id`/`tenant_id` exclusivamente del JWT del usuario (`current_user.tenant_id`), sin respetar el permiso `ORG_ADMIN_VIEW_ALL` ni el rol `super_admin` que SÍ usan otros endpoints del mismo router (`list_products`, `review-queue`, acciones de auditoría/reverse-transition) vía `_check_org_scope_permission()`. El store existente (`kind: partial`, foco export de catálogo/CSV/ZIP de imágenes del propio intent `260903-catalog-client-export`) nunca había profundizado en el modelo de permisos cross-org (`role.py`, `user.py`, `_check_org_scope_permission()`) ni en los otros patrones de acceso cross-org coexistentes en el router. Scan enfocado sobre esta área específica.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260910-export-cross-org`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco export de catálogo/CSV/ZIP de imágenes, intent `260903-catalog-client-export`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área distinta (modelo de permisos cross-org / `_check_org_scope_permission`, no el pipeline de armado de CSV/ZIP en sí). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

```
NARROWER: replacing the store discards deep knowledge of:
  - docs/canonical/F01-bulk-upload-csv-import.md
  - docs/data39.csv
  - apps/api/src/prosell/domain/entities/organization.py
  - apps/api/src/prosell/domain/services/csv_field_mapper.py
  - apps/api/src/prosell/domain/services/csv_product_parser.py
  - apps/api/src/prosell/domain/services/csv_image_mapper.py
  - apps/api/src/prosell/domain/services/csv_export.py
  - apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py
  - apps/api/src/prosell/application/ports/ido_spaces.py
  - apps/api/src/prosell/infrastructure/services/do_spaces_service.py
  - apps/web/src/lib/api/products.ts
  - apps/web/src/app/(seller)/catalog/page.tsx
  - apps/web/src/app/api/v1/products/[...path]/route.ts
  - apps/api/pyproject.toml
  components: catalog-client-csv-export, vehicle-image-zip-export
(store intent: 260903-catalog-client-export; incoming intent: 260910-export-cross-org)
```

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco permiso cross-org del endpoint de export (intent `260910-export-cross-org`)

### Scan Coverage

- **Analizado en profundidad**:
  - `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — lectura completa de L1-60 (imports/setup), L160-162 (`CurrentUser`/`DbSession`/`SpacesService`), L255-330 (`_check_org_scope_permission`, `_require_marketplace_publish`, `_require_super_admin`), L426-485 (`create_product` — precedente de org-override con validación de existencia), L700-782 (`/export.csv` cola + `/export-client-format.zip` completo), L782-880 (`list_products`, `effective_tenant`), L960-1030 (`get_category_filter_values`, `get_featured_products`), L1036-1120 (`get_product`, `get_product_image_urls` — patrón `is_org_admin` de lectura single-resource)
  - `apps/api/src/prosell/domain/entities/role.py` — `RoleType`, `Permission`, `ROLE_PERMISSIONS` (L1-110)
  - `apps/api/src/prosell/domain/entities/user.py` — `has_role()`, `has_permission()` (L247-274)
  - `apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py` — firma de `__init__`/`execute` (L67-107)
  - `apps/api/src/prosell/domain/repositories/organization_repository.py` — firma de `get_by_tenant_id()` (L40-48)
  - `apps/api/tests/integration/api/routers/test_product_router_export_client_format.py` — archivo completo (las 3 clases de test)
  - `aidlc/spaces/default/intents/260903-catalog-client-export/inception/user-stories/personas.md` — archivo completo (confirma la premisa del intent: exclusión explícita de `super_admin` del flujo de export en el diseño original)
- **Skimmed only**: inventario `rg` de todos los endpoints de `product_router.py` (batch approve/reject/reserve/pause/resume/sold, submit, single-resource approve/reject/publish/pause/resume/reserve/mark-sold) para mapear qué patrón de acceso cross-org usa cada uno — números de línea capturados, cuerpos no leídos.
- **No tocado**: frontend (`apps/web`), otros routers, internals de `Organization` más allá de `tenant_id`/`code` ya conocidos de pases previos, tests unitarios de `role.py`/`user.py`.

### Root cause / hallazgo principal

Confirma la premisa exacta del intent: `GET /api/v1/products/export-client-format.zip` (`product_router.py:735-779`) resuelve `organization_id` exclusivamente de `current_user.tenant_id` (L752-764) y no acepta ningún parámetro de request que permita apuntar a otra organización — su docstring (L747-750) afirma esta restricción como diseño intencional, citando `BR1.2`/`NFR1` del intent `260903-catalog-client-export`. `personas.md` de ese mismo intent confirma textualmente que la exclusión de `super_admin` del flujo de export fue alcance de diseño explícito ("no hay interacción de... super admin en el flujo de export"), no una omisión de implementación — reencuadra la premisa del intent `260910-export-cross-org` con precisión: es una decisión de scope a **revisar y ampliar**, no un bug de código a "corregir" en el sentido de una regresión accidental.

En paralelo, `list_products`, `get_category_filter_values` y `get_featured_products` SÍ honran `organization_id`+`ORG_ADMIN_VIEW_ALL` vía el patrón idéntico:

```python
owner_tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)
tenant_id = organization_id if organization_id is not None and can_view_all_orgs else owner_tenant_id
```

El scan detecta además **tres patrones de acceso cross-org coexistiendo sin unificar** en el mismo router: (1) `_check_org_scope_permission()` + parámetro `organization_id` (estilo listado: `list_products`, `get_category_filter_values`, `get_featured_products`); (2) `is_org_admin` standalone inline (lecturas de recurso único: `get_product`, `get_product_image_urls`; y `create_product`, que además valida la existencia del org-override vía `org_repo.get_by_tenant_id()` como defensa IDOR); (3) `has_role("super_admin")` literal, que **bypassea el permiso `ORG_ADMIN_VIEW_ALL` por completo** (acciones batch). El fix de este intent debe elegir explícitamente cuál patrón replicar para el endpoint de export — no copiar ciegamente el primero que aparezca.

**Hallazgo crítico de test**: `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` (en `test_product_router_export_client_format.py`) autentica su caller con `RoleType.SUPER_ADMIN` hardcodeado y asertaa que el producto de la organización B es invisible para el `super_admin` que llama desde la organización A — la suite de integración ACTUAL codifica el bug reportado como comportamiento correcto/esperado. Un fix de este intent necesita revisar explícitamente este test. `_check_org_scope_permission()` no tiene test directo/unitario propio — su rama `403` solo se ejercita implícitamente a través de los endpoints que la usan.

### Deuda técnica señalada, no resuelta por este scan (fuera de alcance de reverse engineering, para Requirements Analysis / Functional Design)

- Decisión de diseño: cuál de los tres patrones de cross-org access coexistentes replicar en el endpoint de export (el más cercano en semántica es el patrón (1), usado por `list_products` — mismo tipo de operación de lectura filtrable por `organization_id` — pero la decisión final no le corresponde a este scan).
- Decisión de diseño: si agregar validación de existencia de organización (como hace `create_product` vía `org_repo.get_by_tenant_id()`) al resolver un `organization_id` provisto por el caller en el endpoint de export, dado que `_check_org_scope_permission()` hoy no la tiene — gap ya documentado en `dependencies.md`/`code-quality-assessment.md` del pase `260903-catalog-client-export`.
- `ExportCatalogClientFormatUseCase.execute()` solo recibe `tenant_id: UUID` — no requiere cambio de firma; la lógica de resolución de organización (incluyendo el chequeo de permiso) pertenece al router, siguiendo la convención ya vigente en `list_products`/`create_product`.
- Actualizar el docstring del endpoint (L747-750), que hoy afirma la restricción single-tenant como diseño intencional — un fix de scope debe revertir esa afirmación.
- Revisar `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` para reflejar el comportamiento correcto tras el fix (hoy asertaa exactamente el comportamiento que el intent pide cambiar).

Ver `architecture.md`, `code-structure.md`, `component-inventory.md`, `api-documentation.md`, `code-quality-assessment.md` y `dependencies.md` para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260903-catalog-client-export`)

El intent `260903-catalog-client-export` implementa la exportación del catálogo en el mismo formato CSV (24 columnas) que el cliente usa para importar vehículos, más un ZIP con las imágenes de cada vehículo organizadas por carpeta. El store existente cubría a profundidad la migración de sintaxis Zod (intent `260828-zod-3-to-4-migration`), pero nunca había profundizado en el pipeline de export de catálogo (`csv_export.py`), en el import cliente equivalente (`csv_field_mapper.py`/`csv_product_parser.py`/`csv_image_mapper.py`), ni en el puerto de storage (`ido_spaces.py`/`do_spaces_service.py`). El usuario eligió explícitamente **scan enfocado** sobre rescan completo.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260903-catalog-client-export`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco migración de sintaxis Zod, intent `260828-zod-3-to-4-migration`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (export de catálogo/CSV/ZIP de imágenes, no esquemas Zod). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

```
NARROWER: replacing the store discards deep knowledge of:
  - AGENTS.md
  - apps/web/package.json
  - apps/web/src/lib/api/schemas/
  - apps/web/src/lib/api/verticals.ts
  - apps/web/src/lib/api/extractErrorMessage.ts
  - apps/web/src/lib/api/schemas/leads.ts
  - apps/web/src/lib/api/schemas/appointments.ts
  - apps/web/src/components/forms/MemberForm.tsx
  - apps/web/src/components/forms/UnifiedProductForm.tsx
  - .gga
  components: zod-3-to-4-migration, passthrough-call-sites, nativeEnum-call-sites, AGENTS.md-zod-exception-section
(store intent: 260828-zod-3-to-4-migration; incoming intent: 260903-catalog-client-export)
```

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco export de catálogo formato cliente + ZIP de imágenes (intent `260903-catalog-client-export`)

### Paso 0 (graphify-first) cumplido

Grafo fresco (`graphify-out/graph.json` generado 07:25:35, posterior al HEAD commit 07:24:51). Se usó `graphify query` para orientarse en bulk-upload/CSV/organización/imágenes antes de leer cualquier archivo crudo. Lectura directa reservada a contenido literal no indexado en detalle por graphify (`docs/canonical/F01-bulk-upload-csv-import.md`, `docs/data39.csv`) y a los archivos de código que el propio graphify señaló como núcleo del área.

### Scan Coverage

- **Analizado en profundidad**: `docs/canonical/F01-bulk-upload-csv-import.md` (completo), `docs/data39.csv` (header + parseo real con `csv.DictReader`, 564 filas, muestreo de contenido), `apps/api/src/prosell/domain/entities/organization.py`, `apps/api/src/prosell/domain/services/csv_field_mapper.py`, `apps/api/src/prosell/domain/services/csv_product_parser.py`, `apps/api/src/prosell/domain/services/csv_image_mapper.py`, `apps/api/src/prosell/domain/services/csv_export.py`, `apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`, `apps/api/src/prosell/application/ports/ido_spaces.py`, `apps/api/src/prosell/infrastructure/services/do_spaces_service.py` (parcial — constructor/config), `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (líneas 620-750: `export.csv` + `list_products`), `apps/web/src/lib/api/products.ts` (líneas 1480-1560: `downloadSchemaTemplate`, `exportCatalogCsv`), `apps/web/src/app/(seller)/catalog/page.tsx` (líneas 360-400: `handleExportCsv`), `apps/web/src/app/api/v1/products/[...path]/route.ts` (proxy BFF completo), `apps/api/pyproject.toml` (dependencias completas), `aidlc/spaces/default/intents/260826-prod-bugfixes-batch/inception/requirements-analysis/requirements.md` (sección FR8 — FEAT-1, spec previa del export genérico).
- **Skimmed only** (ubicados vía graphify, no leídos en profundidad — quedan `kind: partial` en el codekb): `apps/api/src/prosell/domain/entities/product.py` (grep de campos `image_urls`/`cover_image_key`), `apps/api/src/prosell/application/dto/product/attributes.py`, `apps/api/src/prosell/application/dto/product/response.py`, `apps/web/src/components/admin/BulkImportClientCSV.tsx`, `apps/web/src/components/upload/BulkUploadCSV.tsx`, `apps/web/src/lib/api/bulkImportClient.ts`, `apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py`, `image_router.py`, `org_router.py`, `docs/superpowers/specs/2026-06-09-storage-optimization-design.md`. Tests localizados pero no leídos completos: `test_bulk_upload_vehicles.py`, `test_csv_field_mapper.py`, `test_csv_image_mapper.py` (duplicado aparente en `tests/unit/services/` y `tests/unit/domain/services/`), `test_csv_export.py`, `BulkImportClientCSV.test.tsx`, `bulkUpload.test.tsx`.
- **No tocado**: resto del repositorio (scan enfocado, no full rescan) — auth, Zod schemas, batch review, seed data, Tailwind y el resto de la arquitectura backend/frontend siguen vigentes tal cual del store previo, sin re-verificar en este pase.

### Root cause / hallazgo principal

Ver `code-quality-assessment.md` § "Hallazgos del scan enfocado `260903-catalog-client-export`" (#57-65) para el detalle completo: el export de catálogo existente (`GET /api/v1/products/export.csv`, FEAT-1) usa un formato de columnas genérico, no las 24 columnas del formato cliente (`docs/data39.csv`) — se necesita un pipeline de export distinto, decisión de diseño pendiente; `build_image_folder_name()` (`csv_export.py`) tiene un bug confirmado de mapeo de campo (`attrs.get("color")` en vez de `attributes["exterior_color"]`); `IDOSpacesService` carece de un método de descarga de bytes, necesario para el ZIP de imágenes; y hay una discrepancia real entre `docs/canonical/F01-bulk-upload-csv-import.md` y los datos reales sobre el uso de las columnas `option`/`description`.

### Deuda técnica señalada, no resuelta por este scan (fuera de alcance de reverse engineering, para Requirements Analysis / Code Generation)

- Decisión de diseño: extender `GET /api/v1/products/export.csv` con un parámetro de formato, o crear un endpoint nuevo dedicado al formato cliente + ZIP.
- Decisión de diseño: agregar un método de descarga a `IDOSpacesService`, o consumir `image_urls` públicas vía `httpx` para armar el ZIP.
- Confirmar con el usuario si "23 columnas" (descripción verbatim del intent) excluye la columna `id` de las 24 reales de `docs/data39.csv`.
- Verificar si `setProductCover.test.ts`/`test_csv_image_mapper.py` duplicado entran en el alcance de Build and Test de este intent.

Ver `architecture.md`, `code-structure.md`, `component-inventory.md`, `technology-stack.md`, `dependencies.md` y `code-quality-assessment.md` para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260828-zod-3-to-4-migration`)

El intent `260828-zod-3-to-4-migration` migra `apps/web` de sintaxis Zod 3 (`.passthrough()`, `z.nativeEnum()`) a sintaxis nativa Zod 4 (`z.looseObject()`, `z.enum()` sobre TS enums), audita el estado real del issue GitHub #74, y actualiza `AGENTS.md` en consecuencia. El store existente cubría a profundidad el contrato de wire de `teamApi`/`team_router` (intent `260902-teamapi-create-param`), pero nunca había profundizado en el área de esquemas Zod (`apps/web/src/lib/api/schemas/`) ni en el estado real de #74. El usuario eligió explícitamente **scan enfocado** sobre rescan completo.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260828-zod-3-to-4-migration`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco contrato de wire `teamApi`/`team_router`, intent `260902-teamapi-create-param`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (sintaxis de validación Zod en `lib/api/schemas/`, no el contrato de creación de equipo). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

```
NARROWER: replacing the store discards deep knowledge of:
  - apps/web/src/lib/api/teamApi.ts
  - apps/web/src/stores/teamStore.ts
  - apps/web/src/components/forms/TeamForm.tsx
  - apps/web/src/app/api/v1/teams/route.ts
  - apps/web/src/app/api/v1/teams/[id]/route.ts
  - apps/web/src/app/api/v1/teams/org/[orgId]/route.ts
  - apps/web/next.config.ts
  - apps/api/src/prosell/infrastructure/api/routers/team_router.py
  - apps/api/src/prosell/application/dto/team/create.py
  - apps/api/src/prosell/application/dto/team/response.py
  - apps/api/tests/contract/schema_matching/test_team_dto_schemas.py
  components: teamApi.create, teamApi.update, teamApi.listByOrg, teamApi.getById, teamApi.addMember, teamApi.acceptInvitation, CreateTeamRequest, TeamResponse
(store intent: 260902-teamapi-create-param; incoming intent: 260828-zod-3-to-4-migration)
```

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco migración Zod 3→4, auditoría issue #74, corrección `AGENTS.md` (intent `260828-zod-3-to-4-migration`)

### Scan Coverage

- **Analizado en profundidad**: `AGENTS.md` (líneas 100-169, sección completa de excepción legacy Zod + contexto GGA circundante), `apps/web/package.json` (bloque de dependencias), `apps/web/src/lib/api/schemas/` — los 17 archivos (vía scan de contenido completo con `rg`), `apps/web/src/lib/api/*.ts` (escaneado por ocurrencias de `.passthrough()`/`z.nativeEnum()`/`z.enum()`/`z.looseObject()`; `verticals.ts`, `products.ts`, `extractErrorMessage.ts` leídos en profundidad específicamente), `apps/web/src/lib/api/schemas/leads.ts` (leído completo — el archivo más rico, ambos patrones presentes), `apps/web/src/lib/api/schemas/appointments.ts` (líneas 1-45), `apps/web/src/lib/api/extractErrorMessage.ts` (leído completo — el archivo de migración parcial previamente revertida), `apps/web/src/components/forms/MemberForm.tsx` (líneas 80-160, los comentarios de código del "issue #74"), `apps/web/src/components/forms/UnifiedProductForm.tsx` (líneas 470-490 y la definición de `FIXED_FIELDS_SCHEMA` en línea 99 — outlier estructural de `.passthrough()` en el use-site), historial git completo (con timestamps) de cada commit relacionado a Zod desde 2026-06-30 hasta 2026-09-01, más `git show` sobre los dos commits decisivos (`d1af1858`, `ad74ac33`), **GitHub issue #74** (obtenido en vivo vía `gh issue view 74 --json ...`: body, comentarios, state, closedAt, labels), `.gga` (config, confirma `STRICT_MODE=true`), documentos existentes del codekb (`code-quality-assessment.md`, `dependencies.md`, `project.md`) para reconciliar contra la estimación previa.
- **Solo relevado (skimmed)**: resto de `apps/web` (components, app router pages, hooks, stores, tests) más allá de los archivos específicos arriba — solo grep-matched para los cuatro patrones objetivo. Backend (`apps/api`) intocado — fuera de alcance, este intent es exclusivo de `apps/web`.

### Root cause / hallazgo principal

Ver `code-quality-assessment.md` § "Hallazgos del scan enfocado `260828-zod-3-to-4-migration`" (#50-56) para el detalle completo: issue #74 CERRADO desde 2026-07-20 con alcance propio que nunca cubrió `.passthrough()`/`z.nativeEnum()`; recuento exacto de 36 call sites de `.passthrough()` en 14 archivos y 4 de `z.nativeEnum()` en 2 archivos (corrige la estimación previa de "~41/11"); `AGENTS.md` necesita corrección más allá de actualizar la fecha del issue, porque su frase de cierre ya bloqueó GGA sobre una migración parcial anterior; `UnifiedProductForm.tsx:483` es un outlier estructural que requiere decisión explícita de diseño.

### Deuda técnica señalada, no resuelta por este scan (fuera de alcance de reverse engineering, para Requirements Analysis / Code Generation)

- Decisión de diseño para `UnifiedProductForm.tsx` (definición compartida de `FIXED_FIELDS_SCHEMA` vs. use-site aislado en línea 483).
- Alcance exacto de la corrección de `AGENTS.md` (¿eliminar la sección completa, o acotarla explícitamente a los patrones que #74 sí cubrió?).
- `apps/web/src/lib/zod-resolver.ts` (código muerto) y `apps/web/src/app/(seller)/settings/profile/page.tsx:28` (residuo de #74) — señalados como aside, no pedidos por este intent.

Ver `architecture.md`, `code-structure.md`, `technology-stack.md`, `dependencies.md` y `code-quality-assessment.md` para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260902-teamapi-create-param`)

El intent `260902-teamapi-create-param` corrige el mismatch de nombre de parámetro entre `teamApi.create()` (frontend, envía `organization_id`) y `CreateTeamRequest` (backend, espera `org_id`) al crear un equipo. El store existente cubría el área `orgApi`/`teamApi` a profundidad de superficie de método (intent `260828-useeffect-to-react-query`, foco onboarding/invite), pero nunca había profundizado en el contrato de wire exacto de `teamApi.create()`/`teamApi.update()` contra los DTOs Pydantic del backend, ni en la capa de rutas BFF de `teams` (mocks vs. proxy real), ni en `next.config.ts`. El usuario eligió explícitamente **scan enfocado** sobre rescan completo.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260902-teamapi-create-param`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco tests unitarios `products.ts`/transiciones de estado, intent `260901-frontend-test-debt`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (contrato `teamApi`/`team_router` de creación de equipo, no `products.ts`). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco mismatch de parámetro `teamApi.create` (intent `260902-teamapi-create-param`)

### Scan Coverage

- **Analizado en profundidad**: `apps/web/src/lib/api/teamApi.ts` (archivo completo — 6 métodos + hooks), `apps/web/src/lib/api/schemas/teamApi.ts` (archivo completo — esquemas Zod), `apps/web/src/stores/teamStore.ts` (acciones `createTeam`, `fetchTeamsByOrg`, `updateTeam`), `apps/web/src/components/forms/TeamForm.tsx` (call site de `onSubmit`, líneas 139-170), `apps/web/src/hooks/useTeams.test.ts` (test existente de `createTeam`, líneas 111-124), `apps/web/tests/components/forms/TeamForm.test.tsx` (grep dirigido de uso de `organization_id`/`org_id`), `apps/web/src/app/api/v1/teams/route.ts` (capa BFF de `POST /api/v1/teams`), `apps/web/src/app/api/v1/teams/[id]/route.ts` (capa BFF de `GET /api/v1/teams/{id}`), `apps/web/src/app/api/v1/teams/org/[orgId]/route.ts` (capa BFF de `GET /api/v1/teams/org/{orgId}`), `apps/web/next.config.ts` (config de rewrites, modo `fallback`), `apps/api/src/prosell/infrastructure/api/routers/team_router.py` (archivo completo — 6 endpoints), `apps/api/src/prosell/application/dto/team/create.py` (archivo completo — `CreateTeamRequest`, `AddTeamMemberRequest`), `apps/api/src/prosell/application/dto/team/response.py` (archivo completo — `TeamResponse`, `TeamMemberResponse`, `TeamListResponse`), `apps/api/tests/contract/schema_matching/test_team_dto_schemas.py` (archivo completo — tests de contrato), `.skills/contract-testing/SKILL.md`.
- **Skimmed only**: `apps/api/src/prosell/application/use_cases/organization/` y `.../org/` (creación de organización, NO de equipo — fuera del camino real de este scan), `apps/api/src/prosell/infrastructure/api/routers/org_router.py`, `apps/api/tests/integration/api/test_team_invitation_api.py`, `test_team_repository.py`, `test_team_use_cases.py`, `test_team_entity.py` (encontrados vía `fd`, no abiertos).
- **No tocado**: resto del repositorio (scan enfocado, no full rescan) — el store previo sobre `products.ts`, onboarding/invite, auth, batch review, bulk upload, appointments, fb-sync, Tailwind y el resto de la arquitectura backend/frontend sigue vigente tal cual, sin re-verificar en este pase.

### Root cause (doble mismatch, simétrico, confirmado por lectura directa de ambos lados del contrato)

**Lado request**: `apps/web/src/lib/api/teamApi.ts:40` envía `CreateTeamRequest.organization_id: string`, serializado vía `JSON.stringify(data)` en `teamApi.ts:139` hacia `POST /api/v1/teams`. El DTO backend `apps/api/src/prosell/application/dto/team/create.py:12` espera `CreateTeamRequest.org_id: UUID` (requerido, sin alias) — si esta petición llegara alguna vez al backend real, sería un `422`. Caller: `apps/web/src/components/forms/TeamForm.tsx:149-152` construye `{ name: data.name, organization_id: organizationId }`, pasado sin cambios a través de `teamStore.ts:158-162`.

**Lado response (simétrico, hallazgo adicional no nombrado en el texto original del intent)**: `apps/api/src/prosell/application/dto/team/response.py:44` → `TeamResponse.org_id: UUID`. Frontend `apps/web/src/lib/api/schemas/teamApi.ts:31` → `TeamSchema.organization_id: z.string()` (requerido, sin `.optional()`; `.passthrough()` solo tolera campos extra, no relaja uno requerido que falta). Si una respuesta real del backend llegara a `handleResponse()`, `TeamSchema.parse()` lanzaría un `ZodError`.

**Por qué nunca se manifestó como bug visible**: `apps/web/next.config.ts:82-102` configura el rewrite `/api/:path*` → backend como tipo `fallback`, por lo que las rutas de archivo de Next.js siempre ganan. `apps/web/src/app/api/v1/teams/route.ts` es una "Mock API Route" declarada (comentario en línea 2) que implementa `POST /api/v1/teams` enteramente en memoria (`global.__mockTeams`), usando `organization_id` consistentemente tanto al escribir como al leer — nunca contradice al frontend y nunca toca el backend/DB/`team_router.py` real. Igual para `GET /api/v1/teams/org/{orgId}` y `GET /api/v1/teams/{id}` (que además solo implementa GET, no PATCH — `teamApi.update()` probablemente devuelve 405 hoy, defecto relacionado pero separado). `teamApi.addMember` y `teamApi.acceptInvitation` no tienen archivo mock y SÍ llegan al backend real.

Arreglar solo el nombre de campo de `teamApi.ts` tendría efecto observable CERO mientras exista el route file mock — `POST /api/v1/teams` nunca sale del proceso Next.js hoy.

`apps/api/tests/contract/schema_matching/` es contract testing solo de nombre para este par de DTOs: valida el modelo Pydantic contra sí mismo, nunca lee `teamApi.ts`, por lo que estructuralmente no puede atrapar este tipo de bug. `.skills/contract-testing/SKILL.md` del proyecto describe una "Layer 3: Schema Matching (DTO ↔ TypeScript Drift Detection)" diseñada exactamente para esta clase de bug, pero no existe tal test de Layer 3 para `team`.

### Hallazgo por archivo

- **`apps/web/src/lib/api/teamApi.ts`** — 6 métodos: `create`, `listByOrg`, `getById`, `update`, `addMember`, `acceptInvitation`. `create()` (línea 40) construye el body con `organization_id`; serialización en línea 139.
- **`apps/api/src/prosell/application/dto/team/create.py`** — `CreateTeamRequest.org_id: UUID` (línea 12, requerido, sin alias); `AddTeamMemberRequest` en el mismo archivo, fuera del camino de este bug.
- **`apps/api/src/prosell/application/dto/team/response.py`** — `TeamResponse.org_id: UUID` (línea 44); `TeamMemberResponse`, `TeamListResponse` en el mismo archivo.
- **`apps/web/src/lib/api/schemas/teamApi.ts`** — `TeamSchema.organization_id: z.string()` (línea 31, requerido, sin `.optional()`/`.nullable()`).
- **`apps/web/src/app/api/v1/teams/route.ts`** — mock in-memory (`global.__mockTeams`), auto-consistente en `organization_id`, nunca reenvía al backend real.
- **`apps/web/src/app/api/v1/teams/[id]/route.ts`** — mock, solo exporta `GET` (sin `PATCH`).
- **`apps/web/src/app/api/v1/teams/org/[orgId]/route.ts`** — mock, `GET` únicamente.
- **`apps/web/next.config.ts:82-102`** — rewrite `fallback` que explica por qué los archivos de ruta de Next.js (los mocks) siempre ganan sobre el proxy real hacia FastAPI.
- **`apps/api/src/prosell/infrastructure/api/routers/team_router.py`** — 6 endpoints reales: `POST ""`, `GET "/org/{org_id}"`, `GET "/{team_id}"`, `PATCH "/{team_id}"`, `POST "/{team_id}/members"`, `POST "/{team_id}/invite"`, `POST "/accept-invitation"` — nunca alcanzados por `create`/`listByOrg`/`getById` mientras el mock exista, sí alcanzados por `addMember`/`acceptInvitation`.
- **`apps/api/tests/contract/schema_matching/test_team_dto_schemas.py`** — instancia `CreateTeamRequest`/`TeamResponse` en aislamiento; no lee ni conoce `teamApi.ts` — no puede detectar este bug por diseño.
- **`apps/web/src/hooks/useTeams.test.ts:111-124`** — test existente de `createTeam` mockea la acción del store directamente, sin aserción sobre los nombres de campo del payload de wire.
- **`apps/web/tests/components/forms/TeamForm.test.tsx`** — grep dirigido confirma que tampoco asertaba nombres de campo del payload.

### Deuda técnica señalada, no resuelta por este scan (fuera de alcance de reverse engineering, para Requirements Analysis / Code Generation)

- `teamApi.update()` probablemente 405 en producción real (el mock de `[id]/route.ts` solo exporta `GET`) — defecto relacionado pero distinto del mismatch de parámetro, no nombrado en la descripción verbatim del intent.
- Ausencia de un test de Layer 3 (schema-matching DTO↔TypeScript) para `team`, pese a que `.skills/contract-testing/SKILL.md` ya describe el patrón — mismo gap estructural que permitió que este bug pasara desapercibido.

Ver `api-documentation.md`, `architecture.md` § Interaction Diagrams (nuevo diagrama 11), `component-inventory.md`, `code-structure.md` y `code-quality-assessment.md` (hallazgos #45-46) para el detalle completo de este pase, mergeado con el conocimiento preservado de los pases anteriores.

## [PRESERVADO ÍNTEGRO] Motivo del pase anterior (scan enfocado `260901-frontend-test-debt`)

El intent `260901-frontend-test-debt` repara la deuda de tests unitarios frontend pre-existente ya catalogada en `project.md` desde el intent `260826-prod-bugfixes-batch` ("Hay 13 tests frontend pre-existentes fallando en el baseline de main... mock sin el campo `published_to_marketplace` que el schema real ya requiere"): `apps/web/tests/unit/api/products.test.tsx` (7 de 12 fallando) y `apps/web/tests/unit/lib/api/reverseTransitions.test.tsx` (4 de 9 fallando). El store existente estaba `STALE` para esta área — las rutas relevantes ya habían cambiado desde el último scan (`260828-useeffect-to-react-query`, foco onboarding/invite) y nunca se había profundizado en `apps/web/src/lib/api/products.ts` ni en los dos archivos de test objetivo. El usuario eligió explícitamente **scan enfocado** sobre rescan completo.

## [PRESERVADO ÍNTEGRO] Verificación de overwrite (codekb-scope-diff) — pase `260901-frontend-test-debt`

Antes de escribir este documento se ejecutó `codekb-scope-diff --compare` contra un borrador de este scope, comparado contra el store existente (`kind: partial`, foco onboarding/invite/migración React Query, intent `260828-useeffect-to-react-query`). Veredicto: **NARROWER** — resultado mecánico esperado de un scan enfocado en un área completamente distinta (tests unitarios de `products.ts`/transiciones de estado, no onboarding/invite). El conocimiento sustantivo del store anterior no se pierde: se preserva íntegro en este mismo documento y en los otros 8 artefactos, mergeado con los hallazgos nuevos.

## [PRESERVADO ÍNTEGRO] Developer Code Scan Results — foco tests unitarios `products.test.tsx` / `reverseTransitions.test.tsx` (intent `260901-frontend-test-debt`)

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

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 260911-export-org-selector
fingerprint: 6289213e15392af9fbdd8acb2dcb5bc85e32ef45
analyzed:
  paths:
    - apps/web/src/app/(seller)/catalog/page.tsx
    - apps/web/src/lib/api/products.ts
    - apps/web/src/components/admin/OrganizationPicker.tsx
    - apps/web/src/components/admin/OrganizationPicker.test.tsx
    - apps/web/src/stores/organizationStore.ts
    - apps/web/src/hooks/useAuth.ts
    - apps/web/src/lib/auth/permissions.ts
    - apps/web/src/lib/api/organizations.ts
    - apps/web/src/lib/api/schemas/organizations.ts
    - apps/api/src/prosell/infrastructure/api/routers/product_router.py
    - apps/web/src/app/(admin)/admin/review-queue/page.tsx
    - apps/web/src/components/review/ReviewQueueTable.tsx
    - docs/superpowers/changes/subsystem-d-dealer-ownership/design.md
  components:
    - org-selector-catalog-export-wiring
shallow:
  paths:
    - apps/api/src/prosell/domain/entities/role.py
    - apps/api/src/prosell/domain/entities/user.py
    - apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py
    - apps/api/src/prosell/domain/repositories/organization_repository.py
    - apps/api/tests/integration/api/routers/test_product_router_export_client_format.py
    - aidlc/spaces/default/intents/260903-catalog-client-export/inception/user-stories/personas.md
    - apps/api/tests/unit/application/use_cases/product/test_export_catalog_client_format.py
    - docs/canonical/F01-bulk-upload-csv-import.md
    - docs/data39.csv
    - apps/api/src/prosell/domain/entities/organization.py
    - apps/api/src/prosell/domain/services/csv_field_mapper.py
    - apps/api/src/prosell/domain/services/csv_product_parser.py
    - apps/api/src/prosell/domain/services/csv_image_mapper.py
    - apps/api/src/prosell/domain/services/csv_export.py
    - apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py
    - apps/api/src/prosell/application/ports/ido_spaces.py
    - apps/api/src/prosell/infrastructure/services/do_spaces_service.py
    - apps/api/pyproject.toml
    - apps/web/src/app/api/v1/products/[...path]/route.ts
    - AGENTS.md
    - apps/web/src/lib/api/schemas/
    - apps/web/src/lib/api/verticals.ts
    - apps/web/src/lib/api/extractErrorMessage.ts
    - apps/web/src/lib/api/schemas/leads.ts
    - apps/web/src/lib/api/schemas/appointments.ts
    - apps/web/src/components/forms/MemberForm.tsx
    - apps/web/src/components/forms/UnifiedProductForm.tsx
    - .gga
    - apps/web/package.json
    - apps/web (resto, grep-matched solamente para .passthrough()/z.nativeEnum()/z.enum()/z.looseObject())
    - apps/api (cobertura parcial acumulada de pases previos — ver analyzed.paths de este bloque para lo nuevo de este pase)
    - apps/web/src/lib/api/teamApi.ts
    - apps/web/src/lib/api/schemas/teamApi.ts
    - apps/web/src/stores/teamStore.ts
    - apps/web/src/components/forms/TeamForm.tsx
    - apps/web/src/app/api/v1/teams/route.ts
    - apps/web/src/app/api/v1/teams/[id]/route.ts
    - apps/web/src/app/api/v1/teams/org/[orgId]/route.ts
    - apps/web/next.config.ts
    - apps/api/src/prosell/infrastructure/api/routers/team_router.py
    - apps/api/src/prosell/application/dto/team/create.py
    - apps/api/src/prosell/application/dto/team/response.py
    - apps/api/tests/contract/schema_matching/test_team_dto_schemas.py
    - apps/web/src/hooks/useTeams.test.ts
    - apps/web/tests/components/forms/TeamForm.test.tsx
    - .skills/contract-testing/SKILL.md
    - apps/api/src/prosell/application/use_cases/organization/
    - apps/api/src/prosell/application/use_cases/org/
    - apps/api/src/prosell/infrastructure/api/routers/org_router.py
    - apps/api/tests/integration/api/test_team_invitation_api.py
    - apps/api/tests/integration/api/test_team_repository.py
    - apps/api/tests/integration/api/test_team_use_cases.py
    - apps/api/tests/integration/api/test_team_entity.py
    - apps/web/tests/unit/api/products.test.tsx
    - apps/web/tests/unit/lib/api/reverseTransitions.test.tsx
    - apps/api/src/prosell/domain/entities/product.py
    - apps/api/src/prosell/infrastructure/models/product_model.py
    - apps/web/src/components/admin/AvailableTransitions.tsx
    - apps/web/src/components/catalog/CatalogDetailView.tsx
    - apps/web/tests/unit/components/upload/setProductCover.test.ts
    - apps/web/tests/unit/lib/api/products.test.ts
    - apps/web/vitest.config.ts
    - .github/workflows/ci.yml
    - apps/web/src/stores/authStore.ts
    - apps/web/src/lib/auth/deriveRole.ts
    - apps/web/src/lib/api/leads.ts
    - apps/web/src/app/onboarding/page.tsx
    - apps/web/src/app/invite/[token]/page.tsx
    - apps/web/src/app/invite/org/[token]/page.tsx
    - apps/web/src/lib/api/orgApi.ts
    - apps/web/src/lib/api/schemas/orgApi.ts
    - apps/web/src/lib/api/notificationsApi.ts
    - apps/web/src/lib/api/fetchWithAuth.ts
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
    - apps/api/src/prosell/application/use_cases/product/bulk_upload_preview.py
    - apps/api/src/prosell/infrastructure/models/organization_model.py
    - apps/api/tests/integration/api/test_appointment_api.py
    - apps/api/src/prosell/infrastructure/api/routers/appointment_router.py
    - apps/api/src/prosell/infrastructure/api/main.py
    - apps/api/tests/integration/api/routers/test_fb_sync_router.py
    - apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py
    - apps/api/src/prosell/infrastructure/models/fb_unpublish_request_model.py
    - apps/api/src/prosell/infrastructure/models/
    - apps/web/src/components/
    - apps/api/tests/
    - apps/web/tests/
    - tests/e2e/specs/
    - docker/
    - apps/api/scripts/
    - apps/api/src/prosell/application/dto/appointment/
    - apps/api/src/prosell/infrastructure/repositories/appointment_repository_impl.py
    - apps/api/src/prosell/application/dto/product/attributes.py
    - apps/api/src/prosell/application/dto/product/response.py
    - apps/web/src/components/admin/BulkImportClientCSV.tsx
    - apps/web/src/components/upload/BulkUploadCSV.tsx
    - apps/web/src/lib/api/bulkImportClient.ts
    - apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py
    - apps/api/src/prosell/infrastructure/api/routers/image_router.py
    - docs/superpowers/specs/2026-06-09-storage-optimization-design.md
    - apps/api/tests/unit/services/
    - apps/api/tests/unit/domain/services/
    - apps/api/tests/unit/application/use_cases/product/
    - apps/web/tests/unit/components/admin/
    - aidlc/spaces/default/intents/260826-prod-bugfixes-batch/inception/requirements-analysis/requirements.md
blocked:
  paths:
    - apps/api/tests/integration/api/test_fb_credential_migration_router.py
    - apps/api/src/prosell/infrastructure/api/routers/fb_credential_migration_router.py
  reason: ".claude/settings.local.json deny rule blocks Read/Bash on any path matching '*credential*' — local permissions limit, not a bug"
```
