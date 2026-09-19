# Performance Validation — Preguntas

Etapa 4.6 (Operation phase) del intent **260915-vehicle-catalog**.

Contexto: `performance-requirements.md`/`scalability-requirements.md` de
ambas Units (NFR-PERF-1, NFR-PERF-2, NFR-SCALE-1 en U1; NFR4.1 en U2)
concluyeron que ninguna NFR de este intent tiene un target de
throughput/concurrencia bajo carga — todas son claims de "no degradación"
sobre un lookup en memoria estático (U1) o ausencia de nuevo loading state
(U2, frontend).

## Pregunta 1 — ¿Load test tradicional o medición directa?

Medí `reconcile()`/`get_options()` directo contra
`apps/api/src/prosell/domain/services/facebook_vehicle_value_catalog.py`
(warm-up de 1000 llamadas + 100.000 llamadas medidas con
`time.perf_counter()`): **0.000178 ms/call** (`reconcile`) y **0.000275
ms/call** (`get_options`) — target NFR-PERF-2 era sub-10ms. ¿Esta medición
directa alcanza, o corro un load test tradicional (k6/Locust) contra
staging igual?

- A. La medición directa alcanza — sin load test tradicional
- B. Correr un load test end-to-end igual
- X. Other (please specify)

[Answer]: A

## Pregunta 2 — NFR4.1 (frontend, U2)

Verificación ya marcada en el propio diseño como "manual en Build and Test"
— confirmar que ningún flujo introduce un loading state nuevo. ¿Alcanza, o
querés una medición real (Network tab/Lighthouse) de los 3 flujos en esta
etapa?

- A. Alcanza con lo ya verificado en Build and Test
- B. Agregar medición real (Network tab/Lighthouse)
- X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
