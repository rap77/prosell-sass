<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-31T22:53:00Z — Se generaron 4 preguntas (piso del Depth Minimal activo para scope bugfix), no más, porque el reverse-engineering enfocado ya había resuelto la mayoría de las ambigüedades técnicas (alcance del useEffect, gap fetchWithAuth, triangulación de errores) — consistente con el aprendizaje ya persistido en project.md.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-31T22:53:00Z — Las 4 respuestas del usuario convergieron todas en la opción "A" (alcance mínimo, useMutation con guard, client component sin separar, preservar ApiError) — se priorizó consistentemente el fix más acotado sobre expandir el bugfix a deuda técnica adyacente ya conocida.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-31T22:53:00Z — El reviewer advisory señaló que FR2.4 y OQ1 duplican la misma pregunta del supresor ESLint — evaluar si consolidarlos en una edición futura del artefacto (hallazgo menor, no bloqueante).
