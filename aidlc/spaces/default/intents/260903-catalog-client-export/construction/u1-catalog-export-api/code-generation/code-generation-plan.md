# Code Generation Plan — u1-catalog-export-api

Trazabilidad historia→step: todos los steps implementan **US1.1** y
**US1.3** (`unit-of-work-story-map.md`), backend de
`u1-catalog-export-api`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar la capa aplicable (backend o frontend según el",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar la capa aplicable (backend o frontend según el\n  cambio) y luego escribir y correr los tests de esa capa, sin backfillear\n  cobertura en código pre-existente no tocado por el cambio.\n- Asimetría de cobertura aceptada tal cual (Q3 en 260829): piso 40% frontend\n  (`lines:40 functions:40 branches:75 statements:40` en `vitest.config.ts`),\n  sin piso enforced en backend (`pytest --cov=prosell` sin\n  `--cov-fail-under`). No forzar simetría.\n- CI ejecuta la suite completa en cada push/PR a `main`; pre-push local\n  corre `pytest -q` — gate de \"suite completa en verde antes de merge\" SÍ\n  enforced mecánicamente.\n- Asimetría de gates de lint intencional (Q4 en 260829): `next-lint`\n  deshabilitado en pre-commit (solo CI); `react-doctor` bloqueante en\n  pre-commit, advisory en CI.\n- **Precedente de diseño de test para binarios/ZIP, con precisión de\n  dirección**: el dominio ya tiene `CSVImageMapper`\n  (`apps/api/src/prosell/domain/services/csv_image_mapper.py`) con tests\n  unitarios dedicados a LEER estructuras ZIP que el cliente sube — sentido\n  de IMPORT (`TestReadZipContents`, `TestZipStructureReading`,\n  `TestBuildDoSpacesKey`, `TestSanitizeFilename`). Ese precedente cubre el\n  sentido INVERSO al que este intent necesita: armar un ZIP para EXPORT.\n  El **patrón de diseño de test transfiere** (unit test sobre la\n  función/servicio, bytes-in/bytes-out en memoria, sin storage real), pero\n  la **suite de casos es nueva** — no es \"extender\" una suite existente,\n  es escribir una suite nueva sobre `csv_export.py` con esa misma\n  filosofía (posición de calidad, confirmada sin objeción por developer y\n  devsecops). Ya existe además un endpoint real de descarga de archivo\n  (`download_bulk_upload_errors_csv()` en `product_router.py`,\n  `StreamingResponse` con `text/csv`) que sirve de precedente directo de\n  formato de respuesta para el nuevo endpoint de export.\n\n- **Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la\n  entrevista) — no cambia el piso general del proyecto, solo aplica al\n  feature de export CSV+ZIP:**\n  1. Regresión explícita del bug ya confirmado en\n     `build_image_folder_name()` (`csv_export.py`): hoy lee\n     `attrs.get(\"color\")` en vez de `attributes[\"exterior_color\"]`, y el\n     fallo es silencioso (sin excepción ni log). El caso de test debe usar\n     la clave real (`exterior_color`), no solo `color`, para que la\n     regresión quede cubierta permanentemente. El fix va en el archivo de\n     test existente `apps/api/tests/unit/domain/services/test_csv_export.py`\n     (patrón 1:1 ya establecido), no en uno nuevo. Antes de tocar la\n     función, confirmar si es compartida con el endpoint de export\n     genérico ya existente (`GET /api/v1/products/export.csv`, FEAT-1 de\n     `260826-prod-bugfixes-batch`) y correr la suite completa relacionada\n     a ese endpoint, no solo los tests nuevos.\n  2. Casos límite explícitos de `Organization.code` para el segmento\n     `{CÓDIGO_ORG}` del nombre de carpeta: código de 1 carácter, código de\n     5 caracteres, y código ausente (`None`) — `Organization.code` es\n     `str | None` de 1 a 5 caracteres, no fijo en 2 como sugiere el\n     ejemplo feliz de `docs/data39.csv`. No alcanza con un solo caso feliz.\n  3. Test de contrato para `Content-Type`/`Content-Disposition` del nuevo\n     endpoint de export — el repo ya tuvo dos bugs reales confirmados de\n     \"proxy fuerza `.json()` sobre contenido no-JSON\" en esta clase exacta\n     de superficie (`project.md` learning 260826; `code-quality-assessment.md`\n     #9 y #64). El proxy de `products`\n     (`apps/web/src/app/api/v1/products/[...path]/route.ts`) ya está\n     arreglado para esta ruta específica (confirmado por lectura directa:\n     chequea `Content-Type`, hace `response.blob()` cuando no es JSON) —\n     el test de contrato verifica que ese comportamiento correcto\n     sobrevive el viaje completo proxy→browser para el endpoint nuevo, no\n     que haya que arreglar nada de nuevo.\n\n- **Gaps de cobertura/convención señalados por calidad, a resolver en\n  Build and Test (no piso nuevo de equipo, documentados por trazabilidad)**:\n  cero tests hoy para `handleExportCsv` (`catalog/page.tsx`) y\n  `exportCatalogCsv` (`apps/web/src/lib/api/products.ts`) — es superficie\n  de test nueva, no cobertura pre-existente a \"mantener en verde\". Además,\n  `catalog/page.tsx` no calza limpio en ninguno de los dos patrones de\n  ubicación de test ya vigentes (`tests/components/{module}/X.test.tsx` vs.\n  co-located `page.test.tsx` de páginas admin) — Build and Test debe\n  resolver cuál aplica antes de escribir los tests nuevos.\n- **Duplicado de archivo de test sin resolver**: `test_csv_image_mapper.py`\n  existe en dos ubicaciones (`tests/unit/services/` y\n  `tests/unit/domain/services/`). Antes de usarlo como referencia de\n  patrón o de extenderlo, Build and Test debe verificar cuál corre en CI."
    },
    {
      "layer": "project",
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30) \n\n- En Build and Test, con Test Strategy Minimal, no generar integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md cuando el intent no tiene NFR de performance/security y las FRs ya están cubiertas por regresiones de integración existentes — reconfirmado en el intent 260830-ci-seed-data. (learned 2026-08-30) \n- Para verificar NFR1.2 (suite completa de pytest backend) en Build and Test cuando no hay un Postgres de test corriendo: levantar un contenedor Docker temporal matching exacto de la config de CI (`postgres:17`, mismas credenciales/puerto que `postgres-test` en `ci.yml`), bootstrapear el schema con `create_test_schema.py`, correr la suite, y detener el contenedor al terminar. La convención ya aprendida de verificar con `git stash`/`pop` contra el baseline antes de asumir que una falla es \"pre-existente\" aplica también a la suite COMPLETA, no solo a los módulos tocados por el cambio. (learned 2026-08-30) \n\n- En Code Generation, correr vitest/tsc/eslint sobre los archivos efectivamente tocados en esa misma etapa (no solo diferir toda verificación a Build and Test) — atrapa bugs de implementación (ej. import incorrecto de un hook) antes del gate de aprobación, en vez de que aparezcan recién en la etapa siguiente. (learned 2026-09-01)"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
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
  "input_sha256": "sha256:55e4af81d7b1cc46b10ced26615e360ef2fcd2bc6a1d0ffe5ae53f2d0b69306f",
  "contract_sha256": "sha256:c77f87040bf4836c06296375faa65be1599a8d70c7bdb6ae1582fe0c86d85103"
}
```

## Layers aplicables a este Unit

`Data model / database` **NO aplica** — sin entidad persistida nueva
(Domain Design ADR-002). `Frontend behavior` **NO aplica** — U1 es
backend puro. Aplican: `Repository / data access`, `Business logic`,
`API / endpoint`.

## Pre-implementación — hallazgo real durante la planificación

Investigación de código (graphify + lectura directa) confirmó: el bug de
`FR2.3`/`BR2.3` **NO está dentro de `build_image_folder_name()`** (esa
función solo usa el `color` que el caller le pasa) — está en el CALL SITE
`product_router.py:686`, dentro de `export_catalog_csv()` (el endpoint
genérico FEAT-1 ya existente), que pasa `color=attrs.get("color")` en vez
de `color=attrs.get("exterior_color")`. Arreglar esa línea corrige
AMBOS endpoints (el genérico y el nuevo), consistente con la instrucción
de `team-practices.md` de correr la suite completa del endpoint genérico
tras el fix, no solo los tests nuevos.

También confirmado: el archivo de test real es
`apps/api/tests/unit/services/test_csv_export.py` — la ruta
`tests/unit/domain/services/test_csv_export.py` que `team-practices.md`
asumía NO existe en el repo; se usa la ruta real.

## Steps

- [ ] **Step 1 — Verificar test runner**: confirmar `uv run pytest apps/api/tests/unit/services/test_csv_export.py -q` corre en verde hoy (baseline pre-cambio).
- [ ] **Step 2 — Repository/data access**: agregar `get_object(key: str) -> bytes` a `IDOSpacesService` (`apps/api/src/prosell/application/ports/ido_spaces.py`) + implementación en `DOSpacesService` (`apps/api/src/prosell/infrastructure/services/do_spaces_service.py`), usando el cliente `boto3` ya configurado ahí.
- [ ] **Step 3 — Repository/data access tests**: tests unitarios para `DOSpacesService.get_object()` (éxito, objeto inexistente/error de storage) con el cliente `boto3` mockeado, siguiendo el patrón de test ya usado para `upload_file`/`delete_file` en el mismo archivo de test.
- [ ] **Step 4 — Business logic**: en `apps/api/src/prosell/domain/services/csv_export.py`, agregar:
  - `CLIENT_FORMAT_COLUMNS` (lista de las 24 columnas exactas, orden fijo, `requirements.md` FR1.3).
  - `build_client_format_row(...)` — mapea un `Product` a una fila de 24 columnas (`option` siempre vacío, `description` = valor guardado, BR1.4).
  - Reusar `build_image_folder_name()`/`_slug_part()` ya existentes para el nombre de carpeta del ZIP (BR2.1, BR2.2, BR2.4) — sin duplicar lógica de sanitización.
  - Placeholder `sin-codigo` cuando `Organization.code` es `None` (BR2.2, `stories.md` AC1.1.8).
- [ ] **Step 5 — Business logic tests** (en `apps/api/tests/unit/services/test_csv_export.py`, extendiendo el archivo existente):
  - **Regresión del bug**: corregir `product_router.py:686` (`color=attrs.get("exterior_color")`) y agregar/actualizar el caso de test que usa la clave real `exterior_color` (no solo `color`) para `build_image_folder_name()` a través del call site corregido.
  - Casos límite de `Organization.code`: 1 carácter, 5 caracteres, `None` → `sin-codigo` (`stories.md` AC1.1.8).
  - `build_client_format_row()`: `option` siempre vacío, `description` poblado, header/orden exacto de las 24 columnas.
- [ ] **Step 6 — Business logic (excepciones)**: en `apps/api/src/prosell/domain/exceptions/product_exceptions.py`, agregar `EmptyCatalogExportError(ProductError)` y `ExportLimitExceededError(ProductError)` (BR4.1, BR4.3, BR3.1).
- [ ] **Step 7 — Business logic (use case)**: nuevo `apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py` — `ExportCatalogClientFormatUseCase`: query de productos `published` por `organization_id`, chequeo de cap (500, `scalability-design.md` NFR3.1) → `ExportLimitExceededError`, chequeo de catálogo vacío → `EmptyCatalogExportError`, lectura concurrente de imágenes (semáforo máx. 20, `performance-design.md`) con 1 retry + backoff 200ms (`reliability-design.md`) vía `IDOSpacesService.get_object()`, ensamblado del ZIP (`zipfile`, stdlib) con el CSV en la raíz + carpetas por vehículo.
- [ ] **Step 8 — Business logic tests (use case)**: tests unitarios del use case con repositorio y storage port mockeados — catálogo vacío (404), cap excedido (413), imagen individual fallida (log warning, no aborta, `rules.md` BR4.2), ZIP resultante bien formado (CSV + carpetas esperadas).
- [ ] **Step 9 — API/endpoint**: nuevo endpoint `GET /api/v1/products/export-client-format.zip` en `product_router.py` — resuelve `organization_id` del JWT (`current_user.tenant_id`, mismo patrón que `export_catalog_csv`), delega al use case, mapea `EmptyCatalogExportError`→404 y `ExportLimitExceededError`→413 (mismo patrón de exception handler ya vigente para `ProductError`), responde `StreamingResponse`/`Response` con `Content-Type: application/zip` y `Content-Disposition: attachment` (mismo patrón de `download_bulk_upload_errors_csv()`).
- [ ] **Step 10 — API/endpoint tests**: test de contrato para `Content-Type`/`Content-Disposition` del nuevo endpoint (piso mínimo del equipo, ítem 3) + tests de integración para 200/404/413, aislamiento multi-tenant (NFR1, un usuario de la Org A no puede ver productos de la Org B).
- [ ] **Step 11 — Documentación y trazabilidad**: `code-summary.md` + `traceability.json` (Step 5/Step 6 de la etapa).

## Coverage target

Consistente con `team.md` (Testing Posture): sin piso de cobertura
backend enforced (`pytest --cov=prosell` sin `--cov-fail-under`) — el
piso real es cualitativo (los 3 ítems del piso mínimo del intent, Steps
5 y 10 arriba), no un porcentaje.
