<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-31T22:15:00Z — Interpretamos que el defecto de `AGENTS.md:333` cubre únicamente el `useEffect` de mount en `onboarding/page.tsx` e `invite/[token]/page.tsx`; `handleStep1`/`completeSetup` (llamadas imperativas por click en `onboarding/page.tsx`) son candidatas naturales a `useMutation` pero no son la violación en sí — se documentó como pregunta abierta de alcance para Requirements Analysis, no se decidió acá.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-31T22:15:00Z — Store previo estaba STALE (cubría archivos Tailwind/config no relacionados del intent 260831). Se hizo scan enfocado (no full rescan) y se mergeó con el codekb existente en vez de reemplazarlo, marcando `kind: partial` — consistente con el aprendizaje ya afirmado en project.md para scans enfocados.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-31T22:15:00Z — Se priorizó velocidad (scan enfocado) sobre cobertura total del repo; el costo es que el store queda `partial` y el resto del repo depende de conocimiento previo no re-verificado en este pase.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-31T22:15:00Z — `orgApi.ts`/`teamApi.ts` no usan `fetchWithAuth` (sin refresh-on-401 hoy). Envolver en React Query sin arreglar esto preserva el gap — Requirements Analysis debe decidir explícitamente si entra en alcance de este bugfix o se documenta como deuda separada.
- 2026-08-31T22:15:00Z — `invite/[token]/page.tsx` hace branching de error por `error.message.toLowerCase().includes(...)` y `error.status === 401` (shape `ApiError`, no tipado). Cualquier `useMutation` debe preservar ese shape o el branching se rompe — no se puede copiar el patrón de `notificationsApi.ts` (que descarta el detalle del error en un `Error` genérico) sin romper la UX.
