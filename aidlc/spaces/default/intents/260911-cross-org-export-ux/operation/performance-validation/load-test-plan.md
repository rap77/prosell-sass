# Load Test Plan — 260911-cross-org-export-ux

## Alcance

Targets NFR-PERF-1..5 y NFR-REL-1 de
`construction/u1-cross-org-export-api/nfr-requirements/performance-requirements.md`
y `nfr-design/performance-design.md` — en particular NFR-PERF-4
(modo "todas las organizaciones" < 18s).

## Perfil de tráfico (Q1)

Endpoint administrativo de invocación manual, no de tráfico de
usuarios finales — sin patrón de carga sostenida ni picos concurrentes
por diseño (`performance-design.md`). El plan de carga original
(`k6`/Locust contra un entorno production-like, per
`nfr-validation-methods.md`) se descarta como sobre-ingeniería para
este perfil de uso; en su lugar, el plan real ejecutado fue una
medición directa del camino de código contra la DB real de staging.

## Limitación real encontrada

Staging tiene **1 producto `published` en 1 organización** en el
momento de este stage (verificado en vivo). Sembrar datos sintéticos a
escala de plataforma (cientos/miles de productos en decenas de
organizaciones) para validar genuinamente NFR-PERF-4 bajo carga real
queda **fuera de alcance de este Bolt** — no fue un requerimiento
autorizado de este intent, y hacerlo ahora sería expandir el alcance
sin aprobación.

## Ejecución real

`ExportCatalogClientFormatUseCase.execute()` invocado directamente
(vía `docker exec prosell-staging-api python3`) contra la conexión real
a la base de datos de staging, para ambos modos (puntual y "todas las
organizaciones"), midiendo `time.monotonic()` de punta a punta — sin
mockear la DB ni los repositorios, solo el servicio de almacenamiento
de imágenes (que falla limpiamente por falta de credenciales reales en
esta sonda, sin afectar la medición del resto del pipeline).

Ver `test-results.md` para los resultados y `nfr-validation-matrix.md`
para el veredicto contra cada NFR.
