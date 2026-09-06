**Collaborator:** aidlc-developer-agent

## Contribution

Foco de esta revisión: naming, layer boundaries, error handling, file
organization, y code-style conventions, evaluados contra el draft del lead
(`team-practices.md`, `discovered-rules.md`, `evidence.md`) y evidencia
directa (Paso 0 graphify-first + lectura puntual de valores literales, según
la excepción ya prevista a esa regla).

### Naming

- Confirmado por evidencia (graphify + `code-structure.md`): la familia de
  servicios de dominio para CSV sigue una convención de nombre consistente
  — `csv_export.py`, `csv_product_parser.py`, `csv_image_mapper.py`,
  `csv_field_mapper.py`, todos bajo `domain/services/`, snake_case, prefijo
  `csv_` cuando el servicio opera sobre la fila/estructura CSV. Constantes
  en UPPER_SNAKE (`UNIVERSAL_COLUMNS_ORDERED`), funciones en snake_case
  (`build_image_folder_name()`) — sin desvíos.
- Cualquier módulo nuevo para el ensamblado del ZIP de imágenes (capacidad
  nueva, no cubierta por `csv_export.py` ni `csv_image_mapper.py` hoy) debe
  seguir esta misma convención de nombre. No se afirma un nombre específico
  acá — es decisión de Requirements/Functional Design — pero el patrón
  esperable es un módulo hermano bajo `domain/services/`, no un nombre que
  rompa la familia `csv_*`/`catalog_*` ya establecida.

### Layer boundaries

- Confirmado por graphify (`application/ports/__init__.py`: "Ports
  (secondary interfaces) for ProSell SaaS application layer"): los puertos
  secundarios (`IDOSpacesService`, y por extensión cualquier puerto de
  storage) viven en `application/ports/`, NO en `domain/ports/` — esto
  corrige una imprecisión de `code-structure.md`, que lista `ports/` como
  subcarpeta de `domain/`. Es una aclaración de arquitectura, no un defecto:
  domain define solo `repositories/` (interfaces de persistencia) y
  mantiene zero-deps; los puertos secundarios hacia servicios externos
  (storage, email, etc.) son responsabilidad de application. Relevante para
  este intent porque decide dónde vive el método nuevo de lectura de
  imágenes.
- **Punto de layer-boundary crítico para Functional Design, no resuelto en
  el draft del lead**: si la vía elegida para leer bytes de imágenes ya
  subidas es (b) `httpx` contra las `image_urls` públicas (alternativa al
  método `get_object()` del puerto S3), esa llamada HTTP NO puede vivir en
  `domain/services/` bajo ninguna circunstancia — domain es zero-deps
  externas por regla de `CLAUDE.md` y confirmado por la estructura real del
  repo. La lógica pura de nombrar la carpeta (`build_image_folder_name()`,
  ya en domain, correcto ahí) debe permanecer separada de la lógica de
  I/O de red/storage (que pertenece a application u infrastructure). Un
  error común al extender `csv_export.py` sería colar el fetch de imágenes
  directamente en el mismo archivo/función que arma el nombre de carpeta —
  eso mezclaría una función pura de dominio con I/O externo en el mismo
  módulo. Recomiendo a Functional Design separar explícitamente: dominio
  = construir el nombre/estructura (ya existe, solo hay que arreglar el
  bug); application/infrastructure = orquestar la lectura de bytes +
  armado del ZIP en memoria.

### Error handling

- Confirmado por lectura de código: `csv_export.py` HOY no tiene ningún
  `raise` — `build_image_folder_name()` construye el nombre con `.get()` y
  fallbacks silenciosos (de ahí el bug: `attrs.get("color")` en vez de
  `attributes["exterior_color"]`, que se pierde sin ningún error ni log).
  Esto es exactamente el patrón que `phases/construction.md` prohíbe
  ("Silent failures are not acceptable") — el bug confirmado no es solo un
  error de lectura de campo, es síntoma de que la función no tiene ninguna
  superficie para señalar datos faltantes/inválidos.
- Sobre el punto que se me pidió evaluar explícitamente (si el nuevo
  endpoint/feature debería adoptar una jerarquía de excepciones tipadas
  tipo `CatalogExportException`/`ProductDomainException`): confirmado por
  graphify que **el backend YA tiene esa jerarquía para el dominio
  Product** — `apps/api/src/prosell/domain/exceptions/product_exceptions.py`
  define `ProductError` (clase base) con subclases específicas
  (`ProductNotFoundError`, `ProductInvalidStatusTransitionError`,
  `ProductAlreadyExistsError`, `ProductNotEditableError`,
  `VehicleAlreadyExistsError`, `InvalidVINError`,
  `ProductVersionConflictError`, `ProductRestoreTargetMissingError`),
  mapeada a HTTP en `product_router.py`. También existe `StorageUploadError`
  ya declarado en el puerto `ido_spaces.py` para errores de storage.
- **Posición**: NO hace falta inventar una jerarquía nueva
  (`CatalogExportException`) para este feature — sería una desviación de la
  convención de "una jerarquía por dominio" ya establecida y confirmada.
  Lo correcto es extender `product_exceptions.py` con una subclase nueva de
  `ProductError` (p. ej. algo del estilo `ProductImageAssetUnavailableError`
  para cuando una imagen referenciada en `image_urls` no se puede leer al
  armar el ZIP) — mismo archivo, mismo patrón, cero superficie nueva de
  convención. La regla ya afirmada en `project.md` (Q6, "adoptar en el
  frontend un patrón de manejo de errores equivalente al del backend") es
  una mandate de ADOPCIÓN para el FRONTEND porque ahí no existe el patrón
  — no aplica como "adopción" al backend, donde ya es la convención
  vigente; para este feature backend es simplemente "seguir lo que ya
  existe", no una decisión de práctica de equipo nueva a afirmar en este
  stage. El draft del lead no menciona este ángulo — lo marco como
  ampliación, no como corrección de un error del lead.

### File organization

- El precedente de test 1:1 sigue firme y aplica directo acá: existe
  `apps/api/tests/unit/domain/services/test_csv_export.py` (confirmado por
  graphify) cubriendo `build_image_folder_name()` — el fix del bug de color
  va en ese archivo existente (agregar/corregir el caso de test), no en uno
  nuevo. Mismo patrón que `test_csv_image_mapper.py` para su módulo
  hermano.
- Si Functional Design decide que el export de 24 columnas es una extensión
  de `csv_export.py` (no un pipeline nuevo — ver pregunta abierta ya
  registrada en `evidence.md`/`architecture.md`), el archivo correcto para
  tocar sigue siendo ese, consistente con la organización por dominio ya
  vigente (`domain/services/csv_*.py`) — no crear un `catalog_export_v2.py`
  paralelo sin necesidad.

### Code-style conventions

- Sin desvíos nuevos detectados para este feature respecto a lo ya
  confirmado por el lead: Ruff+Pyright backend, Prettier+ESLint frontend,
  GGA bloqueante en pre-commit. Cualquier excepción de dominio nueva
  (`ProductImageAssetUnavailableError` o el nombre que Functional Design
  decida) pasa por el mismo pipeline sin necesidad de regla adicional.
- Un endpoint HTTP no-JSON nuevo (CSV o ZIP) debe seguir el precedente ya
  confirmado por el lead (`download_bulk_upload_errors_csv()`,
  `StreamingResponse`) y verificar que el proxy BFF correspondiente maneje
  contenido binario — ya confirmado que `products/[...path]/route.ts` lo
  hace (`response.blob()` + `Content-Disposition`), a diferencia de
  `categories`/`organizations`/`vehicles`, que siguen con el bug de
  `response.json()` forzado. Si el endpoint de export vive bajo
  `/api/v1/products/*` (como hoy), no hay trabajo de proxy pendiente.

## Positions

AGREE: El draft del lead identifica correctamente que no hace falta
especialización nueva en Way of Working, Walking Skeleton ni Deployment
para este intent — el feature de export es una adición de código dentro de
Units existentes, sin cambios de topología ni de branching.

AGREE: El precedente de test unitario para binarios/ZIP que cita el lead
(`CSVImageMapper` + `test_csv_image_mapper.py`) es el patrón correcto de
Testing Posture para el nuevo código que arme el ZIP — unit tests sobre la
función/servicio en memoria, sin integración nueva contra storage real.

AGREE: El hallazgo del lead sobre `IDOSpacesService` sin método de lectura
de bytes ya almacenados está bien identificado y correctamente dejado como
decisión de diseño para Requirements/Functional Design, no una práctica de
equipo a afirmar en este stage.

AGREE: Dejar como pregunta abierta (no resuelta en Practices Discovery) la
semántica de "preguntarle al usuario la ruta base de destino" — es
correctamente una decisión de arquitectura/alcance para Requirements
Analysis, no una práctica de código.

OBJECT: El draft del lead no cubre Error Handling para este feature en
absoluto — ni en `team-practices.md` § Code Style ni en `discovered-rules.md`.
Dado que el bug confirmado en `build_image_folder_name()` es en sí mismo un
síntoma de manejo de errores ausente (fallo silencioso, sin excepción ni
log), y que el proyecto ya tiene una convención de excepciones de dominio
tipadas por subdominio (`product_exceptions.py`) directamente aplicable acá,
recomiendo que `evidence.md` incorpore este hallazgo explícitamente para que
Requirements Analysis / Functional Design lo tomen como restricción de
diseño: extender `ProductError`, no inventar una jerarquía paralela.

OBJECT: El draft del lead describe la ubicación de `IDOSpacesService` de
forma imprecisa por seguir la lectura de `code-structure.md` al pie de la
letra (que lista `ports/` bajo `domain/`) sin la corrección que
`architecture.md` § Key Design Decisions ya insinúa indirectamente. La ruta
real confirmada es `application/ports/ido_spaces.py` — el puerto vive en
application, no en domain. Esto no cambia ninguna decisión de práctica de
equipo, pero si se traslada tal cual a Functional Design podría inducir a
un desarrollador a buscar o crear el contrato en el lugar equivocado.
