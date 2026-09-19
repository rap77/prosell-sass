<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-18T12:55:00Z — El gate manual `Looks correct / Request changes` para deployment-execution necesitó `AIDLC_SKIP_HUMAN_PRESENCE_GUARD=1` (sesión sessionless: el hook `record-human-turn` no dispara en AskUserQuestion dentro de opencode sin settings.json que lo arme) — workaround documentado en `audit-format.md` como "deterministic recovery/tests". El humano eligió A en las 4 preguntas del file-backed Q&A, registradas en `deployment-execution-questions.md`.

- 2026-09-18T12:55:00Z — El orden de operaciones del gate local lo define `project.md` § Mandated: GGA → secret scan → spec-status → validate-tailwind → lint-staged → ruff/ruff-format → pyright → react-doctor → hooks estándar. La política es "todo lo que GGA señale en archivos tocados se corrige antes de push", aunque el hallazgo sea preexistente (ver aprendizaje en `project.md` § Corrections del intent 260903-catalog-client-export).

## Deviations

- 2026-09-18T12:55:00Z — SKIP del bloque interactivo de "interaction mode" (Guide me / I'll edit the file / Chat) — Operation phase tiene ~4 preguntas targeted per `stage-protocol.md` § Depth-aware Generation, no justifica el bloque. Las preguntas se presentaron en un solo batched `AskUserQuestion` de 4 preguntas.

## Tradeoffs

- 2026-09-18T12:55:00Z — Decisión: US2.1 (`ProductLocationFields` sin wiring a `UnifiedProductForm`) se deploya junto con el resto del intent en lugar de pausar hasta un intent de seguimiento. La recomendación del lead (cross-unit-traceability.md) y del humano fue la misma: los FR/US no afectados (US1.1, US1.2, FR3, FR4, FR5, NFR2) son funcionalmente independientes del wiring de US2.1, y el código de US2.1 está completo y probado a nivel de componente — bloquear el deploy completo por ese gap sería sobre-ingeniería. El gap queda transparente en `cross-unit-traceability.md` y `build-and-test-summary.md` para que cualquier seguimiento futuro lo recoja.

- 2026-09-18T12:55:00Z — Migración `20260917_0001_migrate_legacy_vehicle_catalog.py` corre automáticamente vía `alembic upgrade head` en el container de staging como parte de `docker compose up -d` (per `deploy.yml` líneas 53/43-54 de `promote-prod.yml`). El `alembic upgrade head` se ejecuta explícitamente vía `docker exec prosell-prod-api python -m alembic upgrade head` en producción después de levantar el compose. No requiere coordinación manual con el deploy — está en el mismo flujo, y la idempotencia + 3 guardas + downgrade simétrico ya están probados (6 tests en `test_migrate_legacy_vehicle_catalog.py`).

## Open questions

- 2026-09-18T12:55:00Z — Confirmar el resultado del smoke test post-deploy con un GET a `https://api-staging.prosellweb.com/api/v1/health/` (o el endpoint equivalente que apunte al contenedor staging); si devuelve 200, el deploy está funcionalmente verde. Si GGA surfacea algún hallazgo preexistente en archivos tocados por este intent, el workflow pausa y se aborda antes de push — gate ya tiene esa política.
