<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-30T13:20:00Z — el store previo era CURRENT (paths sin cambios) pero su cobertura (auth/proxy/CI genérico) claramente no incluía `apps/api/scripts/`, `apps/api/tests/` ni la lógica de seed; se interpretó como "coverage no fit" y se saltó la opción de reuse, presentando directamente la pregunta de rescan (full vs focused) según la rama del stage file para ese caso.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-30T13:20:00Z — se instruyó al architect a MERGEAR el nuevo contenido con los 9 docs existentes en vez de reemplazarlos (aunque el texto de la opción "Focused scan" del stage dice "prior deep knowledge outside it is discarded"), siguiendo la convención de equipo ya aprendida en el intent 260829-auth-navigation-refactor de preservar conocimiento previo fuera del área y marcar `kind: partial`. El compare tool confirmó verdict COVERS (no NARROWER), validando que no se perdió cobertura.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; la domain is well-understood -->

- 2026-08-30T13:20:00Z — el developer priorizó leer el log real de CI (`gh run view --log-failed`) antes de asumir la causa desde los scripts de seed solamente; esto reveló que "CI seed data" en realidad son 3-4 familias de fallas independientes agrupadas en un mismo run rojo, no un único bug — se documentaron todas pero se recomendó explícitamente que Requirements Analysis acote el alcance a la de mayor confianza (slug `suvs` stale).

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-30T13:20:00Z — Requirements Analysis debe decidir explícitamente si el alcance de este intent incluye solo el fix de tests con slug `suvs` stale, o también el patrón `shared_session`+`db.commit()` (finding #3) y/o reparar la cadena real de Alembic (finding #2). Los findings #4 (FK violation en batch tests) y #5 (bulk_upload org codes) quedaron marcados como fuera de alcance salvo pedido explícito.
