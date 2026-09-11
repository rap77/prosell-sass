# Code Generation — Plan Approval (Unit: u1-export-org-confirmation)

## Plan Approval

Resumen del plan (`code-generation-plan.md` + `unit-test-instructions.md`):

- **`exportCatalogClientFormat()`** (`apps/web/src/lib/api/products.ts`)
  acepta un `organizationId?: string` opcional; agrega `?organization_id=
<id>` a la URL cuando está presente, sin cambios cuando no.
- **`catalog/page.tsx`** resuelve `exportOrganization` (`"own" | "loading"
| "cross-org"`) leyendo `organizationStore.viewingOrgId` +
  `useOrganization()` (mismo query ya cacheado por `OrganizationPicker`
  en el Header — sin fetch nuevo). `ExportSummaryBanner` recibe ese prop
  y renderiza un badge destacado (ícono `Building2` + texto en negrita,
  "Exportando catálogo de: {name}") arriba del contenido existente,
  SIEMPRE visible (en skeleton) cuando `viewingOrgId` está seteado —
  nunca idéntico al caso "own". `handleExportClientFormat` pasa el
  `organization_id` condicional y bifurca el mensaje de 404 en 3 casos
  (cross-org con nombre / fallback genérico / mensaje ya existente sin
  cambios para la org propia).
- Sin cambios en `OrganizationPicker`, nombre de archivo descargado, o
  manejo de 413/red — todos boundary ya existentes.
- **Tests** (Standard, 8 casos nuevos en `CatalogPage.test.tsx` + 3 casos
  nuevos en `products.test.ts` nuevo): cubren las 11 AC de `stories.md` y
  los 3 puntos del piso de equipo del Testing Contract (regresión
  negativa sin permiso, wiring nuevo, mismo store sin estado paralelo).

**Testing Contract:**

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar la capa aplicable (en este intent, frontend)",
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
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar la capa aplicable (en este intent, frontend)\n  y luego escribir y correr los tests de esa capa, sin backfillear\n  cobertura en código pre-existente no tocado por el cambio.\n- Piso de cobertura asimétrico aceptado (40% frontend, sin piso enforced\n  en backend) — no forzar simetría.\n- CI corre la suite completa en cada push/PR; pre-push local corre\n  `pytest -q`.\n- Asimetría de gates de lint intencional (`next-lint` solo CI,\n  `react-doctor` bloqueante en pre-commit).\n\n**Sin especialización nueva de fondo para este intent** en metodología,\nordering, piso de cobertura general ni gates de CI — el marco general\nsigue vigente sin cambios (confirmado por el lead y las tres revisiones\nciegas sin objeción).\n\n**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la\nentrevista: \"A. Sí, afirmar los 3 puntos tal cual\") — no cambia el piso\ngeneral del proyecto, solo aplica al feature de selector de organización\npara export:**\n\n1. **Regresión negativa explícita de gating por permiso, no solo camino\n   feliz**: un caso de test donde el usuario NO tiene\n   `ORG_ADMIN_VIEW_ALL` debe demostrar que (a) el selector no se\n   renderiza / no está disponible en el flujo de export, y (b)\n   `exportCatalogClientFormat()` se invoca sin `organization_id` (o con\n   el comportamiento por defecto del propio tenant), nunca con un\n   `organization_id` ajeno — sigue el patrón ya establecido en `team.md`\n   de exigir casos límite explícitos, no solo un camino feliz.\n2. **Test del wiring nuevo**: confirmar que el `organization_id` elegido\n   llega correctamente a `exportCatalogClientFormat()` — es superficie de\n   test completamente nueva, no hay nada pre-existente que \"mantener en\n   verde\" acá.\n3. **Si la vía de diseño elegida en Requirements/Functional Design\n   reutiliza `organizationStore.viewingOrgId`** (el mecanismo global ya\n   existente): verificar que consumirlo desde el flujo de export no\n   rompe el consumo existente del `OrganizationPicker` en el header —\n   mismo store, dos consumidores; alcanza con confirmar que el selector\n   de export lee/escribe el mismo store sin introducir un segundo\n   mecanismo de estado paralelo, no hace falta un test de integración\n   cross-componente completo.\n\n`OrganizationPicker.test.tsx` es directamente reusable como precedente de\nmocks (`useAuth`, `useOrganizations`, `useOrganizationStore`) para\ncualquiera de las dos vías de diseño — Build and Test debe reusar ese\nmismo patrón de mocks en vez de inventar uno nuevo.\n\n**Gap heredado, no resuelto por este intent (documentado por\ntrazabilidad, no piso nuevo)**: `team.md` ya deja pendiente para Build\nand Test cuál convención de ubicación de test aplica a\n`catalog/page.tsx` (no calza limpio en\n`tests/components/{module}/X.test.tsx` ni en el patrón co-located de\npáginas admin). Este intent agrega tests nuevos exactamente en esa zona\ngris — Build and Test debe resolver explícitamente cuál convención aplica\nantes de escribir los tests del selector/wiring, para no reabrir la\nambigüedad por segunda vez sin decisión. Si la vía elegida reutiliza\n`OrganizationPicker`, el precedente ya es claro (co-located en\n`components/admin/`); si es un selector local nuevo, hereda la misma\nambigüedad que `catalog/page.tsx`."
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
  "input_sha256": "sha256:7d0563f2f0cd7c78c012496ae6cda4c8854f186573001906a3bb524c4028e459",
  "contract_sha256": "sha256:cd46a01a7c0858635820f851d374735ffb2b1d751997419fc437cc802e0adea3"
}
```

[Approval Fingerprint]: sha256:32b4e9230c0e08a941384d9dc43d9f2ec31aacad5c009c88f34759570b4dedf5

- "Approve Plan" — proceed to code generation
- "Request Changes" — revise the plan

[Answer]: Approve Plan
