# Unit Test Instructions — U1 (`u1-vehicle-catalog-api`)

## Framework y configuración

`pytest` + `pytest-asyncio` (ya configurado en `apps/api/pyproject.toml`), sin configuración nueva.

## Comando exacto (scoped a este Unit)

```bash
cd apps/api && uv run pytest tests/unit/domain/services/test_facebook_vehicle_value_catalog.py tests/unit/domain/services/test_category_translation.py tests/unit/domain/services/test_csv_export.py tests/integration/alembic/test_migrate_legacy_vehicle_catalog.py -v
```

Los tests de `decode_vin()`/`category_router` extendidos corren dentro del archivo de test ya existente de esos routers (agregar casos, no un archivo nuevo) — ejecutar además:

```bash
cd apps/api && uv run pytest -k "decode_vin or facebook_values" -v
```

## Cobertura esperada

- `FacebookVehicleValueCatalog`: 5-8 tests (Standard strategy) — reconciliación exitosa, fallida, `get_options()` conocido/desconocido, y el test de reconciliación cruzada del 100% del catálogo (piso #1).
- `Category.validate_attributes()` con valor reconciliado: 1 test dedicado (piso #2).
- `CATEGORY_TRANSLATION_TABLE`: 3-5 tests dedicados (piso #4, gap del hallazgo #88).
- Migración legacy: 2-3 tests (idempotencia + guarda anti-drift, piso #5).
- `build_client_format_row()` sanitización: 3-4 tests (valores con `=+-@`, valor normal sin cambios).
- Piso #6 (wiring de publisher): sin test nuevo — correr la suite existente de los 3 adapters y confirmar verde.

Piso general: 80% de cobertura de línea en el código nuevo/tocado (`org.md`), CI ejecuta la suite completa antes de merge.

## Mocking/Stubbing

- `FacebookVehicleValueCatalog`: sin mock — domain service puro, se testea directo.
- `decode_vin()`: mock de `NHTSAVinService`/NHTSA API ya vigente en los tests existentes — reutilizar el mismo patrón, solo agregar aserciones sobre `unmatched_fields`.
- Migración legacy: usar el mismo patrón de test de integración con Postgres de test ya vigente (`create_test_schema.py`), sin mock de base de datos.

## Test Data

- Valores de prueba para el catálogo: al menos un caso por cada uno de los 9 campos (`make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, `wheelbase_type`, `bed_type`, `cab_type`, `electrification_level`), con un valor real de `NHTSA_TO_FACEBOOK` como input.
- Migración legacy: fixture con al menos 3 productos — uno que necesita migrar, uno que no calza con ninguna guarda (excluido), uno ya migrado (para el test de idempotencia).
