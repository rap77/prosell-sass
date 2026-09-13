# Performance Test Results — 260911-cross-org-export-ux

## Medición real contra staging (N=1, piso informativo)

Ejecutado en vivo vía `docker exec prosell-staging-api python3` contra
la conexión real a `prosell-staging-db` (commit `4dd7bcd2` ya
desplegado).

| Modo                                                  | Organizaciones | Productos | Duración   | Resultado                         |
| ----------------------------------------------------- | -------------- | --------- | ---------- | --------------------------------- |
| Puntual (`organization_id=<real>`)                    | 1              | 1         | **0.283s** | Completa correctamente, sin error |
| "Todas las organizaciones" (`all_organizations=True`) | 1              | 1         | **0.324s** | Completa correctamente, sin error |

Ambos modos ejecutan el camino de código real (query de productos,
resolución batch de `org_code` vía `get_by_ids`, traducción de
categoría, armado de filas CSV) contra la base de datos real de
staging, sin mockear nada de la capa de dominio/aplicación — solo el
servicio de almacenamiento de imágenes, que falla limpiamente
(`StorageReadError`, capturado por `_read_image_with_retry`, NFR-REL-1
ya verificado en Code Generation) por falta de credenciales reales en
esta sonda puntual, sin abortar el export.

## Por qué esto NO es una validación de carga

El target NFR-PERF-4 (< 18s) es para el modo "todas" **a escala real
de plataforma** — decenas/cientos de organizaciones, cientos/miles de
productos. Con N=1 en ambos lados, esta medición confirma
**corrección funcional end-to-end**, no que el sistema sostenga el
target bajo el volumen real que el NFR describe. Reportar esto como
"PASS" del NFR sería una afirmación fabricada sin sustento.

## Cuellos de botella (Q4, ya identificados en diseño, sin cambio)

1. Lectura secuencial de imágenes por producto — mitigado con
   semáforo de 20 concurrentes (`nfr-design/performance-design.md`,
   sin cambio de este intent).
2. ZIP completo armado en memoria antes de streamear (NFR3, riesgo
   residual aceptado, no mitigado).
3. Resolución batch de `org_code` — ya una sola query
   (`get_by_ids`), sin N+1 (verificado en Code Generation con
   `assert_called_once()`).

Ninguno de los tres tiene evidencia bajo carga real en este stage —
la lista es la misma que ya estaba documentada en diseño, sin
confirmación nueva de comportamiento a escala.

## No ejecutado en este stage

- Load test real (`k6`/Locust) a escala de plataforma — requiere
  sembrado de datos sintéticos, fuera de alcance de este Bolt (ver
  `load-test-plan.md`).
- Validación de auto-scaling — no aplica (`docker compose` en
  staging, sin auto-scaling configurado).
