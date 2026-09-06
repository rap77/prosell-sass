# Business Rules — u1-catalog-export-api

## Part A — Source of Truth (YAML)

```yaml
rules:
  - id: BR1.1
    statement: >
      Solo productos con status=published Y organization_id igual al
      tenant_id resuelto del JWT del usuario autenticado entran al
      export.
    category: authorization
    applies_to: CsvExportRow (filtro previo a su construcción)
    trigger: request al endpoint de export
    logic: "IF product.status == 'published' AND product.organization_id == jwt.organization_id THEN incluir en export ELSE excluir"
    violation_behaviour: producto excluido silenciosamente del export (no es un error — es el filtro normal)
    source: "requirements.md FR1.2, NFR1"

  - id: BR1.2
    statement: >
      El tenant_id/organization_id del export se resuelve SIEMPRE del JWT
      de sesión — ningún parámetro de la petición (query, body) puede
      alterar qué organización se exporta.
    category: authorization
    applies_to: request handling del endpoint
    trigger: cada request al endpoint de export
    logic: "IF request contiene un parámetro que pretende fijar organization_id THEN ignorarlo — el único origen válido es jwt.organization_id"
    violation_behaviour: "N/A — el contrato del endpoint (contract-summary.md) no expone ningún parámetro de este tipo; no hay superficie que violar"
    source: "requirements.md NFR1"

  - id: BR1.3
    statement: >
      El header y el orden de las 24 columnas del CSV son fijos y
      exactos, igual que docs/data39.csv.
    category: constraint
    applies_to: CsvExportRow → serialización CSV
    trigger: construcción de cada fila
    logic: "el orden de columnas es id;cod_dealer;price;category;type;location;year;make;model;mileage;body_style;exterior_color;interior_color;clean_title;state;fuel_type;transmission;option;description;path;groups;label;publicado;VIN, separador ';'"
    violation_behaviour: "N/A — invariante estructural, no hay condición de negocio que lo cambie"
    source: "requirements.md FR1.3"

  - id: BR1.4
    statement: >
      La columna `option` se exporta SIEMPRE vacía; la columna
      `description` se puebla con el valor guardado en el producto.
    category: calculation
    applies_to: CsvExportRow.option, CsvExportRow.description
    trigger: construcción de cada fila
    logic: "option = '' SIEMPRE; description = product.description"
    violation_behaviour: "N/A — regla de mapeo directo, sin condición de excepción"
    source: "requirements.md FR1.4, stories.md AC1.1.11"

  - id: BR1.5
    statement: >
      La respuesta del endpoint es SIEMPRE un único archivo ZIP
      combinado (CSV + carpetas de imágenes) — nunca dos descargas
      separadas ni dos endpoints distintos — servido con
      `Content-Type: application/zip` y `Content-Disposition: attachment`
      con nombre de archivo.
    category: constraint
    applies_to: ExportCatalogResult (response del endpoint)
    trigger: cada request exitoso al endpoint de export
    logic: "response = un único ZIP conteniendo CsvExportRow[] serializadas + VehicleImageFolder[] con sus imágenes; headers Content-Type=application/zip, Content-Disposition=attachment con filename"
    violation_behaviour: "N/A — invariante estructural del contrato, ya fijado en contract-summary.md"
    source: "stories.md AC1.1.1, AC1.1.9 — resuelve la ambigüedad Critical señalada por el reviewer de Requirements Analysis"

  - id: BR2.1
    statement: >
      El nombre de carpeta de imágenes por vehículo sigue el patrón
      <código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/.
    category: constraint
    applies_to: VehicleImageFolder.folder_name
    trigger: construcción de la carpeta por producto
    logic: "folder_name = f'{org_segment}/{year}-{make}-{model}-{mileage_k}-{color}-{org_segment}/'"
    violation_behaviour: "N/A — invariante estructural"
    source: "requirements.md FR2.2, stories.md AC1.1.3"

  - id: BR2.2
    statement: >
      El segmento `{código_organización}` usa el valor real y sanitizado
      de Organization.code (1-5 caracteres); si Organization.code es
      None, usa el placeholder literal `sin-codigo`.
    category: constraint
    applies_to: VehicleImageFolder.organization_code_segment
    trigger: construcción del segmento de organización
    logic: "IF organization.code IS NOT NULL THEN sanitize(organization.code) ELSE 'sin-codigo'"
    violation_behaviour: "N/A — regla de mapeo con fallback explícito, sin condición de error"
    source: "requirements.md FR2.2, stories.md AC1.1.8 (fija el placeholder como valor cerrado, no diferido)"

  - id: BR2.3
    statement: >
      El segmento COLOR del nombre de carpeta se lee de
      `Product.attributes['exterior_color']` — NUNCA de un campo `color`
      inexistente en el modelo real.
    category: validation
    applies_to: VehicleImageFolder.folder_name (segmento color)
    trigger: construcción del segmento de color
    logic: "color_segment = product.attributes['exterior_color']"
    violation_behaviour: >
      Fix de regresión del bug ya confirmado (antes leía attrs.get('color'),
      inexistente, y el fallo era silencioso — segmento vacío). Ahora la
      clave correcta siempre existe para un producto vehicular real.
    source: "requirements.md FR2.3, stories.md AC1.1.4 — regresión obligatoria per team-practices.md Q1"

  - id: BR2.4
    statement: >
      Todo segmento del nombre de carpeta/archivo dentro del ZIP pasa por
      el sanitizador ya existente del dominio antes de concatenarse a una
      ruta interna del ZIP.
    category: validation
    applies_to: VehicleImageFolder.folder_name (todos los segmentos)
    trigger: construcción de cada segmento
    logic: "segment = _slug_part(raw_value) para cada segmento (marca, modelo, color, código de organización)"
    violation_behaviour: "sin sanitizar → superficie de zip-slip; la regla es preventiva, aplicada siempre, sin rama de excepción"
    source: "requirements.md FR2.4, NFR2 — reutiliza _slug_part()/csv_export.py o el equivalente probado de CSVImageMapper"

  - id: BR3.1
    statement: >
      El export rechaza la petición con un error específico (413 Payload
      Too Large) cuando el catálogo excede el cap de recursos, en vez de
      intentar armar un ZIP sin cota. El número exacto del cap se define
      en NFR Design.
    category: policy
    applies_to: request handling, antes de iniciar el armado del ZIP
    trigger: conteo de productos published a exportar
    logic: "IF count(published_products) > CAP (definido en NFR Design) THEN raise ExportLimitExceededError (413) ELSE continuar"
    violation_behaviour: "413 Payload Too Large con mensaje específico (stories.md AC1.3.1) — nunca timeout ni ZIP corrupto/incompleto"
    source: "requirements.md NFR3, stories.md US1.3/AC1.3.1"

  - id: BR4.1
    statement: >
      Si la organización no tiene ningún producto published, el export
      rechaza con 404 y un mensaje claro — no arma un ZIP vacío.
    category: validation
    applies_to: request handling, antes de iniciar el armado del ZIP
    trigger: conteo de productos published a exportar
    logic: "IF count(published_products) == 0 THEN raise EmptyCatalogError (404) ELSE continuar"
    violation_behaviour: "404 con body tipado vía ProductError (stories.md AC1.1.5)"
    source: "requirements.md FR4.1, stories.md AC1.1.5"

  - id: BR4.2
    statement: >
      Si una imagen referenciada en `image_urls` no se puede leer al
      armar el ZIP, el export NO se aborta — el vehículo se incluye
      igual con las imágenes que sí están disponibles, y se emite un log
      `warning` con `product_id` + referencia de la imagen fallida.
    category: policy
    applies_to: VehicleImageFolder.image_keys (lectura de cada imagen)
    trigger: fallo al leer una imagen individual (get_object() de IDOSpacesService)
    logic: "IF read(image_key) fails THEN log.warning(product_id, image_key); continuar con las imágenes restantes ELSE incluir la imagen en la carpeta"
    violation_behaviour: "sin excepción propagada — degradación parcial, nunca aborta el export completo (stories.md AC1.1.6)"
    source: "requirements.md FR4.1, stories.md AC1.1.6"

  - id: BR4.3
    statement: >
      Todos los errores del flujo de export se modelan como subclases
      nuevas de `ProductError`, mapeadas a HTTP en `product_router.py` —
      nunca una jerarquía separada de excepciones.
    category: policy
    applies_to: BR3.1, BR4.1 (las excepciones que esas reglas lanzan)
    trigger: cualquier condición de error del flujo de export
    logic: "toda excepción del dominio de export hereda de ProductError"
    violation_behaviour: "N/A — regla de convención de código, no una condición de negocio con violación"
    source: "requirements.md FR4.1 — afirmado en Practices Discovery Q2"
```

## Part B — Resumen humano

| ID    | Categoría     | Resumen                                                                                         |
| ----- | ------------- | ----------------------------------------------------------------------------------------------- |
| BR1.1 | authorization | Solo productos `published` de la organización del JWT entran al export                          |
| BR1.2 | authorization | tenant_id SIEMPRE del JWT, nunca de un parámetro de la petición                                 |
| BR1.3 | constraint    | Header/orden de las 24 columnas fijo, `;` como separador                                        |
| BR1.4 | calculation   | `option` siempre vacía, `description` = valor guardado                                          |
| BR1.5 | constraint    | Respuesta siempre un único ZIP combinado con headers Content-Type/Content-Disposition correctos |
| BR2.1 | constraint    | Patrón del nombre de carpeta de imágenes por vehículo                                           |
| BR2.2 | constraint    | Segmento de organización: código real sanitizado, o `sin-codigo` si `None`                      |
| BR2.3 | validation    | Segmento color lee `attributes.exterior_color` (fix del bug confirmado)                         |
| BR2.4 | validation    | Todo segmento del nombre de carpeta pasa por el sanitizador antes de concatenarse               |
| BR3.1 | policy        | Cap de recursos excedido → 413, número exacto en NFR Design                                     |
| BR4.1 | validation    | Catálogo vacío → 404, no arma ZIP vacío                                                         |
| BR4.2 | policy        | Imagen individual no legible → log warning, no aborta el export                                 |
| BR4.3 | policy        | Todos los errores del export son subclases de `ProductError`                                    |
