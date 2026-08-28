# Code Generation Plan — react-doctor cleanup

Traza a `requirements.md` (FR1, FR2.1–FR2.8, FR3, FR4). Metodología: test-after
(ver Testing Contract abajo) — implementar cada capa aplicable y después
escribir/correr sus tests. Test strategy Minimal, scope `refactor`: sin piso
de tests nuevo, la suite existente debe seguir en verde.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "refactor",
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
  "input_sha256": "sha256:52bf305ddbd99a02de02c9efbb0dc06294de14553cc14c775d07478852d96351",
  "contract_sha256": "sha256:55c8e62865b6a4f20d888b1ae6e4a31dfc6ef557aa6065d4d0a5d9747c1e5307"
}
```

Todos los items de este plan son refactors puros (sin lógica de negocio
nueva) sobre código ya existente y ya cubierto por tests — no se generan
tests nuevos por FR, se preserva la suite existente en verde (obligación de
scope) más al menos verificación de que el diagnostic específico se resuelve
(rescan de react-doctor, no un test nuevo).

## Pasos

### FR1 — Bailouts de React Compiler (5 fixes, receta ya confirmada)

- [ ] **Step 1** (FR1.1, story: FR1): `apps/web/src/app/onboarding/page.tsx` — 3 `try/catch/finally` (`checkSetup`, `completeSetup`, `handleStep1`). Receta: extraer a función a nivel de módulo cuando hay lógica de negocio en el `catch` (patrón ya validado en `migration-approval/page.tsx`), o `Promise#finally()` si el `catch` es un no-op silencioso.
- [ ] **Step 2** (FR1.2, story: FR1): `apps/web/src/components/forms/UnifiedProductForm.tsx:~470` — mismo patrón.
- [ ] **Step 3** (FR1.3, story: FR1): `apps/web/src/components/upload/BulkUploadCSV.tsx:~65` — mismo patrón.
- [ ] **Step 4**: Verificar Testing Contract (test-runner ya existe, brownfield: confirmar comando antes de tocar). Comando: `pnpm vitest run <archivo>.test.tsx` por archivo afectado (ver `unit-test-instructions.md`).
- [ ] **Step 5**: Correr lint + typecheck + tests de los 3 archivos + rescan de react-doctor, confirmar que los 5 `react-hooks-js/todo` desaparecen y no aparece ningún diagnostic nuevo en esos archivos.

### FR2.7 — Seguridad: tenant-static-proxy-risk (prioridad alta, categoría chica — se resuelve completa, no muestra)

- [ ] **Step 6** (story: FR2.7): `apps/web/src/lib/api/organizations.ts:187`, `apps/web/src/lib/api/userApi.ts:156`, `apps/web/src/lib/api/verticals.ts:138` — revisar el patrón de proxy de asset estático tenant-controlado, agregar validación/allowlist del origen si corresponde.
- [ ] **Step 7**: Verificar lint + typecheck + tests + rescan.

### FR2.1 — Zod v3→v4 (muestra representativa: 2 archivos)

- [ ] **Step 8** (story: FR2.1): `apps/web/src/lib/api/extractErrorMessage.ts` (alto apalancamiento, usado en todos los proxies) — migrar API deprecada a validadores top-level de Zod v4.
- [ ] **Step 9** (story: FR2.1): `apps/web/src/lib/api/schemas/appointments.ts` — mismo patrón, segundo caso para confirmar que la receta generaliza.
- [ ] **Step 10**: Verificar lint + typecheck + tests + rescan de esos 2 archivos.

### FR2.3 — Accesibilidad (muestra representativa: 1 archivo, cubre 2 reglas)

- [ ] **Step 11** (story: FR2.3): `apps/web/src/app/(admin)/admin/fb-accounts/[id]/page.tsx` — agregar `<label htmlFor>`/`aria-label` a los controles marcados por `control-has-associated-label` y `label-has-associated-control` en ese archivo.
- [ ] **Step 12**: Verificar lint + typecheck + tests + rescan.

### FR2.4 — Performance (muestra representativa: 1 archivo)

- [ ] **Step 13** (story: FR2.4): `apps/web/src/app/(admin)/admin/review-queue/page.tsx` — combinar iteraciones encadenadas (`js-combine-iterations`) donde sea seguro sin cambiar el resultado.
- [ ] **Step 14**: Verificar lint + typecheck + tests + rescan.

### FR2.6 — Bugs varios (muestra representativa: 2 casos, 1 por regla)

- [ ] **Step 15** (story: FR2.6): `apps/web/src/app/(admin)/admin/fb-accounts/page.tsx:226` — `no-locale-format-in-render`, mover el formateo de fecha fuera del render o memoizar correctamente.
- [ ] **Step 16** (story: FR2.6): `apps/web/src/app/api/v1/auth/2fa/disable/route.ts:23` — `no-fetch-response-used-without-status-check`, chequear `response.ok`/status antes de consumir el body.
- [ ] **Step 17**: Verificar lint + typecheck + tests + rescan.

### FR2.8 — deslop unused-dependency (categoría chica — se resuelve completa)

- [ ] **Step 18** (story: FR2.8): `package.json` — identificar y remover la dependencia y dev-dependency no usadas que reporta react-doctor.
- [ ] **Step 19**: Verificar `pnpm install` + typecheck + tests + rescan (confirmar que remover la dependencia no rompe nada).

### FR2.2 — deslop unused-export / unused-file (muestra representativa: revisión manual, sin borrar en este pase)

- [ ] **Step 20** (story: FR2.2): Sin herramienta de segunda opinión (`knip`/`ts-prune`) en el proyecto — para esta muestra, confirmar MANUALMENTE (grep de imports/referencias) que 2-3 candidatos listados por react-doctor son genuinamente inalcanzables, y documentar el resultado en `code-summary.md` **sin borrar archivos todavía** (riesgo de falso positivo más alto que las demás categorías; borrar código muerto queda para el checkpoint de aprobación de esta categoría, no automático).

### FR2.5 — no-giant-component / only-export-components (DIFERIDO, no ejecutado en este pase)

- [ ] **Step 21**: `UnifiedProductForm.tsx` (1226 líneas) y `category-schema-editor.tsx` (1156 líneas) requieren un split estructural real (extraer subcomponentes, mover lógica a hooks) — no es un fix mecánico de 1 línea como las demás categorías. Documentar en `code-summary.md` la estrategia recomendada (por sección funcional del formulario) como input para un intent futuro, sin tocar el archivo en este pase — el riesgo de romper comportamiento en un componente de 1200+ líneas sin design previo no es aceptable dentro de un checkpoint de "muestra representativa".

### Cierre

- [ ] **Step 22**: Generar `code-summary.md` (archivos tocados, decisiones clave, cobertura de tests, desviaciones del plan — incluyendo FR2.2 y FR2.5 como "muestreado sin aplicar" / "diferido").
- [ ] **Step 23**: Generar `traceability.json` mapeando cada FR/FR.m tocado a su archivo.
