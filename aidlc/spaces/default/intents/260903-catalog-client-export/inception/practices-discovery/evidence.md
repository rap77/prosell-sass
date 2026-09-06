# Evidence (Final — Step 5 Lead Integration)

## Quién inspeccionó qué

- **Lead (Step 2 draft)**: baseline de `team.md`/`project.md`, codekb
  mergeado del intent (code-structure, technology-stack, dependencies,
  code-quality-assessment, architecture, business-overview), y Paso 0
  graphify-first (`graphify query` sobre endpoints de descarga CSV/ZIP
  existentes) más lectura directa puntual de valores literales no
  indexados en detalle (firma del endpoint de descarga existente, ABC de
  `IDOSpacesService`, líneas del proxy BFF de productos).
- **aidlc-quality-agent (Step 3, ciego)**: foco en testing posture
  aplicable al área — precisó que el precedente `CSVImageMapper` cubre el
  sentido inverso (import, no export), identificó el bug ya confirmado en
  `build_image_folder_name()` y los casos límite de `Organization.code`,
  señaló el gap de cobertura cero en `handleExportCsv`/`exportCatalogCsv`
  (frontend), el gap de convención de ubicación de test para
  `catalog/page.tsx`, el duplicado sin resolver de
  `test_csv_image_mapper.py`, y recomendó un test de contrato de
  `Content-Type`/`Content-Disposition` dado el historial repetido de esa
  clase de bug en el repo.
- **aidlc-developer-agent (Step 3, ciego)**: foco en naming, layer
  boundaries, error handling, file organization y code-style — confirmó
  la convención de nombres `csv_*` en `domain/services/`, corrigió la
  ubicación real de `IDOSpacesService` (`application/ports/`, no
  `domain/ports/` como sugiere `code-structure.md`), señaló que
  `csv_export.py` no maneja errores hoy (fallo silencioso), confirmó que
  `ProductError` ya existe como jerarquía de excepciones del dominio
  Product y propuso extenderla en vez de crear una jerarquía paralela, y
  marcó el riesgo de mezclar I/O de red con lógica pura de dominio si se
  elige la vía `httpx`.
- **aidlc-devsecops-agent (Step 3, ciego)**: foco en aislamiento
  multi-tenant del export masivo, semántica de "ruta de destino local", y
  gaps de seguridad nuevos — verificó que `export_catalog_csv()` ya
  resuelve tenant_id exclusivamente de `current_user.tenant_id` (patrón a
  replicar, más estricto que `list_products()`), analizó el perfil de
  riesgo de las dos interpretaciones de "ruta de destino" (download de
  navegador vs. escritura arbitraria de archivos en servidor = path
  traversal de severidad alta), y confirmó dos gaps de seguridad nuevos a
  mitigar en diseño: zip-slip dentro del ZIP (mitigable reusando
  `_slug_part()`/`_sanitize_filename` ya probados) y DoS por agotamiento de
  memoria (mitigable con un cap explícito, análogo al `max_rows=5000` ya
  existente en `export_catalog_csv()`).

## Baseline used (re-run)

- `aidlc/spaces/default/memory/team.md` — todas las 5 secciones no vacías
  (Way of Working, Walking Skeleton, Testing Posture, Deployment, Code
  Style), última afirmación en el intent 260829-auth-navigation-refactor
  con reconfirmaciones posteriores (260830-ci-seed-data,
  260830-ci-fixes-round2, 260828-useeffect-to-react-query,
  260901-frontend-test-debt, 260902-teamapi-create-param). Tratado como
  hecho de equipo vigente, no como sugerencia.
- `aidlc/spaces/default/memory/project.md` — secciones `## Mandated`,
  `## Forbidden`, `## Testing Posture`, `## Corrections` (aprendizajes
  acumulados), usadas para `discovered-rules.md` y para descartar dudas ya
  resueltas en intents previos.

## Codekb (reverse-engineering, mergeado hoy con foco en catálogo/export/imágenes)

- `aidlc/spaces/default/codekb/prosell-sass/code-structure.md`
- `aidlc/spaces/default/codekb/prosell-sass/technology-stack.md`
- `aidlc/spaces/default/codekb/prosell-sass/dependencies.md`
- `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md`
- `aidlc/spaces/default/codekb/prosell-sass/architecture.md`
- `aidlc/spaces/default/codekb/prosell-sass/business-overview.md`

Usados como fuente de verdad brownfield en vez de re-escanear el repo
completo — coincide con el veredicto NARROWER ya documentado en
`project.md` para este mismo intent (scan enfocado sobre catálogo/export,
resto del store marcado `kind: partial`).

## Inspección directa (Paso 0 graphify-first)

- `graphify query "does the backend already have any CSV or ZIP file
download/export endpoint (StreamingResponse, FileResponse)?"` — 294 nodos
  encontrados; confirmó dos precedentes directos:
  - `download_bulk_upload_errors_csv()` en
    `apps/api/src/prosell/infrastructure/api/routers/product_router.py:586`
    — endpoint real de descarga (`StreamingResponse`, CSV), ya en
    producción.
  - `CSVImageMapper` en
    `apps/api/src/prosell/domain/services/csv_image_mapper.py` — ya maneja
    lectura/escritura de estructuras ZIP (`zipfile`, línea 16 y 202), con
    suite de tests unitarios dedicada en
    `apps/api/tests/unit/domain/services/test_csv_image_mapper.py`
    (`TestReadZipContents`, `TestZipStructureReading`,
    `TestBuildDoSpacesKey`, `TestSanitizeFilename`).
- `graphify query` sobre `application/ports/__init__.py` — confirmó que los
  puertos secundarios (`IDOSpacesService`) viven en `application/ports/`,
  corrigiendo la imprecisión de `code-structure.md` (que lista `ports/`
  como subcarpeta de `domain/`).
- `graphify query` sobre la jerarquía de excepciones del dominio Product —
  confirmó `apps/api/src/prosell/domain/exceptions/product_exceptions.py`
  con `ProductError` (base) y subclases específicas
  (`ProductNotFoundError`, `ProductInvalidStatusTransitionError`,
  `VehicleAlreadyExistsError`, `InvalidVINError`,
  `ProductVersionConflictError`, etc.), mapeada a HTTP en
  `product_router.py`; también `StorageUploadError` ya declarado en
  `ido_spaces.py`.
- `graphify query` sobre la familia de servicios `csv_*` — confirmó
  convención de nombre consistente (`csv_export.py`,
  `csv_product_parser.py`, `csv_image_mapper.py`, `csv_field_mapper.py`,
  todos bajo `domain/services/`, snake_case, prefijo `csv_`).
- Lectura directa (excepción ya prevista a graphify-first, valores
  literales/contenido no indexado en detalle):
  - `apps/api/src/prosell/infrastructure/api/routers/product_router.py`
    líneas 586-611 (firma y guard clauses del endpoint de descarga CSV
    existente) y líneas 635-718 (`export_catalog_csv()`, FEAT-1): confirmó
    que resuelve tenant_id EXCLUSIVAMENTE de `current_user.tenant_id`
    (línea 652, `403` si es `None`), sin aceptar `organization_id` del
    cliente, con `max_rows = 5000` como cap de memoria (línea 669) —
    patrón más estricto que `list_products()` (línea 721, que sí acepta
    `organization_id` pero gateado por `_check_org_scope_permission`).
  - `apps/api/src/prosell/application/ports/ido_spaces.py` — confirmó que
    `IDOSpacesService` (ABC) declara `upload_file`, `delete_file`, y
    presign/exists, pero NINGÚN método de lectura de bytes ya almacenados
    (`get_object` o equivalente no existe).
  - `apps/api/src/prosell/domain/services/csv_export.py` líneas 26-37
    (`_slug_part()`) — confirmó el sanitizador ya existente que colapsa
    caracteres no-alfanuméricos (incluidos separadores de path) antes de
    construir nombres de carpeta; es el precedente de seguridad a
    reutilizar para el ZIP nuevo, no solo de testing.
  - `apps/web/src/app/api/v1/products/[...path]/route.ts` líneas 106-130 —
    confirmó que el proxy BFF de productos YA maneja respuestas no-JSON
    (chequea `Content-Type`, hace `response.blob()` cuando no es JSON) —
    el bug de "proxy fuerza `.json()` sobre toda respuesta" ya registrado
    en `project.md` (learning 260826) **está resuelto para esta ruta
    específica**; no bloquea el export si el nuevo endpoint cuelga de
    `/api/v1/products/*`. Otros proxies (`categories`, `organizations`,
    `vehicles`) siguen con el bug — fuera de alcance de este intent salvo
    que el diseño final requiera un endpoint bajo otra ruta.

## Interview decisions (Step 4, ya resueltas por el humano)

- **Testing methodology y ordering**: test-after, sin piso de cobertura
  nuevo más allá del ya afirmado (40% frontend / sin piso backend). Merge
  strategy: squash. Deploy: on-merge a staging, gate manual a producción
  con confirmación de texto. Sin walking skeleton. Las cinco secciones de
  `team.md` confirmadas **sin cambios**.
- **Q1 (Testing) — piso obligatorio de test PARA ESTE INTENT** (no cambia
  el piso general del proyecto): (1) regresión del bug de
  `build_image_folder_name()` (usa `attrs.get("color")` en vez de
  `attributes["exterior_color"]`, fallo silencioso); (2) casos límite de
  `Organization.code` (1-5 caracteres, o ausente); (3) test de contrato
  `Content-Type`/`Content-Disposition` para el nuevo endpoint de export,
  dado el historial repetido (dos veces) de bugs de proxy exactamente en
  esta clase de contenido no-JSON en este repo.
- **Q2 (Code Style) — decisión de diseño para el manejo de errores del
  export en backend** (NO promovida a `discovered-rules.md`: es una
  decisión de este feature, no una restricción de proceso general — ver
  nota en ese artefacto): extender `ProductError`
  (`product_exceptions.py`) con una subclase nueva para los errores de
  export (p. ej. imagen referenciada en `image_urls` que no se puede leer
  al armar el ZIP), en vez de crear una jerarquía separada tipo
  `CatalogExportException`. Developer confirmó sin objeción que esto es
  simplemente "seguir la convención backend ya vigente", no una práctica
  de equipo nueva — la mandate ya afirmada de Q6 en `project.md` (adoptar
  excepciones tipadas + handler centralizado) es una adopción para el
  FRONTEND, donde el patrón no existe; no aplica igual al backend, donde
  ya es la convención.
- Devsecops confirmó sin objeción que ningún hallazgo de este intent
  (zip-slip, DoS por memoria, tenant scoping del export) alcanza el umbral
  de "restricción dura declarada por el humano" para promover a
  `discovered-rules.md` — son requisitos de diseño/NFR para
  Requirements/Functional Design.

## Unresolved / candidatos para Requirements Analysis (NO decidido acá)

1. **Semántica de "preguntarle al usuario la ruta base de destino"**: el
   ejemplo dado (`Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/`) es
   una ruta de FILESYSTEM LOCAL del usuario, no una ruta de storage remoto
   (DigitalOcean Spaces). Ambiguo respecto a dónde vive esa escritura:
   (a) el backend genera el ZIP y lo entrega como download HTTP normal, y
   la "ruta base" es solo el nombre/carpeta sugerido para el diálogo de
   guardado del NAVEGADOR (patrón ya seguro, ya usado dos veces en el
   repo vía `Content-Disposition`); o (b) un proceso que corre en la
   máquina del propio usuario y escribe directamente al filesystem local
   (ej. un script CLI/herramienta fuera del flujo HTTP normal). Esto
   cambia por completo la arquitectura de la feature, el patrón de test
   aplicable, Y el perfil de seguridad — dejado como pregunta abierta, no
   resuelto por asunción propia (consistente con el aprendizaje ya
   persistido: no resolver ambigüedad de alcance por asunción).
   - **Restricción de seguridad no negociable a heredar si (b) resulta ser
     la interpretación correcta e implicara que el BACKEND reciba un
     string de ruta y escriba ahí** (en vez de un script que el usuario
     corre localmente, fuera del backend HTTP): sería una vulnerabilidad
     de path traversal / escritura arbitraria de archivos en el servidor
     de severidad alta (el ejemplo de ruta ni siquiera es relativo al
     workspace del proyecto). Esa ruta debe validarse con
     allowlist/resolución canónica contra un directorio base — nunca
     usarse tal cual en una operación de escritura de archivo. Si (b) es
     un script/herramienta local del usuario fuera del backend HTTP, el
     riesgo de servidor no existe, pero sigue aplicando saneamiento de
     ruta estándar por higiene.
   - Consecuencia de testability: si termina siendo un
     `window.prompt`/input simple (patrón ya usado, FR8.3 de
     `260826-prod-bugfixes-batch`), el patrón de component test es el ya
     establecido (`fireEvent` + mock de `window.prompt`). Si requiere File
     System Access API real, ese patrón NO es testeable de forma directa
     en jsdom — debería pesar en la decisión de diseño, no solo la
     arquitectura de storage.
2. **Lectura de imágenes ya subidas para armar el ZIP**: `IDOSpacesService`
   no tiene método de lectura — la elección entre agregar `get_object` al
   puerto S3 (application) vs. usar `httpx` contra las `image_urls`
   públicas condiciona dónde vive el código nuevo (application/
   infrastructure vs. mezclado incorrectamente en domain) y qué capa de
   test aplica (unit vs. integración con storage). No es una práctica de
   equipo a afirmar en este stage, pero se deja registrado para que
   Requirements/Functional Design lo resuelva.
   - **Invariante de seguridad a heredar sin importar la vía elegida**: la
     URL/key leída debe provenir siempre del `Product` ya filtrado por
     `tenant_id` (nunca de un parámetro de request) — el fetch de imágenes
     no debe construirse ni aceptarse desde fragmentos de query params del
     cliente.
3. **¿Es un endpoint nuevo o una extensión de
   `GET /api/v1/products/export.csv`?** No decidido acá — condiciona si
   hay trabajo de proxy BFF pendiente (si cuelga de `/api/v1/products/*`,
   el proxy ya maneja contenido binario correctamente; si fuera otra ruta,
   habría que auditar ese proxy específico).
4. **Gaps de cobertura y convención de test para Build and Test**: cero
   tests hoy para `handleExportCsv`/`exportCatalogCsv` (frontend);
   ubicación de test para `catalog/page.tsx` no calza limpio en ninguno de
   los dos patrones vigentes; duplicado sin resolver de
   `test_csv_image_mapper.py` en dos ubicaciones (verificar cuál corre en
   CI antes de usarlo como referencia).

## Requisitos de diseño / NFR a heredar (no son práctica de equipo, condicionan Requirements/Functional Design y Code Generation)

- **Tenant scoping del export**: seguir el patrón de `export_catalog_csv()`
  — tenant_id resuelto EXCLUSIVAMENTE de `current_user.tenant_id`, sin
  aceptar `organization_id` del cliente. Un "export completo del catálogo"
  es una operación de self-service por tenant, no una vista administrativa
  cross-tenant, salvo decisión explícita y documentada en Requirements
  Analysis (mismo gate `_check_org_scope_permission` si aplicara).
- **Zip-slip / path traversal dentro del propio ZIP**: TODO nombre de
  carpeta/archivo agregado al ZIP MUST pasar por sanitización que elimine
  separadores de path — reutilizar `_slug_part()` o el equivalente
  `_sanitize_filename` de `CSVImageMapper`, nunca concatenar atributos de
  producto sin sanitizar.
- **DoS por agotamiento de memoria**: un "export completo del catálogo"
  con ZIP de imágenes adjunto es potencialmente mucho más pesado que el
  CSV solo (N productos × M imágenes, bytes binarios). Si el diseño arma
  el ZIP completo en memoria antes de responder, requiere un cap explícito
  (máx. productos o máx. tamaño de ZIP) equivalente al `max_rows=5000` ya
  existente en `export_catalog_csv()`, o streaming de la construcción del
  ZIP en vez de buffer completo en memoria.
