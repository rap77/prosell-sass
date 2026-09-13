<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-12T19:50:00Z — reusé sin cambio las dos decisiones de diseño ya aprobadas en 260903-catalog-client-export (semáforo de 20, retry 1x200ms) en vez de reabrirlas — el volumen techo (500) no cambia en este intent.

## Deviations

- 2026-09-12T19:50:00Z — ninguna respecto al stage file; se omitió el bloque interactivo de preguntas por no haber ambigüedad genuina.

## Tradeoffs

- 2026-09-12T19:50:00Z — elegí memoización lazy (dict poblado durante el loop) para el walk-up de vertical de categoría, en vez de un batch upfront de category_id distintos como el patrón de org_code — más simple, mismo efecto práctico, sin necesitar conocer el conjunto completo de categorías antes del loop.
- 2026-09-12T19:50:00Z — agregué NFR-PERF-6 (target de resolución de vertical cacheada) como budget de diseño local, sin promoverlo a un NFR de nfr-requirements — atiende la observación Minor del reviewer de esa etapa sin reabrir el artefacto ya READY de nfr-requirements.
- 2026-09-12T19:50:00Z — diseñé un único método de conteo parametrizado (organization_id opcional) para el cap, en vez de dos variantes separadas por-org/global — evita duplicación de query casi idéntica.

## Open questions

- 2026-09-12T19:50:00Z — ninguna.
