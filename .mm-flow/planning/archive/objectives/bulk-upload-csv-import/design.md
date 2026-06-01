# Design — bulk-upload-csv-import

## Arquitectura

### Extensión incremental sobre el bulk upload existente

El parser actual (`csv_product_parser.py`) solo extrae 4 campos required + 8 optional. El approach es **extender sin romper**:

```
csv_product_parser.py (actual)
    │
    ├── _parse_row() — solo campos old
    │
csv_product_parser.py (extendido)
    │
    ├── _parse_row() — sigue funcionando para CSV old
    │
    ├── _parse_row_client() — nuevo, acepta 23 columnas
    │
    └── CSVFieldMapper — conversiones de formato
```

**No se crea un parser nuevo.** Se extiende el existente con un mapper que maneja las diferencias.

### División de responsabilidades

```
Router (product_router.py)
    │
    ├── POST /bulk-upload/preview  →  BulkUploadPreviewUseCase
    │                                      │
    │                                      ├── CSVProductParser (extendido)
    │                                      └── CSVImageMapper (nuevo)
    │
    └── POST /bulk-upload/with-images  →  BulkUploadVehiclesUseCase
                                               │
                                               ├── CSVProductParser (extendido)
                                               ├── CSVImageMapper (nuevo)
                                               └── ProductRepository (upsert por VIN)
```

## Technical Approach

### 1. Extender `CSVProductParser`

**Clave:** hacer que el parser detecte automáticamente si el CSV es del formato viejo (`,` delimitado, 4+8 columnas) o del formato cliente (`;` delimitado, 23 columnas).

```python
class CSVProductParser:
    def __init__(self, dialect: str = "auto"):  # "auto" | "standard" | "client"
        self.dialect = dialect

    def _detect_dialect(self, header: str) -> str:
        if ';' in header:
            return "client"  # formato del cliente
        return "standard"   # formato actual
```

### 2. CSVFieldMapper — conversiones de formato

```python
@dataclass
class CSVFieldMapper:
    """Convierte campos del CSV cliente al modelo de ProSell."""

    def map_location(self, location: str) -> tuple[str, str]:
        """'Orlando florida' → ('Orlando', 'FL')"""

    def map_clean_title(self, value: str) -> str | None:
        """'1' → 'clean', '0' → 'rebuilt', '' → None"""

    def map_groups(self, groups: str) -> list[str]:
        """'1,2,3' → ['1', '2', '3']'"""

    def map_title_status(self, clean_title: str, state: str) -> dict:
        """Genera attributes.title_status y attributes.title_state"""
```

### 3. CSVImageMapper — asociación de imágenes

```python
class CSVImageMapper:
    """Mapea paths locales de imágenes a archivos dentro de un ZIP."""

    def __init__(self, zip_path: Path):
        self.zip_path = zip_path
        self._index = self._build_index()

    def find_images(self, csv_path: str) -> list[Path]:
        """
        Dado 'Users/juanl/.../IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF'
        busca en el ZIP archivos dentro de esa carpeta o con prefijo similar.
        """
```

**Matching strategy:**
1. Normalizar el `path` del CSV (remover `Users/juanl/proy/facebook-auto-post/`)
2. Buscar en el ZIP entries que empiecen con ese prefijo
3. Si no hay match exacto, hacer fuzzy match por nombre de carpeta (`2020-EXPLORER-XLT-70K-GRIS`)

### 4. Idempotencia por VIN

```python
async def upsert_vehicle(vin: str, data: CreateProductRequest) -> UUID:
    """Si existe un producto con ese VIN, actualizar. Si no, crear."""
    existing = await product_repo.get_by_vin(vin)
    if existing:
        return await product_repo.update(existing.id, data)
    return await product_repo.create(data)
```

### 5. Campos nuevos en VehicleAttributes

```python
class VehicleAttributes(BaseModel):
    # ... campos existentes ...

    # Nuevos del CSV cliente
    title_status: Literal["clean", "rebuilt"] | None = None
    title_state: str | None = None
    facebook_groups: list[str] | None = None
    label: str | None = None
    publicado: bool = False
```

## Dependencias

| Servicio | Depende de | Notas |
|----------|-----------|-------|
| CSVProductParser | — | Extiende, no reemplaza |
| CSVFieldMapper | — | Nuevo, puro Python |
| CSVImageMapper | ZIP handling | Nuevo |
| BulkUploadPreviewUseCase | CSVProductParser + CSVFieldMapper | Nuevo |
| BulkUploadVehiclesUseCase | CSVProductParser + CSVImageMapper + ProductRepo | Nuevo |

## Boundary: qué NO cruza la frontera del dominio

- **No** se parsea el ZIP en el dominio — eso vive en `infrastructure`
- **No** se suben imágenes en el dominio — eso usa `ImageUploader` existente
- **No** se resuelven categories por nombre en el dominio — se pasa el UUID desde el use case

## API Contract

### `POST /api/v1/products/bulk-upload/preview`

```
Request:  multipart/form-data
  file: CSV (required)
  dry_run: bool = true

Response 200:
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
      "images_found": ["2020-EXPLORER-XLT-70K-GRIS-MF/img1.jpg"],
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

```
Request:  multipart/form-data
  file: CSV (required)
  images_zip: ZIP file (optional)
  organization_id: UUID (required)
  category_id: UUID (required)

Response 200:
{
  "total_rows": 45,
  "imported_count": 43,
  "failed_count": 2,
  "results": [
    {
      "row_number": 2,
      "vin": "1FMSK7DH7LGA77418",
      "product_id": "uuid-creado",
      "images_uploaded": 5,
      "status": "imported",
      "errors": []
    }
  ]
}
```

## Important Tradeoffs

- **CSV `;` vs `,`**: Se detecta automáticamente del header. El cliente usa `;`, el formato actual usa `,`.
- **`title` = `cod_dealer`**: El cliente ya cambió esto. El `title` del CSV es el código del dealership, no el título de publicación. Se guarda en `title` de todas formas (el sistema actual no tiene `cod_dealer`).
- **Imágenes opcionales**: Si el ZIP no se manda o faltan imágenes, se importa igual — las imágenes son un enhancement, no un blocker.
- **Upsert vs Insert**: Se hace upsert por VIN. Si el vehículo ya existe, se actualiza. Esto es intentional para permitir re-importaciones.
