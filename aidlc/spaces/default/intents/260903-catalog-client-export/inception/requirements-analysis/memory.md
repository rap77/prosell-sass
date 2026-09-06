<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-04T12:45:00Z — Depth Standard con Reverse Engineering/Practices Discovery ya resolviendo la mayoría de ambigüedades técnicas: se generaron 5 preguntas iniciales (piso del Depth), con 2 follow-ups adicionales cuando las respuestas libres revelaron una tercera opción no contemplada (selector de disco vía File System Access API) y necesitaban mapeo preciso contra el enum real de `ProductStatus`.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-04T12:45:00Z — El reviewer advisory (aidlc-product-lead-agent) encontró NOT-READY con un hallazgo Critical: `requirements.md` nunca especificó el mecanismo de entrega que relaciona el CSV (FR1) con el ZIP de imágenes (FR2) — ni un endpoint que devuelve ambos combinados, ni dos descargas separadas. Ninguna de las 5 preguntas ni sus follow-ups cubrió explícitamente esta decisión de arquitectura, pese a ser el núcleo del feature. Candidato a aprendizaje: al generar preguntas de Requirements Analysis para un feature con dos artefactos de salida distintos (ej. CSV + ZIP), preguntar explícitamente el mecanismo de entrega/empaquetado que los relaciona, no asumir que queda implícito.
- 2026-09-04T12:45:00Z — Reconfirmado (ya visto en reverse-engineering y practices-discovery del mismo intent): `aidlc-log.ts answer` rechaza un segundo `answer` dentro del mismo turno humano cuando varias preguntas estructuradas se responden en una sola llamada de AskUserQuestion — se sigue resolviendo con un único `answer` combinado por turno.
- 2026-09-04T12:45:00Z — `aidlc-log.ts review --verdict` rechazó el primer intento porque el reviewer había modificado el artefacto (agregando `## Review`) después del `REVIEW_REQUESTED` inicial — hubo que re-basear con `--retry-pending` antes de `--verdict`. Ya está documentado como aprendizaje persistido (`project.md`, intent `260830-ci-seed-data`), reconfirmado acá.
