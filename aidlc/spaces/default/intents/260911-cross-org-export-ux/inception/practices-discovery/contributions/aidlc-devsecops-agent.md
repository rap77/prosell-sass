**Collaborator:** aidlc-devsecops-agent

## Contribution

Reviso el draft del lead (`team-practices.md`, `discovered-rules.md`,
`evidence.md`) contra `api-documentation.md` (asimetría `organization_id`
omitido = "propio" en export vs. "todas" en `list_products`),
`code-quality-assessment.md` (hallazgos #83-86), el código real de
`export_catalog_client_format.py` y `product_router.py:735-798`, y la
línea base afirmada de `team.md` § Deployment/§ Way of Working.

### 1. Lint/format/CI para las funciones de transformación de valor nuevas en `csv_export.py`

Ruff+Pyright (ya bloqueantes en pre-commit) siguen siendo el gate
correcto para tipado y estilo — no hace falta una regla nueva de lint.
Pero ninguna herramienta de lint/SAST detecta una inversión de signo
semántica (`title_status="clean"` → debería ser `"1"`, no `"0"`) ni un
`",".join()` mal aplicado: eso solo lo atrapa un test que fije un valor
de entrada conocido y afirme el valor de SALIDA exacto. El piso #1 que
propone el lead en `team-practices.md` § Testing Posture ya apunta
exactamente a esto — **AGREE**, sin nada que agregar en la capa de
lint/CI misma.

### 2. "Misma clase de permiso, mayor alcance" — marco insuficiente por sí solo

`_check_org_scope_permission()` (`ORG_ADMIN_VIEW_ALL`/`super_admin`) es
el gate de AUTORIZACIÓN correcto y no hace falta un permiso nuevo — en
eso el lead tiene razón. Pero "misma clase de permiso" responde solo la
pregunta de **quién puede entrar**, no la de **cuánto se pierde si el
gate falla o si la cuenta con el permiso se ve comprometida**. Estas son
preguntas distintas en cualquier modelo de riesgo likelihood×impact
(STRIDE/threat modeling): la probabilidad de que el gate falle no cambia
por este intent, pero el **impacto** de esa falla sí — hoy un fallo de
`_check_org_scope_permission()` (bug, sesión de `super_admin`
comprometida, insider) expone el catálogo de UNA organización ajena por
request; con "exportar todas" el mismo fallo expone las ~29+
organizaciones del sistema en una sola descarga. Es el mismo control,
pero el radio de explosión de que ese control falle una sola vez pasa de
"1 tenant" a "todos los tenants" — eso sí es una superficie de riesgo
mayor, no solo "extensión neutra del mismo control ya auditado" como lo
plantea `team-practices.md` § Deployment.

Concretamente, dos consecuencias que el draft no menciona y que
recomiendo dejar como pregunta abierta explícita para Requirements/
Functional Design (no como Mandated de esta etapa — coincido con el
lead en que no corresponde promoverlo a práctica de equipo general):

- **Logging de auditoría distinguible para el caso "todas".** El
  `logger.info()` ya existente en `product_router.py:786-789`
  (`"Cross-org catalog export: user=... own_org=... exported_org=..."`)
  está pensado para UN target puntual (`exported_org=<uuid>`) — no hay
  hoy ningún camino de código que arme ese mismo log para "exporté las
  29 organizaciones a la vez", porque ese camino de código no existe
  todavía. La convención ya afirmada en `project.md` § Code Style
  (`logger.info()` estructurado preferido sobre tabla de auditoría
  dedicada, precedente `260910-export-cross-org`) sigue aplicando tal
  cual como MECANISMO — no estoy pidiendo una tabla nueva. Pero el
  CONTENIDO de ese log para el caso "todas" necesita ser distinguible en
  una búsqueda de log (ej. un campo `scope=ALL_ORGS` o un evento
  separado `catalog_export.all_orgs_completed`), no reusar
  silenciosamente el mismo formato pensado para un solo target — de lo
  contrario, "¿alguna vez alguien exportó el catálogo completo de la
  plataforma?" no es una pregunta respondible por grep sobre los logs
  existentes.
- **Confirmación de UI más fuerte para la acción de mayor radio de
  explosión.** `evidence.md` § "Preguntas abiertas para la entrevista
  humana" no incluye ninguna pregunta sobre si "exportar todas las
  organizaciones" necesita una confirmación de UI distinta a simplemente
  elegir una opción más en el picker (ej. un modal que declare
  explícitamente "esto va a descargar el catálogo de TODAS las
  organizaciones" antes de disparar la descarga) — dado que es una
  acción de exfiltración masiva de datos de un solo click, sin
  posibilidad de deshacer. No es una decisión de práctica de equipo
  (es UX/Functional Design), pero su ausencia total en la lista de
  preguntas abiertas es un gap real: el hallazgo #86 (patrón
  `window.prompt()` con default) ya reconoce que este intent agrega
  popups nuevos — vale la pena que uno de ellos, o un elemento
  específico, confirme explícitamente el alcance "todas" antes de
  ejecutar.

### 3. `EXPORT_MAX_PRODUCTS=500` y el ángulo de agotamiento de recursos (DoS)

El hallazgo #84 ya señala correctamente que el cap necesita
reconsiderarse para el modo "todas" — coincido con que es una decisión
de diseño pendiente, no una práctica de equipo. Agrego un dato que
`evidence.md` no conecta explícitamente: leyendo
`export_catalog_client_format.py` (líneas 150-169) y
`product_router.py:794-798`, el ZIP completo se arma en memoria
(`zip_bytes: bytes`) ANTES de que el `StreamingResponse` empiece a
enviar nada (`iter([result.zip_bytes])` es un iterador de un solo
elemento, no streaming real chunk-por-chunk) — el nombre de la clase
sugiere streaming pero el patrón real es "armar todo en memoria, después
mandarlo". Esto ya es así hoy para una sola organización; multiplicado
por ~29+ organizaciones en una sola request, el consumo de memoria del
proceso por esa única request escala con el total de productos+imágenes
de TODA la plataforma, no de un tenant. `_MAX_CONCURRENT_IMAGE_READS`
(semáforo) acota la concurrencia de lecturas de imagen pero no el tiempo
total de wall-clock ni la memoria total acumulada del ZIP resultante. No
propongo una solución (paginar, subir el límite, o aceptar que puede
fallar en 413 son las tres vías que el propio hallazgo #84 ya nombra) —
solo señalo que la pregunta abierta #4 de `evidence.md` debería
explicitar también el ángulo de memoria del proceso, no solo el de "cae
en 413 antes o después", para que Functional/NFR Design lo tenga
presente al decidir.

Sobre rate limiting específicamente: el proyecto YA tiene infraestructura
de rate limiting genérica (`slowapi`, configurada globalmente en
`main.py`/`config.py` — por IP y por usuario, requests-por-minuto). Esa
infraestructura acota la FRECUENCIA de requests, no el COSTO de una
request individual — no resuelve el escenario "una sola request
legítima, dentro del límite de frecuencia, que igual es cara". No
recomiendo agregar un rate limit específico nuevo para este endpoint
como práctica de esta etapa (sería sobre-ingeniería sin evidencia de que
el equipo lo necesite, y no hay precedente de rate limits por-endpoint
en el resto de la API) — lo dejo como riesgo residual aceptado,
consistente con la postura ya afirmada en `team.md` § Deployment
("postura de seguridad de pipeline con gaps aceptados y no
bloqueantes").

### 4. Vigencia del learning de auditoría liviana (`project.md`)

El learning ("preferir `logger.info()` sobre tabla de auditoría
dedicada, salvo precedente de tabla ya existente para ese dominio")
sigue aplicando cabalmente al MECANISMO — no hay razón para introducir
una tabla nueva solo porque el alcance de un export creció. Lo que NO
se sostiene sin ajuste es asumir que basta con que el código existente
(`logger.info` con `exported_org=<uuid>` puntual) simplemente seguirá
corriendo sin cambios para el caso "todas" — como señalo en el punto 2,
ese log no tiene hoy ningún camino que lo dispare para ese caso, y su
forma actual no es distinguible en una búsqueda. Es una precisión de
diseño para Functional/NFR Design de ESTE intent, no una revisión del
learning general.

## Positions

AGREE: Ruff+Pyright siguen siendo el gate de lint/CI correcto para las
funciones de transformación de valor nuevas en `csv_export.py`; ningún
lint/SAST detecta una inversión de valor semántica, así que el piso de
test #1 propuesto por el lead (fijar valor de entrada conocido, afirmar
salida exacta) es la única defensa real y ya está bien targeteado.

AGREE: `_check_org_scope_permission()`/`ORG_ADMIN_VIEW_ALL` sigue siendo
el gate de autorización correcto para "exportar todas" — no hace falta
un permiso ni un mecanismo de autorización nuevo, solo que el caso
"todas" pase por el mismo chequeo (como ya propone el piso de test #2
del lead).

OBJECT: la afirmación de `team-practices.md` § Deployment de que este
intent "no tiene superficie de riesgo nueva, solo una extensión del
mismo control ya auditado" es incompleta. El radio de explosión de un
fallo del mismo control pasa de 1 organización a todas las
organizaciones de la plataforma en una sola request exitosa — eso es un
cambio real de impacto, aunque la probabilidad de falla y el mecanismo
de gate no cambien. No pido bloquear la etapa ni promover nada a
Mandated/Forbidden (coincido en que la resolución concreta es de
Requirements/Functional/NFR Design, no de Practices Discovery), pero
recomiendo que `evidence.md` § "Preguntas abiertas para la entrevista
humana" sume explícitamente: (a) si el log de auditoría cross-org
existente necesita distinguir el caso "todas" de un target puntual, y
(b) si la UI necesita una confirmación más fuerte que elegir una opción
del picker antes de disparar la descarga completa. Ninguna de las dos
aparece hoy en esa lista.

AGREE (parcial, con una precisión): el ángulo de agotamiento de recursos
del hallazgo #84 es real y está bien señalado como pregunta abierta,
pero recomiendo que esa pregunta explicite también que el ZIP se arma
completo en memoria antes de streamear (no solo el límite de conteo de
productos vía 413) — el riesgo de memoria del proceso escala con el
total de la plataforma, no con un tenant, independientemente de qué
valor final tome `EXPORT_MAX_PRODUCTS`.

AGREE: no hace falta agregar rate limiting específico por-endpoint como
práctica nueva de esta etapa — la infraestructura genérica ya existente
(`slowapi`) no resuelve el escenario de "una sola request cara dentro
del límite de frecuencia", pero tampoco hay precedente ni evidencia de
que el equipo lo necesite hoy; queda como riesgo residual aceptado,
consistente con la postura de seguridad de pipeline ya afirmada con
gaps no bloqueantes.

AGREE: el learning de `project.md` sobre auditoría liviana
(`logger.info()` sobre tabla dedicada) sigue vigente como MECANISMO para
este intent — no corresponde introducir una tabla de auditoría nueva.
La precisión de que el contenido/forma de ese log necesita distinguir
el caso "todas" es una decisión de diseño de Functional/NFR Design de
este intent puntual, no una revisión del learning general.

AGREE: ninguno de los puntos anteriores amerita promoción a
`discovered-rules.md` § Mandated/Forbidden — son decisiones de diseño de
producto/seguridad acotadas a este intent, consistente con el criterio
ya aplicado en intents previos (`project.md` § Forbidden, entrada
afirmada 2026-09-11).
