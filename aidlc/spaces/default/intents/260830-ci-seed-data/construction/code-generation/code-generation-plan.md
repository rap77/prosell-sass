# Code Generation Plan — fix-prosell-ci-seed-data

Zero-Unit directive (bugfix scope, no Units Generation). Single iteration, artifacts under `<record>/construction/code-generation/`. Every change is confined to `apps/api/tests/` — no production code under `apps/api/src/prosell/` is touched (C1).

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
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar la capa aplicable (backend o frontend según el\n  cambio) y luego escribir y correr los tests de esa capa, sin\n  backfillear cobertura en código pre-existente no tocado por el cambio.\n- La distinción entre \"Strict TDD Mode: enabled\" (memoria global del\n  usuario, configuración personal del asistente aplicable a todas sus\n  sesiones y proyectos) y la práctica real de este equipo/repo\n  (test-after) queda resuelta por evidencia, no por juicio en la\n  entrevista: el threshold de cobertura frontend fue rebajado\n  explícitamente después de medir cobertura ya escrita (patrón inverso a\n  TDD), y los aprendizajes ya persistidos en `project.md` para Code\n  Generation son explícitos y repetidos en esta dirección. La instrucción\n  de `~/.claude/CLAUDE.md` queda fuera de alcance de esta práctica de\n  equipo por ser config de asistente, no una afirmación de práctica de\n  proyecto.\n- **Asimetría de cobertura — aceptada tal cual (Q3).** El frontend tiene un\n  piso de cobertura configurado en `vitest.config.ts`\n  (`lines:40 functions:40 branches:75 statements:40`), rebajado\n  deliberadamente de un objetivo original de 80% tras medir la cobertura\n  real disponible. El backend **no tiene ningún piso de cobertura\n  enforced** (`pytest --cov=prosell --cov-report=xml` en CI genera el\n  reporte pero no pasa `--cov-fail-under`, y `apps/api/pyproject.toml` no\n  declara `fail_under`) — es decir, la asimetría es total, no solo un\n  matiz: ni el 80% que `org.md` fija como default para el scope `classic`\n  activo, ni ningún otro número, aplican al backend hoy. El equipo eligió\n  explícitamente aceptar esta asimetría (40% frontend / sin piso backend)\n  como la práctica vigente, en vez de subir el piso del frontend o de\n  agregar uno nuevo al backend.\n- CI ejecuta la suite completa en cada push/PR a `main` (`test-python`,\n  `test-node` jobs), y el pre-push hook local corre `pytest -q` — el gate\n  de \"suite completa en verde antes de merge\" SÍ está enforced\n  mecánicamente, aunque el umbral de cobertura backend no lo esté.\n- **Asimetría de gates de lint — intencional (Q4).** El hook `next-lint`\n  (ESLint completo) está deshabilitado en pre-commit y solo corre en CI;\n  `react-doctor`, en cambio, SÍ bloquea en pre-commit pero es solo\n  advisory en CI (`react-doctor.yml` no bloquea merge). El equipo confirmó\n  que esta dirección \"invertida\" es deliberada: ESLint completo es lento y\n  se reserva para CI; `react-doctor` es rápido y vale la pena que bloquee\n  localmente.\n- Para el scope `classic` activo de este intent (refactor de navegación\n  auth/frontend): el patrón de test correcto de cara a Build and Test es\n  unit/component (Vitest + Testing Library) sobre el código de navegación\n  tocado, no integración/E2E nuevo, consistente con el aprendizaje ya\n  registrado de no generar artefactos de test por ceremonia cuando el\n  cambio no lo amerita."
    },
    {
      "layer": "project",
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30)"
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
  "input_sha256": "sha256:8673b1cf25044a388d4164ae5cf58cf357eb022f60481858009f1c1aae615a40",
  "contract_sha256": "sha256:a8289265637776b6407c43daac6410d37445617c10e1d39305061f75273d9f64"
}
```

All four FRs are integration-test-only regressions: this is a bugfix whose defect lives IN the test suite itself (stale fixtures, a broken transaction pattern, missing FK data), not in production code. "Implementation" here means fixing the tests to correctly exercise already-correct production code — there is no separate business-logic/API/frontend layer to implement.

## Story-to-Code-Step Traceability

| Plan Step | Requirement                                        |
| --------- | -------------------------------------------------- |
| Step 2    | FR1 (stale `suvs` slug)                            |
| Step 3    | FR2 (regression test for flattened hierarchy)      |
| Step 4    | FR3 (`shared_session` / `db.commit()` fixture bug) |
| Step 5    | FR4 (FK violation, `category_id=uuid4()`)          |

## Steps

- [ ] Step 1: Verify the existing test runner/configuration and record the exact unit-scoped commands (this stage's runner-readiness step; no new config needed — `uv run pytest <path>` already works against the local Postgres test DB on `localhost:5433`).
- [ ] Step 2: FR1 — Fix 4 stale-slug assertions
  - `apps/api/tests/integration/database/test_seed_categories.py::test_seed_creates_level_3_leaf_with_correct_hierarchy` — rewrite to assert `carros-y-camionetas` is the leaf (level 2), not `suvs` (level 3, no longer exists).
  - `apps/api/tests/integration/database/test_seed_car_attributes.py::test_car_leaf_has_attribute_schema_and_presentation` — same slug swap.
  - `apps/api/tests/integration/database/test_seed_car_attributes.py::test_create_product_under_car_leaf_validates_and_composes_title` — same.
  - `apps/api/tests/integration/database/test_seed_car_attributes.py::test_create_product_under_car_leaf_rejects_missing_required` — same.
  - Write and run tests after implementation (test-after).
- [ ] Step 3: FR2 — Add regression test documenting the flattened hierarchy
  - New test in `test_seed_categories.py`: `carros-y-camionetas` is a leaf (no children) and the 5 removed level-3 slugs (`sedan`, `hatchback`, `suvs`, `pick-ups`, `coupe`) do not exist in the seed tree.
  - Write and run after implementation.
- [ ] Step 4: FR3 — Fix the `shared_session`/`db.commit()` transaction bug
  - `apps/api/tests/integration/api/routers/test_fb_sync_router.py`: wrap `shared_session`'s transaction in a SAVEPOINT (`session.begin_nested()`) with an `after_transaction_end` listener that auto-restarts the savepoint, so a handler's explicit `db.commit()` releases only the savepoint (production behavior) instead of ending the fixture's only transaction.
  - `apps/api/tests/integration/bulk_upload/conftest.py`: same SAVEPOINT wrapping applied locally to the `db_session` object inside the `async_client` fixture (the shared `db_session` fixture in `tests/integration/conftest.py` itself is NOT touched — out of scope per FR3.3/Q3).
  - Write and run after implementation — specifically re-verify `test_fb_sync_router.py::TestUnpublishEndpoints::test_completed_callback_updates_all_publication_records_idempotently`, which calls the same endpoint twice and previously broke on the second call.
- [ ] Step 5: FR4 — Fix the FK violation in batch approve/submit tests
  - `apps/api/tests/integration/use_cases/test_batch_approve_products.py` (3 test functions, 5 call sites) and `test_batch_submit_products.py` (4 test functions, 6 call sites): replace `category_id=uuid4()` with `category_id=test_category.id`, adding the existing `test_category` fixture (already defined in `tests/integration/conftest.py`, already tenant-scoped to `test_organization`) as a parameter to each affected test function.
  - Write and run after implementation.
- [ ] Step 6: Documentation and traceability — `code-summary.md` + `traceability.json`.

No API/endpoint layer, no repository/data-access layer, no database migrations/schema changes, no frontend behavior, and no new configuration files apply to this bugfix — every step above is the full applicable-layer set for FR1–FR4 (all test-file-only regressions).
