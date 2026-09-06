# Performance Requirements — u2-catalog-export-ui

`requirements.md` no define ningún NFR de performance para este intent
— los targets de esta sección son originados en esta etapa, sin
`NFR{n}` de inception del que heredar un sub-número (mismo caso que
`performance-requirements.md` de `u1-catalog-export-api`). Este archivo
cubre la responsividad de la INTERFAZ — el tiempo del request HTTP en sí
(`GET /api/v1/products/export-client-format.zip`) ya está cubierto en
`performance-requirements.md` de `u1-catalog-export-api` (NFR-PERF-1/2).

## Targets

| ID            | Métrica                                                                                         | Target  | Percentil | Condición                                                                                     | Método de medición                            |
| ------------- | ----------------------------------------------------------------------------------------------- | ------- | --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| NFR-PERF-UI-1 | Apertura del banner de resumen (`ExportSummaryBanner`) tras clic en el ítem de menú             | < 100ms | p95       | `count` ya computado client-side, sin request de red (`functional-spec.md` § Workflow Paso 2) | Medición manual/perfilado en `build-and-test` |
| NFR-PERF-UI-2 | Transición a estado `loading` de `ExportClientFormatButton` tras confirmar el `window.prompt()` | < 100ms | p95       | Reacción inmediata de UI antes de que el request HTTP complete                                | Igual método                                  |
| NFR-PERF-UI-3 | Renderizado del toast de resultado (éxito/error) tras recibir la respuesta del endpoint         | < 100ms | p95       | Medido desde que la respuesta HTTP llega hasta que el toast es visible                        | Igual método                                  |

Estos targets son estándar de responsividad de interfaz (percepción de
"instantáneo" para el usuario, `ux-guide.md`) — no dependen del tamaño
del catálogo ni del cap de recursos (`u1-catalog-export-api`, NFR3.1),
que solo afecta la duración del request HTTP en sí, ya cubierta aparte.

## Fuente

Deriva de `functional-spec.md` § Máquina de estados de UI (Functional
Design de este mismo Unit) — sin NFR de origen en `requirements.md`.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T17:50:20Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                                                                             | Finding                                                                                                                                               | Recommendation                                                                                                                                                                                 |
| --- | ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `performance-requirements.md`, `security-requirements.md`, `tech-stack-decisions.md` | `contract-summary.md` (declarado en `consumes:`) nunca se citaba por nombre de archivo, pese a fijar el contrato de error que U2 consume y renderiza. | **Corregido**: se agregó una cita explícita en `security-requirements.md` al contrato `ProductErrorResponse` de `contract-summary.md`.                                                         |
| 2   | Minor (corregido) | `security-requirements.md` fila "Tampering"                                          | La fila decía que el input de `window.prompt()` "solo afecta el nombre sugerido", cuando en realidad se usa como nombre real del archivo descargado.  | **Corregido**: reescrita para reflejar que el valor SÍ se usa como nombre real, aclarando por qué el riesgo igual es despreciable (el atributo `download` del navegador no ejecuta contenido). |

### Summary

Los 4 `N/A` de `traceability.json` son legítimos: los IDs `NFR1.1`, `NFR1.2`, `NFR2.1` y `NFR3.1` citados como cubiertos por `u1-catalog-export-api` existen literalmente en los artefactos ya-`READY` de ese Unit, y el `N/A` de NFR4 es consistente con la convención ya afirmada de equipo (piso de test se enforce en Build and Test). Los targets de `NFR-PERF-UI-1/2/3` son razonables y están correctamente diferenciados del tiempo del request HTTP (responsabilidad de U1). Los 2 hallazgos (1 Major, 1 Minor) eran mecánicos/objetivos — una cita ausente y una imprecisión de redacción — corregidos antes de abrir el gate.
