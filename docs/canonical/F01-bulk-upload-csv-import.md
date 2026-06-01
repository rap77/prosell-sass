# CSV Bulk Upload — Vehicle Import with Image Association

## Purpose

Adaptar la carga masiva de vehículos existente (`POST /api/v1/products/bulk-upload`) para que acepte el formato CSV que el cliente ya utiliza en su flujo actual (`docs/data39.csv`), incluyendo:

1. **Parser extendido** que mapee las 23 columnas del CSV del cliente a los campos del modelo de datos de ProSell
2. **Validación comparativa** que muestre las diferencias entre lo que ofrece el CSV y lo que requiere la DB (dry-run preview)
3. **Asociación de imágenes** usando el campo `path` que contiene la ruta local de las fotos del vehículo
4. **Soporte para `cod_dealer`** como identificador de dealership en lugar de `id` (el cliente ya lo cambió)

El objetivo NO es reemplazar el flujo actual de carga individual ni el bulk upload existente — es extenderlo para cubrir el caso de uso del cliente que viene de un sistema anterior, tambien revisar todos los campos que contiene y los que usamos en la base de datos que son los que se utilizan en facebook para hacer la publicacion autimatica.

## Scope

### In Scope

- Extender `CSVProductParser` (`apps/api/src/prosell/domain/services/csv_product_parser.py`) para aceptar las columnas del CSV del cliente
- Crear mapper `CSV cliente → VehicleAttributes + ProductModel` que maneje conversiones de formato (ej: `"Orlando florida"` → `location_city="Orlando"`, `location_state="FL"`)
- Implementar dry-run validation endpoint: `POST /api/v1/products/bulk-upload/preview` que lea el CSV y devuelva una comparación fila por fila indicando:
  - Qué campos se importan correctamente
  - Qué campos tienen diferencias o no existen en la DB
  - Qué imágenes se asociarían a cada vehículo (del campo `path`)
- Asociar imágenes al vehículo usando el campo `path` como base para DO Spaces upload:
  - Aceptar un ZIP con las imágenes manteniendo la estructura de carpetas
  - Mapear `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF` → DO Spaces key
  - Soportar matching por VIN o por nombre de carpeta
- Guardar metadatos del CSV original (`clean_title`, `groups`, `label`, `publicado`) como JSONB en `attributes`
- Resolver `category` por nombre string (`"Vehiculos"`) buscando el UUID correspondiente en la DB

### Out of Scope

- No reescribir el bulk upload actual — solo extender el parser
- No crear UI de edición de vehículos (ya existe)
- No implementar scraping ni importación automática desde Facebook
- No migrar datos legacy del sistema anterior del cliente — solo la importación inicial
- No generar thumbnails ni procesar imágenes en el servidor (el flujo actual de presigned URLs es suficiente)

## Non-negotiables

- El bulk upload existente que funciona hoy NO se rompe — es una extensión, no un reemplazo
- `tenant_id` siempre viene del JWT context, nunca del CSV (IDOR prevention)
- Las imágenes se suben a DO Spaces, no se almacenan localmente en el servidor
- El parser es idempotente: la misma importación dos veces produce el mismo resultado (upsert por VIN)
- Validación de VIN con el mismo regex de 17 caracteres que existe hoy

## Arquitectura

### Campos del CSV del cliente (separados por `;`)

```
id | title | price | category | type | location | year | make | model | mileage |
body_style | exterior_color | interior_color | clean_title | state | fuel_type |
transmission | option | description | path | groups | label | publicado | VIN
```

**Nota del cliente:** `title` = `cod_dealer` (identificador de dealership del vendedor). El `id` del CSV NO se usa como PK en ProSell.

### Mapeo CSV → ProSell

| Campo CSV | Mapa a | Notas |
|----------|--------|-------|
| `title` | `title` | ⚠️ Ahora es `cod_dealer` (el cliente lo renombró) |
| `price` | `price_cents` | Multiplicar ×100 |
| `description` | `description` | Directa |
| `year` | `attributes.year` | Int |
| `make` | `attributes.make` | String |
| `model` | `attributes.model` | String |
| `mileage` | `attributes.mileage` | Float, asumir `miles` como `mileage_unit` |
| `exterior_color` | `attributes.exterior_color` | String |
| `interior_color` | `attributes.interior_color` | String |
| `fuel_type` | `attributes.fuel_type` | String |
| `transmission` | `attributes.transmission` | String |
| `VIN` | `attributes.vin` | Validado como VIN de 17 chars |
| `location` | `location_city` + `location_state` | `"Orlando florida"` → parsear estado desde abreviatura o string completo |
| `clean_title` | `attributes.title_status` | `"1"` = clean, `"0"` = rebuilt |
| `state` | `attributes.title_state` | Condición del título |
| `groups` | `attributes.facebook_groups` | Guardar como JSON array `["1","2","3"]` |
| `label` | `attributes.label` | Fecha en formato inconsistente, guardar como string |
| `publicado` | `attributes.publicado` | Booleano `"1"` / vacío |
| `option` | — | Ignorar (`"make your appointment"`) |
| `type` | — | Ignorar (el cliente siempre usa `"Auto/camioneta"`) |
| `id` | — | Ignorar (es ID externo del cliente) |
| `path` | **IMAGENES** | Ruta local → mapping a DO Spaces (ver abajo) |

### Gaps reales entre el parser actual y lo necesario

El parser actual (`csv_product_parser.py`) solo extrae:
```python
required = {"vin", "title", "price", "category_id"}  # category_id es UUID!
optional = {"description", "condition", "currency", "location_city", "location_state", "location_zip", "attributes"}
```

Faltan: `year`, `make`, `model`, `mileage`, `body_style`, `exterior_color`, `interior_color`, `fuel_type`, `transmission`, `clean_title`, `state`, `groups`, `label`, `publicado`.

### Flujo de imágenes

1. El cliente sube un `.zip` con todas las imágenes manteniendo la estructura de carpetas del `path`
2. El sistema recibe `multipart/form-data`: CSV + ZIP file
3. Se extrae el ZIP a storage temporal
4. Para cada fila del CSV, se normaliza el `path`:
   - `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF` → buscar en el ZIP ese path o similar
   - Matching por prefijo o por nombre de carpeta
5. Las imágenes encontradas se suben a DO Spaces y se registran en `product_images`
6. Se retorna un reporte de: vehículos importados, imágenes asociadas, errores

### Servicios afectados

**Backend:**
- `apps/api/src/prosell/domain/services/csv_product_parser.py` — ampliar `_parse_row()`
- `apps/api/src/prosell/domain/services/csv_image_mapper.py` (nuevo) — mapeo path → DO Spaces
- `apps/api/src/prosell/application/dto/product/attributes.py` — agregar `title_status`, `title_state`, `facebook_groups`, `label`, `publicado` a `VehicleAttributes`
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — endpoint preview + bulk upload con ZIP
- `apps/api/src/prosell/infrastructure/images/image_optimizer.py` — reutilizar existente

**DTOs a extender:**
```python
# VehicleAttributes — agregar:
title_status: Literal["clean", "rebuilt"] | None  # de clean_title
title_state: str | None  # de state
facebook_groups: list[str] | None  # de groups
label: str | None  # de label
publicado: bool  # de publicado
```

## Comportamiento específico del parser

### Conversión de location

El CSV tiene `location = "Orlando florida"` o `"Miami florida"`. Se divide en:
- `location_city = parte antes del último espacio`
- `location_state = "FL"` (hardcodear mapping FL, OR para Orlando/Miami o inferir del string)

### Conversión de clean_title

```python
"1" → title_status = "clean"
"0" → title_status = "rebuilt"
"" → None
```

### Formato de fecha label

El CSV tiene fechas en formatos inconsistentes: `"01/01/25"`, `"1/14/2025"`, `"21/03/25"`. Guardar como string en `attributes.label` sin conversión (no es un campo estructurado en la DB).

## Endpoints nuevos

### `POST /api/v1/products/bulk-upload/preview`

**Request:** `multipart/form-data`
- `file`: CSV (required)
- `dry_run`: boolean (default: true)

**Response:**
```json
{
  "total_rows": 45,
  "rows": [
    {
      "row_number": 2,
      "vin": "1FMSK7DH7LGA77418",
      "title": "DJ",
      "importable": true,
      "mapped_fields": {
        "price_cents": 1780000,
        "location_city": "Orlando",
        "location_state": "FL",
        "attributes.year": 2020,
        "attributes.make": "Ford",
        "attributes.model": "Explorer",
        "attributes.mileage": 70000,
        "attributes.exterior_color": "Gris",
        "attributes.title_status": "rebuilt"
      },
      "missing_fields": [],
      "unmapped_csv_columns": ["option", "type", "id"],
      "images_found": ["2020-EXPLORER-XLT-70K-GRIS-MF/img1.jpg", "..."],
      "errors": []
    }
  ],
  "summary": {
    "importable_count": 43,
    "error_count": 2,
    "images_count": 120
  }
}
```

### `POST /api/v1/products/bulk-upload/with-images`

**Request:** `multipart/form-data`
- `file`: CSV (required)
- `images_zip`: ZIP file (optional)
- `organization_id`: UUID (required)
- `category_id`: UUID (required)

**Response:**
```json
{
  "total_rows": 45,
  "imported_count": 43,
  "failed_count": 2,
  "results": [
    {
      "row_number": 2,
      "vin": "1FMSK7DH7LGA77418",
      "product_id": "uuid-del-producto-creado",
      "images_uploaded": 5,
      "status": "imported",
      "errors": []
    }
  ]
}
```

## Dependencies

- `apps/api/src/prosell/domain/services/csv_product_parser.py` — parser actual (referencia)
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — endpoint actual (extender)
- `apps/api/src/prosell/infrastructure/images/image_optimizer.py` — reutilizar para upload
- `apps/api/src/prosell/domain/value_objects/product_condition.py` — referencia `ProductCondition`
- `docs/data39.csv` — CSV de ejemplo del cliente (fuente de verdad para el formato)

## Validation Commands

```bash
cd apps/api && uv run pytest tests/unit/domain/services/test_csv_product_parser.py -v
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k bulk -v
cd apps/web && pnpm test -- --grep "bulk"
```

## Planned Tasks

### CSV Parser Extension

- Agregar todos los campos del CSV a `ParsedProductRow`
- Crear mapper `CSV row → VehicleAttributes` con conversiones de formato
- Validar `clean_title`, `location`, `fuel_type` con valores conocidos

### Image Association

- Crear `CSVImageMapper` que reciba ZIP + CSV y Asocie paths a vehículos
- Integrar con `ImageUploader` existente para DO Spaces
- Registrar imágenes en `product_images` table

### Preview Endpoint

- Crear `POST /products/bulk-upload/preview` dry-run endpoint
- Mostrar tabla comparativa: campo CSV → valor DB → status

### Integration

- Hook into existing `BulkUploadProductsUseCase` or create `BulkImportVehiclesUseCase`
- Ensure idempotency: upsert by VIN (update if exists, create if not)
