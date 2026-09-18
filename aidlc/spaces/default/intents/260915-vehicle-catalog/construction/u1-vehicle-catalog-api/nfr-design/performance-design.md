# Performance Design — U1 (`u1-vehicle-catalog-api`)

Basado en `nfr-requirements/performance-requirements.md` (NFR-PERF-1, NFR-PERF-2).

## Diseño: sin caché adicional

`FacebookVehicleValueCatalog` es un dict Python estático cargado en memoria al iniciar el proceso — ya es la estructura de datos óptima para un lookup O(1) por `field_key`. No hay justificación para una capa de caché adicional (Redis, in-process LRU, etc.) sobre una estructura que ya vive en memoria y no cambia en runtime.

## Presupuesto de latencia

- `reconcile(field_key, raw_value)` y `get_options(field_key)`: sub-10ms de trabajo propio (NFR-PERF-2), verificado con test unitario de función.
- `POST /vehicles/decode-vin`: sin cambio de presupuesto — sigue dominado por la latencia de NHTSA (NFR-PERF-1).
- `GET /categories/facebook-values/{field_key}`: sin llamadas externas, latencia dominada por overhead de framework/red, no por el lookup en sí.

Sin procesamiento asíncrono, pooling de conexiones, ni lazy loading aplicable — no hay recurso compartido ni I/O que justifique esos patrones para este Unit.
