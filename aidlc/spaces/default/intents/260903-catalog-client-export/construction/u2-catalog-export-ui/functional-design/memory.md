<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T15:35:00Z — `count` de `ExportSummaryBanner` se resolvió como client-side (lista ya cargada en `catalog/page.tsx`, sin endpoint de conteo nuevo) — decisión de bajo riesgo tomada directo sin volver a preguntar al humano, porque no contradice ninguna decisión previa y evita sobre-ingeniería (agregar un endpoint nuevo solo para un conteo ya disponible en memoria del cliente).
- 2026-09-05T15:35:00Z — Reviewer advisory devolvió NOT-READY con 4 hallazgos Major, todos mecánicos/objetivos (2 eran citas de fuente ausentes/desactualizadas — una porque el reviewer no tenía visibilidad de una decisión ya tomada en u1, fuera de su scope de lectura por diseño). Se corrigieron los 4 directo antes de abrir el gate, sin presentar el NOT-READY al humano — quinta reconfirmación de este patrón en el intent, y la primera vez que incluye un caso donde el reviewer carecía de contexto cross-unit por el propio diseño del scope de lectura (§12a) — vale la pena que el conductor tenga presente esta clase de falso-positivo al despachar reviewers per-unit.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
