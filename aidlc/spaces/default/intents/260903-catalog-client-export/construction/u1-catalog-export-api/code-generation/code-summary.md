# Code Summary — u1-catalog-export-api

Los 11 steps del plan aprobado se ejecutaron (Steps 1-10 código/test;
Step 11 es este propio documento, fuera del alcance del subagent
delegado). Independientemente re-verificado por el conductor (no solo
confiando en el reporte del subagent): `uv run pyright` directo sobre
los archivos nuevos/tocados → 0 errores (el diagnóstico de IDE en vivo
mostraba un falso positivo de import sin resolver — gotcha ya conocido
del proyecto, `project.md`); `uv run pytest` sobre los archivos
unitarios nuevos/tocados → 33 passed.

## Archivos modificados

| Archivo                                                             | Cambio                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/prosell/application/ports/ido_spaces.py`              | Nuevo método abstracto `get_object(key) -> bytes` + excepción `StorageReadError`                                                                                                                                                 |
| `apps/api/src/prosell/infrastructure/services/do_spaces_service.py` | Implementación de `get_object()` (boto3 `get_object` + `.read()` en thread pool, mismo patrón async-wrapping que `upload_file`/`delete_file`)                                                                                    |
| `apps/api/src/prosell/domain/services/csv_export.py`                | `CLIENT_FORMAT_COLUMNS` (24 columnas), `build_client_format_row()`, `build_organization_code_segment()`, `build_vehicle_zip_folder_name()`                                                                                       |
| `apps/api/src/prosell/domain/exceptions/product_exceptions.py`      | `EmptyCatalogExportError`, `ExportLimitExceededError` (subclases de `ProductError`)                                                                                                                                              |
| `apps/api/src/prosell/infrastructure/api/routers/product_router.py` | Fix de regresión BR2.3 (línea 686, `color=attrs.get("exterior_color")` en vez de `attrs.get("color")` — corrige AMBOS `export_catalog_csv` y el nuevo endpoint) + endpoint nuevo `GET /api/v1/products/export-client-format.zip` |
| `apps/api/tests/unit/services/test_csv_export.py`                   | Extendido: regresión del bug de color, casos límite de `Organization.code` (1/5 chars, `None`→`sin-codigo`), `build_client_format_row`                                                                                           |
| `apps/api/tests/unit/services/test_do_spaces_service.py`            | Extendido: `get_object()` éxito + error                                                                                                                                                                                          |

## Archivos nuevos

| Archivo                                                                                  | Contenido                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py`     | `ExportCatalogClientFormatUseCase` — orquesta cap check, lectura concurrente de imágenes (semáforo 20 + retry), ensamblado del ZIP |
| `apps/api/tests/unit/application/use_cases/product/test_export_catalog_client_format.py` | 5 tests: catálogo vacío, cap excedido, imagen fallida no aborta, ZIP bien formado, producto sin imágenes                           |
| `apps/api/tests/integration/api/routers/test_product_router_export_client_format.py`     | Contrato Content-Type/Content-Disposition, 200/404/413, aislamiento multi-tenant                                                   |
| `apps/api/tests/integration/api/routers/test_product_router_export_csv.py`               | Regresión del call site corregido sobre el endpoint genérico existente (requiere DB real, no alcanza con el test unitario aislado) |

## Decisiones de implementación clave

1. **Columnas sin regla BR explícita** (`category`, `type`, `location`,
   `body_style`, `interior_color`, `clean_title`, `state`, `fuel_type`,
   `transmission`, `path`, `groups`, `label`, `VIN`): mapeadas
   directamente desde `product.attributes` bajo la misma clave — lectura
   literal de "mapeo directo de atributos" del `functional-spec.md`, sin
   inventar joins nuevos (ej. nombre de categoría) fuera de alcance.
2. **`build_vehicle_zip_folder_name()`** compone
   `{org_segment}/{inner_name}/` reutilizando `build_image_folder_name()`/
   `_slug_part()` sin duplicar lógica de sanitización (BR2.1/BR2.4).
3. **Concurrencia**: un único `asyncio.Semaphore(20)` compartido sobre el
   conjunto aplanado de TODAS las imágenes del export (no por-vehículo)
   — fiel al pseudocódigo de `performance-design.md`.
4. **Sanitización de nombre de archivo dentro del ZIP** reutiliza
   `CSVImageMapper._sanitize_filename()` (preserva extensión) en vez de
   `_slug_part()` (la colapsaría) — ambas opciones estaban sancionadas
   por `security-design.md`; se eligió la que preserva la extensión del
   archivo de imagen.

## Desviaciones del plan (documentadas)

- El plan asumía que el test de regresión BR2.3 iría solo en
  `test_csv_export.py`, pero como el call site corregido vive en el
  router (necesita DB/categoría real), se agregó también
  `test_product_router_export_csv.py` (integración) — cobertura más
  completa que la planeada, no un recorte.
- Se agregó el campo `organization_code` a
  `ExportCatalogClientFormatResult` (no mencionado explícitamente en el
  plan) para que el router arme el filename
  `catalogo_<org>_<fecha>.zip` sin una segunda consulta a
  `Organization` — optimización menor, consistente con la intención del
  plan (Step 9).

## Test coverage summary

33 tests nuevos/extendidos verificados directamente por el conductor
(unitarios) + 7 de integración (contrato, 200/404/413, multi-tenant,
regresión call-site) reportados por el subagent, no re-ejecutados
directamente por el conductor en este pase (requieren Postgres de test
— se verificarán en Build and Test, próxima etapa, con el contenedor
Docker temporal ya establecido como convención del proyecto).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T19:45:39Z
**Iteration:** 1

### Findings

| #   | Severity                          | Location                                                       | Finding                                                                                                                                               | Recommendation                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido)                 | `_read_image_with_retry()`, `traceability.json` (`NFR-PERF-3`) | Faltaba logging de duración por-llamada a `get_object()`, que `performance-requirements.md` exige explícitamente como parte del requisito NFR-PERF-3. | **Corregido**: se agregó `logger.info("catalog_export.image_read duration_ms=...")` alrededor de cada llamada a `get_object()` en `_read_image_with_retry()` (medido con `time.monotonic()`), verificado en los logs de test. `traceability.json` actualizado para apuntar a `export_catalog_client_format.py` (donde vive la instrumentación real).                                            |
| 2   | Minor (corregido)                 | `csv_export.py::build_client_format_row()`                     | `price_cents / 100` sin formato de decimales fijos.                                                                                                   | **Corregido**: `f"{price_cents / 100:.2f}"` — 2 decimales fijos.                                                                                                                                                                                                                                                                                                                                |
| 3   | Minor (documentado, no corregido) | `export_catalog_client_format.py::_read_all_images()`          | Acceso a `CSVImageMapper._sanitize_filename()` (prefijo `_`) desde otra clase.                                                                        | No corregido en este pase — exponer el método sin guion bajo cambiaría la superficie pública de `CSVImageMapper`, una clase compartida con el flujo de import (bulk-upload), que está fuera del alcance de este intent. El acoplamiento funciona hoy sin riesgo real (no hay name-mangling); se deja como deuda menor documentada en vez de tocar una clase compartida por un cambio cosmético. |

### Summary

El fix del bug BR2.3 (`color=attrs.get("exterior_color")` en `product_router.py:694`) está confirmado y corrige ambos endpoints. Cap de 500→413, semáforo de 20, retry 1+backoff 200ms, sanitización anti zip-slip, tenant scoping estricto vía JWT, jerarquía de excepciones, y las 24 columnas del CSV en el orden exacto están todos implementados y testeados correctamente contra el código real. Los 2 hallazgos corregibles (1 Major, 1 Minor) se corrigieron antes de abrir el gate y se re-verificaron en vivo (`pytest`/`ruff`/`pyright` en verde); el tercero (Minor) se documenta como deuda aceptada por afectar una clase compartida fuera de alcance.
