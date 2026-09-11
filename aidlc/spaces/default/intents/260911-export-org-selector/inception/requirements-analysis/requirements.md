# Requirements — 260911-export-org-selector

## Intent Analysis

El backend ya soporta exportar el catálogo de otra organización en formato
cliente (`GET /api/v1/products/export-client-format.zip?organization_id=...`,
resuelto en el intent `260910-export-cross-org`, merged en `264d99f1` —
documentado en `aidlc/spaces/default/codekb/prosell-sass/api-documentation.md`).
Lo que falta es exclusivamente el lado de uso real desde `/catalog`: hoy
`exportCatalogClientFormat()` (`apps/web/src/lib/api/products.ts:1541`) nunca
manda `organization_id`, y no hay ningún punto de la UI de export donde un
usuario con `ORG_ADMIN_VIEW_ALL` pueda elegir otra organización.

El objetivo real del usuario no es "agregar un componente de selector" sino
"que el permiso cross-org ya implementado en el backend sea efectivamente
usable desde la pantalla real de exportar catálogo" — cerrar el gap
UI↔backend documentado en `business-overview.md` (sección de export
cross-org, actualizada en el focused scan de este intent).

Durante Requirements Analysis se resolvió la bifurcación de diseño que
Reverse Engineering había dejado abierta (`architecture.md`, Interaction
Diagram #14): en vez de agregar un selector nuevo, el intent reutiliza el
mecanismo global ya existente y documentado en `component-inventory.md`
(`OrganizationPicker` / `organizationStore.viewingOrgId`, hoy dormido) — el
export se convierte en su primer consumidor real de datos.

## Functional Requirements

### FR1 — Export usa la organización actualmente seleccionada en el selector global

**FR1.1** — Cuando un usuario con permiso `ORG_ADMIN_VIEW_ALL` exporta el
catálogo en formato cliente desde `/catalog`, `exportCatalogClientFormat()`
debe enviar como `organization_id` el valor actual de
`organizationStore.viewingOrgId` (el mismo store que ya alimenta
`OrganizationPicker` en el header) — no un valor fijo a la organización
propia del usuario.

**FR1.2** — Cuando `viewingOrgId` no está seteado (comportamiento por
defecto: ninguna organización distinta elegida en el header), el export
debe comportarse igual que hoy: exportar la organización propia del
usuario, sin enviar `organization_id`.

**FR1.3** — No se agrega ningún selector de organización nuevo dentro del
flujo de export (`ExportSummaryBanner`, menú de exportar, o cualquier otro
punto de `catalog/page.tsx`). El punto de elección de organización sigue
siendo, exclusivamente, `OrganizationPicker` en el header — ya existente,
ya testeado, ya gateado por permiso.

**FR1.4** — El export no fuerza ni resetea `viewingOrgId` al abrirse. Usa
el valor que el usuario ya haya elegido en el header en ese momento, tal
cual esté, sin efectos secundarios sobre el estado global.

### FR2 — Usuarios sin permiso no ven ningún cambio

**FR2.1** — Un usuario SIN `ORG_ADMIN_VIEW_ALL` no ve `OrganizationPicker`
(comportamiento ya existente del componente — `!isAdmin` → no se
renderiza) y su export sigue funcionando exactamente igual que hoy:
siempre exporta su propia organización, sin `organization_id`.

**FR2.2** — Ningún cambio de este intent debe ser visible en la UI de
`/catalog` para un usuario sin el permiso — cero elementos nuevos, cero
comportamiento distinto.

### FR3 — Mensaje específico cuando la organización elegida no tiene catálogo

**FR3.1** — Cuando el usuario exporta con `organization_id` de una
organización distinta a la propia, y esa organización no tiene productos
`published` (el endpoint responde 404, comportamiento ya implementado en
`export_catalog_client_format.py`), el frontend debe mostrar un mensaje
específico que mencione la organización elegida (ej. el `name` de la
organización, ya disponible vía `useOrganizations()` /
`GET /api/v1/admin/organizations`) — no el mensaje de error genérico
actual.

**FR3.2** — Cuando el 404 ocurre exportando la organización PROPIA (sin
`organization_id`), el mensaje se mantiene igual que hoy — este cambio de
mensaje aplica solo al caso cross-org (FR3.1).

## Non-Functional Requirements

### NFR1 — Seguridad: gating por permiso puntual, no por proxy de rol

El punto de origen del `organization_id` (`OrganizationPicker`) ya
implementa doble guard: `!isAdmin` a nivel de render y un no-op en
`organizationStore.setViewingOrgId()` cuando el usuario no tiene
`ORG_ADMIN_VIEW_ALL` (`component-inventory.md`, sección `OrganizationPicker`).
Este intent no introduce ningún guard nuevo de UI — hereda el existente.
La autorización real y auditada de qué organización se puede exportar
sigue viviendo 100% en el backend (`_check_org_scope_permission()`, ya
testeado con 10/10 casos en `260910-export-cross-org`). Ningún cambio de
este intent puede exponer datos de una organización sin que el backend lo
autorice y audite (`logger.info()` por cada export cross-org, ya
implementado).

### NFR2 — Consistencia de estado entre el export y el resto de la app

Al reutilizar `organizationStore.viewingOrgId` (Zustand, ya usado
globalmente), el export debe leer el store sin introducir un segundo
mecanismo de estado paralelo para "qué organización estoy viendo" — ver
`team-practices.md` § Code Style (precisión ya documentada en Practices
Discovery).

## Constraints

- El backend del endpoint `GET /api/v1/products/export-client-format.zip`
  NO se modifica en este intent — ya acepta `organization_id` opcional y
  ya aplica el gate de permiso correcto (`api-documentation.md`).
- No se agregan dependencias nuevas ni componentes de UI nuevos —
  `OrganizationPicker`/`organizationStore` ya existen, están testeados y en
  producción.
- Naming en el boundary: `organizationId`/`viewingOrgId` en camelCase del
  lado frontend se convierte a `organization_id` recién al armar el query
  param hacia `exportCatalogClientFormat()`, siguiendo la convención ya
  vigente en `products.ts` (`team-practices.md` § Code Style).

## Assumptions

- **A1**: `organizationStore.viewingOrgId`, una vez que el export lo
  consuma, seguirá comportándose igual en el resto de la app (el header)
  — este intent no cambia el comportamiento de `OrganizationPicker` en sí,
  solo agrega un segundo consumidor de lectura. Riesgo: si en el futuro
  otro consumidor asume que `viewingOrgId` es exclusivo del header, este
  intent sería el primer caso que rompe ese supuesto implícito — vale la
  pena que Functional Design lo deje explícito en el diseño.
- **A2**: El `name` de la organización devuelto por
  `GET /api/v1/admin/organizations` (ya usado por `useOrganizations()`) es
  suficiente y apropiado para mostrar en el mensaje de FR3.1 (no hace
  falta un endpoint ni campo adicional).

## Out of Scope

- No se modifica el endpoint backend `export-client-format.zip` ni su
  lógica de permisos (ya resuelto en `260910-export-cross-org`).
- No se agrega ningún selector de organización nuevo — la bifurcación de
  diseño se resolvió a favor de reutilizar el mecanismo global existente
  (ver Q1/Q5 en `requirements-analysis-questions.md`).
- No se cambia el comportamiento de `OrganizationPicker` en el header
  (ubicación, guard de permiso, forma de setear `viewingOrgId`) — este
  intent solo agrega un consumidor de lectura nuevo.
- El gap de cobertura de test pre-existente de `handleExportCsv`/
  `exportCatalogCsv` (no relacionado a `organization_id`) no se resuelve
  en este intent — es código pre-existente no tocado por el cambio
  (`team-practices.md` § Testing Posture).
- No se resuelve la ambigüedad heredada de ubicación de test de
  `catalog/page.tsx` (co-located vs. `tests/components/`) — queda para
  Build and Test, según ya documentado en `team-practices.md`.

## Open Questions

- **OQ1**: `deriveRole.ts`/`useAuth.ts` gatea `OrganizationPicker` por
  `isAdmin` (proxy de rol), no por el permiso puntual `ORG_ADMIN_VIEW_ALL`
  directamente — hoy coinciden en la práctica (`ROLE_PERMISSIONS`), pero
  como este intent NO modifica `OrganizationPicker`, esta precisión
  señalada en Practices Discovery queda fuera del alcance real de este
  intent (no hay componente nuevo que gatear) — Functional Design debe
  confirmar explícitamente que no aplica, o si el equipo quiere
  aprovechar este intent para corregirlo en `OrganizationPicker` mismo
  (ampliaría el alcance más allá de lo pedido).
- **OQ2**: Confirmar en Functional Design el mecanismo exacto de lectura
  de `viewingOrgId` desde `catalog/page.tsx` (hook directo a
  `useOrganizationStore` vs. alguna capa de abstracción intermedia) —
  decisión de implementación, no de requisito.

## Review

**Verdict:** READY

**Findings:**

1. [Severidad: Minor] — `code-structure.md` (uno de los cuatro artefactos upstream declarados en `consumes:` del stage file, condicional a brownfield) nunca se cita en `requirements.md` — el documento cita `api-documentation.md`, `business-overview.md`, `architecture.md`, `component-inventory.md` y `team-practices.md` (múltiples veces), pero ninguna sección menciona convenciones de `code-structure.md` (p. ej. dónde debería vivir el código nuevo de consumo del store). — Ubicación: todo el archivo (ausencia). — Recomendación: no bloqueante para este gate — el intent es de alcance muy chico (un solo hook de lectura sobre un store ya existente) y las convenciones de ubicación de archivo ya están cubiertas indirectamente vía `team-practices.md` § Code Style; dejar constancia y, si Functional Design necesita precisión de estructura de carpetas, citar `code-structure.md` ahí.
2. [Severidad: Minor] — NFR2 ("Consistencia de estado entre el export y el resto de la app") está formulado como una restricción de implementación/convención de código (no reintroducir un segundo mecanismo de estado paralelo), no como un atributo de calidad medible (performance, seguridad, escalabilidad, confiabilidad u observabilidad) en el sentido que exige la plantilla del stage. — Ubicación: `## Non-Functional Requirements` → NFR2. — Recomendación: no bloqueante — es testeable tal cual está redactado (verificable por inspección de código / test de que no aparece un segundo store), pero encajaría con más precisión bajo `## Constraints` en una futura iteración.

Sin hallazgos Critical ni Major. Los IDs de FR/NFR son estables y correctos (`FR1`–`FR3.2`, `NFR1`–`NFR2`). Las respuestas del Q&A están reflejadas sin contradicción residual: la resolución de Q5 (el export sigue el valor actual del selector global, sin reset) reemplaza correctamente a la respuesta original de Q4 (reset a organización propia), y `requirements.md` implementa la resolución de Q5 (FR1.4), no la respuesta superada de Q4 — la nota de "respuesta superada" en el archivo de preguntas es coherente con el artefacto generado. La bifurcación de diseño (reutilizar el selector global en vez de agregar uno nuevo) está completamente reflejada, incluyendo el Out of Scope explícito de "no se agrega ningún selector de organización nuevo" (FR1.3, Out of Scope ítems 2–3). Los Open Questions OQ1 y OQ2 están acotados correctamente como decisiones de implementación/alcance para Functional Design, sin bloquear el gate. No se detectó ningún requisito testeable del pedido original ausente: el pedido verbatim ("no puedo elegir exportar el catálogo de otra organización... aunque en el resto de la app sí puedo") queda cubierto por FR1.1–FR1.4, y el piso de test afirmado en Practices Discovery (gating negativo, wiring, no-ruptura del consumidor existente del header) tiene correspondencia funcional directa en FR1/FR2.
