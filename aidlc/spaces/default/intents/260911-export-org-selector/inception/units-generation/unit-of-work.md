# Unit of Work — 260911-export-org-selector

`domain-design` fue SKIP (sin building blocks nuevos). Este catálogo
deriva la frontera del único Unit directamente de la estructura ya
establecida del monorepo (`apps/web` vs. `apps/api`) y de `requirements.md`/
`stories.md` — patrón ya confirmado en intents previos cuando Domain
Design se salteó legítimamente. Por el mismo motivo, `decisions.md`
(`consumes: required: false`) tampoco existe — `domain-design` es la
etapa que lo produce, y al no haber corrido no hay ADRs de boundary que
consumir acá; no hay gap de fondo, solo ausencia consecuente del mismo
SKIP ya documentado arriba.

| Unit ID | Directory                  |
| ------- | -------------------------- |
| U1      | u1-export-org-confirmation |

## U1 — Export Org Confirmation

- **Description**: Cablea el flujo de exportar catálogo en `/catalog` al
  selector de organización global ya existente (`organizationStore.
viewingOrgId` / `OrganizationPicker`), y agrega el texto de confirmación
  destacado en `ExportSummaryBanner` (afirmado en `refined-mockups`).
- **Boundaries**: `apps/web` únicamente. No toca `apps/api` — el endpoint
  backend ya acepta `organization_id` desde el intent previo
  `260910-export-cross-org`.
- **Responsibilities**:
  - Leer `organizationStore.viewingOrgId` desde el flujo de export de
    `catalog/page.tsx` y pasarlo como `organization_id` a
    `exportCatalogClientFormat()` (FR1.1–FR1.4).
  - Mostrar el badge de confirmación de organización en
    `ExportSummaryBanner` cuando corresponda (FR1.3, AC1.1.5/AC1.1.6).
  - Mensaje específico de catálogo vacío cross-org (FR3.1/FR3.2, US2).
  - Sin cambios para usuarios sin `ORG_ADMIN_VIEW_ALL` (FR2.1/FR2.2, US3).
- **Deployment model**: embebido — parte del deploy normal de `apps/web`,
  no introduce un target de despliegue nuevo.
- **Complexity**: S — un hook de lectura de estado ya existente + un
  prop nuevo en un componente ya existente, sin componentes/entidades
  nuevos.
- **Kind**: `ui` — superficie frontend, sin contrato público nuevo, sin
  lógica de negocio nueva del lado servidor.
- **Implementation notes**: reutilizar `useOrganizations()`
  (`GET /api/v1/admin/organizations`, ya gateado por `ORG_ADMIN_VIEW_ALL`)
  para resolver el nombre de la organización — no `orgApi.list()` (shape
  distinto, ver `project.md` learning ya persistido). Seguir el patrón de
  mocks de `OrganizationPicker.test.tsx` para los tests nuevos.

## Review

**Verdict:** READY

**Findings:**

1. [Severidad: Minor] — Ninguno de los cuatro artefactos de esta etapa (`unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `units-generation-questions.md`) menciona `decisions.md` ni explica su ausencia, pese a que `decisions` es uno de los cuatro artefactos declarados en `consumes:` del stage file. La ausencia es legítima — `domain-design` fue SKIP, y `decisions.md` normalmente se produce ahí (confirmado: `inception/domain-design/` solo tiene `memory.md`, sin `decisions.md`) — pero a diferencia de `components.md`, cuya ausencia SÍ está documentada explícitamente (nota al inicio de este archivo y en `units-generation-questions.md`), la de `decisions.md` no lo está en ningún lado. — Ubicación: los 4 artefactos primarios (ausencia). — Recomendación: no bloqueante — `decisions` es `required: false` y su ausencia es consecuencia directa del mismo SKIP ya documentado para `components.md`; para simetría y para blindar el `upstream-coverage` sensor, agregar una frase breve (ej. en la nota ya existente sobre `components.md` ausente) aclarando que `decisions.md` tampoco existe por el mismo motivo.

Verificación de los 5 puntos del brief:

1. Un único Unit (`U1`, kind: `ui`) es razonable: las 3 historias (US1.1, US2.1, US3.1) tocan exclusivamente `ExportSummaryBanner`/`catalog/page.tsx` y el consumo de lectura de `organizationStore.viewingOrgId`, todo dentro de `apps/web`; no hay ningún FR/AC que cruce a `apps/api` (el backend ya está resuelto y explícitamente fuera de alcance — `requirements.md` § Out of Scope, § Constraints). Coincide con el criterio single-unit delivery ya usado en intents previos análogos (`260829-auth-navigation-refactor`, `260903-catalog-client-export`).
2. El bloque YAML de `unit-of-work-dependency.md` es válido: un solo nodo (`u1-export-org-confirmation`), `kind: ui` (valor permitido), `depends_on: []`, sin auto-referencia ni ciclos — trivialmente acíclico por tener un único nodo sin dependencias.
3. `traceability.json` cubre correctamente las 3 historias: `US1.1`, `US2.1`, `US3.1`, todas `status: "OK"` con `target: "U1"` — `U1` existe como Unit ID declarado en `unit-of-work.md` y aparece en la fila de cada historia en `unit-of-work-story-map.md` (US1.1→U1, US2.1→U1, US3.1→U1), consistente en ambas direcciones.
4. La sustitución de `components.md` ausente por `component-inventory.md`/`architecture.md` del codekb es una resolución razonable y ya documentada explícitamente (nota inicial de `unit-of-work.md` y sección dedicada en `units-generation-questions.md`), coherente con el patrón ya confirmado en `260829-auth-navigation-refactor` y `260903-catalog-client-export` para cuando Domain Design se saltea legítimamente por ausencia de building blocks nuevos.
5. El artefacto respeta la restricción de no recomendar orden de implementación: `unit-of-work-dependency.md` declara explícitamente "no recomienda orden de implementación — eso es de Delivery Planning (2.9)", y `unit-of-work-story-map.md` deja la sección "Orden de implementación dentro del Unit" sin secuencia prescrita, delegándola a 2.9/Functional Design — ningún artefacto sugiere un build order ni critical path.
