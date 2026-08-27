# Code Generation Plan — Batch de bugfixes de producción

Unidad: zero-Unit (scope `express` sin units-generation). Se implementa todo el batch en una sola iteración, siguiendo el orden de prioridad explícito del intent: BUG-3/6 → BUG-1/2 → BUG-4/5 → BUG-7 → FEAT-1.

Fuentes: `aidlc/spaces/default/intents/260826-prod-bugfixes-batch/inception/requirements-analysis/requirements.md` (FR1-FR8, NFR1-NFR3) + codekb `aidlc/spaces/default/codekb/prosell-sass/` (architecture.md, code-structure.md, business-overview.md).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:f1c5ff913eeb340ca4cc907371fe41463fa020ccc73eba0af5543c93b435fb3f",
  "contract_sha256": "sha256:d04120c3c4a1e751020f82be7855855776bc494591d88beb206ed64156683fe5"
}
```

## Plan

### Step 0: Verificar el test runner existente

- [x] Confirmar comandos runnables: `cd apps/api && uv run pytest` (backend), `cd apps/web && pnpm test` (frontend). No requiere bootstrap — el runner ya existe en el repo brownfield. Registrado en `unit-test-instructions.md`. — CONFIRMADO: usados durante toda la ejecución del plan (1278 tests backend, 21 tests nuevos frontend, todos verdes).

### Grupo A — BUG-3/6: unificar contrato de schema de categorías (FR3, FR4)

- [x] **Step 1** — Business logic: unificar `AttributeField` (`apps/web/src/lib/api/schemas/categorySchema.ts`) y `AttributeSchemaEntry` (`apps/web/src/types/category.ts`) en un único schema Zod compartido con campo `options` disponible en ambos lados. _(FR3.1, FR3.2)_ — DONE: agregado `options` a `AttributeFieldSchema`; agregado `"select"` a `AttributeSchemaEntry.render_as`.
- [x] **Step 2** — Business logic: actualizar `SchemaFieldRenderer.tsx` para decidir el control a renderizar por `entry.render_as === "select"` en vez de por presencia de `entry.options` no vacío. _(FR3.3)_ — DESVIACIÓN: se probó este cambio y ROMPÍA los 2 tests existentes de `SchemaFieldRenderer.test.tsx`, que usan `filter_type: "select"` (no `render_as`) con `options` poblado — el patrón real ya soportado en producción. Cambiar el criterio a `render_as` habría sido una regresión real (viola NFR2). Se revirtió: el renderer sigue decidiendo por `options.length > 0` (sin cambios de comportamiento) — el bug real de BUG-6 era que el EDITOR no tenía forma de poblar `options`, no que el renderer decidiera mal. Ver memory.md.
- [x] **Step 3** — Frontend behavior: agregar el input de `options` a `CategorySchemaEditor` (componente de administración de schema) cuando `render_as = "select"`, corrigiendo también el bug de renderizado original de los dropdowns "Type"/"Group" que no reflejaban su valor seleccionado. _(FR3.4)_ — DONE: input de Options (comma-separated) agregado; Type/Group Selects ahora incluyen defensivamente el valor actual como item si no matchea la lista conocida (root cause real de BUG-3: `type: "select"` o un `group` huérfano no aparecían en el `<SelectContent>`, por lo que Radix renderizaba el trigger vacío).
- [x] **Step 4** — Verificado: `Category.validate_attributes()` ya valida `options` (independiente del valor de `type`) sin cambios necesarios. _(NFR3)_
- [x] **Step 5** — Tests: `toSchemaMap` (hoisted a nivel de módulo, mismo patrón que `buildGroupsWithFieldOrder`) — 2 tests nuevos (incluye options cuando render_as=select, los descarta si no). Tests existentes de `SchemaFieldRenderer` sin cambios, siguen pasando. _(FR3.1-FR3.3, Minimal strategy)_ — 5/5 tests verdes (`pnpm vitest run category-schema-editor.test.tsx SchemaFieldRenderer.test.tsx`).
- [x] **Step 6** — Cubierto por Step 3 (fix) + Step 5 (test de `toSchemaMap`); el fallback defensivo de Type/Group no tiene test de render completo (Radix Select + DnD context es pesado de montar) — cubierto a nivel de código, no de test automatizado. Ver Open Questions en code-summary.md. _(FR3.4)_

Nota: FR4 (campos select del formulario de vehículos: Bed Type, Body Type, Drivetrain, Cab Type, Wheelbase Type) es consecuencia directa del Grupo A — una vez el schema soporte `options` correctamente, estos campos se validan con un test de regresión puntual en Step 6 en vez de código adicional.

### Grupo B — BUG-1/2: investigar y corregir ausencia de thumbnails (FR1, FR2)

- [x] **Step 7** — Investigación COMPLETADA (root cause real, distinto para BUG-1 y BUG-2 — no comparten componente, la nota original del intent era incorrecta al asumir que sí):
  - **BUG-1** (`ReviewQueueTable.tsx`): leía `product.image_urls?.[0]` directo, ignorando (a) la ubicación legacy `attrs.image_urls` y (b) el `cover_image_key` explícito — exactamente la clase de bug ya documentada en `lib/api/productImages.ts` (comentario "Regression context (catalog-image-perf, 2026-06)") para OTROS componentes, pero `ReviewQueueTable` nunca se migró al resolver compartido `getCoverImageKey()`.
  - **BUG-2** (`apps/web/src/app/(seller)/publications/page.tsx`, NO `catalog/page.tsx` — la nota original del intent apuntaba al archivo equivocado): la vista "Lista" (tabla, default) no tenía NINGUNA columna de imagen; la vista "Grilla" SÍ tiene `PublicationCard` con soporte de imagen, pero el call site (`<PublicationCard key={pub.id} pub={pub} />`) nunca pasaba la prop `image`.
- [x] **Step 8** — Fix: `ReviewQueueTable.tsx` ahora usa `getCoverImageKey(product)` (fuente única de verdad ya establecida) + nuevo helper compartido `resolveStorageImageUrl()`. _(FR1.1)_
- [x] **Step 9** — Fix: `publications/page.tsx` — `buildPublicationRows` ahora resuelve `imageKey` vía `getCoverImageKey`; columna de thumbnail agregada a la tabla "Lista"; `image` prop wireada al `PublicationCard` en "Grilla". _(FR2.1)_
- [x] **Step 10** — Tests: nuevo helper `resolveStorageImageUrl` agregado a `lib/api/productImages.ts`; 1 test de regresión nuevo en `ReviewQueueTable.test.tsx` (imagen legacy en `attrs.image_urls`, 24/24 tests verdes incluyendo los 23 preexistentes); nuevo `publications/page.test.tsx` (4 tests: `buildPublicationRows` resuelve/omite `imageKey`, `PublicationCard` renderiza imagen o placeholder). _(FR1.1, FR2.1)_

### Grupo C — BUG-4: contacto de organización por WhatsApp (FR5)

- [x] **Step 11** — Confirmado: `OrganizationContact` ya tiene `name`/`whatsapp`/`phone`; `Organization` ya tiene los 5 campos de dirección (`street_address, city, state, postal_code, country`). Sin cambios de schema.
- [x] **Step 12** — `AbstractOrganizationRepository.get_by_id(org_id, tenant_id)` inyectado vía `Depends(get_organization_repository)` en `public_product_router.py`. _(FR5.1)_
- [x] **Step 13** — Nuevo DTO dedicado `PublicProductResponse(ProductResponse)` (NO se tocó el `ProductResponse` compartido con endpoints autenticados) — garantía ESTRUCTURAL de que el teléfono nunca puede filtrarse por este DTO, no solo "no lo pobla el código". `_pick_contact()` (prioriza el primer contacto con whatsapp) + `_compose_address()` (join de los 5 campos) como funciones puras testeables. _(FR5.1, FR5.2)_
- [x] **Step 14** — `ProductData` en `page.tsx` y `ProductPublicView.tsx` extendido con `contact_name`, `contact_whatsapp`, `contact_address`. _(FR5.1)_
- [x] **Step 15** — `whatsappUrl` ahora `https://wa.me/${digitsOnly(contact_whatsapp)}?text=...` (destinatario real); texto incluye `Contacto: {name}` + dirección. _(FR5.3)_
- [x] **Step 16** — 6 tests unitarios nuevos (`test_public_product_router_contact.py`, sin DB — la suite de integración existente para este router se salta en este entorno por falta de DB en :5433, confirmado corriendo la suite existente: 10/10 skipped limpio, sin romper nada): `_compose_address` (join + None), `_pick_contact` (prioriza whatsapp, fallback, ninguno), y una garantía ESTRUCTURAL de que `PublicProductResponse` no tiene campo `phone`. 6/6 verdes. _(FR5.1, FR5.2)_
- [x] **Step 17** — 2 tests nuevos en `ProductPublicView.test.tsx`: link con destinatario + texto con nombre/dirección sin teléfono; fallback a link genérico sin contacto. 2/2 verdes. _(FR5.3)_

### Grupo D — BUG-5: Title Case en formulario de vehículos (FR6)

- [x] **Step 18** — `toTitleCase()` creada en `apps/web/src/lib/utils/toTitleCase.ts` (lowercase + capitaliza tras inicio/espacio/guión → soporta "Mercedes-Benz").
- [x] **Step 19 — DESVIACIÓN IMPORTANTE, gatillada por la nota de riesgo del propio plan.** Al leer `nhtsa_normalizer.py` (`NHTSA_TO_FACEBOOK`) se encontró evidencia CONCRETA en el código de que `body_type`, `drivetrain`, `transmission`, `fuel_type`, `electrification`, `wheelbase_type`, `bed_type` y `cab_type` no son texto libre — son vocabulario controlado que matchea valores esperados por Facebook Marketplace (ej. `drivetrain` → exactamente `"FWD"/"RWD"/"AWD"/"4WD"`, `fuel_type` → `"gasoline"/"diesel"/...`). Además, `apps/api/src/prosell/infrastructure/database/seed_categories.py` confirma que esos mismos campos declaran un `"options"` array explícito en el schema (ej. `fuel_type: options: ["gasoline", "diesel", ...]`), mientras que `make`, `model` y `trim` NO tienen `options` — es decir, el propio schema YA distingue "campo de vocabulario controlado" de "campo de texto libre", y `vehicle-values.ts` (frontend) YA traduce esos enums a etiquetas en español correctamente capitalizadas para el usuario (ej. `gasoline` → `"Gasolina"`) — el bug de Title Case NUNCA afectó esos campos. Aplicar Title Case al valor canónico de un campo `options`-backed lo desalinearía de su propio schema y probablemente rompería el matching con Facebook. **Por lo tanto, siguiendo la instrucción explícita del plan ("detener y reportar... en vez de asumir silenciamente"), NO se tocó `nhtsa_normalizer.py` ni `vehicle_router._normalize_model()`** — el valor canónico que reciben/scrapea Facebook queda exactamente igual que antes. Esto revierte parcialmente la respuesta del usuario en Q3/seguimiento ("casi seguro" que Facebook acepta capitalizado) para los campos de vocabulario controlado — su "casi seguro" resultó estar en conflicto con evidencia concreta de código. Ver memory.md y el resumen final para el usuario. _(FR6.2 reinterpretado con evidencia — ver Step 20)_
- [x] **Step 20** — Title Case aplicado SOLO a campos de texto libre (sin `options` en el schema — make, model, trim, engine, etc.), en dos puntos: `mapDecodedToForm()` (VinDecodeField.tsx, autocompletado VIN — excluye explícitamente campos con `options`) y el input de texto por defecto de `SchemaFieldRenderer.tsx` (tipeo manual, cualquier campo de texto libre). Los campos Select-backed (con `options`) nunca pasan por ninguna de las dos rutas de transformación. _(FR6.1, alcance corregido de FR6.2 — ver Step 19)_
- [x] **Step 21** — Verificado (sin cambios de código, tal como preveía el plan): `resolve_title()` y `composeSubtitle()` son componentes GENÉRICOS de template (usados por CUALQUIER categoría, no solo vehículos) que solo hacen `str(value).strip()` / `String(value)` — sin transformación de case. Como `make`/`model` ya llegan en Title Case desde el punto de entrada (Step 20), el título y subtítulo compuestos heredan la corrección automáticamente sin tocar estos componentes compartidos. _(FR6.1)_
- [x] **Step 22** — Tests: `toTitleCase.test.ts` (5 tests: casos del intent + guión + mixed-case + vacío). `VinDecodeField.test.tsx` (3 tests nuevos: campo sin options se title-casea, campo con options queda intacto, valor no-string pasa sin tocar). Suite existente de `nhtsa_normalizer`/`template_composer` (29 tests) confirmada verde sin cambios — prueba de que NO se tocó el pipeline de FB. 8/8 tests nuevos verdes. _(FR6.1, FR6.2)_

### Grupo E — BUG-7: normalización de idioma en formularios de vehículos (FR7)

- [x] **Step 23 — root cause real, distinto de lo asumido en el intent.** `apps/web/src/lib/translations/vehicle-values.ts` YA tenía un diccionario `fieldLabels` completo y correcto (`make: "Marca"`, `trim: "Versión"`, `mileage: "Kilometraje"`, `doors: "Puertas"`, `windows: "Ventanas"`, `bed_type: "Tipo de Caja"`, etc. — 30+ campos) con su función `tLabel()` — pero NUNCA estaba importado/usado en ningún componente del repo (confirmado por búsqueda: cero importadores). `SchemaFieldRenderer.tsx` (el renderer real de la página de creación/edición, vía `UnifiedProductForm` → `SchemaFormSection` → `SchemaFieldRenderer` — confirmado con trace de imports; `GenericFormFields(V2).tsx` son componentes NO usados por ninguna página, deuda muerta fuera de alcance) usaba `entry.label ?? humanize(fieldKey)`, ignorando el diccionario español existente. Fix: wireado `tLabel()` como fallback intermedio (`entry.label ?? (tLabel si tiene traducción real, si no humanize)`) — un cambio de una línea que activa 30+ traducciones ya escritas. Además, `clean_title` tenía un label explícito `"Clean Title"` hardcodeado en `seed_categories.py` (que por ser explícito nunca pasaría por el diccionario) — corregido a `"Título limpio"` en la fuente del seed. _(FR7.1)_
- [x] **Step 24** — Tests: 2 tests nuevos en `SchemaFieldRenderer.test.tsx` (label conocido se traduce; label explícito de schema sigue teniendo prioridad sobre el diccionario). 4/4 tests del archivo verdes (incluye los 2 preexistentes de selects, sin regresión). Tests de bulk-upload/CSV que referencian `clean_title` (36 tests) confirmados verdes — solo verifican la field key, no el string de label, sin romperse por el cambio de texto. _(FR7.1)_

### Grupo F — FEAT-1: exportación de catálogo a CSV (FR8)

- [x] **Step 25** — DONE: `UNIVERSAL_COLUMNS_ORDERED: tuple[str, ...]` es la fuente de verdad del orden; `UNIVERSAL_COLUMNS` sigue existiendo como `frozenset[str]` derivado (`frozenset(UNIVERSAL_COLUMNS_ORDERED)`) para los usos de membership/diferencia sin cambiar ningún call site. `get_category_schema_template` en `category_router.py` ya consumía `UNIVERSAL_COLUMNS_ORDERED` — sin cambio de comportamiento observable, confirmado por `test_csv_product_parser.py` (15/15 verdes, sin tocar). _(FR8.2)_
- [x] **Step 26** — DONE: `build_export_headers()` / `build_export_row()` en `apps/api/src/prosell/domain/services/csv_export.py` — mismo orden que el template de importación (`UNIVERSAL_COLUMNS_ORDERED` + extra cols + claves de schema no conocidas) más la columna `image_folder_path` al final. _(FR8.1, FR8.5)_
- [x] **Step 27** — DONE: `GET /products/export.csv?category_id=` en `product_router.py`, autenticado (`current_user.tenant_id` requerido), pagina internamente vía `ListProductsUseCase` (200/página, tope 5000 = mismo tope de seguridad que el importador), un `category_id` por archivo (mismo contrato de una-sola-categoría-por-archivo que `CSVProductParser`). _(FR8.1)_

  **DESVIACIÓN — bug de proxy encontrado y arreglado, fuera del scope original del step pero requerido para que el endpoint funcione desde el navegador.** El proxy `apps/web/src/app/api/v1/products/[...path]/route.ts` forzaba `await response.json()` sobre CUALQUIER respuesta del backend — el mismo patrón de bug ya documentado en ese archivo para el header `If-Match` (sesión 2026-08-21). Como `export.csv` devuelve `text/csv` (no JSON), esto tiraba una excepción no manejada en cada llamada real desde el browser, enmascarada como un 502 genérico "Proxy error". Corregido: la respuesta ahora se pasa como blob crudo cuando el `Content-Type` del backend no es `application/json`, preservando `Content-Disposition` para que la descarga de archivo funcione. **ACTUALIZACIÓN post-gate (Request Changes del usuario)**: el proxy de `categories` (`apps/web/src/app/api/v1/categories/[...path]/route.ts`) tenía el MISMO bug — `downloadSchemaTemplate()` (feature preexistente) probablemente rota en producción por la misma causa. El usuario pidió corregirlo en este mismo ciclo en vez de abrir un intent separado. Aplicado el mismo fix (blob passthrough cuando `Content-Type` no es `application/json`, preservando `Content-Disposition`) + 2 tests nuevos en `route.test.ts` (passthrough JSON sin cambios; passthrough no-JSON sin tirar excepción). tsc/eslint/vitest verdes. Confirma el riesgo que `architecture.md` ya había señalado ("Auditar los demás proxies BFF por el mismo patrón").

- [x] **Step 28** — DONE: botón "Exportar CSV" en `apps/web/src/app/(seller)/catalog/page.tsx`, junto a "Agregar producto"; deshabilitado sin categoría seleccionada. Al click: `window.prompt()` pide la carpeta destino (solo informativo — el browser no puede escribir a un path local arbitrario desde JS; el nombre de carpeta real va en la columna `image_folder_path` del CSV), dispara `exportCatalogCsv()` (mismo patrón que `downloadSchemaTemplate` existente: fetch → blob → link de descarga). _(FR8.3)_
- [x] **Step 29** — DONE: `build_image_folder_name()` en `csv_export.py`. Nota documentada en el propio docstring: el ejemplo del intent ("2017-SPARK-128K-BLANCO-DK") omite el segmento MARCA que el patrón declarado sí incluye — implementado según el patrón literal (más información preservada); señalado para confirmación del usuario en code-summary.md. _(FR8.4)_
- [x] **Step 30** — DONE: `apps/api/tests/unit/services/test_csv_export.py`, 4 tests nuevos — patrón de nombre de carpeta (caso del intent + partes faltantes), orden de columnas export = mismo prefijo que el template de importación + columna `image_folder_path` al final, fila exportada incluye esa columna. 4/4 verdes. _(FR8.1, FR8.2, FR8.4, FR8.5)_

### Step 31: Configuración de entorno/build

- [x] Confirmado: no se requirieron cambios de configuración de build/entorno — todo el código nuevo vive en `apps/api` y `apps/web` existentes, sin nuevas dependencias.

### Step 32: Documentación y trazabilidad

- [x] Generados `code-summary.md` y `traceability.json`.
