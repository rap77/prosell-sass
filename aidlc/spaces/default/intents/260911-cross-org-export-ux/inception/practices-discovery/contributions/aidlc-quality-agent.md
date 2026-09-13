**Collaborator:** aidlc-quality-agent

## Contribution

Leí el draft del lead completo (`team-practices.md`, `discovered-rules.md`,
`evidence.md`, `practices-discovery-timestamp.md`), la definición de la etapa
(`practices-discovery.md`), el baseline afirmado en `team.md` § Testing
Posture, los hallazgos #77-86 de `code-quality-assessment.md` y el bloque
superior (2026-09-11) de `reverse-engineering-timestamp.md`.

### 1. El piso de 4 tests propuesto está bien fundado pero incompleto — faltan 2-3 superficies nuevas de test

El piso que propone el lead (regresión de valor `clean_title`/`groups`,
gating negativo del sentinel "todas", resolución por-producto de
`org_code`, wiring del filtrado real de grilla) cubre correctamente los
hallazgos #80, #83 y #79 del scan. Pero el intent describe 8 necesidades, y
al menos dos generan superficie de test genuinamente nueva que el piso de
4 puntos no menciona:

- **Filtrado del picker por `product_count` (hallazgo #78)**: es un
  `.filter(o => (o.product_count ?? 0) > 0)` puramente client-side, pero
  es comportamiento nuevo con un caso límite real — una organización con
  `product_count: 0` (o el campo ausente, cubierto por el `?? 0`) debe
  desaparecer de la lista. Sin un test dedicado, un futuro cambio en
  `useOrganizations()` o en el shape de `OrganizationSchema` puede romper
  este filtro silenciosamente (mismo tipo de dato incorrecto expuesto al
  usuario que motiva el piso de rigor del punto 1, aunque de menor
  severidad porque es solo UX, no exportación de datos incorrectos).
- **Wiring de los dos popups nuevos (`window.prompt` de carpeta base y de
  grupos de Facebook, hallazgo #86)**: el piso cubre el wiring de
  `organization_id` hacia el filtrado de grilla (punto 4) pero no dice
  nada sobre si el valor devuelto por estos dos prompts nuevos realmente
  llega al llamado de export (o donde corresponda) — es la misma
  categoría de "superficie de test completamente nueva, no hay nada
  pre-existente que mantener en verde" que el propio lead usa para
  justificar el punto 4. Aplicar el mismo criterio acá: al menos un test
  por prompt que confirme que un valor no-null ingresado llega al
  parámetro correcto, y que `null` (cancelar) no dispara la acción.

Sugiero agregar estos dos como puntos 5 y 6 del piso, o fusionarlos
explícitamente dentro de los puntos existentes si Requirements Analysis
decide que son triviales — pero no dejarlos fuera de la conversación con
el humano en la entrevista (Step 4).

### 2. Riesgo de regresión no cubierto: la introducción del sentinel "todas" puede romper la convención ya documentada de `organization_id` omitido

El hallazgo #85 documenta una asimetría YA EXISTENTE e intencional: omitir
`organization_id` en el endpoint de export significa "mi propia
organización", nunca "todas" (a diferencia de `list_products`). El punto 2
del piso del lead testea el camino negativo (usuario sin permiso no ve la
opción y el use case rechaza el sentinel si se invoca directo), pero no
testea explícitamente que, **después** de introducir el sentinel "todas",
el comportamiento por defecto (sin pasar el sentinel, sin pasar
`organization_id`) siga resolviendo a "mi propia organización" y no se
haya deslizado hacia "todas" por accidente al copiar el patrón de
`list_products`. Es exactamente el riesgo que el propio hallazgo #85
señala como pendiente de decisión de diseño explícita — el piso de test
debería blindar la decisión que tome Requirements/Functional Design con
una regresión que fije el comportamiento por defecto actual.

### 3. El piso reforzado para el bug de CSV (punto 1) es la resolución correcta — no hace falta escalar a scope `bugfix`

Estoy de acuerdo con la justificación del lead: no corresponde re-clasificar
todo el intent a `bugfix`/`security-patch` (el intent mezcla fix de bug con
capacidad nueva — export "todas", filtrado real, dos popups — y forzar el
scope completo a `bugfix` sería subestimar esa superficie nueva). La vía
correcta es la que el lead ya tomó: mantener `classic` a nivel de intent y
agregar el piso puntual de rigor de `bugfix` (regresión al nivel más
angosto que reproduce el defecto) solo para la superficie específica del
bug, exactamente como ya se hizo en `260910-export-cross-org` para el NFR
de auditoría. Es consistente con el patrón ya aprendido en `project.md`.

**Sugerencia de refuerzo, no bloqueante**: dado que `csv_field_mapper.py`
ya tiene el mapeo directo (import) y `csv_export.py` va a tener el inverso
(export) para los mismos dos campos, un test de **round-trip** (tomar un
valor de `attributes` real, pasarlo por `build_client_format_row()`, y
confirmar que re-importarlo con `csv_field_mapper` reproduce el mismo
`attributes`) detectaría drift futuro entre las dos direcciones sin
mantener dos fixtures independientes a mano. No es indispensable para el
piso mínimo, pero vale mencionarlo en la entrevista como opción B del
punto 1.

### 4. Concern de CI/gate específico de tocar `apps/api` + `apps/web` en el mismo Bolt: la asimetría de pre-push

`team.md` § Testing Posture ya documenta una asimetría intencional: "CI
corre la suite completa en cada push/PR; **pre-push local corre `pytest
-q`**" — es decir, el gate local de pre-push NO corre Vitest, solo pytest.
Eso significa que, para un Bolt que introduce wiring cruzado real entre
frontend y backend (el filtrado de grilla depende de que el backend acepte
`organization_id` en `list_products`; el sentinel "todas" depende de que
el backend relaje `tenant_id`), un desarrollador puede pushear con una
regresión de Vitest sin enterarse hasta que CI corra en remoto — el gate
local no la atrapa. Esto no es una especialización de proceso nueva que
haga falta afirmar formalmente (el mecanismo de CI ya cubre el caso antes
de merge), pero sí amerita una mención explícita en la entrevista: ¿el
equipo quiere correr `pnpm vitest run` local antes de push para este Bolt
en particular, dado que toca ambos deployables con dependencias reales
entre ellos? El draft del lead no menciona esta asimetría en absoluto bajo
Deployment ni Testing Posture — es un gap de cobertura del draft, no una
objeción a ninguna decisión tomada.

### 5. Precisión sobre el precedente citado en Way of Working — ver Positions

El draft afirma que este intent es distinto de `260903-catalog-client-export`
porque ese "estaba acotado a una sola Unit dentro de un solo deployable".
Según el propio `team.md`/`project.md` (aprendizajes de Delivery Planning
del intent `260903-catalog-client-export`), ese intent tuvo DOS Units —
`u1-catalog-export-api` (backend, `apps/api`) y `u2-catalog-export-ui`
(frontend, `apps/web`) — bundleadas en un solo Bolt exactamente porque
ninguna entregaba valor de usuario independiente por sí sola. Es decir,
`260903` ya cruzó ambos deployables dentro de un solo Bolt. Ver detalle en
Positions.

## Positions

- **Way of Working — "sin especialización nueva, este intent es distinto
  de `260903` por tocar dos deployables"**: OBJECT (parcial). La conclusión
  de fondo (no hace falta una convención de branch/Bolt distinta) la
  comparto — pero la premisa que la sostiene es fácticamente incorrecta.
  `260903-catalog-client-export` YA bundleó `u1-catalog-export-api`
  (`apps/api`) + `u2-catalog-export-ui` (`apps/web`) en un solo Bolt
  (aprendizaje ya persistido en `project.md`: "cuando ninguna Unit de un
  plan entrega valor de usuario independiente por sí sola... bundlear
  todas las Units en un solo Bolt... Confirmado en el intent
  `260903-catalog-client-export`"). Este intent no es el primer Bolt de
  dos deployables — es una RECONFIRMACIÓN de un patrón ya probado, no una
  situación nueva. Recomiendo que el lead corrija esta cita en
  `evidence.md`/`team-practices.md` antes del gate, aunque no cambie la
  recomendación final para Way of Working.

- **Walking Skeleton — sin especialización nueva**: AGREE. La
  justificación (autorización y mecanismo de picker ya verificados en
  producción, esta superficie extiende lógica ya probada) es sólida y
  consistente con el criterio ya usado en los tres intents previos de esta
  cadena.

- **Testing Posture — piso de 4 tests propuesto**: OBJECT (parcial). Los 4
  puntos son correctos y bien targeteados, pero incompletos frente a los
  hallazgos #78 y #86 del scan (filtrado por `product_count`, wiring de
  los dos popups nuevos) y frente al riesgo de regresión implícito en el
  hallazgo #85 (comportamiento por defecto post-sentinel). Recomiendo
  presentar estos gaps como parte de la Pregunta 1 de la entrevista
  ("¿confirmar el piso de 4 tal cual, o ajustar?"), no resolverlos por
  asunción propia del lead antes de la entrevista.

- **Testing Posture — no escalar el bug de CSV a scope `bugfix`, sino
  agregar piso puntual reforzado (punto 1)**: AGREE. Es la resolución
  correcta dado que el intent mezcla bug fix con capacidad nueva; escalar
  todo el scope sería sobre-corrección. Sugiero (no bloqueante) ofrecer la
  opción de un test de round-trip import↔export como alternativa/adición
  al fixture de valor fijo.

- **Testing Posture — gap heredado de convención de ubicación de test
  para `catalog/page.tsx`, "Build and Test debe decidir explícitamente"**:
  AGREE. Correcto no resolverlo en esta etapa; correcto documentarlo por
  tercera vez para que no se vuelva a abrir sin decisión.

- **Deployment — sin especialización nueva, Bolts backend/frontend pueden
  separarse sin coordinación especial**: AGREE en cuanto a topología de
  deploy (correcto, el pipeline ya despliega ambos deployables desde el
  mismo push sin gating cruzado). OBJECT en cuanto a que el draft no
  menciona la asimetría de pre-push (`pytest -q` local, sin Vitest) como
  algo a poner sobre la mesa en la entrevista para un Bolt con dependencias
  reales cruzadas entre `apps/api` y `apps/web` — no es un cambio de
  proceso obligatorio, pero merece la pregunta explícita en vez de
  silencio.

- **Code Style — precisiones de resolución de `org_code` por-producto y
  ubicación de la función de mapeo de categorías**: AGREE. Ambas
  precisiones son aplicación directa de convenciones ya vigentes (patrón
  ya usado en `csv_export.py`, no introducir memoización sin justificar
  performance) y correctamente delegadas a Functional Design, no
  resueltas acá.

- **Discovered Rules — ninguna promoción nueva a Mandated/Forbidden**:
  AGREE. El piso de test es una decisión acotada a este intent, no una
  restricción de proceso de equipo general — mismo criterio ya aplicado
  en `260903-catalog-client-export` y `260911-export-org-selector`.
