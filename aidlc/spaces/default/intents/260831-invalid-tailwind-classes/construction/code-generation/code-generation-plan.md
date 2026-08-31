# Code Generation Plan — Fix Invalid Tailwind Classes (publications/page.tsx)

Intent: `260831-invalid-tailwind-classes` | Scope: bugfix | Zero-Unit (no units-generation — incremental scope skips it by design)

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

**Methodology**: test-after. This is a config-value change (frontend layer only) — Data model, Repository, Business logic, and API/endpoint layers from the contract's `plan_profile.steps` are inapplicable and omitted; only "Frontend behavior" (here: build config) applies, per the contract's adaptation rule.

## Traceability

| Plan Step | Requirement                                          |
| --------- | ---------------------------------------------------- |
| Step 1    | FR1.1, FR1.2                                         |
| Step 2    | (verification, no new requirement)                   |
| Step 3    | FR3.1                                                |
| Step 4    | FR2.1 (satisfied transitively — see requirements.md) |

## Steps

- [ ] **Step 1: Extend `theme.extend.spacing`** — Add `"0.25": "0.0625rem"` and `"0.75": "0.1875rem"` to `apps/web/tailwind.config.ts`'s `theme.extend.spacing` block (lines 132-136), alongside the existing `"4.5"`/`"8.5"`/`"9.5"` entries. **Unit, not px** (per requirements.md Open Question OQ1 and the advisory reviewer's Major finding): the existing entries use the `step × 0.25rem` formula (`"4.5": "1.125rem"` = `4.5 × 0.25rem`), confirmed by direct read of the live file. `0.25 × 0.25rem = 0.0625rem`; `0.75 × 0.25rem = 0.1875rem`. Do not remove or reorder the existing 3 entries (FR1.2).
- [ ] **Step 2: Verify the test runner** — Confirm `apps/web/tests/unit/config/tailwind.config.test.ts` runs via the project's existing Vitest config (no new runner/config needed — reusing the established config-test pattern). Record the exact unit-scoped command below.
- [ ] **Step 3: Write and run the test** — Add 2 new test cases to `apps/web/tests/unit/config/tailwind.config.test.ts` (following the exact pattern of the 3 existing `4.5`/`8.5`/`9.5` assertions): one asserting `theme.extend.spacing["0.25"] === "0.0625rem"`, one asserting `theme.extend.spacing["0.75"] === "0.1875rem"`. Run the scoped test command and confirm both pass.
- [ ] **Step 4: Confirm no other file changes needed** — Per requirements.md FR2.1/FR2.2, no edits to `publications/page.tsx` are required; the existing `gap-1.25`/`p-0.75`/`mt-0.25`/`mb-0.75` class names become valid once Step 1 lands. No other file in the workspace is touched (FR2.2 out-of-scope boundary).

## Documentation and Traceability

- [ ] Write `code-summary.md` and `traceability.json` per stage protocol Step 5.
