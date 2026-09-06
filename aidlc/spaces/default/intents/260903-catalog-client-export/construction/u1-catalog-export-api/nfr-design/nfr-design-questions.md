# NFR Design Questions — u1-catalog-export-api

Dos decisiones de diseño genuinas quedan abiertas para esta etapa —el
resto (autenticación, encriptación, componentes lógicos) ya está resuelto
por patrones vigentes del proyecto sin ambigüedad.

## Q1: Estrategia de concurrencia para leer imágenes

`performance-requirements.md` (NFR-PERF-1) exige p95 < 15s para 500
productos con hasta 10 imágenes c/u — hasta 5000 llamadas a
`get_object()`. Leer secuencialmente (una por una) no cumpliría ese
target.

A. **Concurrencia acotada con `asyncio.gather` + semáforo** (ej. máximo
20 lecturas simultáneas) — balancea velocidad con no saturar la
conexión a DigitalOcean Spaces ni la memoria (imágenes en vuelo
simultáneamente).
B. Concurrencia completa sin límite (`asyncio.gather` de todo el batch) —
más rápido en el caso feliz, pero arriesga saturar la conexión o la
memoria si muchas imágenes son grandes.
X. Other (please specify)

[Answer]: A. Concurrencia acotada (semáforo, máximo 20 simultáneas)

## Q2: Política de retry para lectura de imagen individual fallida

`rules.md` (BR4.2, Functional Design) ya fija el comportamiento final
(log warning, no aborta el export) pero no especifica si se reintenta
antes de darse por vencido.

A. **1 retry con backoff corto** (ej. 200ms) antes de loguear el warning
y continuar — cubre fallos transitorios de red sin agregar latencia
significativa al export completo.
B. Sin retry — cualquier fallo se loguea y se continúa inmediatamente.
X. Other (please specify)

[Answer]: A. 1 retry con backoff corto (200ms)

## Consolidated Summary Confirmation

- **Performance**: lectura de imágenes concurrente (semáforo, máx. 20
  simultáneas) para cumplir NFR-PERF-1/2.
- **Reliability**: 1 retry con backoff de 200ms por imagen antes de
  loguear warning y continuar (BR4.2 ya fijaba el comportamiento final,
  esta etapa agrega la política de retry).
- **Security**: sin diseño nuevo — auth/encriptación heredan el patrón ya
  vigente, sin superficie de input validation nueva (endpoint sin
  parámetros).
- **Scalability**: enforcement del cap (500 productos) como único control
  de escalabilidad — sin partitioning, sin colas.
- **Observability**: logging estructurado con los campos ya definidos en
  `observability-requirements.md`, métricas RED estándar.
- **Logical components**: extensión de módulos ya existentes
  (`domain/services/csv_export.py`, nuevo método en el puerto
  `IDOSpacesService`, nuevo endpoint en `product_router.py`) — sin
  componente desplegable nuevo, blast radius acotado a la request
  individual (sin estado compartido).

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
