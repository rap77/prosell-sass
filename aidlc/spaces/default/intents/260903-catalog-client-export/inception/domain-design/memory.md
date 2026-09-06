<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T12:45:00Z — El reviewer marcó NOT-READY (Critical: traceability con OK sin realización real para 2 de 3 historias; Major: sensor upstream-coverage fallando por falta de citas explícitas de archivo; Minor: atributos de Product incompletos). Se corrigieron los tres directamente (sin preguntar al humano, son correcciones mecánicas/objetivas) ANTES de intentar abrir el gate — evitando el patrón de deadlock GATE_REJECTED↔review-freeze visto en User Stories, ya que acá nunca se llegó a registrar el verdict NOT-READY ni a abrir el gate antes de corregir.
- 2026-09-05T12:45:00Z — Usar `--retry-pending` sobre la MISMA iteración para re-basear el fingerprint tras cada corrección (en vez de avanzar a iteración 2) evitó tener que gastar el segundo iteration budget de este stage (`reviewer_max_iterations: 2` en el stage file) — quedó un iteration de margen sin usar.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
