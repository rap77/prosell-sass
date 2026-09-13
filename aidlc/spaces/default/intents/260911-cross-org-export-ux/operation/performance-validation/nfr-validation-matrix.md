# NFR Validation Matrix — 260911-cross-org-export-ux

Fuente: `construction/u1-cross-org-export-api/nfr-requirements/performance-requirements.md`,
`nfr-design/performance-design.md`, `nfr-design/reliability-design.md`.

| NFR                                                                                     | Target                                                                 | Medido (N=1)                                                                                            | Estado                         | Notas                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-PERF-1 (semáforo de concurrencia por imagen)                                        | 20 lecturas concurrentes máx.                                          | No ejercitado (0 imágenes leídas con éxito en esta sonda)                                               | **NO VALIDABLE A ESCALA REAL** | Ya verificado por lectura de código en Code Generation; requiere carga real con múltiples imágenes para confirmar el límite de 20 en la práctica. |
| NFR-PERF-2/3 (targets de latencia para catálogos chicos / lectura individual de imagen) | Sin medición específica fijada más allá del target agregado NFR-PERF-4 | 0.283s / 0.324s (N=1, sin imágenes reales)                                                              | **NO VALIDABLE A ESCALA REAL** | Ya diferido a esta etapa desde Code Generation; sigue diferido — requiere datos sintéticos.                                                       |
| NFR-PERF-4 (modo "todas" < 18s a escala de plataforma)                                  | < 18s                                                                  | 0.324s (N=1 producto, 1 organización)                                                                   | **NO VALIDABLE A ESCALA REAL** | El valor medido es genuino pero irrelevante para el target (que describe volumen de plataforma, no N=1). No se reporta como PASS.                 |
| NFR-PERF-5 (resolución batch de `org_code`, una sola query)                             | 1 query batch, sin N+1                                                 | Ya verificado en Code Generation (`assert_called_once()`)                                               | **OK**                         | Verificable estructuralmente sin necesitar carga — confirmado, no depende del volumen de datos.                                                   |
| NFR-REL-1 (fallo individual de imagen no aborta el export)                              | El export completa aunque una imagen falle                             | Confirmado en esta misma medición: `StorageReadError` en cada intento de lectura, export completó igual | **OK**                         | Confirmado en vivo contra staging real en este stage, más allá de lo ya cubierto por el test unitario de Code Generation.                         |
| NFR3 (riesgo de memoria, modo "todas")                                                  | Riesgo residual aceptado                                               | N/A — no es un target medible, es un riesgo documentado                                                 | **ACEPTADO**                   | Sin cambio — decisión de producto ya afirmada en `requirements.md`/`team.md`.                                                                     |

## Resumen

- **1 NFR confirmado por comportamiento real** (NFR-REL-1, fallo
  individual de imagen no aborta el export).
- **1 NFR confirmado estructuralmente** (NFR-PERF-5, sin necesitar
  carga).
- **3 NFR quedan explícitamente NO VALIDABLES a escala real** con los
  datos actuales de staging (NFR-PERF-1/2/3/4) — no se reportan como
  PASS ni FAIL, se documenta el gap honestamente.
- **1 riesgo aceptado sin cambio** (NFR3).

## Trabajo futuro (no resuelto en este intent)

Para validar genuinamente NFR-PERF-1..4 bajo carga: sembrar datos
sintéticos en staging a escala de plataforma (múltiples organizaciones
con decenas/cientos de productos e imágenes reales en storage) y correr
un load test real (`k6`/Locust) contra el endpoint HTTP completo. Esto
requiere autorización explícita como un intent/Bolt separado — no se
asume ni se ejecuta acá.
