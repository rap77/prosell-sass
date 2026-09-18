# Performance Requirements — U1 (`u1-vehicle-catalog-api`)

Basado en `functional-spec.md`, `rules.md` (BR1.1, BR1.4) y `contract-summary.md`.

## NFR-PERF-1: Reconciliación no agrega latencia observable al decode de VIN

- **Target**: `FacebookVehicleValueCatalog.reconcile()` es un lookup en memoria (diccionario estático) — el presupuesto de latencia de `POST /vehicles/decode-vin` (Contrato 1) sigue dominado por la llamada a NHTSA (ya existente, sin cambios), no por la reconciliación nueva.
- **Justificación**: no hay una NFR de inception que fije un número de referencia para este endpoint — el target es "no degradar" el comportamiento ya en producción, no un target nuevo desde cero.
- **Benchmark de aceptación**: comparar la latencia p50/p95 de `POST /vehicles/decode-vin` antes y después de este intent en Build and Test — la diferencia debe ser no significativa (lookup en memoria de ~9 campos).

## NFR-PERF-2: Endpoint de opciones canónicas responde sin llamadas externas

- **Target**: `GET /categories/facebook-values/{field_key}` (Contrato 2) resuelve enteramente en memoria — sin llamada a base de datos ni a un servicio externo.
- **Benchmark de aceptación**: sub-10ms de trabajo propio, medido con un test unitario de nivel de función sobre `get_options()`/`reconcile()` (timing directo sobre la llamada, sin pasar por HTTP) — no una medición end-to-end vía HTTP, que mezclaría overhead de red/framework ajeno a este componente.
