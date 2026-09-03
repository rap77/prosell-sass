# Code Generation Plan — Migración Zod 3 → Zod 4

Zero-Unit (scope `refactor`, sin Units Generation). Todos los pasos aplican a `apps/web` únicamente.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar la capa aplicable (backend o frontend según el",
  "scope": "refactor",
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
  "input_sha256": "sha256:a5c8ce6a96660e36580ef329fa06d75fc616daa0e4ec6cfa4e1ab9fdef0dc8b7",
  "contract_sha256": "sha256:291a4c499139e4d63ccb3c68ec607b7eab42045a6980bf81158f0ed1050b8ac2"
}
```

## Applicable layers

Only **Frontend behavior** applies — this is a `apps/web`-only validation-syntax migration. No data-model, repository, or API/endpoint layer changes (backend is Python/Pydantic, out of scope per requirements.md).

## Plan Steps

- [ ] **Step 1** — Verify the existing test runner/configuration and record the exact unit-scoped command (`pnpm vitest run <path>`). [Testing Contract runner step]
- [ ] **Step 2** — FR1.1/FR1.2: Migrate `.passthrough()` → `z.looseObject({...})` in the 13 non-outlier files (36 call sites total across 14 files; see file:line list in `code-summary.md`):
      `apps/web/src/lib/api/schemas/orgApi.ts`, `category.ts`, `vendedores.ts`, `organizations.ts`, `productImageUrls.ts`, `leads.ts`, `walletApi.ts`, `authRoutes.ts`, `appointments.ts`, `authApi.ts`, `teamApi.ts`, `apps/web/src/lib/api/verticals.ts`, `apps/web/src/lib/api/extractErrorMessage.ts`.
      → US1 / FR1
- [ ] **Step 3** — FR1.3: Reword the 8 header doc-comments that mention `.passthrough()` in prose (confirmed exact 8: `orgApi.ts`, `authApi.ts`, `teamApi.ts`, `productImageUrls.ts`, `leads.ts`, `category.ts`, `walletApi.ts`, `organizations.ts`) to say `z.looseObject()`. → FR1
- [ ] **Step 4** — FR1.4: `UnifiedProductForm.tsx` — add `FIXED_FIELDS_SCHEMA_LOOSE = z.looseObject({ ...same shape... })` derived variant; replace the line-483 `FIXED_FIELDS_SCHEMA.passthrough().parse(data)` call with `FIXED_FIELDS_SCHEMA_LOOSE.parse(data)`. Leave `FIXED_FIELDS_SCHEMA` (line 99) and its line-290 `.merge(attrSchema)` strict usage untouched. → FR1
- [ ] **Step 5** — FR2.1/FR2.2: Migrate `z.nativeEnum(LeadStatus)` (leads.ts:51,69,70) and `z.nativeEnum(AppointmentStatus)` (appointments.ts:31) → `z.enum(LeadStatus)` / `z.enum(AppointmentStatus)`. → FR2
- [ ] **Step 6** — Write and run tests for the Frontend behavior layer covering FR1/FR2 (see `unit-test-instructions.md`). [test-after ordering: implement layer, then test]
- [ ] **Step 7** — FR3: Delete the `### Zod 3 Syntax (until issue #74 is resolved)` block (lines 124-139) from `AGENTS.md` in full, including its GGA-facing closing instruction. → FR3
- [ ] **Step 8** — FR4: Delete `apps/web/src/lib/zod-resolver.ts` (confirmed zero imports across the codebase). → FR4
- [ ] **Step 9** — FR5: Migrate `apps/web/src/app/(seller)/settings/profile/page.tsx:28` from `.string().email({ message: "Correo inválido" })` to `z.email({ error: "Correo inválido" })`. → FR5
- [ ] **Step 10** — Write and run a test for FR5's validation behavior (see `unit-test-instructions.md`). [test-after ordering]
- [ ] **Step 11** — Environment/build configuration: none needed — `zod ^4.4.0` and `@hookform/resolvers ^5.4.0` are already installed (confirmed in Reverse Engineering).
- [ ] **Step 12** — NFR2 empirical verification: run the pre-commit pipeline (or at minimum GGA, `pnpm eslint`, `pnpm tsc --noEmit`) against the migrated files to confirm the FR3 deletion actually unblocks GGA — this was flagged as an open question in requirements.md, not yet empirically confirmed.
- [ ] **Step 13** — Run the full frontend suite (`pnpm --filter web vitest run`) to confirm NFR1 (zero regression, existing suite green).
- [ ] **Step 14** — Documentation and traceability: write `code-summary.md` and `traceability.json`.

## Story-to-code-step traceability

| Plan Step | Requirement       |
| --------- | ----------------- |
| 2, 3, 4   | FR1 (FR1.1-FR1.4) |
| 5         | FR2 (FR2.1-FR2.2) |
| 7         | FR3               |
| 8         | FR4               |
| 9         | FR5               |
| 6, 10, 13 | NFR1              |
| 12        | NFR2              |
