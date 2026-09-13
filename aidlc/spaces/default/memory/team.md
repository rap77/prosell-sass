# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

Baseline afirmada (sin cambios propuestos):

- Trunk-based development, ramas de feature de corta duración con
  prefijos convencionales (`fix/`, `feat/`, `chore/`, `refactor/`,
  `test/`), todas apuntando a `main`.
- Convención de nombre de rama: `<tipo>/<slug-descriptivo-en-inglés>`.
- Squash-merge (afirmado Q1 en 260829).
- Conventional Commits estricto.

**Sin especialización nueva propuesta para este intent.** Este intent
toca dos deployables — `apps/api` y `apps/web` — con cambios
genuinamente independientes entre sí (el fix de mapeo de valores del CSV
y el soporte cross-org del backend no dependen de que la UI del picker
ya filtre la grilla, y viceversa). **Corrección factual sobre el
precedente citado** (señalada por quality): esto NO es la primera vez
que un Bolt de este proyecto cruza `apps/api` + `apps/web` — el intent
`260903-catalog-client-export` ya bundleó `u1-catalog-export-api`
(backend) + `u2-catalog-export-ui` (frontend) en un solo Bolt, porque
ninguna de las dos Units entregaba valor de usuario independiente por sí
sola (aprendizaje ya persistido en `project.md`). Este intent es una
**reconfirmación** de ese patrón ya probado, no una situación nueva —
el precedente correcto es `260903-catalog-client-export`, no la ausencia
de precedente. La conclusión de fondo del draft original se sostiene con
el precedente corregido: el mecanismo ya afirmado de trunk-based +
squash-merge no distingue por número de deployables tocados dentro de un
mismo Bolt — cada Bolt sigue siendo una rama de feature de corta
duración que se squash-mergea a `main` como un solo commit,
independientemente de cuántos `apps/*` toque. No hay evidencia de que
este intent necesite una convención de branch distinta (ej. una rama por
deployable) — eso sería sobre-ingeniería para un feature que, aunque
más grande, sigue siendo un solo Bolt cohesivo de un solo intent. La
pregunta genuina de secuenciación (¿backend y frontend en el mismo Bolt,
o en Bolts separados dentro del mismo intent?) es una decisión de
Delivery Planning, no de Way of Working — no corresponde a esta etapa.

## Walking Skeleton

Baseline afirmada: no se corre la ceremonia de walking skeleton (Q2 en
260829, NEVER en `project.md`).

**Sin especialización nueva propuesta.** El feature agrega superficie
real (nuevo caso de uso cross-tenant, corrección de mapeo de valores,
nuevo filtrado de grilla, dos popups nuevos) pero ninguna pieza depende
de una porción end-to-end nueva para "probar que conecta" — la capa de
repositorio cross-tenant, el permiso `ORG_ADMIN_VIEW_ALL`, y el
mecanismo de picker/store ya existen y están en producción desde
intents anteriores. El trabajo de este intent es extender lógica ya
verificada en vivo (autorización, resolución de organización, wiring de
`viewingOrgId`), no bootstrapear una arquitectura nueva.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementar cada capa aplicable (backend: dominio/casos
  de uso/repositorio; frontend: componente/hook/página) y luego escribir
  y correr los tests de esa capa, sin backfillear cobertura en código
  pre-existente no tocado por el cambio.
- Piso de cobertura asimétrico aceptado (40% frontend, sin piso enforced
  en backend) — no forzar simetría.
- CI corre la suite completa en cada push/PR; pre-push local corre
  `pytest -q`.
- Asimetría de gates de lint intencional (`next-lint` solo CI,
  `react-doctor` bloqueante en pre-commit).

**Sin especialización de metodología, ordering, piso general de
cobertura ni gates de CI** — el marco general (`classic` → piso de 80%
de cobertura de línea + ejecución en CI, per `org.md`) sigue vigente sin
cambios.

**Nota de cobertura CI cross-stack (observación de quality, no decisión
nueva)**: `team.md` ya documenta la asimetría de que pre-push local solo
corre `pytest -q` (sin Vitest) — convención ya aceptada, mismo espíritu
que la asimetría de gates de lint ya aceptada. Para este Bolt en
particular, que introduce dependencias reales cruzadas entre `apps/api`
y `apps/web` (el filtrado de grilla depende de que el backend acepte
`organization_id`; el sentinel "todas" depende de que el backend relaje
`tenant_id`), la cobertura real cross-stack (ambos lenguajes, suite
completa) ocurre recién en push/PR (CI), no en pre-push local. No es una
especialización nueva de proceso — es la aplicación tal cual de la
convención ya documentada, señalada acá para que quede explícito que el
gate local no atrapa una regresión de Vitest introducida por este Bolt
antes de que llegue a CI.

**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la
entrevista: "Sí, afirmar los 6 puntos tal cual" — no cambia el piso
general del proyecto, solo aplica a la superficie nueva de export
cross-org "todas las organizaciones" + fix de mapeo de valores CSV +
filtrado real de grilla):**

1. **Regresión de valor, no solo de clave, para `clean_title` y
   `groups` en `build_client_format_row()`**: el bug real es de
   TRANSFORMACIÓN DE VALOR (`title_status` string → `"1"`/`"0"` inverso
   de `csv_field_mapper.py`; `facebook_groups: list[str]` →
   `",".join()`), no de rename de clave — un test que solo verifique que
   la columna existe y tiene ALGÚN valor no detectaría una inversión de
   signo o un join incorrecto. El test debe fijar un valor de entrada
   conocido (ej. `title_status="clean"`, `facebook_groups=["A","B"]`) y
   afirmar el valor de SALIDA exacto esperado por el formato cliente
   (`"1"`, `"A,B"`), con un caso adicional para el valor inverso
   (`title_status="rebuilt"` → `"0"`, `facebook_groups=[]` → `""`).
   Justificación: impacto real de un bug no detectado es dato incorrecto
   enviado a un sistema externo del cliente — mayor severidad que el
   piso general de `classic` para un cambio de UI.
2. **Regresión negativa explícita del comportamiento por defecto
   post-sentinel**: después de introducir el sentinel "todas las
   organizaciones", un test debe demostrar que el comportamiento por
   defecto (sin pasar el sentinel, sin pasar `organization_id`) sigue
   resolviendo a "mi propia organización", nunca a "todas" — blinda la
   asimetría ya documentada (hallazgo #85) contra que se deslice hacia
   el criterio de `list_products` por copiar el patrón sin querer.
   Incluye además el caso ya afirmado en `260911-export-org-selector`:
   un usuario SIN `ORG_ADMIN_VIEW_ALL` debe demostrar que (a) la opción
   "todas las organizaciones" no está disponible en la UI, y (b) el use
   case de export "todas" rechaza la llamada aun si se invoca
   directamente sin pasar por la UI (defensa en profundidad, igual
   criterio que `_check_org_scope_permission()` ya aplica al sentinel
   puntual de una org ajena).
3. **Test de la resolución de `org_code` por-producto**: dado un export
   "todas las organizaciones" con productos de 2+ organizaciones
   distintas, cada producto en el ZIP resultante debe aparecer en la
   carpeta/segmento de SU PROPIA organización — no la de la primera
   organización resuelta en el loop. Es la regresión directa del bug
   real detectado en el scan (hallazgo #83 de `code-quality-assessment.md`).
4. **Test de wiring del filtrado real de la grilla**: confirmar que
   `organization_id` (derivado de `viewingOrgId`) efectivamente llega a
   `useInfiniteProducts()`/`ProductFilters` y que cambiar de organización
   en el picker dispara un refetch con el filtro nuevo — superficie de
   test completamente nueva (hoy `viewingOrgId` solo alimenta el export,
   nunca la query de productos).
5. **Test del filtro del picker por `product_count`**: el nuevo
   `.filter(o => (o.product_count ?? 0) > 0)` debe confirmarse con un
   caso límite real — una organización con `product_count: 0` (o el
   campo ausente, cubierto por `?? 0`) debe desaparecer de la lista.
   Sin este test, un cambio futuro en `useOrganizations()`/
   `OrganizationSchema` puede romper el filtro silenciosamente.
6. **Test de wiring de los dos popups nuevos** (`window.prompt()` de
   carpeta base y de grupos de Facebook): al menos un test por prompt
   que confirme que un valor no-null ingresado llega al parámetro
   correcto del llamado de export, y que `null` (cancelar) no dispara la
   acción — misma categoría de "superficie de test completamente nueva"
   que justifica el punto 4.

`OrganizationPicker.test.tsx` y el patrón de mocks ya establecido
(`useAuth`, `useOrganizations`, `useOrganizationStore`) siguen siendo el
precedente reusable para los puntos 2, 4, 5 y 6. Para los puntos 1 y 3
(backend), el precedente reusable es la suite existente de
`csv_export.py`/`csv_field_mapper.py` (mismo patrón de fixtures ya usado
para el mapeo directo del import).

**Gap heredado, no resuelto por este intent**: sigue sin resolverse
formalmente cuál convención de ubicación de test aplica a
`catalog/page.tsx` — este intent agrega tests nuevos en la misma zona
gris ya documentada en `team.md`. Build and Test debe decidir
explícitamente antes de escribir los tests del filtrado de grilla, para
no reabrir la ambigüedad una tercera vez sin decisión.

**Precedente de implementación — resolución batch de `org_code`
por-producto (Code Style, guía de implementación, no práctica de equipo
nueva)**: el patrón exacto a seguir ya existe en producción en
`apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`
— `_resolve_org_codes()` (línea 126) pre-resuelve TODOS los códigos de
organización necesarios en una sola query batch antes del loop por fila,
y el loop hace lookups O(1) contra ese dict (línea 171), nunca una query
por fila dentro del loop. El caso del export "todas" es incluso más
simple de resolver con el mismo patrón (cada `Product` ya trae su propio
`organization_id` como FK conocido, sin necesidad de matching de string
como en el import): un batch `get_all_by_ids()`-style sobre las
organizaciones distintas del lote de productos, construyendo un dict
`{organization_id: org_code}` antes del loop de export. Functional
Design debe heredar este patrón directamente — no hace falta medir
volumen de organizaciones distintas para justificar el batch (como
sugería una versión anterior de este documento); ya es el patrón elegido
por el equipo para exactamente este tipo de problema en el flujo
hermano (import).

**Precedente de implementación — capas para la función de mapeo
árbol-de-categorías → columnas planas del CSV (Code Style, guía de
implementación, no práctica de equipo nueva)**: `csv_export.py` hoy es
un domain service con CERO dependencias externas (solo `re` y
`collections.abc.Mapping`) — consistente con la regla de Clean
Architecture del proyecto ("Domain layer has ZERO external
dependencies") y con el patrón ya usado por las funciones existentes del
archivo, que siempre reciben datos YA RESUELTOS (nunca llaman a un
repositorio). La resolución `category_id → nodo del árbol` SÍ requiere
`CategoryRepository.get_by_id_cross_tenant()` — esa llamada NO debe vivir
dentro de `csv_export.py` (rompería su pureza de domain service), sino
en la capa de use case (`export_catalog_client_format.py` o un helper que
este invoque, que ya tiene acceso a repositorios inyectados), siguiendo
el mismo patrón ya usado hoy para `org_code`/`Organization.code`
(resuelto afuera, pasado ya resuelto adentro). El **mapeo puro** (nombres
de nivel ya resueltos → 2 columnas planas `category`/`type`) sí puede
vivir en `csv_export.py`, junto a `build_client_format_row()`, tomando
como entrada datos ya resueltos — igual que hace hoy
`build_image_folder_name()` con `Organization.code`. Functional Design
decide explícitamente esta separación resolución/mapeo, no la
formulación de "todo en el mismo archivo" de una versión anterior de
este documento.

## Deployment

Baseline afirmada: deploy-on-merge a staging, gate manual de producción
permanente, health check post-deploy, postura de seguridad de pipeline
con gaps aceptados y no bloqueantes.

**Sin especialización nueva de topología ni de proceso de deploy
propuesta** — este intent no introduce un componente desplegable nuevo
ni cambia entornos. Precisión de aplicación (no práctica nueva) que
Delivery Planning/Deployment Pipeline deben tener presente:

- Este Bolt toca `apps/api` Y `apps/web` a la vez. El pipeline de CI/CD
  ya existente (`ci.yml`, `deploy.yml`) construye y despliega ambos
  deployables desde el mismo push a `main` — no hay evidencia de que
  el pipeline actual trate el deploy de uno como condicional al otro.
  Si Requirements/Delivery Planning deciden que backend y frontend
  pueden entregarse en Bolts separados (por ejemplo, el fix de mapeo de
  CSV primero, el filtrado de grilla después), cada Bolt sigue el mismo
  camino de deploy-on-merge ya afirmado, sin necesidad de coordinación
  especial — el backend con el bug de mapeo corregido pero sin
  frontend aún consumiéndolo no rompe nada en producción (el CSV
  simplemente empieza a salir correcto).
- El mecanismo de autorización (un usuario sin permiso viendo/exportando
  el catálogo de otra organización) NO es nuevo respecto a los riesgos ya
  evaluados y aceptados para `OrganizationPicker`/`ORG_ADMIN_VIEW_ALL` en
  intents previos. La autorización real sigue viviendo en el backend
  (`_check_org_scope_permission()`); el nuevo caso de uso "exportar
  todas" debe aplicar el MISMO chequeo, no uno nuevo.
- **Corrección de alcance (señalada por devsecops)**: "mismo control, sin
  superficie de riesgo nueva" es incompleto. El MECANISMO de autorización
  no cambia, pero el **radio de explosión** de que ese mismo control
  falle una sola vez sí cambia: hoy un fallo de
  `_check_org_scope_permission()` expone el catálogo de UNA organización
  ajena por request; con "exportar todas" el mismo fallo expone las
  organizaciones completas de la plataforma en una sola descarga. Es un
  cambio real de impacto, aunque la probabilidad de falla y el mecanismo
  de gate no cambien. Dos decisiones puntuales, ya afirmadas en la
  entrevista (Q2), quedan documentadas acá como guía de implementación
  para Functional/NFR Design — NO se promueven a `discovered-rules.md`
  § Mandated, son decisiones de diseño de producto/seguridad acotadas a
  este intent:
  - **Auditoría distinguible para "todas" (afirmado: sí)**: el
    `logger.info()` ya existente en `product_router.py:786-789`
    (`"Cross-org catalog export: user=... own_org=... exported_org=..."`)
    está pensado para UN target puntual — no hay hoy ningún camino de
    código que arme ese mismo log para "exporté todas las
    organizaciones a la vez", porque ese camino de código no existe
    todavía. El mecanismo (`logger.info()` estructurado, sin tabla de
    auditoría dedicada, per el learning ya persistido en `project.md`
    del precedente `260910-export-cross-org`) sigue vigente tal cual —
    lo que cambia es el CONTENIDO: el log para el caso "todas" necesita
    un campo/valor que lo distinga explícitamente de un target puntual
    (ej. `scope=ALL_ORGS` o un evento separado), para que sea
    respondible por grep si alguna vez se exportó el catálogo completo
    de la plataforma.
  - **Confirmación de UI más fuerte para "todas" (afirmado: sí)**: el
    banner ya existente para exportar una organización ajena puntual
    (badge + Continuar/Cancelar) no alcanza para la acción de mayor
    radio de explosión que es exportar todas las organizaciones de una
    vez — necesita un paso de confirmación más fuerte (texto de
    advertencia adicional, palabra de confirmación tipeada, u otro
    mecanismo). El mecanismo EXACTO queda como pregunta abierta para
    Functional Design (ver `evidence.md`), no resuelto en esta etapa.
  - **Nota de agotamiento de recursos (devsecops, ya señalada como
    pregunta abierta en `evidence.md`, no resuelta acá)**: el ZIP del
    export se arma completo en memoria antes de que el
    `StreamingResponse` empiece a enviar nada — el consumo de memoria de
    una sola request "todas" escala con el total de productos+imágenes
    de TODA la plataforma, no de un tenant. `EXPORT_MAX_PRODUCTS=500`
    (hoy por-tenant) necesita revisarse para el modo "todas" — decisión
    de Functional/NFR Design, sin rate-limiting nuevo propuesto (la
    infraestructura genérica de `slowapi` ya existente acota frecuencia,
    no costo por-request; queda como riesgo residual aceptado,
    consistente con la postura de pipeline ya afirmada con gaps
    aceptados y no bloqueantes).

## Code Style

Baseline afirmada: Ruff+Pyright backend, Prettier+ESLint frontend
(`--max-warnings=0` en CI), GGA bloqueante en pre-commit, naming
camelCase TS/snake_case Python, patrón de manejo de errores centralizado
en frontend (mandate Q6 en 260829, aplica a código nuevo).

**Sin especialización nueva de formatter/linter propuesta.** Los dos
precedentes de implementación para los conceptos backend genuinamente
nuevos de este intent (resolución batch de `org_code` por-producto;
separación resolución/mapeo para la función de categorías→columnas)
quedan documentados arriba en § Testing Posture, junto al piso de tests
que los ejercita — evitar repetirlos acá para no duplicar la misma
decisión en dos secciones. Ambos son guía de implementación para
Functional Design, no práctica de equipo nueva.

- Naming en el boundary del filtrado real de grilla: mismo criterio ya
  afirmado en `260911-export-org-selector` — `organizationId` en
  camelCase del lado frontend, convertido a `organization_id` recién en
  el punto de armado del query param hacia el backend (ya resuelto por
  `products.ts` para otros parámetros).
- El mandate Q6 de manejo de errores centralizado en frontend aplica
  igual que en intents previos a cualquier boundary nuevo — en
  particular, el nuevo camino de `useInfiniteProducts()` con
  `organization_id` hereda el manejo de error ya existente del hook
  (no abre un boundary nuevo), y los dos `window.prompt()` nuevos
  (carpeta base, grupos de Facebook) no introducen manejo de error propio
  — siguen siendo síncronos, sin llamada de red, igual que los dos
  `window.prompt()` ya existentes.

## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
