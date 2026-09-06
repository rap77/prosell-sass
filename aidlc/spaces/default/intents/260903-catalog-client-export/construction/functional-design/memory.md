<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T14:05:00Z — El humano eligió agregar get_object() al puerto IDOSpacesService (Q1) en vez de la opción recomendada (httpx directo) — diverge de la recomendación del lead, pero es una decisión legítima del equipo (evita depender de que las image_urls sean públicamente accesibles). Se documentó como decisión explícita, no como corrección de un error.

<!-- aidlc-wave-memory:u1-catalog-export-api:735218fc07728c632835462138ac7f01278916fa0a108d6403a4546bb6da757e -->

- 2026-09-05T14:16:30Z — Reviewer advisory devolvió READY con 2 Major + 2 Minor, todos mecánicos/objetivos (cita de consumes ausente, cita de fuente inexacta, nota de doble-reclamo de AC faltante, fit de target débil). Se corrigieron los 4 directo antes de abrir el gate — cuarta reconfirmación de este patrón en el intent (Domain Design, Units Generation, Contract Design, ahora Functional Design de U1).

<!-- aidlc-wave-memory:u1-catalog-export-api:4fb5f890b6ccf9f77265b45fb16cd0b4f20ad5c00adb2cfa625967cc326eeda1 -->

- 2026-09-05T15:35:00Z — `count` de `ExportSummaryBanner` se resolvió como client-side (lista ya cargada en `catalog/page.tsx`, sin endpoint de conteo nuevo) — decisión de bajo riesgo tomada directo sin volver a preguntar al humano, porque no contradice ninguna decisión previa y evita sobre-ingeniería (agregar un endpoint nuevo solo para un conteo ya disponible en memoria del cliente).

<!-- aidlc-wave-memory:u2-catalog-export-ui:6b484c7ffc26d64c8aae500033872b3d5e141150f808caf72ca226a62e84ae9e -->

- 2026-09-05T15:35:00Z — Reviewer advisory devolvió NOT-READY con 4 hallazgos Major, todos mecánicos/objetivos (2 eran citas de fuente ausentes/desactualizadas — una porque el reviewer no tenía visibilidad de una decisión ya tomada en u1, fuera de su scope de lectura por diseño). Se corrigieron los 4 directo antes de abrir el gate, sin presentar el NOT-READY al humano — quinta reconfirmación de este patrón en el intent, y la primera vez que incluye un caso donde el reviewer carecía de contexto cross-unit por el propio diseño del scope de lectura (§12a) — vale la pena que el conductor tenga presente esta clase de falso-positivo al despachar reviewers per-unit.

<!-- aidlc-wave-memory:u2-catalog-export-ui:ec1b06fbf1fa792b612a1930518bdc878c078f04f976c579465e454659d64a24 -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-05T13:58:00Z — Se agregó una regla nueva (BR1.5, respuesta = único ZIP combinado con headers correctos) que no estaba en el borrador original de rules.md, para poder trazar AC1.1.1/AC1.1.9 contra un BRx.y concreto — entities.md/rules.md no tienen requisito de "1:1 con FR/NFR de arriba", así que agregar una regla derivada del AC directamente es válido.

<!-- aidlc-wave-memory:u1-catalog-export-api:a1fdfd0b08e007fd097c2780f12038b5a23cf574d31d7ad35cd0bf7472f8969e -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
