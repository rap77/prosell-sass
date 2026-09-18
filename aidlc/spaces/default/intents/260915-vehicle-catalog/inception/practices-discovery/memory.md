<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-16T01:30:00Z — la arquitectura de reconciliación entre el catálogo de decode de VIN (backend, inglés) y el catálogo de opciones del schema (frontend, español) quedó explícitamente abierta para Functional Design, con dos alternativas documentadas en evidence.md (domain service en backend vs. tabla TS compartida) — no resolverla por asunción en etapas posteriores sin volver a citar esa nota.
- 2026-09-16T01:30:00Z — la sanitización de fórmulas en el export CSV (afirmada en Q2) todavía no tiene mecanismo concreto elegido (prefijo de comilla simple vs. rechazo de valor vs. escapado) — Functional Design/Code Generation deben definirlo, no está resuelto acá.
