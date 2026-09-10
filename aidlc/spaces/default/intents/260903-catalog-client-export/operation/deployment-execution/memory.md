<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-06T14:00:00Z — GGA revisa el archivo completo al tocarlo (no solo el diff); un pre-existing violation en `product_router.py` (no relacionado al export) bloqueó el commit. Se trató como un hallazgo a resolver en el mismo commit (política ya afirmada en team.md), no como algo a saltear.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-06T14:35:00Z — no se pudo correr el smoke test/health check real contra staging (Steps 3-5 de esta etapa) porque `Deploy Staging` falló 2 veces con errores de infraestructura del runner self-hosted, sin relación con este commit (ya venía fallando desde 2026-09-03). Se documentó como pendiente en vez de simularlo o saltear el hallazgo.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-06T13:50:00Z — para el hallazgo de seguridad de `_key_tenant_allowed()` (super_admin acepta cualquier UUID sin verificar que el tenant exista), el humano eligió endurecer con verificación DB-backed en vez de solo documentar la excepción — más seguro, más cambio de superficie (función pasa a async, nuevo repo dependency), mitigado con 2 tests nuevos dedicados.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-06T14:40:00Z — el runner self-hosted que corre `deploy-staging` viene fallando de forma recurrente (3 fallas en 4 días, síntomas distintos cada vez: exit 127, colisión de log de diagnóstico, pérdida de comunicación con el servidor). Es un problema operacional fuera del alcance de este repo — candidato a que el equipo revise la salud de esa máquina antes del próximo intent que dependa de un deploy real a staging.
