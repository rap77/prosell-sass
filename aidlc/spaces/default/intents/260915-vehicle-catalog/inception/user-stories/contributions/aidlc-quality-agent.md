**Collaborator:** aidlc-quality-agent

## Contribution

### 1. Testabilidad de los 7 AC

**AC1.1.2, AC1.1.3, AC2.1.1, AC2.1.2, AC2.1.3**: testeables tal cual. Cada
una fija un Given/When/Then con un comportamiento observable y verificable
por input/output concreto (campo queda vacío / error indica el campo /
ubicación persiste a nivel producto / default heredado / prioridad producto
sobre organización en el export). Sin objeción.

**AC1.1.1 — vaga en el punto que más importa para este intent (Critical
desde QA)**: "los campos... se completan con un valor que existe como
opción del schema canónico" solo exige que el valor resultante sea _alguna_
opción válida del schema para ese campo — no que sea la opción
_correcta_ correspondiente al valor decodificado del VIN. Un bug de mapeo
que traduzca `"suv"` (NHTSA) a `"Sedán"` (una opción igualmente válida del
catálogo, pero incorrecta) satisface la letra de este AC tal como está
redactado. Esto es exactamente el mismo patrón de riesgo que
`team.md`/`project.md` ya documentan repetidas veces para este proyecto
("el bug real es de TRANSFORMACIÓN DE VALOR... un test que solo verifique
que la columna existe... no detectaría una inversión de signo o un join
incorrecto" — aprendizaje de `260911-cross-org-export-ux`, y el propio piso
de test #1 de `team-practices.md` de ESTE intent lo exige explícitamente:
"no alcanza con verificar que el campo tenga algún valor" / "fijar un
campo conocido... un valor de entrada conocido... y afirmar que existe una
`option` _exacta_ correspondiente". El AC, tal como está redactado, no
obliga a ese nivel de precisión — queda por debajo del propio piso de test
que el mismo documento cita como fuente. Pido agregar (o reforzar el Then
de) AC1.1.1 para que exija explícitamente "el valor correspondiente exacto
según la reconciliación" y no solo "un valor válido cualquiera para ese
campo", con al menos un ejemplo de campo/valor fijado en el AC (mismo
formato que el piso de test #1: `body_type="suv"` → opción exacta
esperada).

**AC1.2.1 — parcialmente vaga**: la cláusula "sin duplicar mantenimiento
manual entre dos archivos" no es un comportamiento observable por
input/output — es una restricción de implementación (single source of
truth), no una aserción de test. La parte observable ("las opciones
cargadas son exactamente las del catálogo vigente") sí es testeable si se
fija un campo/valor concreto, pero el AC no lo hace. No es bloqueante como
las de arriba (Functional Design va a tener que fijar el mecanismo de
todos modos, per el Open Question de `requirements.md`), pero recomiendo
que Build and Test, al derivar el test real, no confunda "sin duplicar
mantenimiento" con un criterio de test — el criterio de test real es
"opciones cargadas == catálogo vigente, valor por valor".

### 2. Piso de 6 tests de `team-practices.md` vs. cobertura de AC

- **Punto 1** (reconciliación cruzada valor-por-valor): cubierto por
  AC1.1.1/AC1.1.2, con la reserva de precisión señalada arriba.
- **Punto 2** (`validate_attributes()` contra un valor concreto normalizado
  del decode de VIN, "no solo contra valores tipeados a mano"): **gap
  real**. AC1.1.3 solo cubre el caso de valor ingresado _a mano_
  ("Given que ingreso a mano un valor..."). No hay ningún AC que ejercite
  `validate_attributes()` contra un valor que salió del pipeline de
  reconciliación de VIN — es decir, que confirme que un valor ya
  reconciliado (AC1.1.1) efectivamente pasa la validación al guardar, sin
  fricción entre los dos mecanismos. `FR1.3` de `requirements.md` incluso
  enmarca el caso de rechazo como "típicamente tipeado a mano, no
  proveniente del decode de VIN" — lo cual es consistente con el diseño,
  pero deja sin AC (y por lo tanto sin test obligado) exactamente el
  escenario que el piso de test #2 pide verificar explícitamente. Sin este
  AC, un desarrollador puede implementar el guardado y nunca ejercitar el
  camino "decode → reconciliar → guardar" de punta a punta con una
  aserción de test.
- **Punto 3** (sincronización `FACEBOOK_FIELD_KEY_MAP` ↔ catálogo):
  cubierto por AC1.2.1 (con la reserva de la cláusula no-observable
  señalada arriba).
- **Punto 4** (tabla de traducción de categorías,
  `CATEGORY_TRANSLATION_TABLE`, hallazgo #88): **gap real, confirmado**.
  Ninguno de los FR de `requirements.md` menciona `CATEGORY_TRANSLATION_TABLE`
  ni el hallazgo #88 — FR1 cubre únicamente la reconciliación de valores de
  atributo (hallazgo #87) y la sincronización de `FACEBOOK_FIELD_KEY_MAP`
  (hallazgos #89/#91), pero no la tabla de traducción de categorías.
  Consecuencia: ninguna historia de `stories.md` tiene un AC para ese
  punto, aunque el piso de 6 tests lo declara _sin condicional_ (a
  diferencia de los puntos 5 y 6, que sí están marcados "condicionalmente").
  Esto deja al piso de test #4 sin FR/AC padre que trazar en el Cross-Unit
  Final Coverage Gate de Build and Test — el mismo tipo de problema de
  trazabilidad que ya se vio y se corrigió en `requirements.md` para otros
  hallazgos (Q1-Q8). Esto es un gap de `requirements.md`, no algo que esta
  etapa pueda resolver por sí sola (User Stories no genera FR nuevos), pero
  lo señalo acá porque el efecto observable — falta de AC — aparece en
  `stories.md`.
- **Puntos 5 y 6** (migración legacy; wiring de `IPublisherService`):
  correctamente sin AC — están condicionados a que Functional Design decida
  tocar esas capas, y `stories.md` documenta explícitamente por qué FR3/FR4
  no generan historias (trabajo backend sin interacción de usuario nueva).
  Consistente con `requirements.md` § Out of Scope. Sin objeción acá.

### 3. Casos de error / edge cases faltantes

- **US2.1 — falta el caso de ubicación inválida/vacía (confirmado, gap
  real)**: los 3 AC de US2.1 cubren guardar-con-override,
  mostrar-default-heredado y prioridad-en-export, pero ninguno cubre qué
  pasa si el usuario intenta guardar una ubicación vacía o con formato
  inválido para el override de producto. `FR2.1`/`FR2.2` de
  `requirements.md` tampoco lo especifican — no hay decisión de negocio
  registrada sobre si (a) se rechaza el guardado con error, (b) un valor
  vacío se interpreta como "borrar el override y volver al default de
  organización", o (c) se persiste un override vacío que rompe el export
  (contradiciendo el "no solo calculada en el momento de exportar" de
  AC2.1.1). Sin este AC, Functional Design puede implementar cualquiera de
  las tres sin que ningún test lo detecte como incorrecto — el mismo tipo
  de silencio que motivó el hallazgo central de este intent (#87). Pido un
  AC nuevo (US2.1) que fije el comportamiento exacto para "guardar override
  vacío/inválido", o al menos una Open Question explícita en `requirements.md`
  si la decisión todavía no está tomada.
- **AC1.1.2 — caso "todos los campos fallan reconciliación"**: el AC
  cubre el campo individual sin match; no hay AC para el caso límite de que
  NINGÚN campo select-backed tenga match (formulario completo vacío tras el
  decode). No lo marco como gap bloqueante — el comportamiento por-campo de
  AC1.1.2 ya implica (por generalización) el caso de todos los campos, y no
  hay evidencia de que el sistema trate ese caso límite de forma especial
  — pero vale que Build and Test lo tenga presente como caso de prueba
  derivado, no como AC nuevo.

## Positions

- AGREE: AC1.1.2, AC1.1.3, AC2.1.1, AC2.1.2 y AC2.1.3 están bien redactados — Given/When/Then con comportamiento observable e input/output concreto, testeables tal cual.
- OBJECT: AC1.1.1 no exige que el valor autocompletado sea el correspondiente CORRECTO al decode del VIN, solo que sea "una opción válida cualquiera" — permite que pase un test un mapeo de valor incorrecto, contradiciendo el propio piso de test #1 de `team-practices.md` que exige precisión valor-por-valor.
- OBJECT: no hay AC que ejercite `validate_attributes()` contra un valor ya reconciliado del decode de VIN (piso de test #2, que pide explícitamente "no solo valores tipeados a mano") — AC1.1.3 solo cubre el caso manual.
- OBJECT: el piso de test #4 (tabla de traducción de categorías / hallazgo #88) no tiene ningún FR en `requirements.md` ni AC en `stories.md` que lo trace, pese a estar afirmado sin condicional en `team-practices.md` Q1.
- OBJECT: US2.1 no tiene ningún AC para guardar una ubicación de override vacía o inválida — comportamiento no decidido ni en `requirements.md` ni en `stories.md`.
