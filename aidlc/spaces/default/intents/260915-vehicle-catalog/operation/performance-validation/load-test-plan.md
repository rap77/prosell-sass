# Load Test Plan — Intent 260915-vehicle-catalog

## Resumen

Sin load test tradicional (k6/Locust contra un ambiente production-like).
Confirmado con el humano (Q1): ninguna NFR de este intent tiene un target
de throughput/concurrencia real que justifique simular carga — todas son
claims de "no degradación" sobre estructuras estáticas en memoria
(`performance-requirements.md`/`scalability-requirements.md` de ambas
Units, `dashboards.md` de `observability-setup`).

## Por qué no aplica un load test tradicional

- **NFR-PERF-1/2 (U1)**: `reconcile()`/`get_options()` son lookups sobre un
  `dict` Python estático — sin I/O, sin llamada externa, sin recurso
  compartido que pueda saturarse bajo carga. `POST /vehicles/decode-vin`
  sigue dominado por la latencia de NHTSA (dependencia preexistente, sin
  cambios de este intent).
- **NFR-SCALE-1 (U1)**: `scalability-design.md` confirma explícitamente
  "sin proyección de crecimiento" — el catálogo cubre 9 campos con decenas
  de valores cada uno, mismo orden de magnitud que `category_translation.py`
  ya en producción sin problemas.
- **NFR4.1 (U2)**: los 3 flujos de frontend no introducen un estado de
  carga adicional al ya esperado para un fetch de red estándar — verificado
  manualmente en Build and Test.

## Método de verificación elegido en su lugar

Medición directa de función (no HTTP end-to-end, que mezclaría overhead de
red/framework ajeno al componente bajo prueba) — ver `test-results.md` para
los números reales medidos contra el código de producción.
