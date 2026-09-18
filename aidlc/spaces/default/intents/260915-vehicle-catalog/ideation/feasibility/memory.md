<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-15T22:18:38Z — la pregunta genérica del stage file sobre "qué servicios/cuentas de AWS están en uso" se reemplazó por una pregunta sobre la infraestructura real del proyecto (droplet self-hosted, Docker + GitHub Actions, sin AWS) — este proyecto no usa AWS, así que la pregunta stock no aplicaba tal cual.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-15T22:18:38Z — una pregunta multiSelect (Q2) presentada en el primer batch de AskUserQuestion volvió sin ninguna clave en la respuesta (ni siquiera un array vacío) cuando el usuario no marcó ninguna opción — hubo que re-presentarla en un batch aparte. Para preguntas multiSelect "opcionales" dentro de un batch, verificar explícitamente que cada pregunta enviada aparezca en la respuesta antes de asumir que fue respondida.
