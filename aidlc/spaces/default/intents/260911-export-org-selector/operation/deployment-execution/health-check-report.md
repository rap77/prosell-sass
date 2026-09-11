# Health Check Report — 260911-export-org-selector (staging)

## Estado de contenedores post-deploy

| Contenedor              | Estado                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prosell-staging-api`   | Recreated → Healthy                                                                                                                                                                                            |
| `prosell-staging-web`   | Recreated → Started (healthcheck `wget` a `http://127.0.0.1:3000`, `start_period: 40s` — no alcanzó a reportar `Healthy` en la ventana del job, pero el smoke test manual confirmó 200 inmediatamente después) |
| `prosell-staging-db`    | Running (sin cambios) → Healthy                                                                                                                                                                                |
| `prosell-staging-redis` | Running (sin cambios) → Healthy                                                                                                                                                                                |
| `prosell-staging-minio` | Running (sin cambios) → Healthy                                                                                                                                                                                |

## Veredicto

**SALUDABLE.** Ningún contenedor en `Unhealthy`/`Restarting`/`Exited`.
Smoke test manual (`smoke-test-results.md`) confirma 200 en frontend y
backend inmediatamente después del deploy. Sin rollback disparado.

## Producción

No aplica a esta etapa — producción permanece en el estado previo al
deploy (mandate ya afirmado: promoción a producción requiere
confirmación manual explícita `"deploy"` vía `promote-prod.yml`, fuera
del alcance de este intent).

## Confirmación

Resumen confirmado por el humano ("Looks correct") en `deployment-execution-questions.md` § Consolidated Summary Confirmation.
