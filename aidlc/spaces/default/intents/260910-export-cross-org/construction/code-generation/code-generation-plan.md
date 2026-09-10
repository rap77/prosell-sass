# Code Generation Plan — Export Cross-Org Permission

Intent: `260910-export-cross-org` (scope: bugfix, depth: Minimal, zero-Unit — no `units-generation` ran; scoped from `requirements.md` + the RE codekb).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar la capa aplicable (backend o frontend según el",
  "scope": "bugfix",
  "test_strategy": "minimal",
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
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
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
  "input_sha256": "sha256:714bfd1d92ae5f2ed0506373ae2774b9ce1ec2067c73f544ae2c90326064562e",
  "contract_sha256": "sha256:0c3f9516f9fd21cb875f3618fd37e3d3cfad4f6756ee0a6eb1a4a48305e65a16"
}
```

## Scope

Only the backend API layer changes. No frontend, no domain-layer signature changes (`ExportCatalogClientFormatUseCase.execute()` keeps its single `tenant_id: UUID` parameter — resolution logic lives entirely in the router). No new dependencies, no new DB table/migration — the audit requirement (FR2/NFR2) is satisfied with a structured `logger.info()` call, consistent with the existing lightweight logging already used elsewhere in `product_router.py` (e.g. the bulk-upload preview logging) and appropriate for a Minimal-depth bugfix (a dedicated audit table would be over-engineering for this scope).

## Steps

- [ ] **Step 1 — Verify test runner.** Confirm `apps/api` pytest is runnable and record the exact scoped command (see `unit-test-instructions.md`).
- [ ] **Step 2 — API/endpoint layer: implement FR1 (permission model).** Modify `export_catalog_client_format()` in `apps/api/src/prosell/infrastructure/api/routers/product_router.py`:
  - Add `organization_id: UUID | None = None` query parameter.
  - Replace the current `if current_user.tenant_id is None: raise 403` block with `owner_tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)` (reuses the existing shared guard — FR1.1, FR1.3, NFR1).
  - Compute `effective_tenant_id = organization_id if (organization_id is not None and can_view_all_orgs) else owner_tenant_id` (same pattern as `list_products` — FR1.2, FR1.4, FR1.5; FR1.5 needs no extra existence check, `EmptyCatalogExportError`/404 already covers a tenant with no published products, whether real-but-empty or nonexistent).
  - Pass `tenant_id=effective_tenant_id` to `use_case.execute(...)`.
  - Traces: FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, NFR1, NFR3.
- [ ] **Step 3 — Business logic: implement FR2 (cross-org audit logging).** After a successful export (after `use_case.execute()` returns, before building the response), if `effective_tenant_id != owner_tenant_id`, emit `logger.info(...)` identifying the caller (`current_user.id`), the exported organization (`effective_tenant_id`), and the caller's own organization (`owner_tenant_id`). No log call when exporting the caller's own organization (FR2.2 — same as today).
  - Traces: FR2.1, FR2.2, NFR2.
- [ ] **Step 4 — Documentation: implement FR3 (docstring update).** Update the endpoint's docstring: remove the "no request parameter can change which organization gets exported (BR1.2, NFR1)" claim and describe the new `organization_id` cross-org behavior and its permission gate.
  - Traces: FR3.1.
- [ ] **Step 5 — API/endpoint layer tests.** Update/add tests in `apps/api/tests/integration/api/routers/test_product_router_export_client_format.py` (test-after, per the Testing Contract's `test-after` methodology — implement Steps 2-4 first, then this step):
  - Update the module docstring (no longer true that "there is no request parameter that could change which organization is exported").
  - New: `test_super_admin_with_organization_id_sees_target_org_catalog` (FR1.2, FR4.2 — the targeted regression for this bugfix).
  - New: `test_non_admin_with_organization_id_returns_403` (FR1.3, FR4.3).
  - New: `test_nonexistent_organization_id_behaves_like_empty_catalog` (FR1.5).
  - New: `test_cross_org_export_is_audited` (FR2.1).
  - New: `test_own_org_export_is_not_audited` (FR2.2).
  - `test_other_organizations_products_never_appear` (FR4.1) stays as-is — it already asserts the correct behavior for the no-`organization_id` default, which does not change.
  - Traces: FR1.2, FR1.3, FR1.5, FR2.1, FR2.2, FR4.1 (unchanged), FR4.2, FR4.3.
- [ ] **Step 6 — Run the full existing suite for this endpoint and its shared dependency.** `_check_org_scope_permission()` is shared with `list_products`/`get_category_filter_values`/`get_featured_products` — run whichever of those already have dedicated integration test coverage, unmodified, to confirm no regression (team.md piso mínimo #1 precedent, same discipline applied here since this endpoint now shares that same guard function). Note: only `get_featured_products` has a dedicated integration test file today (`tests/integration/api/test_featured_route.py`); `list_products`/`get_category_filter_values` have no dedicated file — this is a pre-existing coverage gap, not something this bugfix introduces or needs to close, since `_check_org_scope_permission()` itself is not modified.
  - Traces: NFR1, NFR3.
- [ ] **Step 7 — Traceability.** Write `code-summary.md` and `traceability.json` mapping every FR/NFR to its implementation/test file.

## Story-to-code-step traceability

| FR/NFR                                                 | Plan Step |
| ------------------------------------------------------ | --------- |
| FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, NFR1, NFR3          | Step 2    |
| FR2.1, FR2.2, NFR2                                     | Step 3    |
| FR3.1                                                  | Step 4    |
| FR1.2, FR1.3, FR1.5, FR2.1, FR2.2, FR4.1, FR4.2, FR4.3 | Step 5    |
| NFR1, NFR3 (regression check)                          | Step 6    |
