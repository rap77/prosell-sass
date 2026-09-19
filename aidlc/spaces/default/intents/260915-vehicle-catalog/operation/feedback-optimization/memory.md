<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-19T00:10:00Z — Sin AWS (sin Cost Explorer/AWS Config/Trusted Advisor) — todo el contenido se adaptó a la infraestructura real, mismo criterio ya aplicado en toda la fase Operation de este intent.

## Deviations

- 2026-09-19T00:10:00Z — Se respetó el orden correcto del PRE-GENERATION SUMMARY STOP (checkpoint confirmado antes de generar los 4 artefactos), consistente con el aprendizaje ya persistido en observability-setup.

## Tradeoffs

- 2026-09-19T00:10:00Z — Para el drift report, en vez de documentar el método de verificación como "chequeo pendiente", se corrió contra el entorno de staging local real accesible (2 comandos: alembic heads vs. SELECT version_num, docker ps) — esto encontró un drift real (prosell-staging-minio caído) que un chequeo documentado-pero-no-corrido no habría detectado.
- 2026-09-19T00:10:00Z — El costo base del droplet quedó explícitamente "no relevado" en vez de inventar un número — el humano no tenía el monto a mano en este momento.

## Open questions

<!-- 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
