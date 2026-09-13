# Performance Validation — Questions

## Clarifying Questions

**[Q1] ¿Cuáles son los patrones de tráfico esperados (steady state, peak, burst)?**

Este endpoint (`export-client-format.zip`) es de uso administrativo
manual, no un endpoint de tráfico de usuarios finales — un admin lo
dispara ocasionalmente (no hay patrón de carga sostenida ni picos
concurrentes esperados por diseño, per `performance-design.md` de u1).

A. Bajo volumen, invocación manual ocasional — sin carga concurrente esperada
B. Alto volumen / tráfico sostenido
[Answer]: A. Bajo volumen, invocación manual ocasional — sin carga concurrente esperada

**[Q2] ¿Cuáles son los percentiles de latencia objetivo (p50, p95, p99)?**

Del NFR-PERF-4 ya fijado en `nfr-requirements/performance-requirements.md`
de `u1`: el modo "todas las organizaciones" debe completar en menos de
18s (sin percentil específico — es un target único de operación
manual, no un SLO de tráfico).

A. Usar el target ya fijado (< 18s para el modo "todas")
B. Redefinir el target acá
[Answer]: A. Usar el target ya fijado (< 18s para el modo "todas")

**[Q3] ¿Qué throughput debe sostener el sistema?**

N/A — no es un endpoint de throughput sostenido (ver Q1). Sin target
de RPS.

A. Sin target de throughput (uso manual, no sostenido)
B. Definir un target de RPS
[Answer]: A. Sin target de throughput (uso manual, no sostenido)

**[Q4] ¿Dónde están los cuellos de botella probables?**

Ya identificados en `performance-design.md`/`code-summary.md` de `u1`:
(1) lectura secuencial de imágenes por producto (mitigado con semáforo
de 20 concurrentes, sin cambio de este intent), (2) el ZIP completo se
arma en memoria antes de streamear (NFR3, riesgo residual aceptado, no
mitigado en este intent), (3) la resolución batch de `org_code`
(`get_by_ids`, ya una sola query, sin N+1).

A. Los 3 ya identificados en diseño — sin cuello de botella nuevo a investigar
B. Hay un cuello de botella adicional a investigar
[Answer]: A. Los 3 ya identificados en diseño — sin cuello de botella nuevo a investigar

## Hallazgo real — limitación de datos en staging

**Staging tiene solo 1 producto `published` en 1 organización** en el
momento de este stage (verificado en vivo, `docker exec
prosell-staging-api` contra la DB real de staging). Esto hace
IMPOSIBLE validar de forma honesta el target NFR-PERF-4 (18s a escala
de plataforma real) o los targets NFR-PERF-1..3 (latencia de lectura de
imagen bajo concurrencia real) — cualquier medición contra el volumen
actual de staging mediría "1 producto es rápido", no si el sistema
sostiene el target a escala real.

**Decisión**: se corrió una medición REAL (no simulada) contra el
código y la DB reales de staging para confirmar que el camino de
código completo ejecuta correctamente end-to-end (sin mockear nada más
que el almacenamiento de imágenes, que falla limpiamente por falta de
credenciales reales en esta sonda) — esto confirma corrección
funcional a escala real, pero NO reemplaza una validación de carga
genuina. Documentar el gap explícitamente en vez de fabricar un "PASS"
sin sustento es la decisión correcta acá — sembrar datos sintéticos a
escala de plataforma para validar 18s de verdad queda fuera de alcance
de este Bolt (no fue autorizado ningún trabajo de seed de datos).

## Consolidated Summary Confirmation

Plan: documentar la medición real de latencia a escala actual (N=1,
ambos modos) como piso informativo, marcar NFR-PERF-4/NFR-PERF-1..3
como "no validable a escala real con los datos actuales de staging"
(no como PASS ni FAIL fabricado) en `nfr-validation-matrix.md`, y dejar
la validación real de carga como trabajo futuro explícito (sembrado de
datos sintéticos + `k6`/Locust), no resuelto en este intent.

[Answer]: Looks correct
