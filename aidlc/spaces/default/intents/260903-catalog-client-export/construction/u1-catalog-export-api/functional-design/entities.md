# Entity Model — u1-catalog-export-api

Domain Design (ADR-002, `components.md`) ya decidió que este export **no
introduce ninguna entidad persistida nueva** — es una operación de
lectura pura. Este archivo modela los **value objects efímeros** que el
flujo de export construye en memoria (nunca persistidos), más las
referencias a las entidades ya existentes (`Product`, `Organization`,
`unit-of-work.md`) que este Unit lee sin modificar.

## Part A — Source of Truth (YAML)

```yaml
entities:
  - name: CsvExportRow
    description: >
      Una fila del CSV de export, en formato cliente (24 columnas). Value
      object efímero — se construye por producto `published` y se
      descarta tras serializarse al CSV. No persistido.
    attributes:
      - name: id
        type: string
        required: true
        unique: false
        references: Product.id
        allowed_values: null
        default: null
        min_max: null
        constraints: "requirements.md FR1.3 — columna id incluida, a diferencia del export genérico existente"
      - name: cod_dealer
        type: string
        required: true
        references: Organization.code
      - name: price
        type: decimal
        required: true
        references: Product.price
      - name: category
        type: string
        required: true
        references: Product (vía category)
      - name: type
        type: string
        required: false
      - name: location
        type: string
        required: false
      - name: year
        type: integer
        required: true
        references: Product.attributes.year
      - name: make
        type: string
        required: true
        references: Product.attributes.make
      - name: model
        type: string
        required: true
        references: Product.attributes.model
      - name: mileage
        type: integer
        required: true
        references: Product.attributes.mileage
      - name: body_style
        type: string
        required: false
      - name: exterior_color
        type: string
        required: true
        references: Product.attributes.exterior_color
        constraints: "FR2.3 — fuente correcta del segmento COLOR (bug fix respecto a attrs.get('color'))"
      - name: interior_color
        type: string
        required: false
      - name: clean_title
        type: boolean
        required: false
      - name: state
        type: string
        required: false
      - name: fuel_type
        type: string
        required: false
      - name: transmission
        type: string
        required: false
      - name: option
        type: string
        required: false
        default: ""
        constraints: "FR1.4 — SIEMPRE vacío, el dato original no se persiste en el modelo de producto"
      - name: description
        type: string
        required: false
        references: Product.description
        constraints: "FR1.4 — poblado con el valor guardado en el producto"
      - name: path
        type: string
        required: false
      - name: groups
        type: string
        required: false
      - name: label
        type: string
        required: false
      - name: publicado
        type: boolean
        required: true
        default: true
        constraints: "solo productos published entran al export — siempre true en las filas generadas"
      - name: VIN
        type: string
        required: false
        references: Product.vin
    entity_constraints:
      - "Header y orden de columnas EXACTOS: id;cod_dealer;price;category;type;location;year;make;model;mileage;body_style;exterior_color;interior_color;clean_title;state;fuel_type;transmission;option;description;path;groups;label;publicado;VIN (FR1.3)"
      - "Separador: ';' (FR1.3)"
    relationships:
      - target: Product
        cardinality: "1:1"
        direction: "CsvExportRow deriva de exactamente un Product"

  - name: VehicleImageFolder
    description: >
      Representa la carpeta de imágenes de un vehículo dentro del ZIP —
      su nombre computado y la lista de imágenes que contiene. Value
      object efímero, no persistido.
    attributes:
      - name: organization_code_segment
        type: string
        required: true
        references: Organization.code
        constraints: "1-5 caracteres si Organization.code existe; placeholder literal 'sin-codigo' si es None (stories.md AC1.1.8) — sanitizado antes de concatenar"
      - name: folder_name
        type: string
        required: true
        constraints: "patrón <código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/, cada segmento sanitizado (FR2.2, FR2.4, NFR2)"
      - name: image_keys
        type: "list<string>"
        required: true
        references: Product.image_urls
        constraints: "todas las imágenes del vehículo (FR2.1) — no solo la portada"
    entity_constraints:
      - "Cada segmento del folder_name pasa por el sanitizador ya existente del dominio (_slug_part()/equivalente) antes de concatenarse — nunca concatenar atributos crudos de producto (NFR2, zip-slip)"
    relationships:
      - target: Product
        cardinality: "1:1"
        direction: "VehicleImageFolder deriva de exactamente un Product"

  - name: ExportCatalogResult
    description: >
      El resultado ensamblado del export completo — el ZIP binario final
      (CSV en la raíz + carpetas por vehículo). Value object efímero de
      nivel de caso de uso, nunca persistido ni serializado a JSON.
    attributes:
      - name: csv_rows
        type: "list<CsvExportRow>"
        required: true
      - name: image_folders
        type: "list<VehicleImageFolder>"
        required: true
      - name: skipped_images
        type: "list<string>"
        required: false
        default: "[]"
        constraints: "referencias de imagen que fallaron al leerse — no abortan el export (AC1.1.6), se loguean como warning"
    entity_constraints:
      - "Un único archivo ZIP combinado — nunca dos artefactos de descarga separados (stories.md AC1.1.1)"
```

## Part B — Resumen humano

Tres value objects efímeros, ninguno persistido: `CsvExportRow` (una fila
del CSV cliente por producto `published`), `VehicleImageFolder` (la
carpeta de imágenes de un vehículo dentro del ZIP, con su nombre ya
sanitizado) y `ExportCatalogResult` (el ZIP combinado final). Los tres
derivan 1:1 de `Product` (ya existente, `components.md`), y
`VehicleImageFolder` referencia además `Organization.code` (ya existente)
para el segmento de organización del nombre de carpeta. Sin entidades
persistidas nuevas — consistente con ADR-002 de `decisions.md` (Domain
Design) y con `unit-of-work.md` (Units Generation), que ya describe esta
responsabilidad sin mencionar ningún modelo de datos nuevo en la base.
