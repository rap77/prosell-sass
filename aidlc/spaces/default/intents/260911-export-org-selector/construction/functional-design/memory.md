<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-11T00:00:00Z — resolví las 3 Open Questions heredadas de Requirements/User Stories/Refined Mockups en esta etapa (gating sin chequeo propio, org borrada tratada como catálogo vacío, fallback de nombre genérico) — es el lugar correcto para cerrarlas antes de Code Generation.
- 2026-09-11T00:00:00Z — traceability.json usa status N/A (no OK) para las 11 ACs, con target apuntando a secciones de functional-spec.md/frontend-components.md en vez de BRx.y — Unit kind ui no produce rules.md, mismo patrón ya confirmado en Domain Design de 260829-auth-navigation-refactor, aplicado ahora también en Functional Design.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
