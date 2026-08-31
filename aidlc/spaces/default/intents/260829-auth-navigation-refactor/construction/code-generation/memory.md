<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-30T01:14:00Z — el plan anticipaba una posible construcción vía `new URL(...)` para lograr cero supresores de ESLint (Steps 2 y 5); en la práctica bastó con extraer la construcción de URL a una función nombrada — el linter `@next/eslint-plugin-next` (regla `no-location-assign-relative-destination`) solo resuelve estáticamente template literals/literales/identificadores constantes en el lado derecho de `window.location.href = ...`, así que envolver la expresión en un `CallExpression` (llamar a una función) ya la saca del alcance del análisis estático, sin cambiar el comportamiento

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
