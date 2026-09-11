# Code Generation Plan — u1-export-org-confirmation

Unit kind `ui`, scope `classic`, Test Strategy `Standard`. Fuente de verdad:
`functional-design/functional-spec.md` + `frontend-components.md`,
`refined-mockups/interaction-spec.md` (badge, texto exacto "Exportando
catálogo de: {organización}", estilo destacado/badge con ícono, Q2), y
`nfr-design/*` (sin patrón técnico nuevo — solo consumir mecanismos ya
existentes).

Story-to-code traceability: US1 (AC1.1.1–AC1.1.6) → Steps 2–4; US2
(AC2.1.1–AC2.1.2) → Step 5; US3 (AC3.1.1–AC3.1.3) → Steps 2–5 (comportamiento
por ausencia de cambio, verificado explícitamente por test negativo).

## Archivos afectados

- `apps/web/src/lib/api/products.ts` — `exportCatalogClientFormat()` acepta
  `organizationId?: string` opcional.
- `apps/web/src/app/(seller)/catalog/page.tsx` — resuelve la organización de
  export desde `organizationStore.viewingOrgId` + `useOrganization()`
  (ya existente, mismo query cacheado que ya dispara `OrganizationPicker`
  en el Header — sin fetch nuevo, confirmado en `nfr-design/performance-design.md`);
  `ExportSummaryBanner` recibe y renderiza el prop `organization`;
  `handleExportClientFormat` pasa el `organization_id` condicional y
  bifurca el mensaje de 404.
- `apps/web/tests/components/catalog/CatalogPage.test.tsx` — extendido
  (archivo ya existente, mismo patrón `tests/components/{module}/X.test.tsx`
  ya usado para este componente exacto; resuelve la ambigüedad de ubicación
  que `team.md`/Testing Contract dejaba pendiente, para ESTE archivo
  puntual, siguiendo su propio precedente ya establecido).
- `apps/web/tests/unit/lib/api/products.test.ts` — nuevo, cubre
  `exportCatalogClientFormat()` con/sin `organizationId`.

## Testing Contract

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

Este Unit es 100% "Frontend behavior" en `plan_profile.testable_layers` — no
hay capa de datos/repositorio/dominio/API nueva (el backend ya está resuelto
en `260910-export-cross-org`). Los pasos numerados abajo colapsan las
capas inaplicables y aplican el ciclo test-after solo a la capa Frontend,
en dos componentes: `products.ts` (cliente API) y `catalog/page.tsx` (UI).

## Pasos

- [ ] **Step 1 — Verificar el runner existente**: confirmar el comando
      exacto de test para este Unit antes del primer ciclo test-after:
      `pnpm --filter web exec vitest run tests/components/catalog/CatalogPage.test.tsx tests/unit/lib/api/products.test.ts`
      (ejecutado desde `apps/web`, ver `unit-test-instructions.md`).

- [ ] **Step 2 — `exportCatalogClientFormat()` acepta `organizationId?`
      (Frontend behavior — implementar)**: en `apps/web/src/lib/api/products.ts`,
      cambiar la firma a `exportCatalogClientFormat(organizationId?: string):
Promise<Response>`. Cuando `organizationId` está presente, agregar
      `?organization_id=<id>` (URL-encoded) a la URL del `fetch`; cuando no,
      mantener la URL actual sin cambios (AC1.1.2/AC3.1.2). Traza: AC1.1.1,
      AC1.1.2, AC3.1.2.

- [ ] **Step 3 — Test de `exportCatalogClientFormat()` (Frontend behavior
      — test after)**: `apps/web/tests/unit/lib/api/products.test.ts` (nuevo).
      Dos casos: (a) sin argumento → la URL fetcheada NO incluye
      `organization_id`; (b) con un id → la URL fetcheada incluye
      `?organization_id=<id>` URL-encoded. Traza: AC1.1.1, AC1.1.2.

- [ ] **Step 4 — Resolver `organization` de export en `CatalogPage`
      (Frontend behavior — implementar)**: en `catalog/page.tsx`, importar
      `useOrganization` de `@/lib/api/organizations` y `useOrganizationStore`
      de `@/stores/organizationStore` (mismo query cacheado ya disparado por
      `OrganizationPicker` en el Header — sin fetch nuevo). Leer
      `viewingOrgId` del store y calcular:

  ```tsx
  type ExportOrganization =
    { kind: "own" } | { kind: "loading" } | { kind: "cross-org"; name: string };

  const exportOrganization: ExportOrganization = !viewingOrgId
    ? { kind: "own" }
    : viewingOrganization?.name
      ? { kind: "cross-org", name: viewingOrganization.name }
      : { kind: "loading" };
  ```

  (exactamente el `Usage Example` de `refined-mockups/interaction-spec.md`
  — `"loading"` cubre tanto "nombre pendiente" como "organización borrada/
  inaccesible", per Q2 de `functional-design-questions.md`, paso 3d de
  `functional-spec.md`). Traza: AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4.

- [ ] **Step 5 — `ExportSummaryBanner` recibe y renderiza `organization`
      (Frontend behavior — implementar)**: agregar el prop
      `organization: ExportOrganization` a `ExportSummaryBanner`. Cuando
      `kind !== "own"`, renderizar un badge destacado (ícono `Building2` +
      texto en negrita, estilo pill — Q2 de `refined-mockups`, NO texto plano)
      ENCIMA del contenido actual del banner (nunca in-line con el párrafo
      existente, según `interaction-spec.md` § Responsive):
  - `kind === "cross-org"` → texto exacto `Exportando catálogo de:
{name}` (Q1 de `refined-mockups`).
  - `kind === "loading"` → mismo badge, contenido en placeholder/skeleton
    (`data-testid="export-summary-org-badge-skeleton"`) — NUNCA ausente
    ni vacío (hallazgo Major del reviewer de Refined Mockups: el estado
    "loading" debe ser visualmente indistinguible de "cargando", pero
    SIEMPRE distinguible de "own" — jamás se omite el badge cuando
    `viewingOrgId` está seteado).
  - `kind === "own"` → sin badge, contenido actual sin cambios
    (AC1.1.6).
    `role="status"` ya existente en el banner cubre el badge (sin
    `aria-live` nuevo, per `interaction-spec.md` § Accessibility). Traza:
    AC1.1.1, AC1.1.4, AC1.1.5, AC1.1.6.

- [ ] **Step 6 — Wiring del `organization_id` + mensajes 404 bifurcados
      en `handleExportClientFormat` (Frontend behavior — implementar)**:
  - Pasar `organization_id` = `viewingOrgId` a `exportCatalogClientFormat()`
    únicamente cuando `exportOrganization.kind !== "own"`; `undefined` en
    caso contrario (AC1.1.1, AC1.1.2, AC3.1.2).
  - En la rama `res.status === 404`, bifurcar el mensaje:
    - `exportOrganization.kind === "cross-org"` → `` `${exportOrganization.name}
no tiene catálogo publicado para exportar.` `` (AC2.1.1).
    - `exportOrganization.kind === "loading"` → texto fallback exacto
      `"Esta organización no tiene catálogo publicado para exportar."`
      (Q3 de `functional-design-questions.md`; cubre tanto "nombre no
      resuelto a tiempo" como "organización borrada/inaccesible").
    - `exportOrganization.kind === "own"` → mensaje genérico YA
      EXISTENTE sin cambios: `"No hay productos publicados para
exportar."` (AC2.1.2 — cero cambios para el caso propio).
  - Pasar `organization={exportOrganization}` en el call site de
    `<ExportSummaryBanner ... />`.
  - Sin cambios en el manejo de 413/`!res.ok`/catch de red (boundary ya
    existente de `260903-catalog-client-export`, confirmado en
    `functional-spec.md` paso 6 y mandate Q6 de manejo de errores
    centralizado).

- [ ] **Step 7 — Tests de `CatalogPage` (Frontend behavior — test
      after)**: extender `tests/components/catalog/CatalogPage.test.tsx`
      (archivo ya existente para este componente — mismo patrón, mismos
      mocks globales de `DropdownMenu` en `tests/setup.tsx`). Mockear
      `@/lib/api/organizations` (`useOrganization`) y
      `@/stores/organizationStore` (`useOrganizationStore`) siguiendo el
      precedente de mocks de `OrganizationPicker.test.tsx` (selector-consuming
      mock). Casos (Standard: 5-8 tests, cubre AC1.1.1–AC1.1.6, AC2.1.1–AC2.1.2,
      AC3.1.1–AC3.1.3 + el piso de equipo Q1.1/Q1.2/Q1.3 del Testing
      Contract):
  1. `viewingOrgId` null → el banner NO muestra badge de organización, y
     `exportCatalogClientFormat` se llama SIN `organization_id`
     (AC1.1.2, AC1.1.6, AC3.1.2 — piso de equipo punto 1, camino "sin
     permiso"/"propia org" son observacionalmente idénticos).
  2. `viewingOrgId` seteado + nombre ya resuelto → el banner muestra
     `"Exportando catálogo de: {name}"`, y `exportCatalogClientFormat`
     se llama CON ese `organization_id` (AC1.1.1, AC1.1.5 — piso de
     equipo punto 2, wiring nuevo).
  3. `viewingOrgId` seteado + nombre NO resuelto (`useOrganization`
     devuelve `organization: undefined`) → el banner muestra el badge en
     estado skeleton, NUNCA idéntico al banner sin badge (AC1.1.4,
     verificable comparando que el badge esté presente en el DOM en
     ambos casos "loading" y "cross-org", ausente solo en "own").
  4. 404 con `viewingOrgId` seteado + nombre resuelto → toast menciona
     el nombre de la organización (AC2.1.1).
  5. 404 con `viewingOrgId` seteado + nombre NO resuelto (borrada/
     inaccesible) → toast muestra el fallback genérico exacto (Q3,
     nota no-bloqueante de US1 sobre organización borrada).
  6. 404 sin `viewingOrgId` (propia org) → toast muestra el mensaje
     genérico YA EXISTENTE sin cambios (AC2.1.2 — pin de regresión, no
     debe cambiar el string ya cubierto por un test anterior de este
     archivo).
  7. `viewingOrgId` y el store compartido: el mismo valor leído por
     `organizationStore.viewingOrgId` es el que llega al `organization_id`
     de la request — no se introduce un segundo mecanismo de estado
     paralelo (AC1.1.3, AC1.1.4 — piso de equipo punto 3; alcanza con
     mockear el store una vez y verificar que ambos consumidores
     leerían el mismo valor, sin test de integración cross-componente).
  8. DOM sin elementos nuevos cuando `viewingOrgId` es null (equivalente
     al caso "sin permiso", ya que el store nunca setea un valor sin
     `ORG_ADMIN_VIEW_ALL"): ningún nodo con texto/role/`data-testid`relacionado a organización aparece en el flujo completo de export
(menú, banner, prompt) — AC3.1.1, AC3.1.3, verificable por`screen.queryByTestId`/`queryByText` en vez de inspección visual.

- [ ] **Step 8 — Correr vitest/tsc/eslint sobre los archivos tocados**
      (per `project.md` learning 260828-useeffect-to-react-query: no diferir
      toda verificación a Build and Test): `pnpm --filter web exec vitest run
tests/components/catalog/CatalogPage.test.tsx
tests/unit/lib/api/products.test.ts`, `pnpm --filter web exec tsc
--noEmit`, `pnpm --filter web exec eslint src/app/\(seller\)/catalog/page.tsx
src/lib/api/products.ts tests/components/catalog/CatalogPage.test.tsx
tests/unit/lib/api/products.test.ts`.

- [ ] **Step 9 — `code-summary.md` + `traceability.json`**: documentar
      archivos tocados, decisiones clave, cobertura de tests, y mapear cada
      AC/NFR a su archivo/test concreto (Step 5 de este stage file).

## Fuera de alcance (confirmado, sin ambigüedad)

- `OrganizationPicker` — sin cambios de ningún tipo (FR1.3, ya confirmado
  en `frontend-components.md`).
- Nombre del archivo descargado — sin cambios (Q3 de `stories.md`,
  explícitamente descartado).
- Manejo de 413/`!res.ok`/catch de red — boundary ya existente, sin
  cambios (mandate Q6 ya satisfecho en `260903-catalog-client-export`).
- Backend — ya resuelto en `260910-export-cross-org` (merged), sin
  cambios de este Unit.
