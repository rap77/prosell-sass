<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-20T22:35:00Z — Asumido que el derivado thumbnail 600×600 cae al fallback `image_urls[0]` para productos legacy sin `cover_image_key` poblada — el usuario no abrió Q1 sobre backfill explícito, se documenta en A5 y OQ1 en vez de repreguntar.
- 2026-09-20T22:35:00Z — Asumido que el routing CDN aplica también a URLs de galería (no solo al thumbnail) para consistencia de superficie privada; documentado en FR3.3.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
