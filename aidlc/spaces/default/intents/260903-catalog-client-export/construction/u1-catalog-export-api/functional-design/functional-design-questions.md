# Functional Design Questions — u1-catalog-export-api

`contract-summary.md` (Contract Design) dejó 3 puntos explícitamente
diferidos a esta etapa. Los resuelvo acá porque son decisiones de diseño
genuinas, no confirmaciones administrativas.

## Q1: Lectura de imágenes ya subidas — `get_object()` vs. `httpx`

`requirements.md` § Assumptions ya se inclina hacia `httpx` (sin
dependencia nueva, sin cambio de puerto). `image_urls` de `Product` son
URLs públicas de DigitalOcean Spaces.

A. `httpx.get()` directo contra las `image_urls` públicas — sin cambio al
puerto `IDOSpacesService`, la llamada HTTP vive en
`application`/`infrastructure` (nunca en `domain/services/`, per
`team-practices.md`). Más simple, sin superficie de puerto nueva a
testear.
B. Agregar `get_object()` a `IDOSpacesService` (puerto + adapter
`do_spaces_service.py`) — evita depender de que la URL sea
públicamente accesible, pero agrega superficie de puerto nueva sin
necesidad real hoy (las URLs ya son públicas).
X. Other (please specify)

[Answer]: B. Agregar get_object() a IDOSpacesService

## Q2: Código HTTP para "catálogo excede el cap de recursos"

`stories.md` AC1.3.1 fija el comportamiento (rechazo con error
específico), no el código. El número exacto del cap queda para NFR
Design — acá solo se fija el código de status.

A. `413 Payload Too Large` — semántica más cercana: "estás pidiendo más
datos de los que el servidor va a procesar en esta respuesta".
B. `422 Unprocessable Entity` — genérico, usado hoy por validación de
DTOs de entrada, no por límites de volumen de respuesta.
X. Other (please specify)

[Answer]: A. 413 Payload Too Large

## Q3: Nombre final del endpoint

`contract-summary.md` lo dejó provisional.

A. Confirmar `GET /api/v1/products/export-client-format.zip` tal cual —
ya está en el contrato, U1/U2 ya construyen contra ese nombre.
B. Cambiar el nombre (especificar cuál).
X. Other (please specify)

[Answer]: A. Confirmar export-client-format.zip

## Consolidated Summary Confirmation

- **Lectura de imágenes**: se agrega `get_object()` al puerto
  `IDOSpacesService` (`application/ports/`) + su implementación en
  `do_spaces_service.py` (`infrastructure/services/`) — nueva capacidad
  de lectura, evita depender de que `image_urls` sea públicamente
  accesible. La llamada al puerto vive en el use case
  (`application/use_cases/`), nunca en `domain/services/`.
- **Cap excedido**: `413 Payload Too Large`, número exacto diferido a NFR
  Design.
- **Endpoint**: `GET /api/v1/products/export-client-format.zip`,
  confirmado como final.
- Sin entidades persistidas nuevas (confirmado en Domain Design ADR-002)
  — `entities.md` va a modelar solo los value objects efímeros del
  request (fila CSV, nombre de carpeta), referenciando `Product`/
  `Organization` ya existentes.
- Reglas de negocio (`rules.md`) cubren: filtro published+tenant,
  formato de las 24 columnas, bug fix de `exterior_color`, sanitización
  obligatoria, enforcement del cap, comportamiento de imagen faltante y
  catálogo vacío.

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
