<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-30T13:55:00Z — `aidlc-log.ts review --verdict` rechazó el primer intento de registrar el veredicto READY con "declared artifacts changed after REVIEW_REQUESTED" porque el reviewer había agregado su sección `## Review` a `requirements.md` (un artefacto `produces[]`) DESPUÉS de que se registró el REVIEW_REQUESTED inicial — el fingerprint hashea los bytes completos del archivo, sin excluir la sección que el propio reviewer agrega. Solución: re-ejecutar el mismo comando `review --iteration <n> --retry-pending` (sin `--verdict`) para re-basear el fingerprint sobre el contenido actual, y recién ahí registrar `--verdict READY`. Es un paso extra no explicitado como tal en `stage-protocol-reviewer.md`, pero el propio mensaje de error del tool lo indica.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
