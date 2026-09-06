<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T22:30:00Z — el shape real del body de error 413/404 (`{"detail": "<string>"}`, `HTTPException(detail=str(e))`) difiere del que `unit-test-instructions.md` asumía (`detail.message`); se reutilizó el util ya existente `extractErrorMessage(body, fallback)` en vez de escribir un parser nuevo, por ser la convención ya vigente en `products.ts`.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-05T23:05:00Z — `ExportSummaryBanner` perdió su prop `count` y el gate de "catálogo vacío" client-side: el reviewer encontró que `functional-spec.md` asumía "el catálogo completo ya está en memoria del lado del cliente", una premisa falsa contra el código real (`useInfiniteProducts(apiFilters, 50)` siempre filtrado+paginado). El humano eligió resolverlo quitando el conteo por completo — el banner es ahora una confirmación simple, y el caso de catálogo vacío lo cubre el 404 real del backend (ya implementado). Ver `code-generation/code-summary.md` § "Resolución del hallazgo #1".

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; la team is unit-first and the domain is well-understood -->

- 2026-09-05T22:20:00Z — se agregó un `catch` de red al handler de export (fallo de fetch, ej. sin conexión) que el plan no pedía explícitamente — se prefirió sobre dejarlo como unhandled rejection, siguiendo el mandate de equipo Q6 de manejo de errores centralizado en frontend, aplicado a código nuevo.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-05T23:10:00Z — el `plan-approval-guard` exige un archivo físico `code-generation-questions.md` con una sección `## Plan Approval`, `[Answer]: Approve Plan` y `[Approval Fingerprint]: sha256:...` calculado por `approvalFingerprint(plan, instructions, contractHash)` — no alcanza con registrar la aprobación vía `aidlc-log.ts answer`/`decision`. Esto no estaba documentado en ningún memory file de equipo/proyecto y bloqueó el dispatch dos veces en esta sesión; candidato a persistir como aprendizaje de proceso.
