<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-31T04:10:00Z — El developer scan encontró que el commit `624819e3` (mergeado en `main`, previo a este intent) ya extendió `theme.extend.spacing` en `apps/web/tailwind.config.ts` con `4.5`, `8.5`, `9.5` — las clases `h-9.5`/`px-4.5` en `privacy/page.tsx`, `terms/page.tsx`, `OnboardingStep3.tsx` y `AppointmentForm.tsx` ya son válidas y no son bug. El único archivo con clases genuinamente inválidas hoy es `apps/web/src/app/(seller)/publications/page.tsx` (nota: la ruta real usa el route group `(seller)/`, no `apps/web/src/app/publications/page.tsx` como asumía el brief inicial), con un patrón distinto no catalogado antes: `gap-1.25` (líneas 208, 488), `p-0.75` (479), `mt-0.25` (524), `mb-0.75` (594). Requirements Analysis debe re-confirmar el alcance del intent con el usuario antes de escribir requirements.md — probablemente se reduce de "5 archivos" a "1 archivo, 5 clases", y hay una ambigüedad de diseño a resolver (¿los decimales .25/.75 son intencionales o typos de valores enteros vecinos como `gap-1`, `p-1`, `mt-1`, `mb-1`?).
