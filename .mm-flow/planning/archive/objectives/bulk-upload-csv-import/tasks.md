# Tasks — bulk-upload-csv-import

## Execution Rules

- Execute tasks in dependency order unless parallelization is explicitly safe.
- Update this file and the handoff when a task is completed or blocked.
- Each task must declare purpose, dependencies, likely file touchpoints, validation commands, and acceptance criteria.

---

## T1: CSV Parser Extension

### Purpose

Extender `CSVProductParser` para que acepte las 23 columnas del CSV del cliente (`docs/data39.csv`), incluyendo: `year`, `make`, `model`, `mileage`, `body_style`, `exterior_color`, `interior_color`, `fuel_type`, `transmission`, `clean_title`, `state`, `groups`, `label`, `publicado`. Crear el mapper de conversiones de formato (`location` → city/state, `clean_title` → `title_status`, etc.).

### Depends On

None

### Parallelizable

no

### Files / Areas Likely Touched

- `apps/api/src/prosell/domain/services/csv_product_parser.py` — ampliar `ParsedProductRow` y `_parse_row()`
- `apps/api/src/prosell/application/dto/product/attributes.py` — agregar campos a `VehicleAttributes`
- `apps/api/src/prosell/domain/services/csv_field_mapper.py` (nuevo) — conversiones de formato

### Validation Commands

```bash
cd apps/api && uv run pytest tests/unit/domain/services/test_csv_product_parser.py -v
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k bulk -v
```

### Acceptance Criteria

- [ ] Parser acepta CSV con columnas del cliente (`;` delimitado)
- [ ] `location "Orlando florida"` se convierte a `location_city="Orlando"`, `location_state="FL"`
- [ ] `clean_title "1"` → `attributes.title_status="clean"`, `"0"` → `"rebuilt"`
- [ ] `groups "1,2,3"` → `attributes.facebook_groups=["1","2","3"]`
- [ ] `mileage` se guarda en `attributes.mileage` como float
- [ ] Todos los campos nuevos se mapean correctamente
- [ ] Tests unitarios del parser pasan

---

## T2: VehicleAttributes DTO — Agregar campos faltantes

### Purpose

Extender `VehicleAttributes` en `apps/api/src/prosell/application/dto/product/attributes.py` con los campos que el CSV aporta y hoy no están modelados: `title_status`, `title_state`, `facebook_groups`, `label`, `publicado`.

### Depends On

T1

### Parallelizable

no

### Files / Areas Likely Touched

- `apps/api/src/prosell/application/dto/product/attributes.py`

### Validation Commands

```bash
cd apps/api && ruff check prosell/application/dto/product/attributes.py
cd apps/api && pyright prosell/application/dto/product/attributes.py
```

### Acceptance Criteria

- [ ] `title_status: Literal["clean", "rebuilt"] | None` existe
- [ ] `title_state: str | None` existe
- [ ] `facebook_groups: list[str] | None` existe
- [ ] `label: str | None` existe
- [ ] `publicado: bool` existe
- [ ] Tests pasan con los nuevos campos

---

## T3: Preview Endpoint (Dry-Run)

### Purpose

Crear `POST /api/v1/products/bulk-upload/preview` que lea el CSV y devuelva una comparación fila por fila: qué campos se importan, cuáles tienen diferencias, qué imágenes se asociarían.

### Depends On

T1, T2

### Parallelizable

no

### Files / Areas Likely Touched

- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — agregar endpoint preview
- `apps/api/src/prosell/application/dto/product/bulk_upload.py` (nuevo) — DTOs de request/response

### Validation Commands

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k preview -v
```

### Acceptance Criteria

- [ ] Endpoint responde con tabla comparativa fila por fila
- [ ] Muestra `mapped_fields`, `missing_fields`, `unmapped_csv_columns`, `images_found`
- [ ] No modifica ningún dato en DB (dry-run)
- [ ] Soporta CSV con `;` como delimitador

---

## T4: CSV Image Mapper (ZIP → DO Spaces)

### Purpose

Crear `apps/api/src/prosell/domain/services/csv_image_mapper.py` que dado un ZIP de imágenes y el CSV, asocie cada imagen al vehículo correspondiente usando el campo `path` como clave de matching.

### Depends On

T1

### Parallelizable

yes (independiente del parser)

### Files / Areas Likely Touched

- `apps/api/src/prosell/domain/services/csv_image_mapper.py` (nuevo)
- `apps/api/src/prosell/infrastructure/images/image_optimizer.py` — reutilizar para upload

### Validation Commands

```bash
cd apps/api && uv run pytest tests/unit/domain/services/test_csv_image_mapper.py -v
```

### Acceptance Criteria

- [ ] Lee estructura de carpetas del ZIP
- [ ] Matchea `path` CSV → archivo en ZIP (prefijo o nombre de carpeta)
- [ ] Genera DO Spaces key normalizada por vehículo
- [ ] Reporta imágenes no encontradas
- [ ] Tests unitarios pasan

---

## T5: Bulk Upload con Imágenes (Integración)

### Purpose

Integrar el parser extendido y el image mapper en `POST /api/v1/products/bulk-upload/with-images`. Aceptar CSV + ZIP y producir vehículos importados con imágenes asociadas en DO Spaces.

### Depends On

T2, T3, T4

### Parallelizable

no

### Files / Areas Likely Touched

- `apps/api/src/prosell/infrastructure/api/routers/product_router.py`
- `apps/api/src/prosell/application/use_cases/bulk_upload_vehicles_use_case.py` (nuevo)
- `apps/api/src/prosell/infrastructure/repositories/product_image_repository.py`

### Validation Commands

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k with_images -v
cd apps/api && ruff check prosell/
```

### Acceptance Criteria

- [ ] Endpoint acepta `multipart/form-data` con CSV + ZIP
- [ ] Vehículos se crean/actualizan por VIN (upsert idempotente)
- [ ] Imágenes se suben a DO Spaces y se registran en `product_images`
- [ ] Response incluye conteo de importados, fallidos, imágenes por vehículo
- [ ] Tests de integración pasan

---

## T6: Validación End-to-End

### Purpose

Verificar que el flujo completo funciona contra el CSV real del cliente (`docs/data39.csv`) con imágenes reales.

### Depends On

T5

### Parallelizable

no

### Files / Areas Likely Touched

- `tests/integration/api/routers/test_product_router.py`
- `tests/fixtures/bulk_upload_fixtures.py`

### Validation Commands

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k bulk_upload -v
```

### Acceptance Criteria

- [ ] CSV de 39 filas se importa sin errores
- [ ] Cada vehículo tiene `attributes` con todos los campos mapeados
- [ ] Preview muestra las diferencias correctas para filas con datos faltantes
- [ ] Imágenes se asocian correctamente (validar con fixture que incluya ZIP)
