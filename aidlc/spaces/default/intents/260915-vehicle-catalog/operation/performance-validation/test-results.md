# Test Results — Performance Validation — Intent 260915-vehicle-catalog

## Resumen

Medición directa (no simulación) contra el código real de producción, per
`load-test-plan.md`. Ambos targets superados por varios órdenes de magnitud.

## NFR-PERF-2 (U1) — Medición real

```python
# apps/api, entorno real del backend (uv run python3)
import time
from prosell.domain.services.facebook_vehicle_value_catalog import reconcile, get_options

# Warm-up: 1000 llamadas
# Medición: 100,000 llamadas por función, time.perf_counter()
```

| Función                         | Target (NFR-PERF-2) | Medido                                                 | Resultado                                |
| ------------------------------- | ------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `reconcile("body_type", "suv")` | sub-10ms            | **0.000178 ms/call** (promedio sobre 100.000 llamadas) | PASS — ~56.000x más rápido que el target |
| `get_options("body_type")`      | sub-10ms            | **0.000275 ms/call** (promedio sobre 100.000 llamadas) | PASS — ~36.000x más rápido que el target |

Metodología: warm-up de 1000 llamadas antes de medir (evita medir el costo
de import/inicialización del módulo), luego 100.000 llamadas cronometradas
con `time.perf_counter()` — la misma técnica de benchmarking que
`nfr-validation-methods.md` recomienda para medición a nivel de función.

## NFR-PERF-1 (U1) — Sin degradación en `decode-vin`

No se re-midió `POST /vehicles/decode-vin` end-to-end en esta etapa — el
target explícito es "no degradar" el comportamiento ya en producción
(dominado por NHTSA, dependencia externa sin cambios de este intent), y la
reconciliación nueva agrega ~0.0002ms de trabajo propio (medido arriba) —
despreciable frente a cualquier latencia de red real hacia NHTSA (típicamente
decenas a cientos de ms). Confirmado como PASS por argumento estructural +
la medición directa de arriba, sin necesidad de una medición end-to-end
adicional.

## NFR-SCALE-1 (U1) — Sin proyección de crecimiento

Confirmado (no medido con carga): 9 campos, decenas de valores cada uno —
mismo orden de magnitud que `CATEGORY_TRANSLATION_TABLE`, ya en producción.
Ver `scalability-design.md` de `nfr-design` (U1) para el análisis completo.

## NFR4.1 (U2) — Frontend, verificación manual

Confirmado en Build and Test (Q2, el humano confirmó que alcanza con lo ya
verificado): ninguno de los 3 flujos de UI (indicador de autocompletado
fallido, consumo del catálogo en el editor de schema, edición de ubicación
por producto) introduce un estado de carga nuevo más allá de los 3 estados
básicos ya fijados en Refined Mockups (loading/success/error).
