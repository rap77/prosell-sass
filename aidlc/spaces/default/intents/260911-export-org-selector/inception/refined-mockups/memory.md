<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-11T00:00:00Z — aplicando la lección aprendida en User Stories de este mismo intent: generé LOS 4 artefactos recién DESPUÉS de la Consolidated Summary Confirmation (no antes), evitando por completo el deadlock gate-start↔review-freeze. Funcionó — cero fricción con el reviewer.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-11T00:00:00Z — el reviewer encontró un hallazgo Major real (el prop `organizationName: string | undefined` colapsaba "organización propia" y "cross-org con nombre aún cargando" al mismo valor, anulando el propósito de AC1.1.5) ANTES de que yo registrara el veredicto — lo corregí directo (unión discriminada `{kind: "own"|"loading"|"cross-org"}`, nuevo estado skeleton en mockups.md y accessibility-checklist.md) antes de `--verdict`, evitando el freeze que sí me afectó en User Stories.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-11T00:00:00Z — dejé para Functional Design confirmar si existe un componente Badge/Chip reusable en el proyecto antes de escribir CSS ad-hoc — no lo verifiqué contra el código real, solo señalé la pregunta en design-system-mapping.md.
