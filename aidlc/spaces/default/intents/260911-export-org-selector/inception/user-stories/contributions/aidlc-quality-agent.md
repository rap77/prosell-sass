**Collaborator:** aidlc-quality-agent

## Contribution

Evalué las 9 ACs (US1: 3, US2: 2, US3: 3) contra dos criterios: (a)
verificabilidad automatizada sin ambigüedad, (b) mapeo 1:1 contra el piso
mínimo de test ya afirmado en `team-practices.md` § Testing Posture (los 3
puntos de Q1).

### Verificabilidad automatizada, AC por AC

**US1**

- **AC1.1.1**: Testeable, pero la redacción ("el archivo descargado
  corresponde al catálogo... de la Organización B") describe una
  verificación de CONTENIDO de archivo que un test de componente/unitario
  de frontend no puede (ni debe) hacer — esa correspondencia ya está
  probada del lado backend (10/10 tests, `260910-export-cross-org`). La
  verificación real y suficiente a este nivel es de PARÁMETRO: mockear
  `organizationStore.viewingOrgId = orgB.id` y aserir que
  `exportCatalogClientFormat()` se invoca con `organization_id: orgB.id`.
  No es una ambigüedad que bloquee el gate, pero Build and Test necesita
  esa precisión explícita para no sobre-ingenierizar un mock de descarga
  y parseo de ZIP que no aporta nada nuevo (ya cubierto aguas abajo).
- **AC1.1.2**: Claro y testeable sin ambigüedad — assert de que
  `exportCatalogClientFormat()` se invoca SIN `organization_id` cuando
  `viewingOrgId` es `undefined`/`null`.
- **AC1.1.3**: Testeable, pero a nivel de test de componente es
  indistinguible de AC1.1.1 — el "ya elegí la Org B para otras pantallas"
  se traduce al mismo mock de estado (`viewingOrgId` ya seteado) que
  AC1.1.1; no hay forma de expresar "vengo de otra pantalla" en un test
  unitario sin cruzar a integración/E2E (que este intent no requiere, por
  Testing Posture). Dejar explícito en Build and Test que AC1.1.1 y
  AC1.1.3 comparten el mismo caso de test (mismo mock, mismo assert) para
  no generar un test redundante que solo duplique setup sin agregar
  cobertura real — no es un defecto del AC, es una nota de diseño de test.

**US2**

- **AC2.1.1**: Claro y testeable — mockear 404 del endpoint + `name` de
  la Org C ya disponible vía `useOrganizations()`, aserir que el texto
  del mensaje contiene el nombre. Sin ambigüedad.
- **AC2.1.2**: Claro y testeable — regresión de que el mensaje genérico
  actual no cambia cuando no hay `organization_id`.

**US3**

- **AC3.1.1**: Testeable (y ya cubierto por `OrganizationPicker.test.tsx`
  existente, sin necesidad de test nuevo — es comportamiento no tocado
  por este intent).
- **AC3.1.2**: Claro y testeable — mapea 1:1 con el punto 1(b) del piso
  de test afirmado.
- **AC3.1.3** ("reviso el flujo completo... cero cambios visibles"): esta
  es la única AC con redacción genuinamente ambigua para automatización.
  "Cero elementos nuevos de UI" es una aserción negativa sin un selector
  concreto a buscar — viola la guardrail de fase de Inception ("Avoid
  ambiguous language... unless paired with a measurable threshold").
  Recomiendo que Build and Test la traduzca a una aserción concreta (ej.
  `queryByTestId`/`queryByRole` sobre el/los elemento(s) específico(s) que
  SÍ se agregan para el flujo de admin — que no aparezcan en el DOM
  cuando el usuario no tiene el permiso), no dejarla como "cero cambios
  visibles" genérico en la instrucción de test.

### Mapeo contra el piso mínimo de test (Testing Posture, Q1)

1. **Regresión negativa de gating** (a: selector no disponible en export,
   b: `exportCatalogClientFormat()` sin `organization_id` ajeno) → cubierto
   1:1 por AC3.1.1 (a) y AC3.1.2 (b). Completo.
2. **Wiring nuevo** (organization_id llega correctamente) → cubierto 1:1
   por AC1.1.1 + AC1.1.2. Completo.
3. **No-ruptura del consumo existente del store por parte de
   `OrganizationPicker` en el header** (mismo store, dos consumidores) →
   **NO tiene una AC dedicada**. Ninguna de las 9 ACs verifica que el
   header siga funcionando igual una vez que el export se convierte en
   segundo consumidor del mismo store. El propio piso aclara que "no hace
   falta un test de integración cross-componente completo", así que esto
   podría considerarse satisfecho indirectamente por (i) la suite
   existente de `OrganizationPicker.test.tsx` quedando en verde sin
   modificarse, y (ii) NFR2 (no introducir un segundo mecanismo de
   estado). Aun así, señalo el gap: no hay ningún AC que lo haga
   explícito como criterio de aceptación observable — queda implícito
   entre NFR2 y "la suite existente sigue verde". Sugiero que Functional
   Design o Build and Test lo dejen explícito (aunque sea como nota, no
   como AC nueva) para que no se pierda de vista.

### Caso límite no cubierto por ninguna AC

Ninguna AC contempla qué pasa si el `name` de la organización (para el
mensaje de AC2.1.1) todavía no está disponible en el cache de
`useOrganizations()` en el momento del 404 (ej. query en estado de
loading/error, o el usuario llegó a esa organización por un camino que no
pobló el cache). El Assumption A2 de `requirements.md` da por sentado que
el nombre "es suficiente y apropiado", pero no que siempre esté
disponible. No bloqueante para este gate (es una decisión de
implementación, no de requisito), pero vale la pena que Functional Design
defina el fallback (¿mostrar el `organization_id` crudo? ¿mensaje
genérico con aviso de "organización seleccionada"?) para que Build and
Test no lo resuelva por asunción propia.

## Positions

- AGREE: Las 9 ACs siguen formato Given/When/Then correcto y son, en su
  mayoría, verificables sin ambigüedad de forma automatizada — razón:
  confirmado AC por AC arriba, sin contradicciones de fondo con
  `requirements.md` ni con `team-practices.md`.
- AGREE: AC1.1.1/AC1.1.2 + AC3.1.1/AC3.1.2 mapean 1:1 y completo contra
  los puntos 1 y 2 del piso mínimo de test afirmado — razón: cobertura
  funcional directa, sin necesidad de ACs adicionales para esos dos
  puntos.
- OBJECT: El punto 3 del piso mínimo de test (no-ruptura del consumo
  existente de `OrganizationPicker` en el header al agregar un segundo
  consumidor del mismo store) no tiene ninguna AC ni mención explícita en
  `stories.md` — razón: aunque el propio piso permite satisfacerlo sin un
  test de integración cross-componente completo, dejarlo completamente
  implícito (ni una nota, ni un AC) arriesga que Build and Test lo
  olvide; pido que se agregue al menos una línea explícita (en `stories.md`
  o en las notas de Build and Test) que it apunte a "verificar que
  `OrganizationPicker.test.tsx` sigue en verde sin modificarse + el nuevo
  hook de export lee el mismo store sin instanciar uno paralelo".
- OBJECT: AC3.1.3 usa lenguaje no verificable de forma automatizada sin
  interpretación adicional ("cero elementos nuevos de UI", "cero cambios
  visibles") — razón: viola la guardrail de Inception de evitar lenguaje
  ambiguo sin un umbral medible; pido que Build and Test la traduzca a
  selectores/queries concretos antes de escribir el test, no que quede
  así en la instrucción de test final.
