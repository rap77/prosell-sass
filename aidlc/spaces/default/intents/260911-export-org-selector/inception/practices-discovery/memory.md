<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-11T00:00:00Z — re-run sobre baseline extensa ya afirmada; las 3 revisiones ciegas coincidieron sin objeción (0/3 OBJECT), por lo que la entrevista se acotó a UNA pregunta (piso mínimo de test puntual) en vez de re-preguntar las 5 secciones completas.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-11T00:00:00Z — devsecops señaló que el guard de UI usa `isAdmin` (proxy de rol) en vez del permiso puntual `ORG_ADMIN_VIEW_ALL` — no es un gap de seguridad (el backend audita/autoriza igual), pero conviene que Requirements/Functional Design fije que el gating chequee el permiso directamente. No se resolvió acá, queda para esa etapa.
- 2026-09-11T00:00:00Z — developer señaló ambigüedad de ubicación de carpeta (`components/admin/` vs. el flujo `(seller)/catalog/`) si se reutiliza `OrganizationPicker`, y la ambigüedad ya conocida de ubicación de test para `catalog/page.tsx` (co-located vs. `tests/components/`) — ninguna se resolvió acá, quedan para Requirements/Functional Design.
