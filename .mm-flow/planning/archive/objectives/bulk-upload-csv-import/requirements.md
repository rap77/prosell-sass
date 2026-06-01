# Requirements — bulk-upload-csv-import

## Problem / Purpose

Adaptar la carga masiva de vehículos existente (`POST /api/v1/products/bulk-upload`) para que acepte el formato CSV que el cliente ya utiliza en su flujo actual (`docs/data39.csv`), incluyendo:

1. **Parser extendido** que mapee las 23 columnas del CSV del cliente a los campos del modelo de datos de ProSell
2. **Validación comparativa** que muestre las diferencias entre lo que ofrece el CSV y lo que requiere la DB (dry-run preview)
3. **Asociación de imágenes** usando el campo `path` que contiene la ruta local de las fotos del vehículo
4. **Soporte para `cod_dealer`** como identificador de dealership (el cliente ya lo renombró en `title`)

El objetivo NO es reemplazar el flujo actual de carga individual ni el bulk upload existente — es extenderlo para cubrir el caso de uso del cliente que viene de un sistema anterior.

## Stakeholders / Users

- **Primary:** Vendedores/dealers que quieren importar su inventario existente desde un sistema anterior
- **Secondary:** Admin que configura la importación inicial del cliente

## Scope

### In Scope

- Extender `CSVProductParser` para aceptar las columnas del CSV del cliente (23 columnas, `;` delimitado)
- Mapper `CSV cliente → VehicleAttributes + ProductModel` con conversiones de formato:
  - `"Orlando florida"` → `location_city="Orlando"`, `location_state="FL"`
  - `clean_title "1"` → `title_status="clean"`, `"0"` → `"rebuilt"`
  - `groups "1,2,3"` → `facebook_groups=["1","2","3"]`
  - `mileage` → `attributes.mileage` como float (asumir `miles`)
- Dry-run preview endpoint: `POST /api/v1/products/bulk-upload/preview`
- Asociación de imágenes desde ZIP manteniendo estructura de carpetas del `path`
- Guardar metadatos originales en `attributes`: `title_status`, `title_state`, `facebook_groups`, `label`, `publicado`
- Resolver `category` por nombre string (`"Vehiculos"`) buscando UUID en DB
- Idempotencia por VIN (upsert, no duplicados)

### Out of Scope

- No reescribir el bulk upload actual — solo extender el parser
- No crear UI de edición de vehículos (ya existe)
- No implementar scraping ni importación automática desde Facebook
- No migrar datos legacy — solo la importación inicial
- No generar thumbnails ni procesar imágenes en el servidor

## Non-negotiables

- El bulk upload existente que funciona hoy NO se rompe — es una extensión, no un reemplazo
- `tenant_id` siempre viene del JWT context, nunca del CSV (IDOR prevention)
- Las imágenes se suben a DO Spaces, no se almacenan localmente
- El parser es idempotente: misma importación dos veces = mismo resultado (upsert por VIN)
- VIN validado con regex de 17 caracteres (igual que ahora)
- Preview es read-only, no modifica nada en DB

## Campos del CSV cliente (separados por `;`)

```
id | title | price | category | type | location | year | make | model | mileage |
body_style | exterior_color | interior_color | clean_title | state | fuel_type |
transmission | option | description | path | groups | label | publicado | VIN
```

## Mapeo CSV → ProSell

| Campo CSV | Mapa a | Conversión |
|----------|--------|-----------|
| `title` | `title` | Directa (es `cod_dealer`) |
| `price` | `price_cents` | `float × 100` |
| `description` | `description` | Directa |
| `year` | `attributes.year` | `int` |
| `make` | `attributes.make` | Directa |
| `model` | `attributes.model` | Directa |
| `mileage` | `attributes.mileage` | `float`, asumir `miles` |
| `exterior_color` | `attributes.exterior_color` | Directa |
| `interior_color` | `attributes.interior_color` | Directa |
| `fuel_type` | `attributes.fuel_type` | Directa |
| `transmission` | `attributes.transmission` | Directa |
| `VIN` | `attributes.vin` | Validado 17 chars |
| `location` | `location_city` + `location_state` | Parsear `"Ciudad State"` |
| `clean_title` | `attributes.title_status` | `"1"`→clean, `"0"`→rebuilt |
| `state` | `attributes.title_state` | Directa |
| `groups` | `attributes.facebook_groups` | `split(",")` → JSON array |
| `label` | `attributes.label` | String (formatos variados) |
| `publicado` | `attributes.publicado` | `"1"`→true, else false |
| `option` | — | Ignorado |
| `type` | — | Ignorado |
| `id` | — | Ignorado |
| `path` | IMAGENES | Mapeo a DO Spaces |

## Campos nuevos en VehicleAttributes

```python
title_status: Literal["clean", "rebuilt"] | None = None
title_state: str | None = None
facebook_groups: list[str] | None = None
label: str | None = None
publicado: bool = False
```

## Endpoints

### `POST /api/v1/products/bulk-upload/preview`

- Acepta CSV (`;` delimitado)
- Devuelve tabla comparativa fila por fila
- Read-only (dry-run)
- No requiere `organization_id` ni `category_id`

### `POST /api/v1/products/bulk-upload/with-images`

- Acepta CSV + ZIP opcional
- Requiere `organization_id` y `category_id`
- Crea/actualiza vehículos por VIN
- Asocia imágenes a DO Spaces

## Acceptance Criteria

- [ ] Parser acepta CSV `;` delimitado con 23 columnas
- [ ] Detecta automáticamente formato cliente vs formato estándar
- [ ] `location "Orlando florida"` → `city="Orlando"`, `state="FL"`
- [ ] `clean_title "0"` → `attributes.title_status="rebuilt"`
- [ ] Preview muestra fila por fila con `mapped_fields`, `missing_fields`, `images_found`
- [ ] ZIP de imágenes se asocia correctamente por `path`
- [ ] Upsert por VIN: re-importar no duplica vehículos
- [ ] Tests unitarios del parser pasan
- [ ] Tests de integración del endpoint pasan
- [ ] Bulk upload existente NO se rompe (regresa tests existentes)
