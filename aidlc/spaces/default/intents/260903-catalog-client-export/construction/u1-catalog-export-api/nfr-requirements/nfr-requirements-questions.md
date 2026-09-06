# NFR Requirements Questions — u1-catalog-export-api

La mayoría de las categorías NFR (seguridad, observabilidad, escalabilidad,
confiabilidad) se derivan directo de decisiones ya tomadas (`requirements.md`
NFR1/NFR2, `rules.md`, patrones ya vigentes del proyecto — Redis/Taskiq no
aplican acá, es una operación síncrona). El único punto genuinamente
abierto es el número exacto del cap de recursos (NFR3, diferido desde
Requirements Analysis y Functional Design).

## Q1: Cap de recursos del export — métrica y número

`requirements.md` sugiere el precedente `max_rows=5000` del import
existente como punto de partida, pero el riesgo real de NFR3 es
agotamiento de MEMORIA armando el ZIP completo (imágenes en memoria, no
solo filas de CSV) — un cap por cantidad de PRODUCTOS es más relevante
que por filas de CSV per se, porque cada producto puede traer múltiples
imágenes.

A. **500 productos published por export** — génerosamente por encima de
un catálogo de dealer típico (decenas a bajos cientos de vehículos),
deja margen amplio sin arriesgar memoria (asumiendo un promedio
razonable de imágenes por vehículo).
B. **5000 productos** (mismo número que el precedente de import) — más
permisivo, pero el import es fila-por-fila desde CSV (sin imágenes en
memoria simultáneas), mientras que el export SÍ necesita tener las
imágenes en memoria para armar el ZIP — no es un precedente
directamente comparable en términos de riesgo de memoria.
X. Other (please specify)

[Answer]: A. 500 productos published por export

## Consolidated Summary Confirmation

- **Cap de recursos (NFR3.1)**: 500 productos `published` por export —
  rechazo con `413 Payload Too Large` si se excede (ya confirmado en
  Functional Design de este mismo Unit).
- **Performance**: sin NFR de performance en `requirements.md` — se
  originan targets nuevos acá (p95 razonable para una operación de
  generación de archivo en bulk, no un endpoint interactivo).
- **Seguridad**: deriva directo de NFR1 (tenant scoping JWT-only) y NFR2
  (zip-slip) ya en `requirements.md`/`rules.md` — sin ambigüedad nueva.
- **Escalabilidad/Confiabilidad/Observabilidad**: sin infraestructura
  nueva (sin colas, sin servicio separado) — targets derivados del
  patrón ya vigente del resto de `apps/api`.
- **Tech stack**: sin dependencias nuevas — `csv`/`zipfile` (stdlib),
  `boto3` ya instalado para el nuevo `get_object()`.

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
