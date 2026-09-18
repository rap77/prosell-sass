<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-16T10:46:22Z — el piso de test #4 de team-practices.md (CATEGORY_TRANSLATION_TABLE) no genera historia de usuario propia, mismo criterio ya aplicado a FR3/FR4/FR5 (sin interacción de usuario nueva) — marcado explícitamente N/A en traceability.json bajo `reverse[]` en vez de forzar una historia artificial.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-16T10:46:22Z — design encontró que US1.2 (sincronización del editor de schema) atribuía la acción al Admin de Dealership, pero el editor de schema de categorías está gateado a Platform Admin (`super_admin`) en el código real (`_require_platform_admin()`, tests de auth) — se corrigió agregando Platform Admin como persona secundaria y reasignando US1.2, sin volver a preguntarle al humano (corrección factual verificada contra código, no un judgment call).

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
