**Collaborator:** aidlc-developer-agent

## Contribution

Reviso el draft del lead con foco en naming, límites de capa, manejo de
errores, organización de archivos y convenciones de code style, para los
dos conceptos backend genuinamente nuevos de este intent: resolución de
`org_code` por-producto en `export_catalog_client_format.py`, y la
función de mapeo árbol-de-categorías → columnas planas en
`csv_export.py`.

### 1. ¿Corresponde diferir ambas decisiones a Requirements/Functional Design, o hay precedente ya establecido que debería surfacearse ahora?

Coincido en que **no** corresponde afirmar una convención de equipo
nueva y general en `## Code Style` — ambas decisiones son de diseño
acotado a este intent puntual, consistente con el criterio ya aplicado
en `260903-catalog-client-export` y `260911-export-org-selector`
(`project.md`, entrada afirmada 2026-09-04: "una decisión de diseño
acotada a un solo feature/intent... se documenta en evidence.md, no se
promueve a discovered-rules.md ## Mandated").

Pero **sí hay un precedente concreto en este mismo codebase** para la
forma exacta del problema "resolver una entidad relacionada por-item
dentro de un loop, evitando N+1 queries", y ni `team-practices.md` ni
`evidence.md` lo mencionan. Leí directamente
`apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`
(no solo el resumen del codekb, que solo cita ese archivo por las claves
reales de `attributes`, líneas 430-469): el use case de import ya
resuelve exactamente el problema inverso — códigos de organización de
un CSV completo → UUIDs — con un **pre-fetch batch en una sola query**
antes del loop:

```python
org_code_map = await self._resolve_org_codes(parsed_rows, tenant_id)  # línea 126
```

y luego el loop por fila hace lookups O(1) contra ese dict
(`if code in org_code_map`, línea 171), nunca una query por fila. El
caso del export es incluso más simple de resolver con el mismo patrón:
cada `Product` ya trae su propio `organization_id` (FK conocido, sin
necesidad de matching de string como en el import), así que un batch
`get_all_by_ids()`-style sobre las organizaciones distintas del lote
resultante, construyendo un dict `{organization_id: org_code}` antes del
loop, es el mismo patrón espejado.

Este precedente responde de antemano la pregunta abierta que
`team-practices.md` § Code Style deja pendiente para Functional Design
("habría que verificar cuántas organizaciones distintas aparecen
típicamente... antes de asumir que hace falta cachear resoluciones
repetidas"): no hace falta medir volumen para justificar el batch — es
el patrón YA elegido por el equipo para el mismo tipo de problema en el
flujo hermano (import). Dejarlo como pregunta abierta de performance
arriesga que Functional Design reinvente una resolución query-por-fila
(el mismo antipatrón que ya causó el bug de "una sola resolución global"
que este intent corrige) en vez de heredar el batch ya probado.

### 2. Gap de manejo de errores (claves de `attributes` ausentes)

No encuentro gap real acá. `build_client_format_row()`
(`csv_export.py:161-193`) ya lee TODAS las columnas vía
`attributes.get(column)` con conversión `None → ""` (línea 191) — un
patrón de default-seguro-ante-ausencia ya establecido en la MISMA
función que las nuevas transformaciones de valor van a extender. El
contrato ya fijado en `api-documentation.md` (líneas 301-306) para
`clean_title`/`groups` sigue exactamente ese idioma:

```python
CLEAN_TITLE_TO_CSV.get(attributes.get("title_status"), "")
row["groups"] = ",".join(attributes.get("facebook_groups") or [])
```

— ambas expresiones ya toleran `None`/clave ausente sin excepción. El
mandate Q6 (manejo de errores centralizado en frontend, excepciones
tipadas + handler centralizado en backend) no aplica acá: estas son
funciones de transformación PURA sobre datos ya en memoria, no un
boundary de integración (API call, DB, I/O) en el sentido de
`construction.md` § Error Handling — no corresponde forzar el patrón de
excepción tipada de dominio sobre lo que es, en esencia, un
`dict.get()` con default. Coincido con el draft en que no hace falta
calling out esto como convención nueva; agrego que el estándar implícito
a seguir para las funciones nuevas es literalmente el mismo `.get()`
con default de la función que ya extienden, no algo a inventar.

Sí dejo una pregunta de diseño no resuelta por ninguno de los tres
artefactos: si la resolución del árbol de categorías (`category`/`type`)
falla o encuentra un nivel inesperado para un producto puntual dentro
del loop, ¿el comportamiento correcto es degradar esa fila a `""` (igual
criterio que el resto de la función, tolerante a datos faltantes) o
abortar el export completo? Dado que el resto de `build_client_format_row()`
nunca aborta por una columna faltante, el criterio consistente sería
degradar, no lanzar — pero es una decisión de producto (¿un catálogo con
1 producto de categoría rara debería bloquear el export de los otros
499?), no algo que yo pueda resolver por evidencia de código.

### 3. Organización de archivos: ¿la función de mapeo de categorías vive en `csv_export.py`?

Acá objeto la propuesta del draft. `csv_export.py` hoy es un domain
service **sin ninguna dependencia externa** — confirmé sus imports:
únicamente `re` y `collections.abc.Mapping`. Es consistente con la regla
del proyecto ("Domain layer has ZERO external dependencies") y con el
patrón ya usado por las funciones existentes del archivo: reciben datos
YA RESUELTOS (`Organization` entity completa en
`build_image_folder_name()`, no un lookup por código; `attributes: dict`
ya cargado) — nunca llaman a un repositorio.

La resolución `category_id → nodo del árbol` SÍ requiere un repositorio:
`CategoryRepository.get_by_id_cross_tenant()`
(`category_repository_impl.py:120-129`, confirmado en
`code-structure.md` línea 195 como "nuevo, este pase"). Meter esa
llamada dentro de una función que vive en `csv_export.py` rompería la
pureza que hoy tiene ese archivo y mezclaría una responsabilidad de
infraestructura/aplicación (fetch de datos) dentro de lo que hoy es
puro domain service — no es solo un capricho de organización de
carpetas, es el mismo principio de capas ya aplicado consistentemente en
el resto del archivo (`org_code` se resuelve afuera, en el use case, y
se pasa adentro ya resuelto).

Propongo — para que Functional Design lo decida explícitamente, no como
afirmación mía de práctica de equipo — separar en dos:

- La **resolución** (`category_id` → nombres de nivel del árbol,
  potencialmente batch-prefetched igual que el punto 1, dado que el
  árbol tiene solo 3-4 niveles con un universo acotado de categorías)
  vive en `export_catalog_client_format.py` (el use case), que ya tiene
  acceso a repositorios inyectados.
- El **mapeo puro** (nombres de nivel ya resueltos → 2 columnas planas
  `category`/`type`) puede perfectamente vivir en `csv_export.py`, junto
  a `build_client_format_row()`, tomando como entrada datos ya
  resueltos — igual que hace hoy con `Organization.code` para
  `build_image_folder_name()`.

Esto no contradice la intuición del draft de "mismo archivo, mismo
patrón que las funciones de transformación de valor existentes" — la
extiendo señalando que el patrón existente ya separa fetch (afuera) de
transformación pura (adentro), y la propuesta del draft de meter todo
en `csv_export.py` sin esa separación se saltea esa distinción.

### 4. Módulos nuevos inventariados / dependencies.md — algo sub-ponderado

El hallazgo del punto 1 (`bulk_upload_vehicles.py` como precedente de
batch-resolution) tampoco está en `dependencies.md` § "export 'todas las
organizaciones' depende de capacidad de repositorio ya existente"
(líneas 89-91) — esa sección describe correctamente QUÉ falta (resolver
`org_code` por producto en vez de una sola vez) pero no CÓMO ya se
resolvió el mismo problema de forma en otro punto del código. Vale la
pena agregarlo a `evidence.md` o dejarlo para que Functional Design lo
levante — no es indispensable resolverlo en esta etapa, pero sí
recomiendo citarlo explícitamente como precedente en vez de dejarlo
implícito en mi contribución únicamente.

## Positions

AGREE: No corresponde afirmar una convención de equipo nueva y general
en `## Code Style` para la resolución de `org_code` por-producto ni para
la función de mapeo de categorías — ambas son decisiones de diseño
acotadas a este intent, consistente con el precedente ya establecido en
`project.md` de no promover decisiones de alcance de un solo intent a
`discovered-rules.md` § Mandated.

OBJECT: Dejar la pregunta de "¿hace falta cachear/batchear la resolución
de `org_code` por-producto?" completamente abierta para Functional
Design, condicionada a medir volumen de organizaciones distintas, no es
necesario — existe un precedente directo y ya probado en este mismo
codebase (`bulk_upload_vehicles.py._resolve_org_codes()`, pre-fetch
batch en un dict antes del loop, lookup O(1) adentro) para exactamente
esta forma de problema. Recomiendo que el lead lo agregue a
`evidence.md` como precedente citado explícitamente, para que Functional
Design lo herede en vez de volver a evaluarlo desde cero o arriesgar una
implementación N+1 ingenua.

OBJECT: La propuesta de que la función de mapeo árbol-de-categorías →
columnas planas viva íntegramente en `csv_export.py` "mismo archivo,
mismo patrón" no distingue entre resolución (requiere repositorio,
`CategoryRepository.get_by_id_cross_tenant()`) y transformación pura
(no requiere repositorio). `csv_export.py` hoy tiene cero dependencias
externas (solo `re`/`collections.abc`) — meter una llamada a repositorio
ahí rompe esa pureza y el patrón de capas ya vigente en el resto del
archivo (que siempre recibe entidades ya resueltas, nunca hace su propio
fetch). Recomiendo que Functional Design decida explícitamente separar
resolución (en el use case) de mapeo puro (en `csv_export.py`), en vez
de heredar la formulación "todo en el mismo archivo" tal cual está
planteada en el draft.

AGREE: No hay gap de manejo de errores que amerite una convención nueva
para claves de `attributes` ausentes/inesperadas — el patrón
`.get(...)` con default seguro ya está establecido en
`build_client_format_row()` y el contrato ya fijado para
`clean_title`/`groups` en `api-documentation.md` ya lo sigue. El mandate
Q6 (manejo de errores centralizado) no aplica a estas funciones de
transformación pura, que no son un boundary de integración.

AGREE: Las precisiones de naming en el boundary (camelCase frontend →
`organization_id` snake_case recién en el armado del query param) y el
resto de la convención de Code Style ya afirmada no necesitan cambios
para este intent — el draft las reafirma correctamente sin abrir
ambigüedad nueva.
