<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-16T02:14:26Z — el reviewer advisory de esta etapa devolvió NOT-READY (1 Critical, 2 Major, 1 Minor). Intenté pedir una segunda review (`--iteration 2`) para re-verificar tras corregir los hallazgos mecánicos y responder el follow-up (Q8) — el tool la rechazó ("review request 2 exceeds this stage's review budget (1)"): el mecanismo de "recovery" de `aidlc-log.ts review` (`scopeStale`/`sourceStale`) es para staleness de FUENTE de workspace (stages `workspace_requires`), no para "edité el produces[] después del veredicto". Para un review advisory (presupuesto=1), NO existe una segunda pasada real tras un NOT-READY salvo pasar por el gate (Request Changes → GATE_REJECTED resetea el floor de conteo, recién ahí `--iteration 1` de nuevo es válido). Lo correcto en este caso: re-basear el fingerprint con `--retry-pending` sobre la MISMA iteración (1) y registrar el veredicto tal cual quedó escrito en el archivo (NOT-READY), aunque ya se hayan aplicado correcciones — nunca inventar un READY unilateral. Presentar los hallazgos originales en el gate junto con las correcciones ya aplicadas, y dejar que el humano decida Approve o Request Changes.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
