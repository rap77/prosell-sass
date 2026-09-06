**Collaborator:** aidlc-devsecops-agent

## Contribution

Alcance de mi revisión: lint/format, SAST/DAST, secret scanning, dependency
scanning y supply-chain, más los tres riesgos específicos pedidos para este
intent (aislamiento multi-tenant en el export masivo, semántica de "ruta de
destino local", y gaps de seguridad nuevos que introduce este feature sobre
la postura ya aceptada por el equipo).

### Lint/format, SAST/DAST, secret scanning, dependency scanning, supply-chain

No encuentro evidencia de que este intent requiera una especialización nueva
en ninguno de estos controles — todo lo que aplica es lo ya afirmado y
aceptado por el equipo en `team.md` § Deployment (Q7) y § Code Style, y
confirmado mecánicamente en `code-quality-assessment.md` (hallazgo #11) y
`dependencies.md` (Dependabot solo `github-actions`). GGA sigue siendo
revisor de estilo/arquitectura, no un SAST — no va a detectar
determinísticamente los riesgos que señalo abajo (zip-slip, SSRF-adyacente,
DoS por agotamiento de memoria). Ninguno de esos riesgos justifica por sí
solo abrir el intent de seguridad dedicado que el equipo ya decidió diferir
(Q7) — son manejables como parte del diseño de este feature — pero si el
intent de seguridad dedicado se prioriza antes de escribir el código de este
export, valdría la pena incluir un SAST real (Bandit/Semgrep para Python,
`npm audit`/`pip-audit` para dependencias) en su alcance, dado que este es el
primer endpoint del repo que combina generación de contenido binario
compuesto (CSV + ZIP con imágenes) en una sola respuesta — exactamente la
clase de superficie donde un SAST determinístico aporta más que un revisor
de estilo con IA.

### (a) Riesgo de exposición entre tenants en el export masivo

Verifiqué directamente el endpoint ya existente `GET /api/v1/products/export.csv`
(`product_router.py:635-718`, FEAT-1) — es el precedente correcto a replicar,
y es **más estricto** que el endpoint de listado (`GET /api/v1/products`,
línea 721):

- `export_catalog_csv()` NO acepta ningún parámetro `organization_id` del
  cliente. Resuelve el tenant exclusivamente de
  `current_user.tenant_id` (línea 652: `403` si es `None`) y lo pasa
  directo a `ListProductsUseCase.execute(tenant_id=current_user.tenant_id, ...)`
  (línea 672). Cero superficie de IDOR.
- `list_products()`, en cambio, sí acepta `organization_id` como query param,
  pero está gateado por `_check_org_scope_permission(current_user, organization_id)`
  (línea 756) — un cliente sin el permiso `ORG_ADMIN_VIEW_ALL` que intente
  pasar el `organization_id` de otro tenant es rechazado explícitamente
  (línea 274-280: `403 "Cannot filter products by another organization's
organization_id"`). Es una excepción de admin deliberada y auditada, no un
  bypass.

**Posición**: el nuevo endpoint de export cliente (CSV 24 columnas + ZIP)
debe seguir el patrón de `export_catalog_csv()` — tenant_id resuelto
EXCLUSIVAMENTE de `current_user.tenant_id`, sin aceptar `organization_id` del
cliente en absoluto — no el patrón de `list_products()`. Un "export completo
del catálogo de una organización" es semánticamente una operación de
self-service por tenant, no una vista administrativa cross-tenant; si en
Requirements Analysis surge un caso de uso legítimo de "un ORG_ADMIN exporta
el catálogo de otra organización", eso debe ser una decisión explícita y
documentada (mismo gate `_check_org_scope_permission`), nunca el
comportamiento por defecto. Esto es consistente con la convención ya
afirmada del proyecto ("tenant_id desde JWT, nunca body/query, IDOR
prevention") y no requiere ninguna práctica nueva de equipo — es aplicación
directa de una convención ya vigente.

Adicionalmente: las imágenes que se empaquetan en el ZIP deben provenir
EXCLUSIVAMENTE de los `Product` ya filtrados por esa misma query con
tenant_id — es decir, la lectura de bytes de storage (vía `get_object` nuevo
en el puerto S3, o vía `httpx` contra `image_urls`) debe operar sobre las
`image_urls` ya guardadas en los `Product` de la página consultada, nunca
sobre una key/URL de storage construida o aceptada desde un parámetro del
cliente. Si se elige la vía `httpx`, la URL a fetchear debe ser exactamente
el valor ya persistido en `Product.image_urls` (dato de servidor, no de
request) — no hay entrada de usuario en ese fetch, así que el riesgo
SSRF-adyacente es bajo, pero vale la pena que Functional Design lo declare
explícitamente como invariante (no construir la URL a partir de fragmentos
de query params).

### (b) Ruta de destino en filesystem local

Coincido con el `Unresolved #1` de `evidence.md` en que esto es genuinamente
ambiguo y no debe resolverse por asunción — agrego la lectura de seguridad
de las dos alternativas, porque cambian completamente el perfil de riesgo:

- **Interpretación (a) — download de navegador estándar** (la ruta es solo
  un nombre de archivo/carpeta sugerido para el diálogo de guardado, vía
  `Content-Disposition` como ya hacen `export_catalog_csv()` y
  `download_bulk_upload_errors_csv()`): sin riesgo nuevo. El navegador nunca
  entrega al backend una ruta absoluta del filesystem del usuario, y
  ninguna ruta arbitraria del cliente llega a tocar el filesystem del
  servidor. Este es el patrón ya seguro y ya usado dos veces en el repo.
- **Interpretación (b) — un proceso que escribe directamente a una ruta de
  filesystem que el usuario tipea** (el ejemplo dado,
  `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/`, es una ruta local
  de ESE usuario, no de storage remoto): si esto se implementara como un
  endpoint HTTP del backend que recibe un string de ruta y escribe ahí
  (en vez de un script/herramienta que corre en la máquina del propio
  usuario, fuera del flujo HTTP), sería una vulnerabilidad de **path
  traversal / escritura arbitraria de archivos en el servidor** de
  severidad alta — el string de ruta del ejemplo ni siquiera es relativo al
  workspace del proyecto (empieza con `Users/juanl/...`, fuera de cualquier
  raíz del repo), exactamente el patrón que un chequeo de path traversal
  debe rechazar. Si (b) resulta ser la interpretación correcta pero
  implementada como una herramienta/script que el USUARIO corre localmente
  (fuera del backend HTTP), el riesgo de servidor no existe, pero sí sigue
  aplicando saneamiento de ruta estándar (resolver y validar contra un
  directorio base, no confiar en el string tal cual) por higiene, aunque
  sea un proceso local de un solo usuario.

**Posición**: esto debe quedar como pregunta explícita en la entrevista de
este mismo stage o, si no corresponde acá, como Open Question obligatoria
para Requirements Analysis — no una práctica de equipo a afirmar en
`team.md`, porque es una decisión de arquitectura de ESTE feature, no una
convención general. Pero sí dejo la restricción de seguridad no negociable
registrada acá para que Requirements Analysis la herede: si la interpretación
final incluye que el BACKEND escriba a una ruta arbitraria de filesystem
recibida en el request, esa ruta debe validarse con allowlist/resolución
canónica contra un directorio base — nunca usarse tal cual en una operación
de escritura de archivo.

### (c) Gaps de seguridad nuevos introducidos por este feature

1. **Zip-slip / path traversal dentro del propio ZIP** — mitigado ya por un
   control existente que hay que preservar, no reinventar: `_slug_part()`
   (`domain/services/csv_export.py:26-37`) colapsa cualquier carácter
   no-alfanumérico (incluidos `/`, `\`, `.`, `..`) a `-` antes de construir
   `build_image_folder_name()`. Mientras el código nuevo reutilice esta
   función (o el `_sanitize_filename` equivalente ya probado en
   `CSVImageMapper`, ver `TestSanitizeFilename` en
   `test_csv_image_mapper.py`) para nombrar tanto carpetas como archivos
   dentro del ZIP, no hay superficie nueva de zip-slip. **Riesgo concreto si
   NO se reutiliza**: construir el nombre de carpeta/archivo del ZIP con
   concatenación directa de atributos del producto (`make`, `model`,
   `color`) sin pasar por un sanitizador, permitiría a un vendedor
   malicioso crear un producto con `model = "../../../etc/passwd"` y lograr
   que el ZIP contenga una entrada con secuencia `../` — explotable en
   herramientas de extracción vulnerables del lado del cliente que
   consuman el ZIP. Marco esto como requisito no funcional explícito para
   Code Generation: TODO nombre de carpeta/archivo agregado al ZIP MUST
   pasar por sanitización que elimine separadores de path.
2. **DoS por agotamiento de memoria** — `export_catalog_csv()` ya tiene un
   `max_rows = 5000` como cap de seguridad (línea 669) y arma el CSV
   completo en memoria (`io.StringIO()`). Un "export completo del catálogo"
   con ZIP de imágenes adjunto es potencialmente mucho más pesado
   (N productos × M imágenes cada uno, bytes binarios, no solo texto). Si
   el diseño arma el ZIP completo en memoria antes de responder (patrón
   `zipfile.ZipFile(io.BytesIO(), ...)`, igual que `CSVImageMapper` ya hace
   para el sentido inverso), un catálogo grande puede agotar memoria del
   proceso — self-inflicted DoS, no requiere atacante externo. Marco como
   NFR a resolver en Functional Design: un cap explícito (máx. productos o
   máx. tamaño de ZIP) equivalente al `max_rows` ya existente, o streaming
   de la construcción del ZIP en vez de buffer completo en memoria.
3. Ningún gap nuevo de lint/format, SAST/DAST, secret scanning o
   dependency scanning más allá de los ya aceptados en Q7 — este feature no
   agrega dependencias nuevas (confirmado en `dependencies.md`: tanto
   `boto3` como `httpx` ya están instalados), así que no cambia la
   superficie de `Dependabot`/`npm audit`/`pip-audit` que el equipo ya
   decidió diferir.

## Positions

- AGREE: El draft de `team-practices.md` § Testing Posture correctamente
  identifica `CSVImageMapper` y `download_bulk_upload_errors_csv()` como los
  precedentes de test aplicables (unit tests sobre la función que arma el
  ZIP en memoria, sin necesidad de integración nueva contra storage real).
  Agrego que el mismo precedente (`_sanitize_filename`/`TestSanitizeFilename`)
  es también el precedente de SEGURIDAD a preservar (sanitización de
  nombres dentro del ZIP), no solo de testing — ambos deben mantenerse
  sincronizados si Code Generation extrae una función compartida.
- AGREE: El draft correctamente deja como `Unresolved` (no resuelto por
  asunción) la semántica de "ruta base de destino" en `evidence.md`
  Unresolved #1. Concuerdo en que es una decisión de arquitectura, no una
  práctica de equipo — agrego el análisis de riesgo de path traversal /
  escritura arbitraria de archivos si la interpretación (b) del draft
  terminara siendo un endpoint de backend que escribe a una ruta de cliente
  sin validar, como restricción no negociable a heredar en Requirements
  Analysis si corresponde.
- AGREE: El draft correctamente deja como decisión de diseño (no de
  práctica de equipo) la elección entre agregar `get_object` al puerto S3 o
  usar `httpx` contra `image_urls` públicas. Agrego la invariante de
  seguridad que debe acompañar cualquiera de las dos vías: la URL/key leída
  debe provenir siempre del `Product` ya filtrado por tenant_id, nunca de
  un parámetro de request.
- AGREE: `discovered-rules.md` no lista ninguna regla `Mandated`/`Forbidden`
  nueva — coincido en que ningún hallazgo de este intent alcanza el umbral
  de "restricción dura declarada por el humano"; los riesgos que señalo
  arriba (zip-slip, DoS por memoria, tenant scoping del export) son
  requisitos de diseño/NFR para Requirements/Functional Design, no
  constraints de proceso de equipo a promover a `team.md`/`project.md` en
  este stage.
- OBJECT: El draft de `team-practices.md` § Testing Posture, en su párrafo
  final ("Posible área nueva a confirmar en la entrevista"), enmarca la
  pregunta de la ruta de destino únicamente como un tema de PATRÓN DE TEST
  (component test vs. File System Access API). Faltó nombrar ahí mismo que
  es, ante todo, una pregunta de SEGURIDAD antes que de testing — la
  respuesta determina si existe o no una superficie de escritura arbitraria
  de archivos en el servidor. No es un desacuerdo de fondo con el draft
  (ambos coincidimos en que hay que preguntar, no asumir), pero la entrevista
  del Step 4 debería presentar esta pregunta con ese encuadre de seguridad
  explícito, no solo como elección de patrón de test.
