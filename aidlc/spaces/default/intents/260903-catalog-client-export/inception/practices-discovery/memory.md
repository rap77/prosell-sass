<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-04T10:50:00Z — Re-run con baseline de team.md ya afirmado y sin objeciones de fondo de las 3 revisiones ciegas: en vez de re-entrevistar las 5 secciones a fondo, se presentó un interview acotado a los dos puntos genuinamente nuevos (piso de test del feature, manejo de errores del feature), confirmando las 5 secciones sin cambios en un solo paso.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-04T10:50:00Z — `aidlc-state.ts practices-event` fue rechazado cuando lo corrió el agente delegado (aidlc-pipeline-deploy-agent) por el guard `aidlc-state-transition-guard.ts` (transición conductor-owned) — el conductor lo corrió directamente después de recibir el resultado de integración del lead.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-04T10:50:00Z — La decisión de Q2 (extender ProductError) se documentó en evidence.md como decisión de diseño de este feature, NO se promovió a discovered-rules.md como Mandated de equipo — es una decisión de alcance de un solo intent, no una restricción de proceso general.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-04T10:50:00Z — `aidlc-log.ts answer` rechaza un segundo `answer` dentro del mismo turno humano cuando dos preguntas estructuradas se responden en una sola llamada de AskUserQuestion (guard `humanActedSinceLastAnswer`) — reconfirmado en este stage (ya visto en reverse-engineering del mismo intent). El archivo de preguntas con `[Answer]:` sigue siendo la fuente de verdad; falta el segundo QUESTION_ANSWERED en el audit log. Candidato a persistir como aprendizaje de proceso.
