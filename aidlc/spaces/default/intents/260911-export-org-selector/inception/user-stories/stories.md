# User Stories — 260911-export-org-selector

Todas Must Have (afirmado en la entrevista, Q1). Trazan a `requirements.md`
(FR1–FR3.2, NFR1–NFR2) y a los artefactos de reverse-engineering
(`business-overview.md`, `component-inventory.md`) y practices-discovery
(`team-practices.md`) que documentan el mecanismo global reutilizado.

## US1 — Exportar el catálogo de otra organización

**US1.1**: As a Admin con permiso cross-org (Valeria), I want exportar el
catálogo en formato cliente de la organización que tengo elegida en el
selector del header, so that puedo generar el archivo para cualquier
organización que administro sin pasos extra ni tener que cambiar de
cuenta.

**Priority**: Must Have

**Acceptance Criteria**:

- **AC1.1.1**: Given tengo permiso `ORG_ADMIN_VIEW_ALL` y elegí la
  Organización B en el selector del header (`OrganizationPicker`), When
  hago click en "Exportar catálogo (formato cliente)" en `/catalog`, Then
  la request de export envía `organization_id` correspondiente a la
  Organización B (el contenido real del ZIP para esa organización ya está
  verificado del lado backend en `260910-export-cross-org` — este AC
  verifica el wiring del parámetro, no el contenido del archivo).
- **AC1.1.2**: Given no elegí ninguna organización distinta en el selector
  del header (comportamiento por defecto), When exporto el catálogo, Then
  la request de export NO envía `organization_id` — igual que el
  comportamiento actual.
- **AC1.1.3**: Given ya elegí la Organización B en el header para ver
  otras pantallas (ej. lista de productos), When abro el flujo de export
  sin cambiar nada, Then el export usa la Organización B automáticamente
  (mismo `organizationStore.viewingOrgId` que ya lee `OrganizationPicker`)
  — no hace falta volver a elegirla ni se resetea a mi organización
  propia.
- **AC1.1.4**: Given `OrganizationPicker` en el header sigue mostrando y
  permitiendo cambiar la Organización B (comportamiento ya existente, sin
  tocar), When el flujo de export lee `viewingOrgId` para armar su
  request, Then el valor leído por el header y por el export es
  exactamente el mismo (un único store, un único valor) — ningún
  mecanismo de estado paralelo nuevo se introduce para "qué organización
  estoy viendo" (cubre el punto 3 del piso mínimo de test afirmado en
  Practices Discovery).
- **AC1.1.5**: Given tengo una organización distinta a la mía elegida en
  el header, When abro el banner de confirmación de export
  (`ExportSummaryBanner`), Then el banner muestra un texto que confirma
  explícitamente el nombre de la organización que se va a exportar, antes
  de que confirme la descarga (judgment call de la ronda de mob, Q3
  afirmada: mitiga el riesgo de exportar la organización equivocada sin
  darse cuenta, dado que el selector vive en el header, lejos del botón
  de exportar). Esto es un agregado de TEXTO al banner ya existente, no un
  selector ni componente nuevo — no contradice la decisión de "sin UI
  nueva" de Requirements Analysis.
- **AC1.1.6**: Given exporto mi propia organización (sin elegir otra en
  el header), When abro el banner de confirmación, Then el banner NO
  necesita mostrar ningún texto de organización nuevo — mantiene su
  contenido actual (AC1.1.5 aplica solo al caso cross-org, para no
  agregar ruido en el camino más frecuente).

**Explícitamente descartado (Q3)**: no se cambia el nombre sugerido del
archivo descargado para reflejar la organización — el humano priorizó
solo la confirmación en el banner, no el nombre de archivo.

**Nota para Functional Design (no bloqueante, señalada en la ronda de mob)**:
ninguna AC de US1 cubre el caso de que `viewingOrgId` apunte a una
organización que fue borrada o a la que el admin ya no tiene acceso — un
caso distinto al de US2 (la organización existe pero no tiene catálogo
publicado). Functional Design debe definir el comportamiento esperado
(ej. tratarlo igual que "sin organización elegida", o mostrar un error
específico) antes de Code Generation.

## US2 — Mensaje claro cuando la organización elegida no tiene catálogo

**US2.1**: As a Admin con permiso cross-org (Valeria), I want ver un
mensaje que mencione explícitamente la organización que elegí cuando esa
organización no tiene catálogo publicado, so that entiendo por qué el
export no trajo resultados sin confundirlo con un error genérico.

**Priority**: Must Have

**Acceptance Criteria**:

- **AC2.1.1**: Given elegí la Organización C en el header y esa
  organización no tiene ningún producto publicado, When intento exportar
  su catálogo, Then veo un mensaje que menciona el nombre de la
  Organización C explícitamente (no un error 404 genérico).

  **Nota para Functional Design (no bloqueante, señalada en la ronda de
  mob)**: aplica cuando el nombre de la Organización C ya está disponible
  en el listado de organizaciones que alimenta el propio
  `OrganizationPicker` (caso normal: si la elegí en el picker, ya está
  cargada). Si por alguna razón el nombre no estuviera disponible en ese
  momento, se acepta un mensaje genérico de fallback en vez de bloquear o
  mostrar un error de carga distinto — Functional Design define el texto
  exacto del fallback.

- **AC2.1.2**: Given exporto MI PROPIA organización (sin elegir otra en
  el header) y no tengo catálogo publicado, When intento exportar, Then
  veo el mismo mensaje de error que ya existe hoy — este cambio no afecta
  el caso de mi propia organización.

## US3 — Sin cambios visibles para usuarios sin el permiso

**US3.1**: As a Usuario sin permiso cross-org (Martín), I want que mi
experiencia de exportar catálogo siga siendo exactamente igual que antes
de este cambio, so that no me confunde ni me expone opciones que no
debería tener.

**Priority**: Must Have

**Acceptance Criteria**:

- **AC3.1.1**: Given no tengo el permiso `ORG_ADMIN_VIEW_ALL`, When abro
  `/catalog`, Then no veo el selector `OrganizationPicker` en el header
  (comportamiento ya existente, sin cambios).
- **AC3.1.2**: Given no tengo el permiso, When exporto el catálogo en
  formato cliente, Then siempre se exporta mi propia organización, sin
  ningún parámetro `organization_id`, igual que el comportamiento actual.
- **AC3.1.3**: Given no tengo el permiso, When reviso el DOM del flujo
  completo de exportar (menú "Exportar", `ExportSummaryBanner`, prompt de
  nombre de archivo), Then no aparece ningún elemento nuevo con texto,
  rol o `data-testid` relacionado a organización o selector (ej. ningún
  nodo que mencione "organización" fuera de lo que ya existía antes de
  este intent) — verificable por snapshot/query de testing-library, no
  por inspección visual subjetiva.

## Review

**Verdict:** READY

**Findings:**
Sin hallazgos.

Los dos hallazgos Minor de la revisión anterior quedaron resueltos: (1) los
ACs de US1 ahora están numerados AC1.1.1→AC1.1.6 en orden secuencial y
estrictamente correlativo con el texto (verificado línea por línea, sin
saltos ni reordenamientos residuales); (2) la nota de fallback del nombre de
organización en AC2.1.1 ya no está mezclada dentro de la redacción del
propio Given/When/Then — quedó como un bloque separado y explícito
("**Nota para Functional Design (no bloqueante...)**") inmediatamente
después del AC, con el mismo formato que la nota equivalente al final de
US1 y USQ3.

Verificación completa (no solo el diff de los 2 hallazgos previos):

- Las 10 IDs de `requirements.md` (FR1.1–FR1.4, FR2.1–FR2.2, FR3.1–FR3.2,
  NFR1–NFR2) están cubiertas en `traceability.json` con `status: "OK"` y
  targets concretos de US/AC — sin huérfanos en ninguna dirección.
- Las 3 historias (US1/US2/US3) siguen formato Given/When/Then, identifican
  actor + acción + valor de negocio, y son independientemente testeables
  (positivo / error / negativo-sin-permiso) — cumple la regla de fase
  Inception sobre formato BDD.
- ACs testeables sin ambigüedad: cada uno especifica una condición y un
  resultado observable verificable por test (wiring de parámetro, ausencia
  de parámetro, lectura de store compartido, texto de banner, DOM sin
  elementos nuevos por testing-library).
- `personas.md` reutiliza consistentemente Valeria/Martín ya usadas en
  `260903-catalog-client-export`, con metas y pain points específicos de
  este intent (selector cross-org, mensaje de organización vacía).
- El alcance descartado (Q3: no se cambia el nombre del archivo) y el
  judgment call afirmado (texto de confirmación en el banner) están
  documentados sin contradecir el "sin selector nuevo" de
  `requirements.md` (FR1.3) — AC1.1.5/AC1.1.6 son agregado de texto, no
  componente nuevo.
- La nota no-bloqueante sobre organización borrada/inaccesible (fuera de
  alcance de las ACs de US1, distinta del caso de US2) queda correctamente
  diferida a Functional Design, sin bloquear este gate.
- `user-stories-questions.md` tiene la sección `## Consolidated Summary
Confirmation` con `[Answer]: Looks correct`, satisfaciendo el gate
  mecánico de `gate-start` para este stage.

No se detectaron hallazgos nuevos Critical, Major ni Minor en esta pasada.
