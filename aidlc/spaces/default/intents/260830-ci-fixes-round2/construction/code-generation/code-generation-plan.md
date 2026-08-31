# Code Generation Plan — 260830-ci-fixes-round2 (zero-Unit, backend bugfix)

Consumes: `aidlc/spaces/default/intents/260830-ci-fixes-round2/inception/requirements-analysis/requirements.md` (FR1-FR5, NFR1-NFR2)

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
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30) \n\n- En Build and Test, con Test Strategy Minimal, no generar integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md cuando el intent no tiene NFR de performance/security y las FRs ya están cubiertas por regresiones de integración existentes — reconfirmado en el intent 260830-ci-seed-data. (learned 2026-08-30) \n- Para verificar NFR1.2 (suite completa de pytest backend) en Build and Test cuando no hay un Postgres de test corriendo: levantar un contenedor Docker temporal matching exacto de la config de CI (`postgres:17`, mismas credenciales/puerto que `postgres-test` en `ci.yml`), bootstrapear el schema con `create_test_schema.py`, correr la suite, y detener el contenedor al terminar. La convención ya aprendida de verificar con `git stash`/`pop` contra el baseline antes de asumir que una falla es \"pre-existente\" aplica también a la suite COMPLETA, no solo a los módulos tocados por el cambio. (learned 2026-08-30)"
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
  "input_sha256": "sha256:f7270057791a0b9961578f6f5c388a9872992de93d904d0aae4d35b15e5271bc",
  "contract_sha256": "sha256:1af05dc412ca77257789f16b94d802c75c3411d304ee4940218ad4cead23f52c"
}
```

All work is backend-only (Python/FastAPI/SQLAlchemy). No frontend layer applies. Every targeted regression uses the narrowest test level that reproduces the defect — existing integration tests for FR1/FR2/FR3/FR4, and a corrected existing integration test for FR5 (test fix, not app code).

## Step 1 — Verify test runner

- [ ] Confirm the exact unit-scoped pytest command works before any Red/fix cycle. Start a temporary Postgres 17 container matching CI's `postgres-test` service exactly (`postgres:17`, user `prosell`, password `prosell_test_password`, db `prosell_test`, port 5433), bootstrap the schema with `apps/api/scripts/create_test_schema.py`, and confirm `uv run pytest tests/integration/api/test_batch_review_api.py -q` runs (fails as expected, matching the diagnosed baseline). Never point this at `prosell_staging` — the suite is destructive (DROP/CREATE DATABASE per test).

## Step 2 — FR3.1: bootstrap the `fb_group_category` enum in the isolated per-test DB fixture

- [ ] Implement: `apps/api/tests/conftest.py`, fixture `test_db_session` (~L140-227). Before `await conn.run_sync(Base.metadata.create_all)` (L188-189), create the `fb_group_category` Postgres enum the same way `apps/api/scripts/create_test_schema.py`'s `MANUAL_ENUMS` does (`DROP TYPE IF EXISTS fb_group_category CASCADE; CREATE TYPE fb_group_category AS ENUM ('vehicles','general','real_estate','electronics','other')`), inside the same `async with async_engine.begin() as conn:` block, via `conn.execute(text(...))`. This is the actual root cause confirmed live: `migration_context` (in `test_fb_credential_migration_router.py`) depends on `test_db_session`, which creates an isolated `DROP DATABASE`/`CREATE DATABASE` schema per test function and runs `create_all()` directly — the only schema-creation path in the whole test suite that skips the `MANUAL_ENUMS` bootstrap.
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/api/test_fb_credential_migration_router.py -v` (12 tests) against a fresh isolated DB — confirm 0 errors.

## Step 3 — FR2.3: fix `test_organization` fixture to set `code`

- [ ] Implement: `apps/api/tests/integration/conftest.py`, fixture `test_organization` (~L190-215). Add `code=` to the `OrganizationModel(...)` construction, matching the `cod_organization` values the bulk-upload sample CSVs already reference (confirm the exact value(s) used by `tests/integration/bulk_upload/` fixtures/CSVs before picking the string — do not invent one).
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/bulk_upload/ -v` — confirm `test_endpoint_returns_correct_response_structure`, `test_endpoint_requires_organization_id`, and `test_preview_summary_counts` all pass (FR2.3's assumption that this single fixture fix resolves the preview assert too — verify, don't assume).

## Step 4 — FR1.1: real category fixture in `test_batch_review_api.py`

- [ ] Implement: `apps/api/tests/integration/api/test_batch_review_api.py`, 4 sites (L110, 151, 201, 213). Add `test_category` as a fixture parameter to each affected test function and replace `category_id=uuid4()` with `category_id=test_category.id`, mirroring the exact pattern already used in `tests/integration/use_cases/test_batch_approve_products.py`.
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/api/test_batch_review_api.py -v` — confirm `test_batch_approve_success`, `test_batch_reject_success`, `test_batch_approve_partial_failure` pass.

## Step 5 — FR2.1: respect the `organization_id` fallback in bulk upload

- [ ] Implement: `apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`, `execute()` (~L124-127). Move the "unknown organization codes" check so it evaluates per row inside the existing per-row loop (which already resolves via the caller's `organization_id` fallback when a row's `cod_organization` doesn't resolve), instead of pre-scanning the whole batch and raising before the loop runs. Preserve the existing `ValueError` type and message shape for rows that genuinely have no resolvable organization (no code AND no valid `organization_id` fallback).
- [ ] Write/run targeted regression: covered together with Step 6's regression (same endpoints).

## Step 6 — FR2.2: map `ValueError` to `HTTPException(400)` on bulk-upload endpoints

- [ ] Implement: `apps/api/src/prosell/infrastructure/api/routers/product_router.py`, handlers `bulk_upload_preview` and `bulk_upload_with_images`. Wrap the `use_case.execute(...)` call in `try/except ValueError as e: raise HTTPException(status_code=400, detail=str(e)) from e`, matching the exact pattern already used by `/brokers` and `/ownership` in the same file.
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/bulk_upload/ -v` — confirm all 4 previously-failing tests pass (this step + Step 3 + Step 5 combined).

## Step 7 — FR4: `GET /api/v1/admin/organizations/{organization_id}`

- [ ] Implement: `apps/api/src/prosell/infrastructure/api/routers/admin_organizations_router.py`. Add `@router.get("/{organization_id}", response_model=OrganizationResponse)` following the exact pattern already used by `update_organization` (PATCH, same path) and `list_organization_products`: `_require_org_admin_view_all(current_user)`, `org_repo.get_by_id(organization_id, tenant_id=organization_id)`, 404 if `None`, else `OrganizationResponse.from_entity(organization)`. Place it directly before `update_organization` so GET/PATCH for the same resource sit together.
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/api/test_admin_organizations_router.py::test_admin_patch_persists_contact_name -v` — confirm the trailing GET now returns 200 with the persisted contact.

## Step 8 — FR5: fix the test role in `test_list_org_verticals_cross_org_returns_403`

**Corrected during Code Generation** (see `requirements.md` FR5, updated with human sign-off): `org_verticals_router.py`'s cross-tenant check already exists and its `Permission.ORG_ADMIN_VIEW_ALL` bypass is intentional platform-admin functionality (both `RoleType.ADMIN` and `RoleType.SUPER_ADMIN` carry it) — the router is NOT modified.

- [ ] Implement: `apps/api/tests/integration/api/test_org_verticals.py`, `test_list_org_verticals_cross_org_returns_403`. Change the fixture from `async_client_as_admin`/`admin_user` (`SUPER_ADMIN`, has the bypass) to a client/user fixture with `SALES_AGENT` role or equivalent (no `ORG_ADMIN_VIEW_ALL`) — confirm `tests/integration/api/conftest.py`'s `async_client_as_seller`/`seller_user` fixtures are usable here before wiring them in.
- [ ] Write/run targeted regression: rerun `uv run pytest tests/integration/api/test_org_verticals.py -v` — confirm the cross-org test passes with the corrected role, and the rest of the file's existing passing tests remain green.

## Step 9 — Full regression (NFR1, NFR2)

- [ ] Run `uv run pytest -q` (whole backend suite) against the CI-parity Postgres container from Step 1. Confirm 0 failed / 0 errors and exactly the same 1945+ passing count as the pre-fix baseline (no new failures). Stop and tear down the temporary Postgres container afterward — never leave it running, never point any of this at `prosell_staging`.

## Step 10 — Documentation and traceability

- [ ] Write `code-summary.md` and `traceability.json` per stage instructions, including the FR5 correction (test fix, not router change) as a documented deviation.
