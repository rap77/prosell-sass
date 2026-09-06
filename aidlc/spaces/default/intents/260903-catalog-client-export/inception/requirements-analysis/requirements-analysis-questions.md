# Requirements Analysis — Questions

Depth: **Standard**. Reverse Engineering y Practices Discovery ya resolvieron
la mayoría de las ambigüedades técnicas (formato exacto de columnas, precedentes
de código, piso de test, manejo de errores). Las preguntas de acá se limitan a
las decisiones de producto/alcance genuinamente abiertas.

## Q1: Diseño del endpoint

Ya existe `GET /api/v1/products/export.csv` (formato genérico, columnas
dinámicas por categoría). El nuevo export necesita el formato EXACTO de
`docs/data39.csv` (24 columnas fijas, separador `;`).

¿Cómo debería exponerse?

A. Un endpoint nuevo dedicado (ej. `GET /api/v1/products/export-client-format.csv`), sin tocar el existente
B. Extender el endpoint existente con un parámetro de formato (ej. `?format=client`)
C. Reemplazar el endpoint existente — el formato cliente pasa a ser el único
X. Other (please specify)

[Answer]: A. Un endpoint nuevo dedicado, sin tocar el existente

## Q2: "Ruta de destino" — qué significa exactamente

El pedido dice: "Antes de exportar, preguntarle al usuario la ruta base de
destino con un valor sugerido por defecto (ej.
`Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/`)". Esto es ambiguo entre
dos comportamientos muy distintos:

A. Es solo un **nombre/ruta sugerido** que se muestra en un diálogo (como el `window.prompt` ya usado en el import) para que el usuario sepa dónde conviene guardar el ZIP descargado — el navegador hace la descarga normal, la app nunca toca el filesystem del usuario
B. La app necesita **escribir directamente** en esa ruta del filesystem local del usuario (fuera del flujo normal de descarga del navegador) — esto requeriría una herramienta de escritorio o extensión, no es alcanzable desde un endpoint HTTP + navegador
X. Other (please specify)

[Answer]: El usuario pidió inicialmente flexibilidad total (nombre sugerido editable + botón de "buscar en disco"). Follow-up: el botón de buscar en disco (File System Access API) solo funciona en Chrome/Edge, no en Firefox/Safari — el usuario eligió NO implementar el selector de disco por ahora. Queda como opción A: un campo de texto editable con la ruta/nombre sugerido por defecto (basado en el path del usuario), sin selector de disco ni escritura directa al filesystem — el navegador hace la descarga ZIP normal con ese nombre como sugerencia.

## Q3: Alcance del catálogo a exportar

¿Qué productos de la organización entran en el export?

A. Todos los productos de la organización, sin importar su estado (Borrador, Pendiente, Publicado, Vendido, Archivado, Rechazado)
B. Solo los productos activos/visibles (ej. Publicado + Vendido), excluyendo Borrador/Rechazado/Archivado
C. El usuario elige el estado a exportar en el momento (filtro en la UI)
X. Other (please specify)

[Answer]: Other — el usuario dijo "solo los activos, sin vendidos ni pausados ni en mantenimiento". Follow-up de mapeo contra los 8 estados reales de ProductStatus (DRAFT/PENDING/PUBLISHED/PAUSED/RESERVED/SOLD/REJECTED/ARCHIVED): el usuario simplificó a **solo PUBLISHED**. El export incluye únicamente productos en estado `published`.

## Q4: Imágenes por vehículo en el ZIP

El scan encontró que un producto puede tener varias imágenes (`image_urls`) pero no un método directo para leer bytes ya subidos desde `IDOSpacesService`.

¿Qué imágenes van dentro de la carpeta de cada vehículo en el ZIP?

A. Todas las imágenes del vehículo (`image_urls` completo)
B. Solo la imagen de portada (`cover_image_key`)
C. Todas las imágenes, pero con un límite máximo configurable por vehículo (evita ZIPs gigantes)
X. Other (please specify)

[Answer]: A. Todas las imágenes del vehículo

## Q5: Campos `option` y `description` del CSV cliente

`docs/data39.csv` real tiene ambas columnas (`option`, `description`) con contenido distinto entre sí, pero el sistema hoy solo persiste `description` — el contenido original de `option` no sobrevive al import (se descarta salvo un fallback de extracción de VIN por regex). Para el export:

A. Exportar `description` tal cual está guardado en ambas columnas (`option` queda igual a `description`, aceptando que no es 100% fiel al dato original importado)
B. Dejar `option` vacío en el export (columna presente, valor en blanco) y solo poblar `description`
C. Este intent también agrega persistencia del campo `option` original en el modelo de producto, para poder exportarlo fielmente (amplía el alcance más allá de "solo exportar")
X. Other (please specify)

[Answer]: B. Dejar `option` vacío en el export (columna presente, valor en blanco) y solo poblar `description`

## Consolidated Summary Confirmation

- Nuevo endpoint dedicado (ej. `GET /api/v1/products/export-client-format.csv`) sin tocar el `export.csv` genérico existente.
- El export incluye únicamente productos en estado `published` de la organización activa (JWT tenant_id, nunca parámetro del cliente).
- Formato CSV: idéntico byte-a-byte a `docs/data39.csv` — 24 columnas exactas, mismo orden, separador `;`, incluyendo `id`.
- La columna `option` queda vacía en el export (no se persiste ese dato hoy); `description` se puebla con el valor guardado.
- El ZIP incluye TODAS las imágenes de cada vehículo (`image_urls` completo), organizadas en `<código_org>/<año>-<marca>-<modelo>-<millasK>-<color>-<código_org>/`.
- Antes de exportar, la UI pide al usuario una ruta/nombre base con un valor sugerido por defecto, en un campo de texto editable — sin selector de disco (File System Access API descartada por incompatibilidad con Firefox/Safari) y sin escritura directa al filesystem del usuario; el navegador hace la descarga ZIP estándar.
- Fix incluido en este intent (ya confirmado como bug real en Reverse Engineering): `build_image_folder_name()` debe leer `attributes["exterior_color"]`, no `attrs.get("color")`.
- Piso de test obligatorio para este intent (ya afirmado en Practices Discovery): regresión del bug de color, casos límite de `Organization.code` (1-5 chars/ausente), contrato `Content-Type`/`Content-Disposition` del nuevo endpoint.
- Manejo de errores: nueva subclase de `ProductError` para errores de export (imagen no disponible, catálogo vacío, etc.).
- Queda fuera de alcance de este intent: persistir el campo `option` original, exportar otros estados además de `published`, y el selector de carpeta vía File System Access API.

Does this all look correct before I generate the requirements artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
