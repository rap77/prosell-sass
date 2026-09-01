<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-01T23:00:00Z — User Stories fue SKIPped para este scope bugfix, así que el Cross-Unit Final Coverage Gate se redujo a verificar solo FR/NFR contra traceability.json — no hay ACs de las que carecer, consistente con el aprendizaje ya persistido en project.md.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-01T23:00:00Z — No se generaron integration/performance/security-test-instructions.md (Test Strategy Minimal, sin NFR de performance/security en requirements.md) — reconfirma el aprendizaje ya persistido para este escenario exacto.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-01T23:00:00Z — Se re-verificó con git stash/pop que las 13 fallas pre-existentes de la suite completa son independientes de este cambio (ningún archivo tocado por este intent se relaciona con products.ts/reverseTransitions.ts/setProductCover.ts) — no se confió en la afirmación de "pre-existente" de sesiones anteriores sin re-confirmarla.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-01T23:00:00Z — El hallazgo advisory Major de Code Generation (posible doble-mutate() bajo React Strict Mode dev) sigue sin test automatizado — evaluar en un futuro intent si vale la pena simular el double-invoke de Strict Mode en el test harness, o directamente cambiar el guard a useRef como sugirió el reviewer.
