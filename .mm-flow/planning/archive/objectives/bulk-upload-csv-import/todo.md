# Todo — bulk-upload-csv-import

## Execution Checklist

- [x] T1: CSV Parser Extension
⏱️ **Estimate**: N/A | **Actual**: 24.1m | **Deviation**: — | **Progress**: 5/5 (100%)
📊 **Avg/subtask**: 4.8m | **ETA**: done **Estimate**: N/A | **Actual**: 24.1m | **Deviation**: — | **Progress**: 5/5 (100%)
📊 **Avg/subtask**: 4.8m | **ETA**: done **Estimate**: N/A | **Actual**: 24.1m | **Deviation**: -6.0m | **Progress**: 4/5 (80%)
📊 **Avg/subtask**: 6.0m | **ETA**: 6.0m **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 3/5 (60%)
📊 **Avg/subtask**: 5.4m | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 2/5 (40%)
📊 **Avg/subtask**: 4.1m | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/5 (20%)
📊 **Avg/subtask**: 9s | **ETA**: in progress

  - [x] T1.1: Leer canonical doc `F01-bulk-upload-csv-import.md` y entender mapeo
  - [x] T1.2: Leer parser actual `csv_product_parser.py`
  - [x] T1.3: Extender `ParsedProductRow` con campos nuevos
  - [x] T1.4: Crear `csv_field_mapper.py` con conversiones
  - [x] T1.5: Tests unitarios pasan
  - depends_on: none
  - validation: `cd apps/api && uv run pytest tests/unit/domain/services/test_csv_product_parser.py -v`

- [x] T2: VehicleAttributes DTO — Agregar campos faltantes
⏱️ **Estimate**: N/A | **Actual**: 2.4m | **Deviation**: — | **Progress**: 2/2 (100%)
📊 **Avg/subtask**: 1.2m | **ETA**: done **Estimate**: N/A | **Actual**: 2.4m | **Deviation**: — | **Progress**: 2/2 (100%)
📊 **Avg/subtask**: 1.2m | **ETA**: done **Estimate**: N/A | **Actual**: 2.2m | **Deviation**: -2.2m | **Progress**: 1/2 (50%)
📊 **Avg/subtask**: 2.2m | **ETA**: 2.2m **Estimate**: N/A | **Actual**: 2.2m | **Deviation**: -2.2m | **Progress**: 1/2 (50%)
📊 **Avg/subtask**: 2.2m | **ETA**: 2.2m

  - [x] T2.1: Agregar `title_status`, `title_state`, `facebook_groups`, `label`, `publicado` a `VehicleAttributes`
  - [x] T2.2: Validar con ruff + pyright
  - depends_on: T1
  - validation: `cd apps/api && pyright prosell/application/dto/product/attributes.py`

- [x] T3: Preview Endpoint (Dry-Run)
⏱️ **Estimate**: N/A | **Actual**: 41.1m | **Deviation**: — | **Progress**: 3/3 (100%)
📊 **Avg/subtask**: 13.7m | **ETA**: done **Estimate**: N/A | **Actual**: 41.1m | **Deviation**: -20.5m | **Progress**: 2/3 (66%)
📊 **Avg/subtask**: 20.5m | **ETA**: 20.5m **Estimate**: N/A | **Actual**: 38.4m | **Deviation**: -1.3h | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: 38.4m | **ETA**: 1.3h

  - [x] T3.1: Crear DTOs de request/response en `bulk_upload.py`
  - [x] T3.2: Implementar endpoint `POST /products/bulk-upload/preview`
  - [x] T3.3: Tests de integración
  - depends_on: T1, T2
  - validation: `cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k preview -v`

- [x] T4: CSV Image Mapper (ZIP → DO Spaces)
⏱️ **Estimate**: N/A | **Actual**: 1.5h | **Deviation**: — | **Progress**: 3/3 (100%)
📊 **Avg/subtask**: 29.4m | **ETA**: done **Estimate**: N/A | **Actual**: 1.5h | **Deviation**: — | **Progress**: 3/3 (100%)
📊 **Avg/subtask**: 29.4m | **ETA**: done **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: in progress **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: in progress **Estimate**: N/A | **Actual**: — | **Deviation**: — | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: — | **ETA**: —

  - [x] T4.1: Crear `csv_image_mapper.py`
  - [x] T4.2: Implementar matching path → archivo ZIP
  - [x] T4.3: Tests unitarios
  - depends_on: T1
  - validation: `cd apps/api && uv run pytest tests/unit/domain/services/test_csv_image_mapper.py -v`

- [x] T5: Bulk Upload con Imágenes (Integración)
  - [x] T5.1: Crear `BulkUploadVehiclesUseCase`
  - [x] T5.2: Integrar parser + image mapper en endpoint
  - [x] T5.3: Tests de integración
  - depends_on: T2, T3, T4
  - validation: `cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k with_images -v`

- [x] T6: Validación End-to-End
⏱️ **Estimate**: N/A | **Actual**: 5.8m | **Deviation**: — | **Progress**: 3/3 (100%)
📊 **Avg/subtask**: 1.9m | **ETA**: done **Estimate**: N/A | **Actual**: 5.8m | **Deviation**: — | **Progress**: 3/3 (100%)
📊 **Avg/subtask**: 1.9m | **ETA**: done **Estimate**: N/A | **Actual**: 5.4m | **Deviation**: -2.7m | **Progress**: 2/3 (66%)
📊 **Avg/subtask**: 2.7m | **ETA**: 2.7m **Estimate**: N/A | **Actual**: 4.3m | **Deviation**: -8.6m | **Progress**: 1/3 (33%)
📊 **Avg/subtask**: 4.3m | **ETA**: 8.6m

  - [x] T6.1: Importar `docs/data39.csv` completo (39 filas)
  - [x] T6.2: Verificar todos los campos mapeados en DB
  - [x] T6.3: Verificar que preview muestra diferencias correctas
  - depends_on: T5
  - validation: `cd apps/api && uv run pytest tests/integration/api/routers/test_product_router.py -k bulk_upload -v`
