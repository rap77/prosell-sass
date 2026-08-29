# Code Generation Plan — Next.js / React version bump (apps/web)

Sin Unit (scope `express`, sin `units-generation`): esta etapa corre una sola iteración, sin ceremonia de Bolt/skeleton/swarm, según `stage-protocol-construction.md` §"Applicability" y la nota del stage file sobre directivas zero-Unit.

Traza a `requirements.md`: FR1, FR2, FR3 (FR3.1-FR3.3), FR4, FR5, NFR1-NFR5.

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
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
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
  "input_sha256": "sha256:44364bf5637ac0114353eb6ccd22fce3dc324acf9a77e1387c0b368eafced9af",
  "contract_sha256": "sha256:f85e912f690a168de9eb91013b6643e19e6923376ea6481d84f73ef8ac7847cc"
}
```

**Adaptación al cambio real**: no hay capas "Data model/Repository/Business logic/API/Frontend" nuevas — este cambio es un bump de dependencias de configuración (`package.json`). Se omiten esas capas por no ser aplicables (metodología intacta, solo se salta lo que no aplica, per `plan_profile.steps` adaptation rule). El paso "Frontend behavior" se reinterpreta como: verificar que la app sigue renderizando con las nuevas versiones (cubierto por la suite Vitest existente, no requiere test nuevo per FR/NFR).

## Steps

- [x] **Step 1** — Runner readiness: confirmar el comando de test existente (`pnpm --filter web vitest run` / equivalente) corre en verde ANTES del bump (baseline). Traza: NFR1. **Resultado**: 156 files, 1243 passed / 13 failed (pre-existentes) / 1256 total.
- [x] **Step 2** — Revisión de changelog: documentar en `code-summary.md` los hallazgos (o "sin hallazgos relevantes") de las release notes de Next.js 16.1.0→16.3.3 y React 19.2.0→19.2.8. Traza: FR5. **Resultado**: ver `code-summary.md` § Revisión de changelog.
- [x] **Step 3** — Actualizar `apps/web/package.json`: `next` `^16.1.0` → `^16.3.3`. Traza: FR1.
- [x] **Step 4** — Actualizar `apps/web/package.json`: `react` y `react-dom` `^19.2.0` → `^19.2.8`. Traza: FR2.
- [x] **Step 5** — Actualizar `apps/web/package.json`: `@types/react` y `@types/react-dom` `^19.0.0` → última versión de la línea 19.2.x. Traza: FR3.1, FR3.2.
- [x] **Step 6** — Actualizar `apps/web/package.json`: `eslint-config-next` `^16.1.0` → `^16.3.3`. Traza: FR3.3.
- [x] **Step 7** — Test file: `apps/web/tests/unit/config/package-versions.test.ts` — regresión de nivel-config (mismo patrón que `next.config.test.ts`/`tailwind.config.test.ts`) que importa `apps/web/package.json` y asegura que `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom` y `eslint-config-next` cumplen el piso `16.3.3`/`19.2.8`. Este es el único test NUEVO de este cambio — cubre el happy-path floor por componente (los pines) que exige Test Strategy Minimal; el resto de la verificación (NFR1, NFR4) reusa la suite existente, no requiere tests nuevos por decisión explícita del usuario en Requirements Analysis. Traza: FR1, FR2, FR3.
- [x] **Step 8** — `pnpm install` desde la raíz del monorepo para regenerar `pnpm-lock.yaml` reflejando los nuevos rangos. Traza: FR4.
- [x] **Step 9** — Correr `pnpm --filter web typecheck`. Traza: NFR2. **Resultado**: 0 errores.
- [x] **Step 10** — Correr `pnpm --filter web lint` (`--max-warnings=0`). Traza: NFR3. **Resultado**: 5 warnings nuevos encontrados y suprimidos con justificación (ver code-summary.md § Deviación); 0 warnings finales.
- [x] **Step 11** — Correr la suite completa de Vitest de `apps/web` (unit + componentes) y confirmar 0 regresiones nuevas vs. el baseline del Step 1. Traza: NFR1. **Resultado**: 157 files, 1247 passed / 13 failed (mismas pre-existentes) / 1260 total. 0 regresiones.
- [ ] **Step 12** — Correr la suite Playwright de `tests/e2e` contra la app ya actualizada. Traza: NFR4. **DEFERRED**: sin infraestructura (docker/Postgres) en este sandbox; decisión explícita del usuario de dejarlo como paso manual pre-merge (ver code-summary.md y traceability.json).
- [x] **Step 13** — Documentación: `code-summary.md` con archivos tocados, decisiones clave, hallazgos del Step 2, y resultado de Steps 9-12. Traza: FR5, todos los NFR.
- [x] **Step 14** — `traceability.json` mapeando cada FR/NFR a su archivo/test de evidencia.

Ningún paso toca `apps/api`, la raíz del monorepo (fuera de `pnpm-lock.yaml`), ni la versión propia de Playwright de `tests/e2e` — confirma NFR5.
