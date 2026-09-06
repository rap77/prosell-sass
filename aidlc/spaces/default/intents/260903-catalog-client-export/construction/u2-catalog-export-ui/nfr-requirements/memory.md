<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T17:50:00Z — Reviewer advisory devolvió READY con 1 Major (cita ausente de contract-summary.md) + 1 Minor (imprecisión de redacción en fila STRIDE Tampering). Se corrigieron los 2 directo antes de abrir el gate.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-05T17:35:00Z — Los 4 NFR de inception (NFR1-NFR4) se marcaron N/A en traceability.json — U2 (kind: ui) no tiene responsabilidad propia de tenant scoping, zip-slip, cap de recursos ni piso de test arquitectónico; toda esa responsabilidad ya está cubierta por u1-catalog-export-api. Verificado por el reviewer contra los archivos ya-READY de ese Unit.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
