# Code Generation Plan — Fix teamApi.create mismatch parameter

Intent: `260902-teamapi-create-param` · zero-Unit (bugfix, Units Generation skipped by scope)

Story-to-code traceability: every step maps to `requirements.md` FR1-FR5. No backend DTO changes are needed — the backend (`org_id`) is already the target shape; only the frontend and its mocks move.

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
  "input_sha256": "sha256:9d9856974a53a32307567c00cd5ce77cfdeb556062423110d93d5e46f976dad9",
  "contract_sha256": "sha256:beb6dbd169878942691ba523fa55242983526e26a11a83b06c9407e5e46280df"
}
```

Applicable testable layers for this bugfix: **API/endpoint** (backend, new regression test only — no DTO changes) and **Frontend behavior** (rename + mock removal). Data model, repository, and business-logic layers are not touched — the backend DTOs already use `org_id`; only frontend field names and frontend-only mock routes change.

## Steps

- [ ] Step 1: Verify test runners. Record exact unit-scoped commands: `pnpm --filter web exec vitest run src/hooks/useTeams.test.ts src/components/teams/TeamSwitcher.test.tsx ../../tests/components/forms/TeamForm.test.tsx` (frontend) and `uv run pytest tests/contract/schema_matching/test_team_schema_drift.py tests/integration/api/test_team_api.py -q` (backend, run from `apps/api`).
- [ ] Step 2: **Frontend behavior — implement (FR1.1, FR2.1)**. Rename `CreateTeamRequest.organization_id` → `org_id` in `apps/web/src/lib/api/teamApi.ts`, and `TeamSchema.organization_id` → `org_id` in `apps/web/src/lib/api/schemas/teamApi.ts`.
- [ ] Step 3: **Frontend behavior — implement (FR1.2)**. Update the call site in `apps/web/src/components/forms/TeamForm.tsx` (`onSubmit`) to pass `org_id: organizationId` instead of `organization_id: organizationId`.
- [ ] Step 4: **Frontend behavior — implement (FR2.2, mechanical consequence of Step 2)**. `apps/web/src/hooks/useTeams.ts` redeclares `UseTeamsReturn.createTeam`'s parameter type with its own local `organization_id: string` field (a duplicate of `CreateTeamRequest`, not derived from it) — rename to `org_id` there too, so the hook's declared type stays consistent with the renamed `CreateTeamRequest`.
- [ ] Step 5: **Frontend behavior — implement (FR3.1, FR3.2, FR4.1)**. Delete the three mock BFF route files: `apps/web/src/app/api/v1/teams/route.ts`, `apps/web/src/app/api/v1/teams/[id]/route.ts`, `apps/web/src/app/api/v1/teams/org/[orgId]/route.ts`. Once deleted, `next.config.ts`'s existing `fallback` rewrite (already correctly configured — no change needed there) resolves all three routes against the real FastAPI backend, including `PATCH /api/v1/teams/{id}` (`teamApi.update()`), which resolves FR4.1 with no separate code change.
- [ ] Step 6: **Frontend behavior — write and run tests after implementation (mechanical, consequence of Steps 2-4)**. Update the three existing test files whose literals still use `organization_id` for the `team` domain, so they match the renamed contract: `apps/web/src/hooks/useTeams.test.ts` (mock `Team` objects + `createTeam` call assertion), `apps/web/src/components/teams/TeamSwitcher.test.tsx` (mock `Team` objects, now typed against `TeamListResponse`), `apps/web/tests/components/forms/TeamForm.test.tsx` (`createTeam` call assertion). These are not new test scenarios — they assert the same behavior against the corrected field name.
- [ ] Step 7: **API/endpoint — write and run tests after implementation (FR3.3, targeted regression)**. Add `apps/api/tests/integration/api/test_team_api.py`: an `AsyncClient`/`ASGITransport` integration test (same pattern as `test_team_invitation_api.py`) that POSTs the frontend's now-corrected payload shape (`{"name": ..., "org_id": ...}`) to `/api/v1/teams`, with `get_team_repository` mocked (no DB), and asserts `201` plus `org_id` present in the response body. This is the narrowest test that reproduces and proves the fix for the exact reported defect: the real backend, exercised end-to-end, now accepts the corrected wire shape.
- [ ] Step 8: **API/endpoint — write and run tests after implementation (FR5.1, FR5.2)**. Add `apps/api/tests/contract/schema_matching/test_team_schema_drift.py`: a Layer 3 schema-matching test (per `.skills/contract-testing/SKILL.md`) that introspects `CreateTeamRequest`/`TeamResponse` (Pydantic `model_fields`) and parses the corresponding TypeScript field names out of `teamApi.ts`/`schemas/teamApi.ts`, asserting the wire field names match — specifically that `org_id` (not `organization_id`) is present on both sides for both the request and response shapes. This is the permanent regression against this bug class recurring.
- [ ] Step 9: Documentation and traceability — write `code-summary.md` and `traceability.json`.

## Deviations from the approved requirements.md (documented here per the construction protocol — mechanical consequences of already-approved FRs, not new design decisions)

- `useTeams.ts`'s locally-redeclared `createTeam` parameter type (Step 4) was not named in `requirements.md` FR2.2 by file path, but is the exact "code that consumes the field" FR2.2 describes — renaming it is required for the interface to stay internally consistent after Step 2, not a new scope item.
- Steps 6's three test-file edits are direct mechanical consequences of the FR1/FR2 field rename (existing assertions on the old field name would otherwise fail), not new test scenarios — consistent with the already-learned project convention that FR-consequence test fixes don't require a fresh approval round.
