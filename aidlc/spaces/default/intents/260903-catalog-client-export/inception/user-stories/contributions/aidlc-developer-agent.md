**Collaborator:** aidlc-developer-agent

## Contribution

### 1. AC1.1.6 (imagen no disponible sin abortar el export) — implementabilidad directa, NO requiere decisión de diseño de streaming vs. buffer

Verifiqué el endpoint hermano real que ya existe hoy en el mismo router,
`export_catalog_csv()` (`apps/api/src/prosell/infrastructure/api/routers/product_router.py:635-718`),
que es el precedente explícito que FR1.3 pide mirrorear en formato de columnas.
Su implementación real:

- Acumula **todas** las filas en una lista Python (`rows: list[list[str]]`) en
  memoria mientras pagina productos (`page_size=200`, `max_rows=5000`).
- Vuelca todo a un único `io.StringIO()`.
- Envuelve el resultado en `StreamingResponse(iter([output.getvalue().encode("utf-8")]))`
  — un iterador de **un solo chunk**, no streaming real; `StreamingResponse`
  se usa aquí únicamente por su firma de respuesta HTTP, no por su semántica
  de generador incremental.

Este es el patrón YA ACEPTADO y en producción para el mismo tipo de endpoint
(`export.csv`). El equipo, vía NFR3, ya reconoció el riesgo de memoria de
"armar el ZIP completo en memoria" y lo resolvió como una decisión de
**dimensionamiento de un cap** (filas/imágenes/tamaño), no como una decisión
de rediseño hacia streaming. Es decir: la pregunta arquitectónica
"¿streaming o buffer completo?" ya fue implícitamente resuelta por el propio
NFR3 y por el precedente de código — la respuesta es "buffer completo,
acotado por un cap", igual que `export.csv` hoy.

Dado esto, AC1.1.6 es una extensión mecánica de ese mismo patrón:

```python
with zipfile.ZipFile(buffer, "w") as zf:
    for product in products:
        for image_url in product.image_urls:
            try:
                image_bytes = fetch_image_bytes(image_url)  # httpx o get_object()
            except (ImageFetchError, httpx.HTTPError):
                logger.warning("export: imagen no disponible", extra={...})
                continue  # el vehículo sigue en el CSV/ZIP con las imágenes que sí están
            zf.writestr(f"{folder}/{filename}", image_bytes)
```

No hace falta ningún generador, ningún streaming incremental de ZIP
(`zipfile` no soporta streaming parcial de escritura fácilmente de todas
formas — trabaja mejor sobre un buffer seekable como `io.BytesIO`), ni una
decisión de arquitectura nueva. La única pieza de diseño real que Functional
Design sí debe fijar (y que Requirements ya dejó como Open Question) es de
dónde vienen los bytes de la imagen (`get_object()` nuevo en
`IDOSpacesService` vs. `httpx` contra `image_urls` públicas) — pero esa
decisión es ortogonal a "cómo no abortar el export completo", que se resuelve
con un `try/except` por imagen dentro del loop, exactamente como cualquier
otro catch-per-item ya usado en el dominio (ej. el manejo de "unknown org
codes" en `bulk_upload_vehicles.py`, ya documentado como patrón de
guard-per-row en `project.md`).

**Conclusión**: AC1.1.6 es implementable de forma directa. Es Small y
Testable tal como está redactado. No amerita ni una historia separada ni una
ronda adicional de diseño arquitectónico.

### 2. ¿US1.1 es demasiado grande (CSV + ZIP + 3 edge cases)?

Con la Q1 ya resuelta (**A: un único ZIP combinado**, CSV en la raíz + una
carpeta por vehículo), CSV y ZIP dejan de ser dos entregables independientes
desde la perspectiva del usuario: son un solo archivo, una sola descarga, un
solo endpoint. Partir la historia en "exportar CSV" + "exportar ZIP" violaría
dos criterios INVEST simultáneamente:

- **Valuable**: ninguna de las dos mitades por separado resuelve el dolor real
  de Valeria (`facebook-auto-post` necesita CSV Y carpetas de imágenes juntos
  para asociar fotos a filas — un CSV sin imágenes, o un ZIP de imágenes sin
  CSV, no es utilizable por la herramienta externa).
- **Independent**: no se puede entregar (ni demostrar, ni testear
  end-to-end) una mitad sin la otra, porque ambas viven en la misma respuesta
  HTTP de un mismo endpoint.

Dicho esto, sí vale la pena mirar el conteo de 7 AC con más cuidado:

- AC1.1.1–AC1.1.4 son el happy path real (una descarga, formato de columnas,
  estructura de carpetas, bug de color) — superficie de implementación
  genuina y acotada (domain: `build_image_folder_name()` + nueva función de
  armado de ZIP; infrastructure: nuevo endpoint).
- AC1.1.5 (catálogo vacío) y AC1.1.6 (imagen no disponible) son dos ramas de
  error independientes entre sí y del happy path — chicas, testeables por
  separado, pero **no separables en historias propias** porque ninguna tiene
  valor de negocio aislado (un mensaje de "catálogo vacío" sin el feature de
  export detrás no es una historia; es un edge case del mismo feature).
- AC1.1.7 (aislamiento multi-tenant) es, en la práctica, **gratis** en
  términos de estimación: no es una decisión de diseño nueva ni código
  adicional más allá de reutilizar el mismo patrón ya vigente en
  `export_catalog_csv()` (`current_user.tenant_id`, nunca un parámetro de la
  petición — confirmado línea por línea arriba, ver `current_user.tenant_id
is None` check en L652 y el uso exclusivo de `current_user.tenant_id` en
  `use_case.execute()` L672). No suma superficie de implementación real al
  tamaño de la historia; es una consecuencia automática de copiar el patrón
  existente.

**Conclusión**: US1.1 no es "demasiado grande" para ser INVEST-válida dado
que Q1 fuerza semántica de una sola entrega — partirla generaría historias no
independientes ni valiosas por sí solas. Sí recomiendo a Functional
Design/Delivery Planning **secuenciar la implementación** en el orden happy
path → AC1.1.5 → AC1.1.6, y tratarlos como pasos/commits distinguibles
dentro del mismo Bolt (consistente con el rango de 1-2 días que `org.md` fija
para branches de feature), en vez de forzar una división artificial de la
historia en sí.

### 3. ¿Falta una historia técnica? — el fix del bug de color (Q2) y un gap real de trazabilidad que sí encontré

**Sobre Q2** (fix de color como AC dentro de US1.1, no historia técnica
separada): estoy de acuerdo con la decisión tomada. Verifiqué el código
real — el bug vive en el **call site** de `export_catalog_csv()`
(`color=attrs.get("color")`, L686 de `product_router.py`), no en
`build_image_folder_name()` en sí (esa función solo recibe `color` como
parámetro genérico, agnóstico de dónde salga el valor). Para este intent, el
código nuevo de armado de ZIP+CSV formato-cliente va a tener su propio call
site nuevo (no reutiliza el de `export.csv`), así que "arreglar el bug"
literalmente ES escribir el call site nuevo correctamente
(`attributes["exterior_color"]` en vez de `attrs.get("color")`) — es la misma
línea de código que ya hace falta escribir para AC1.1.3 (estructura de
carpetas). Separarlo en una historia técnica aparte violaría Independent (no
se puede entregar sin el call site que ya construye US1.1) y Valuable (no
tiene valor de negocio aislado — es correctitud interna de una historia que
ya existe). Correcto tal como está.

**Gap real que sí encontré** (no una historia faltante, pero sí una AC
faltante): **NFR2 (zip-slip — sanitización de nombres)** no tiene ningún AC
explícito en `stories.md`. AC1.1.3 describe el patrón de nombrado de carpetas
pero no afirma en ningún lugar que esos nombres pasen por el sanitizador ya
existente (`_slug_part()` en `csv_export.py` — que de hecho YA sanitiza,
colapsando todo carácter no-alfanumérico incluido `/` a `-`, confirmado
leyendo el código: `_SLUG_RE = re.compile(r"[^A-Z0-9]+")`). Un desarrollador
podría satisfacer AC1.1.3 literalmente sin garantizar que el segmento de
color/modelo esté sanitizado si construye una función de nombrado nueva
desde cero en vez de reutilizar `_slug_part()`. Recomiendo agregar una
cláusula explícita a AC1.1.3 (o un AC1.1.8 nuevo) del estilo: "Given un
atributo de producto contiene un carácter no alfanumérico (ej. `/`, `..`),
When se arma el nombre de carpeta/archivo, Then el segmento se sanitiza
igual que `_slug_part()` — ningún segmento de ruta permite atravesar
directorios dentro del ZIP." Esto le da a QA algo concreto que testear para
NFR2, que hoy queda mencionado solo en `requirements.md` sin bajar a
criterio de aceptación verificable.

## Positions

AGREE: AC1.1.6 es implementable de forma directa reutilizando el patrón ya
vigente de `export_catalog_csv()` (buffer completo en memoria + cap de
recursos vía NFR3) — no requiere una decisión de diseño de streaming vs.
buffer; esa decisión ya está tomada implícitamente por el precedente de
código y por cómo el equipo enmarcó NFR3.

AGREE: US1.1 no debe partirse en historias separadas de CSV y ZIP — la
decisión de Q1 (un único ZIP combinado) hace que ambas mitades sean
no-independientes y no-valiosas por separado; partirlas violaría INVEST en
vez de mejorarlo. Sí recomiendo secuenciar happy path → AC1.1.5 → AC1.1.6
como pasos de implementación dentro del mismo Bolt.

AGREE: la decisión de Q2 (fix de color como AC dentro de US1.1, no historia
técnica separada) es correcta — el fix vive en el mismo call site nuevo que
ya construye AC1.1.3, no tiene valor aislado ni es entregable de forma
independiente.

OBJECT: falta un acceptance criterion explícito para NFR2 (sanitización
anti zip-slip) en US1.1 — AC1.1.3 tal como está redactado no obliga a que la
implementación reutilice el sanitizador existente, dejando NFR2 sin una
forma verificable de fallar un test. Pido agregar una cláusula/AC nueva
antes del gate de aprobación, o dejarlo documentado como Open Question
explícita para Functional Design si el lead prefiere resolverlo ahí.
