# Functional Design — Preguntas (Unit: u1-export-org-confirmation)

Unit kind `ui` — sin `entities.md`/`rules.md` (produces_kinds las excluye
para este kind). `functional-spec.md` es autocontenido: especifica el
workflow de interacción y las transiciones de estado del banner
directamente desde `unit-of-work.md` y `requirements.md`, sin dependencia
de reglas de negocio de dominio (no hay entidades nuevas).

Quedan 3 Open Questions heredadas de etapas anteriores, explícitamente
diferidas a esta etapa — se resuelven acá:

**Cierre explícito de OQ2 (`requirements.md` § Open Questions)**: "Confirmar
en Functional Design el mecanismo exacto de lectura de `viewingOrgId`
desde `catalog/page.tsx` (hook directo a `useOrganizationStore` vs. alguna
capa de abstracción intermedia)". Respuesta: **hook directo** —
`functional-spec.md` § Workflow, paso 1, lee `organizationStore.viewingOrgId`
sin ninguna capa de abstracción intermedia, siguiendo el mismo patrón ya
usado por `OrganizationPicker`. OQ2 queda cerrada con esta decisión.

## Q1 — Gating por permiso puntual vs. proxy de rol (OQ1 de requirements.md)

`OrganizationPicker` ya gatea por `isAdmin` (booleano derivado de rol),
mientras que `organizationStore.setViewingOrgId()` ya gatea por el
permiso puntual `ORG_ADMIN_VIEW_ALL` (defensa en profundidad real). Este
intent NO modifica `OrganizationPicker` — solo consume `viewingOrgId` ya
existente. La pregunta es sobre el nuevo código de este Unit (lectura del
badge en `ExportSummaryBanner`): ¿tiene que agregar su PROPIO chequeo de
permiso, o alcanza con leer `viewingOrgId` tal cual (que ya solo puede
estar seteado a través de un flujo ya gateado)?

**Reconciliación con `team.md` § Code Style**: la precisión de Practices
Discovery ("el condicional del componente nuevo debe chequear el permiso
puntual `ORG_ADMIN_VIEW_ALL` directamente... no un proxy de rol como
`isAdmin`") se redactó pensando en la bifurcación (a) del diseño —
agregar un selector de organización NUEVO — que Requirements Analysis
terminó descartando (FR1.3, Out of Scope: sin selector nuevo, sin cambios
a `OrganizationPicker`). El badge de este Unit no es un condicional de
AUTORIZACIÓN — es de solo LECTURA de un valor (`viewingOrgId`) que ya
está gateado en su origen. Por eso esa precisión de `team.md` no aplica
acá: no hay ningún "condicional del componente nuevo" que chequee
permisos, porque el componente nuevo no toma ninguna decisión de
autorización — solo muestra lo que el store ya decidió mostrar.

```question
prompt: "El código nuevo de este Unit (badge en ExportSummaryBanner) ¿necesita su propio chequeo de ORG_ADMIN_VIEW_ALL, o alcanza con leer viewingOrgId tal cual (ya solo puede estar seteado por un flujo que el propio OrganizationPicker ya gatea)?"
header: "Gating"
multiSelect: false
options:
  - label: "A. Alcanza con leer viewingOrgId sin chequeo propio"
    description: "El valor de viewingOrgId ya es confiable — solo puede haber sido seteado por OrganizationPicker, que ya lo gatea con doble guard (render + store). Agregar un segundo chequeo sería redundante."
  - label: "B. Agregar un chequeo explícito igual en este Unit"
    description: "Por defensa en profundidad adicional, aunque sea redundante con el guard existente."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Alcanza con leer viewingOrgId sin chequeo propio

## Q2 — Organización borrada o inaccesible (nota diferida de User Stories/Refined Mockups)

```question
prompt: "Si viewingOrgId apunta a una organización que fue borrada o a la que el admin ya no tiene acceso, ¿qué debería pasar?"
header: "Org inaccesible"
multiSelect: false
options:
  - label: "A. Tratar igual que catálogo vacío (mensaje de US2, con fallback de nombre)"
    description: "useOrganizations() no devolvería esa organización en su lista — se usa el mismo fallback de nombre no disponible (Q3) y, si el export igual se intenta, el backend ya devuelve 403/404 según corresponda."
  - label: "B. Comportamiento distinto, específico para este caso"
    description: "Decime qué mensaje o comportamiento particular querés."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Tratar igual que catálogo vacío (mensaje de US2, con fallback de nombre)

## Q3 — Fallback cuando el nombre de organización no está en cache (AC2.1.1)

```question
prompt: "Cuando useOrganizations() no tiene todavía el nombre de la organización elegida (fallback ya previsto en AC2.1.1), ¿qué texto exacto se muestra?"
header: "Fallback"
multiSelect: false
options:
  - label: "A. \"esta organización\" (genérico, en minúscula, sin nombre propio)"
    description: "Ej. \"La organización esta organización no tiene catálogo publicado\" → mejor: \"Esta organización no tiene catálogo publicado para exportar\" (sin mencionar nombre)."
  - label: "B. Mostrar el ID de la organización como fallback"
    description: "Menos legible para el usuario, pero más preciso técnicamente."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. "esta organización" (genérico, en minúscula, sin nombre propio)

## Consolidated Summary Confirmation

- El nuevo código no agrega un chequeo de permiso propio — lee
  `viewingOrgId` tal cual, confiando en el doble guard ya existente de
  `OrganizationPicker`/`organizationStore`.
- Organización borrada/inaccesible se trata igual que catálogo vacío
  (mismo mensaje de fallback, mismo flujo de error).
- El texto de fallback cuando el nombre no está disponible es genérico:
  "Esta organización no tiene catálogo publicado para exportar" (sin
  mencionar nombre propio).
- Sin `entities.md`/`rules.md` (Unit kind `ui`) — `functional-spec.md`
  autocontenido especifica el workflow y las transiciones de estado del
  badge (own/loading/cross-org, ya definidas en Refined Mockups).
- OQ2 de `requirements.md` cerrada explícitamente: lectura directa del
  store (`organizationStore.viewingOrgId`), sin capa de abstracción.
- La precisión de `team.md` sobre chequear el permiso puntual
  directamente aplicaba al selector nuevo descartado (bifurcación a) —
  no al badge de solo lectura de este Unit, que no toma decisiones de
  autorización.

Los 2 hallazgos Minor del reviewer (cierre de OQ2 sin citar, falta de
reconciliación con `team.md`) ya quedaron corregidos directo en este
archivo, antes de este re-chequeo.

Does this all look correct before I generate the artifacts?

```question
prompt: "Does this all look correct before I generate the artifacts?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
