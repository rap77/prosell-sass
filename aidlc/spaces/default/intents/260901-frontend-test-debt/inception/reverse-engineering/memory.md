<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-01T18:20:00Z — Interpreté "Fix pre-existing frontend unit tests debt (products.test.tsx and reverseTransitions.test.tsx)" como: arreglar los mocks de estos dos archivos para que reflejen el contrato real de `productSchema` (Zod), no como una sospecha de bug real en `apps/web/src/lib/api/products.ts`. La causa raíz es mecánica y ya está confirmada por `git log -S` + ejecución real de la suite (ver Deviations).

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-01T18:20:00Z — No hice un rescan completo del store de codekb (STALE, ver `team.md`/`project.md`) — el usuario ya había elegido scan enfocado en una etapa previa de este mismo intent. Corrí graphify (`graphify query`) sobre ambos archivos de test antes de leer nada crudo (Paso 0 mandatorio), y sólo caí a `Read`/`git log -S`/`git show` para: (a) el contenido exacto de los dos test files (fixtures, no indexadas por AST con detalle de línea útil), (b) el diff histórico que introdujo el campo `published_to_marketplace` como requerido (literal exacto a citar), y (c) correr la suite real (`pnpm vitest run`) para confirmar el modo de falla — ninguna de estas tres es sustituible por graphify.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-01T18:20:00Z — No investigué en profundidad `setProductCover.test.ts` (el tercer test fallando mencionado en `project.md` de una sesión previa) porque el alcance de este intent, según su descripción verbatim, sólo nombra `products.test.tsx` y `reverseTransitions.test.tsx`. Dejo la evidencia de que la misma causa raíz (falta de `published_to_marketplace` en un mock de `Product`) es la sospecha más probable para ese tercer archivo también, a confirmar en Requirements Analysis si el usuario decide ampliar el alcance.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-01T18:20:00Z — ¿El usuario quiere que este intent arregle también `apps/web/tests/unit/components/upload/setProductCover.test.ts` (mismo síntoma, mismo root cause, no nombrado en la descripción verbatim) o estrictamente sólo los dos archivos nombrados? Mantener acotado a los dos nombrados salvo que Requirements Analysis decida ampliar — consistente con el patrón ya aprendido de no expandir alcance de oficio.
- 2026-09-01T18:35:00Z — (architect, link 2) Reconfirmo la pregunta abierta del developer sobre `setProductCover.test.ts` sin resolverla — queda igual para Requirements Analysis.

## Interpretations (architect, link 2)

- 2026-09-01T18:35:00Z — Sinteticé los resultados del developer como deuda de fixtures de test puramente mecánica (Signal #43 de `code-quality-assessment.md`), sin tratarla como ambigüedad de diseño ni proponer alternativas arquitectónicas — la causa raíz ya viene confirmada por ejecución real de test y diff de commit, no hay decisión que tomar más allá del backfill de 8 mocks.

## Deviations (architect, link 2)

- 2026-09-01T18:35:00Z — Antes de escribir, corrí `graphify query "productSchema published_to_marketplace"` (Paso 0 mandatorio) para ubicar `productSchema` en el grafo; graphify reporta la declaración en `products.ts:L56` mientras que el scan del developer cita `~L88` — discrepancia de número de línea entre herramientas (probablemente distintas convenciones de conteo/versión del grafo vs. lectura directa), no de archivo ni de contenido. Documenté ambos números en `reverse-engineering-timestamp.md` en vez de forzar uno solo, para no introducir un dato no verificado directamente.

## Tradeoffs (architect, link 2)

- 2026-09-01T18:35:00Z — Mergeé los hallazgos nuevos como secciones nuevas dentro de cada uno de los 9 artefactos existentes (en vez de reescribir cada documento desde cero) para preservar íntegro el conocimiento de los 5 pases anteriores (`260826-prod-bugfixes-batch` full rescan + 4 scans enfocados), consistente con la convención ya establecida del proyecto para scans enfocados sobre un store `kind: partial`.

## Open questions (architect, link 2)

- 2026-09-01T18:35:00Z — Ninguna pregunta nueva de mi parte más allá de la ya registrada por el developer arriba. Nada que agregar de mi lado para la próxima corrida de este stage.
