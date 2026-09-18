# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

**Baseline afirmada (referenciada, sin cambios propuestos)**: trunk-based
development, ramas de feature de corta duración con prefijos convencionales
(`fix/`, `feat/`, `chore/`, `refactor/`, `test/`) apuntando a `main`,
squash-merge, Conventional Commits estricto. Ver `memory/team.md` § Way of
Working para el texto completo.

**Sin especialización nueva propuesta para este intent.** El intent toca
`apps/api` y `apps/web` (schemas de categoría, VIN decode, import/validación
de vehículos, defaults de ubicación, migración legacy, contratos de
publisher), pero no hay evidencia de que necesite una convención de branch
distinta a la ya afirmada — sigue siendo trabajo de un solo Bolt/feature
cohesivo dentro de un mismo intent, con la decisión de cuántos Bolts (y en qué
orden) reservada para Delivery Planning, no para esta etapa.

**Precisión de aplicación (no práctica nueva)**: a diferencia de los últimos
intents (`260903-catalog-client-export`, `260910/11-export-*`), este trabajo
es mayormente correctivo/estructural sobre superficie YA en producción (los
dos catálogos de valores de Facebook, `VinDecodeField.tsx`,
`category-schema-editor.tsx`, `csv_field_mapper.py`) en vez de agregar un
endpoint/UI nuevo de punta a punta — no cambia el mecanismo de branching, solo
el tipo de cambio dentro del mismo mecanismo.

## Walking Skeleton

**Baseline afirmada**: no se corre la ceremonia de walking skeleton (NEVER en
`project.md`).

**Sin especialización nueva propuesta.** El hallazgo central del scan
(`code-quality-assessment.md` #87: dos catálogos de valores de Facebook
incompatibles — `nhtsa_normalizer.py` en inglés/minúscula vs.
`facebook-values/index.ts` en español, sin reconciliación runtime) es una
corrección de una arquitectura YA existente y en producción (`Category`,
`VinDecodeField`, `IPublisherService`/`PublisherStrategySelector` ya existen —
confirmado positivamente en el hallazgo #93, "el contrato de adapter de
publisher NO se diseña de cero"). No hay pieza nueva que necesite una porción
end-to-end mínima para "probar que conecta" — el trabajo es reconciliar/migrar
lógica ya verificada en vivo, mismo criterio ya aplicado en intents previos
(`260911-cross-org-export-ux`) para descartar walking skeleton.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementar cada capa aplicable (backend: normalización de
  VIN/dominio de categoría/casos de uso de import y migración; frontend:
  `VinDecodeField`, `category-schema-editor`, formularios de vehículo) y
  luego escribir y correr los tests de esa capa, sin backfillear cobertura en
  código pre-existente no tocado por el cambio.
- Piso de cobertura asimétrico ya aceptado (40% frontend, sin piso enforced en
  backend) — no forzar simetría, per baseline.
- CI corre la suite completa en cada push/PR; pre-push local corre
  `pytest -q` (asimetría ya aceptada: no corre Vitest en pre-push).

**Sin especialización de metodología, ordering ni piso general de
cobertura** — el marco general (`classic`/`feature` → piso de 80% de
cobertura de línea + ejecución en CI, per `org.md`) sigue vigente.

**Candidato a piso mínimo de test NUEVO para ESTE INTENT (a confirmar en la
entrevista, Step 4 — no afirmado todavía)**: dado que el hallazgo central
#87 es una desalineación SILENCIOSA (sin ningún chequeo runtime que la
detecte), el riesgo real de un fix parcial es idéntico al ya aceptado en
`260911-cross-org-export-ux` para bugs de valor-no-solo-de-clave:

1. **Test de reconciliación cruzada entre los dos catálogos de valores de
   Facebook** (`nhtsa_normalizer.NHTSA_TO_FACEBOOK` vs.
   `facebook-values/index.ts`): para cada campo select-backed relevante de la
   taxonomía de vehículos, el valor que produce el autocompletado de VIN debe
   calzar con alguna `option` que el catálogo nuevo ofrece para ese mismo
   campo — sin este test, una migración futura de uno de los dos catálogos
   puede romper el otro en silencio, exactamente como describe el hallazgo
   #87.
2. **Test de `Category.validate_attributes()` contra el valor normalizado del
   decode de VIN**, no solo contra valores tipeados a mano — hoy la
   validación corre solo al guardar; confirmar si debe además rechazar (o
   señalar) un autocompletado que no calza con ninguna `option` configurada.
3. **Test de regresión de las migraciones legacy ad-hoc** (`20260812_0002_migrate_legacy_sedan_products.py`,
   `20260625_0002_vehicle_vin_required.py`) si este intent las extiende o
   generaliza — el hallazgo #92 documenta que hoy son puntuales por caso, sin
   framework reutilizable; si Requirements Analysis decide generalizarlas,
   necesitan tests de idempotencia/rollback nuevos que hoy no existen.
4. **Test de wiring del `IPublisherService`/`PublisherStrategySelector`** si
   este intent extiende el puerto para absorber la reconciliación de
   catálogos (pregunta abierta del hallazgo #93) — confirmar que el contrato
   existente (`playwright_publisher.py`, `graph_api_publisher.py`,
   `null_graph_api_publisher.py`) sigue funcionando sin cambios de
   comportamiento para los adapters que NO tocan este intent.

**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la
entrevista: "Sí, afirmar los 6 puntos tal cual" — no cambia el piso general
del proyecto, solo aplica a la superficie nueva/tocada del catálogo canónico
de vehículos de Facebook: reconciliación de catálogos de valores, mapeo de
claves de schema, tabla de traducción de categorías, y — condicionalmente —
migración legacy y contrato de adapter de publisher):**

1. **Test de reconciliación cruzada valor-por-valor entre el catálogo de
   decode de VIN (`nhtsa_normalizer.NHTSA_TO_FACEBOOK`) y el catálogo de
   opciones del schema (`facebook-values/index.ts`)** — hallazgo central
   #87. Mismo rigor ya exigido en el precedente `260911-cross-org-export-ux`
   para `title_status`/`facebook_groups`: fijar un campo conocido (ej.
   `body_type`), un valor de entrada conocido del catálogo A (`"suv"`) y
   afirmar que existe una `option` exacta correspondiente en el catálogo B
   para ese mismo campo — no alcanza con verificar que el campo tenga algún
   valor. Verificado por developer que el mismatch no es solo idioma
   inglés/español: ninguna de las tres representaciones de
   `facebook-values/index.ts` (`key` en español, `es`, `en`) calza
   carácter-a-carácter con los tokens que emite `NHTSA_TO_FACEBOOK`
   (`"gasoline"`, `"suv"`, `"FWD"`) — hay discrepancias de casing incluso
   dentro de la representación `en`. El test debe cubrir ese nivel de
   granularidad (valor exacto, no solo idioma).
2. **Test de `Category.validate_attributes()` contra un valor concreto
   normalizado del decode de VIN, con input/output fijados — no un test de
   humo.** Corrección de QA aplicada: la redacción original ("confirmar si
   debe además rechazar o señalar") era una pregunta de diseño disfrazada de
   ítem de piso, sin valor de entrada/salida concreto. Requirements Analysis
   debe fijar primero el comportamiento exacto (¿rechaza con error, o
   señala/loguea sin bloquear?) antes de que Build and Test pueda escribir
   este test como una aserción ejecutable — mismo rigor exigido al punto 1
   (input fijo → output exacto esperado), no solo confirmación de alcance.
3. **Test de cobertura para la sincronización `FACEBOOK_FIELD_KEY_MAP`
   (`category-schema-editor.tsx`) ↔ catálogo de valores
   (`facebook-values/index.ts`)** — hallazgos #89/#91. Gap señalado por QA:
   el draft original solo trataba esto como guía de implementación en §
   Code Style, no como piso de test obligatorio, pese a que el propio scan
   lo describe como "el mismo patrón de riesgo estructural que #87, en
   escala menor" — aplicarle un criterio de severidad distinto (test
   obligatorio para uno, solo nota de diseño para el otro) sería
   inconsistente con el propio razonamiento usado para justificar el punto
   1. Condicionado, igual que los puntos 5 y 6, a que Requirements Analysis
      confirme que este intent toca esa capa de reconciliación.
4. **Test dedicado para la tabla de traducción de categorías
   (`CATEGORY_TRANSLATION_TABLE`)** — hallazgo #88 (hoy con una sola entrada
   hardcodeada, cubierta solo indirectamente, sin test propio). Gap de
   citación señalado por QA: el hallazgo #88 vive en la misma sección del
   scan enfocado de este intent (`code-quality-assessment.md`, hallazgos
   #87-93) y no había sido citado en el draft original pese a ser evidencia
   directamente relevante para Testing Posture.
5. **Test de regresión de las migraciones legacy ad-hoc**
   (`20260812_0002_migrate_legacy_sedan_products.py`,
   `20260625_0002_vehicle_vin_required.py`) — condicional a que este intent
   las extienda o generalice (hallazgo #92, sin framework reutilizable hoy).
6. **Test de wiring del `IPublisherService`/`PublisherStrategySelector`** —
   condicional a que este intent extienda el puerto para absorber la
   reconciliación de catálogos (pregunta abierta #93); debe confirmar que
   los tres adapters concretos (`playwright_publisher.py`,
   `graph_api_publisher.py`, `null_graph_api_publisher.py`) siguen
   funcionando sin cambio de comportamiento para los que no toca este
   intent.

`csv_export.py`/`csv_field_mapper.py` (mapeo de valores) y
`OrganizationPicker.test.tsx` (patrón de mocks frontend) siguen siendo los
precedentes reusables ya establecidos en intents previos para este tipo de
test de regresión de valor.

**Gap heredado, no resuelto por este intent**: `docs/canonical/F01-bulk-upload-csv-import.md`
sigue desactualizada respecto al CSV real del cliente (columna `option` vs.
`description`, hallazgo #60) — fuera de alcance salvo que Requirements
Analysis decida corregir la doc como parte de este trabajo.

## Deployment

**Baseline afirmada**: deploy-on-merge a staging, gate manual de producción
permanente, health check post-deploy, postura de seguridad de pipeline con
gaps aceptados y no bloqueantes.

**Sin especialización nueva de topología ni de proceso de deploy
propuesta** — este intent no introduce un componente desplegable nuevo ni
cambia entornos. Sigue tocando `apps/api` + `apps/web` desde el mismo pipeline
ya afirmado (`ci.yml`, `deploy.yml`).

**Precisión de aplicación (no práctica nueva, señalada por el lead a partir
de la evidencia del scan)**:

- Si Requirements Analysis/Functional Design deciden generalizar el patrón de
  migración legacy ad-hoc (hallazgo #92) en una herramienta reutilizable, esa
  migración de datos corre con las mismas guardas de seguridad ya usadas en
  `20260812_0002_migrate_legacy_sedan_products.py` ("triples", per el scan del
  developer) — no se relaja el estándar de seguridad de migraciones de datos
  en producción por generalizar la herramienta.
- Cualquier cambio al puerto `IPublisherService` (si se extiende para
  absorber la reconciliación de catálogos) debe verificarse contra los TRES
  adapters concretos (`playwright_publisher.py`, `graph_api_publisher.py`,
  `null_graph_api_publisher.py`) antes de deploy — el `PublisherStrategySelector`
  ya en producción hace que un cambio de contrato afecte simultáneamente a
  los tres, no a uno solo.
- **Corrección de precisión (señalada por devsecops, verificada contra
  código)**: el parámetro `access_token: str` que reciben `publish`/`update`/
  `delete` de `IPublisherService` no es un token genérico de una sola clase
  — para el adapter de Playwright (`playwright_publisher.py:76`) ese mismo
  parámetro es, según su propio docstring, "Facebook session cookies JSON
  string (Phase 1)": una credencial de **mayor alcance** que un token OAuth
  de página (una sesión de cookies robada permite actuar como el usuario
  completo en Facebook, no solo sobre la Marketplace API). Si este intent
  toca el puerto o agrega la capa de reconciliación de catálogos en ese
  boundary (pregunta abierta #93), cualquier código nuevo que envuelva o
  intercepte esa llamada hereda dos obligaciones que hoy los tres adapters
  ya cumplen mecánicamente pero que no son automáticas para código nuevo:
  (a) nunca loguear `access_token` ni incluirlo en mensajes de excepción, y
  (b) tratar el "access_token" de Playwright y el de Graph API con el MISMO
  nivel de secreto, aunque uno sea session cookies y el otro un token de
  página — código genérico que trate el parámetro solo por su firma no debe
  asumir que siempre es de alcance acotado.
- **Decisión de implementación acotada a este intent (Q2, afirmada en la
  entrevista)**: agregar sanitización de fórmulas al export de catálogo en
  CSV cliente (`build_client_format_row()`/`export_catalog_client_format.py`)
  como parte de este intent, dado que ya se toca ese mismo mapeo de valores.
  Motivo (verificado por devsecops contra código real): `csv.writer` estándar
  de Python escapa delimitador/comillas pero no protege contra CSV/formula
  injection — un valor que empiece con `=`, `+`, `-` o `@` se interpreta
  como fórmula al abrir el CSV en Excel/Sheets. Hoy es un riesgo residual de
  baja probabilidad porque `Category.validate_attributes()` corre al guardar
  y las `options` vienen de catálogos curados, pero el hallazgo central #87
  aumenta esa probabilidad: si la reconciliación entre catálogos introduce
  un fallback que acepta un valor decodificado de VIN sin `option`
  configurada (para no bloquear el autocompletado), ese valor deja de ser
  "curado" y llega sin sanitizar a la celda del CSV que el cliente abre
  directamente en Excel. Mecanismo exacto (prefijar con `'`, rechazar
  valores que empiecen con `=+-@`, u otro) queda para Functional Design —
  no resuelto en esta etapa.
- **Expectativa explícita, no regla nueva (señalada por devsecops)**: el
  mandate ya vigente de corregir todo hallazgo de GGA en archivos tocados
  (`project.md` § Mandated) aplica con fuerza especial acá porque este
  intent toca una concentración inusualmente alta de archivos ya marcados
  como deuda técnica preexistente en el scan (#88, #89/#91, #92) — es
  altamente probable que GGA superficie hallazgos en esos mismos archivos.
  Deployment Execution no debe tratarlo como scope creep sorpresivo, sino
  como aplicación directa del mandate ya afirmado.

## Code Style

**Baseline afirmada**: Ruff+Pyright backend, Prettier+ESLint frontend
(`--max-warnings=0` en CI), GGA bloqueante en pre-commit, naming camelCase
TS/snake_case Python, patrón de manejo de errores centralizado en frontend
(mandate Q6, aplica a código nuevo).

**Sin especialización nueva de formatter/linter propuesta.**

**Guía de implementación nueva para este intent (Code Style, no práctica de
equipo — a resolver en Functional Design, señalada acá por evidencia del
scan, hallazgos #89/#91)**: `FACEBOOK_FIELD_KEY_MAP` (`category-schema-editor.tsx`)
y `facebook-values/index.ts` son dos archivos mantenidos a mano, sin ningún
test/linter que falle si quedan desincronizados. Si este intent introduce una
capa de reconciliación entre los dos catálogos de valores (hallazgo #87), esa
capa debería vivir como fuente única de verdad consultada por AMBOS
consumidores (`VinDecodeField.tsx` y `category-schema-editor.tsx`), en vez de
mantener el mapeo estático duplicado — mismo espíritu que el patrón ya
elegido por el equipo de "resolver batch antes del loop, nunca duplicar
lógica en dos ramas" (`_resolve_org_codes()`, ya documentado en `project.md`).

**Corrección de alcance (señalada por developer, verificada contra código
real)**: la formulación de arriba describe correctamente el problema
#89/#91 (ambos archivos son frontend TS, ahí una tabla compartida alcanza),
pero NO cubre el hallazgo central #87 — `NHTSA_TO_FACEBOOK` no es frontend,
vive en `apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py`
(backend Python). Si Functional Design toma la formulación "fuente única de
verdad en TS consultada por ambos consumidores" al pie de la letra también
para #87, terminaría diseñando una reconciliación puramente frontend para un
mismatch cuyo origen real cruza lenguaje/capa. El eje real de la decisión
para Functional Design es dónde vive la reconciliación respecto a ese
cruce — dos alternativas de primer nivel, ambas con trade-offs genuinos, sin
afirmar ninguna en esta etapa:

- **Backend, como domain service puro** (recomendación del developer, mismo
  molde que `category_translation.py`: recibe el token ya decodificado, sin
  llamar a ningún repositorio; el endpoint de decode de VIN devolvería al
  frontend un valor ya reconciliado contra `facebook-values`) — mantiene la
  regla de negocio ("qué valor acepta Facebook Marketplace para un campo
  decodificado de VIN") en el lado del stack que ya la posee, sin agregar un
  tercer archivo a sincronizar.
- **Frontend, como tabla TS compartida** (la formulación original del
  draft) — válida si el equipo prefiere no cruzar el boundary de lenguaje,
  pero entonces `facebook-values/index.ts` tendría que exponerse también al
  backend o duplicarse, algo que el draft original no contemplaba.

**Nota abierta para Functional Design (developer, no resuelta en esta
etapa)**: `nhtsa_normalizer.py` (283 líneas, cero imports, dict puro) tiene
exactamente la misma forma "cero dependencias externas" que
`category_translation.py` — pero mientras `category_translation.py` vive
correctamente en `domain/services/` (con docstring citando la regla del
proyecto "Domain layer has ZERO external dependencies"), `nhtsa_normalizer.py`
vive en `infrastructure/services/`. Es una inconsistencia de ubicación de
capa preexistente, no introducida por este intent, y no hace falta que este
intent la corrija — pero es directamente relevante para decidir dónde ubicar
la reconciliación nueva: agregar código nuevo junto a una pieza ya mal
ubicada arriesga perpetuar la inconsistencia. Ver también `evidence.md`.

## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
