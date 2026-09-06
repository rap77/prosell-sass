<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-05T22:40:00Z — Test Strategy standard exige solo `integration-test-instructions.md` por defecto; se decidió NO generar `performance-test-instructions.md`/`security-test-instructions.md` pese a que existen NFR de ambas clases, porque ya tienen tests dedicados escritos y verificados en Code Generation — generarlos sería ceremonia redundante, no cobertura nueva.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-05T22:41:00Z — El proxy BFF genérico de Next.js (`route.ts`) tenía su lógica blob-vs-JSON correcta pero SIN NINGÚN test que la ejercitara para respuestas binarias, ni siquiera para el CSV existente (`export.csv`), pese a que el equipo ya sufrió dos bugs reales de esta clase exacta. Se agregó el test faltante en este stage (AC1.1.9 lo exige explícitamente "de punta a punta a través del proxy"). Candidato a regla general: cualquier endpoint nuevo con content-type no-JSON debería traer su propio test de proxy, no solo confiar en que la lógica genérica "ya está arreglada".
