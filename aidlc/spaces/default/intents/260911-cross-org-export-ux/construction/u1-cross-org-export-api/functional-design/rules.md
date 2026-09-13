# Business Rules — u1-cross-org-export-api

Fuente: `requirements.md` (FR2, FR4, FR6, FR7, FR8.4, FR9.2/9.4, NFR1,
NFR2), `stories.md`, `contract-summary.md`,
`functional-design-questions.md` (Q1-Q3).

```yaml
rules:
  - id: BR1.1
    statement: "clean_title se deriva de attributes.title_status con conversión inversa a la del import"
    category: calculation
    applies_to: build_client_format_row (columna clean_title)
    trigger: "exportar un producto en formato cliente"
    logic: >
      IF title_status == "clean" THEN clean_title = "1"
      ELSE IF title_status == "rebuilt" THEN clean_title = "0"
    violation_behaviour: "valor desconocido de title_status → clean_title vacío, no falla el export completo"
    source: FR7.3

  - id: BR1.2
    statement: "groups se deriva de attributes.facebook_groups uniendo con coma"
    category: calculation
    applies_to: build_client_format_row (columna groups)
    trigger: "exportar un producto en formato cliente"
    logic: 'groups = ",".join(facebook_groups) si facebook_groups no está vacío, sino el fallback confirmado por el usuario (BR2.7)'
    violation_behaviour: "N/A — join siempre produce un string válido, incluso vacío"
    source: FR7.4, FR9.4

  - id: BR1.3
    statement: "category/type se derivan del VERTICAL RAÍZ de product.category_id (resuelto vía CategoryRepository, walk-up hasta el ancestro de nivel 0) vía CategoryTranslationEntry, no de los nombres reales del árbol ni del category_id hoja directo"
    category: calculation
    applies_to: build_client_format_row (columnas category, type)
    trigger: "exportar un producto en formato cliente"
    logic: >
      1) resolver current = CategoryRepository.get_by_id_cross_tenant(product.category_id);
      2) WHILE current.parent_id is not null: current = CategoryRepository.get_by_id_cross_tenant(current.parent_id) (walk-up hasta el ancestro con parent_id null, level=0);
      3) buscar CategoryTranslationEntry por vertical_category_id == current.id;
      4) si no existe entrada para ese vertical, el producto NO se incluye en el export (BR1.7).
      Corrección de un hallazgo Critical del reviewer §12a: Category es jerárquico multi-nivel (parent_id/level) y product.category_id apunta a un nodo hoja, no al vertical — un lookup directo por category_id excluiría incorrectamente casi todos los productos de la vertical vehículos, no solo los de otras verticales.
    violation_behaviour: "sin entrada de traducción para el vertical resuelto → producto excluido del export, no un valor vacío"
    source: FR7.5

  - id: BR1.4
    statement: "location combina location_city y location_state con un espacio, código de estado tal cual almacenado"
    category: calculation
    applies_to: build_client_format_row (columna location)
    trigger: "exportar un producto en formato cliente"
    logic: 'location = f"{location_city} {location_state}"'
    violation_behaviour: "campo ausente → segmento vacío en el string resultante, no falla el export"
    source: FR7.6

  - id: BR1.5
    statement: "VIN se lee de attributes.vin (minúscula), no de una clave VIN inexistente"
    category: calculation
    applies_to: build_client_format_row (columna VIN)
    trigger: "exportar un producto en formato cliente"
    logic: "VIN = attributes.get('vin')"
    violation_behaviour: "ausente → columna vacía"
    source: FR7.1

  - id: BR1.6
    statement: "body_style se lee de attributes.body_type"
    category: calculation
    applies_to: build_client_format_row (columna body_style)
    trigger: "exportar un producto en formato cliente"
    logic: "body_style = attributes.get('body_type')"
    violation_behaviour: "ausente → columna vacía"
    source: FR7.2

  - id: BR1.7
    statement: "un producto cuyo VERTICAL RAÍZ (resuelto per BR1.3) no tiene entrada de traducción (fuera de la vertical vehículos) se excluye del export formato cliente"
    category: constraint
    applies_to: "el loop de armado del CSV/ZIP, antes de build_client_format_row"
    trigger: "el vertical raíz de product.category_id (BR1.3) no tiene CategoryTranslationEntry"
    logic: "IF no existe traducción para el vertical resuelto THEN excluir el producto del CSV y del ZIP (sin fila, sin carpeta de imágenes)"
    violation_behaviour: "N/A — es el comportamiento correcto, no una violación"
    source: "functional-design-questions.md Q1"

  - id: BR1.8
    statement: "state se lee de attributes.title_state, no de la clave state inexistente"
    category: calculation
    applies_to: build_client_format_row (columna state)
    trigger: "exportar un producto en formato cliente"
    logic: "state = attributes.get('title_state')"
    violation_behaviour: "ausente → columna vacía"
    source: "unit-of-work.md (las 8 columnas originalmente identificadas en el scan); agregado a scope en esta etapa por decisión explícita del humano tras hallazgo del reviewer — ver memory.md"

  - id: BR2.1
    statement: "el modo 'todas las organizaciones' requiere ORG_ADMIN_VIEW_ALL/super_admin"
    category: authorization
    applies_to: "endpoint export-client-format.zip, parámetro all_organizations"
    trigger: "all_organizations=true en la request"
    logic: "IF all_organizations AND NOT has_permission(ORG_ADMIN_VIEW_ALL) THEN 403"
    violation_behaviour: "403 Forbidden, mismo mecanismo ya usado para organization_id ajeno puntual (_check_org_scope_permission)"
    source: FR4.4, NFR2

  - id: BR2.2
    statement: "sin all_organizations ni organization_id explícitos, el export resuelve a la organización propia del usuario, nunca a todas"
    category: policy
    applies_to: "endpoint export-client-format.zip"
    trigger: "request sin all_organizations y sin organization_id"
    logic: "effective_scope = own_organization"
    violation_behaviour: "N/A — es el comportamiento por defecto ya existente, sin cambios"
    source: FR2.2

  - id: BR2.3
    statement: "el código de organización de cada producto se resuelve en batch antes del loop de export, no reutilizando el de la primera organización resuelta"
    category: constraint
    applies_to: "resolución de org_code en el modo 'todas'"
    trigger: "all_organizations=true con productos de 2+ organizaciones"
    logic: "pre-resolver {organization_id: org_code} para el conjunto completo de organizaciones del lote de productos, ANTES del loop por fila (mismo patrón que _resolve_org_codes(), dirección inversa cross-tenant)"
    violation_behaviour: "sin esta regla: todos los productos usarían el org_code de la primera organización resuelta — bug ya detectado en el scan (hallazgo #83)"
    source: FR4.2

  - id: BR2.4
    statement: "EXPORT_MAX_PRODUCTS (500) aplica como límite GLOBAL cuando all_organizations=true, no por-organización"
    category: constraint
    applies_to: "conteo de productos antes de armar el ZIP en modo 'todas'"
    trigger: "all_organizations=true"
    logic: "IF total_productos_todas_las_organizaciones > 500 THEN 413"
    violation_behaviour: "413 Request Entity Too Large, mismo error ya usado para el caso de una sola organización"
    source: FR4.3

  - id: BR2.5
    statement: "el log de auditoría de un export 'todas las organizaciones' incluye scope=ALL_ORGS para distinguirlo de un export cross-org puntual"
    category: policy
    applies_to: "logger.info() del endpoint de export"
    trigger: "all_organizations=true"
    logic: "log incluye el campo scope=ALL_ORGS además de user/own_org ya existentes"
    violation_behaviour: "N/A — es un requisito de observabilidad, no de comportamiento funcional"
    source: FR6.1, NFR1, "functional-design-questions.md Q3"

  - id: BR2.6
    statement: "la columna path se completa concatenando la carpeta base confirmada + el código de organización del producto + el nombre de carpeta del producto"
    category: calculation
    applies_to: build_client_format_row (columna path)
    trigger: "exportar un producto en formato cliente (cualquier modo)"
    logic: 'path = f"{base_folder}{org_code}/{product_folder_name}"'
    violation_behaviour: "N/A — base_folder y product_folder_name siempre están definidos en este punto del flujo"
    source: FR8.4

  - id: BR2.7
    statement: "facebook_groups_fallback se usa SOLO cuando el producto no tiene facebook_groups propio"
    category: constraint
    applies_to: build_client_format_row (columna groups, junto a BR1.2)
    trigger: "attributes.facebook_groups está vacío o ausente"
    logic: 'IF facebook_groups vacío THEN groups = facebook_groups_fallback ELSE groups = ",".join(facebook_groups)'
    violation_behaviour: "un producto CON grupos propios nunca debe recibir el fallback — verificado por test dedicado (piso mínimo punto 1)"
    source: FR9.4

  - id: BR2.8
    statement: "el nombre de archivo del export 'todas las organizaciones' es catalogo_TODAS_{fecha}.zip"
    category: policy
    applies_to: "header Content-Disposition del endpoint de export"
    trigger: "all_organizations=true"
    logic: 'filename = f"catalogo_TODAS_{datetime.now(UTC).strftime(''%Y%m%d'')}.zip"'
    violation_behaviour: "N/A — convención de nombre, no una regla de negocio con caso de violación"
    source: "functional-design-questions.md Q2"
```

## Resumen legible

| ID    | Regla                                                                                 | Categoría     |
| ----- | ------------------------------------------------------------------------------------- | ------------- |
| BR1.1 | clean_title inverso de title_status                                                   | calculation   |
| BR1.2 | groups = join de facebook_groups                                                      | calculation   |
| BR1.3 | category/type vía walk-up a vertical + tabla de traducción                            | calculation   |
| BR1.4 | location = city + state                                                               | calculation   |
| BR1.5 | VIN desde attributes.vin                                                              | calculation   |
| BR1.6 | body_style desde attributes.body_type                                                 | calculation   |
| BR1.7 | excluir productos sin traducción de categoría                                         | constraint    |
| BR1.8 | state desde attributes.title_state (8va columna, agregada tras hallazgo del reviewer) | calculation   |
| BR2.1 | permiso requerido para all_organizations                                              | authorization |
| BR2.2 | default = organización propia, nunca todas                                            | policy        |
| BR2.3 | resolución batch de org_code por-producto                                             | constraint    |
| BR2.4 | límite global de 500 en modo todas                                                    | constraint    |
| BR2.5 | auditoría distinguible (scope=ALL_ORGS)                                               | policy        |
| BR2.6 | path = base + org_code + carpeta producto                                             | calculation   |
| BR2.7 | fallback de grupos FB solo si falta                                                   | constraint    |
| BR2.8 | nombre de archivo para modo todas                                                     | policy        |
