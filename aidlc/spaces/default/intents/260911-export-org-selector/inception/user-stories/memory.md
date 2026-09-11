<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-11T00:00:00Z — decidí Execute (no Skip) para este stage pese a que la implementación resultante es mínima — el cambio es user-facing con reglas condicionales testeables (permiso, mensaje de error distinto), no encaja en ninguna categoría de skip del stage file.
- 2026-09-11T00:00:00Z — aprendí (por error, ver Deviations) que este stage también exige la Consolidated Summary Confirmation ANTES del gate final, aunque el propio stage file (Step 7) diga "proceed immediately to generation" — el frontmatter `summary_confirmation: required` prevalece y el tool de gate-start lo hace cumplir mecánicamente.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-11T00:00:00Z — intenté abrir el gate sin la Consolidated Summary Confirmation (siguiendo literalmente el Step 7 del stage file, que no la menciona) — el tool `gate-start` la exigió igual, tuve que agregarla post-hoc resumiendo TODO el resultado de la ronda de mob antes de poder abrir el gate. Mismo patrón que ya pasó en Requirements Analysis de este mismo intent.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-11T00:00:00Z — la Consolidated Summary Confirmation exige un native-tool write POSTERIOR en LOS CUATRO produces[] (no solo el artefacto que edita el reviewer) — despachar el reviewer antes de re-guardar los otros 3 produces[] (personas.md, traceability.json, assessment.md) crea un deadlock real entre gate-start (exige el write) y review-freeze (bloquea el write una vez hay un veredicto terminal). Resuelto vía Request Changes formal (`reject` acepta estado "in-progress", no solo "awaiting-approval") — no hacía falta ningún bypass de env var. Regla para la próxima vez: re-guardar/tocar TODOS los produces[] inmediatamente después de la confirmación, ANTES de despachar cualquier reviewer.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-11T00:00:00Z — 3 notas no-bloqueantes quedan para Functional Design: (1) comportamiento cuando `viewingOrgId` apunta a una organización borrada/inaccesible, (2) fallback de texto cuando el nombre de organización no está en cache al momento del 404, (3) confirmado explícitamente que el nombre de archivo NO cambia (descartado en Q3, no es una nota diferida sino una decisión cerrada).
