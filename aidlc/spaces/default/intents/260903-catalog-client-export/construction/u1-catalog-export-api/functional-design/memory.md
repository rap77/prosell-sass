<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T14:05:00Z — El humano eligió agregar get_object() al puerto IDOSpacesService (Q1) en vez de la opción recomendada (httpx directo) — diverge de la recomendación del lead, pero es una decisión legítima del equipo (evita depender de que las image_urls sean públicamente accesibles). Se documentó como decisión explícita, no como corrección de un error.
- 2026-09-05T14:16:30Z — Reviewer advisory devolvió READY con 2 Major + 2 Minor, todos mecánicos/objetivos (cita de consumes ausente, cita de fuente inexacta, nota de doble-reclamo de AC faltante, fit de target débil). Se corrigieron los 4 directo antes de abrir el gate — cuarta reconfirmación de este patrón en el intent (Domain Design, Units Generation, Contract Design, ahora Functional Design de U1).

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-05T13:58:00Z — Se agregó una regla nueva (BR1.5, respuesta = único ZIP combinado con headers correctos) que no estaba en el borrador original de rules.md, para poder trazar AC1.1.1/AC1.1.9 contra un BRx.y concreto — entities.md/rules.md no tienen requisito de "1:1 con FR/NFR de arriba", así que agregar una regla derivada del AC directamente es válido.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
