<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-12T00:00:00Z — usé status "N/A" (no "OK") para todas las ACs de traceability.json porque este Unit es kind:ui, sin rules.md/BRx.y — mismo patrón ya confirmado en 260829-auth-navigation-refactor y 260911-export-org-selector.

## Deviations

- 2026-09-12T00:00:00Z — esta vez SÍ registré la confirmación de resumen (decision+answer vía CLI) ANTES de dispatchear el reviewer §12a, corrigiendo el error de orden que causó un deadlock de tooling en u1-cross-org-export-api (ver memory.md de esa unit).

## Tradeoffs

- 2026-09-12T00:00:00Z — functional-spec.md incluye pseudocódigo TypeScript ilustrativo (derivación de organizationId, firma de exportCatalogClientFormat) en vez de solo prosa, porque el contrato exacto de contract-summary.md tiene detalles de tipos que la prosa sola podría transmitir ambiguamente — dentro del límite de ≤15 líneas por snippet del stage file.

## Open questions

- 2026-09-12T00:00:00Z — ninguna. El ícono (Q1) quedó resuelto (Layers).
