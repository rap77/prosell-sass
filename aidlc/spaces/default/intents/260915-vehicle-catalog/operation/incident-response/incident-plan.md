# Incident Plan — Intent 260915-vehicle-catalog

## Resumen

Sin plataforma AWS Incident Manager (el proyecto no usa AWS). Este plan
adapta el proceso genérico de incident response a la infraestructura real:
droplet self-hosted, Docker Compose, GitHub Actions, sin guardia formal
(ver `escalation-matrix.md`).

## Modos de falla cubiertos

Confirmado con el humano (Q1): este intent **no introduce ningún modo de
falla nuevo** más allá de los ya genéricos de la plataforma — mismos
servicios ya monitoreados (api, web, db, redis, worker, caddy), sin
dependencia externa nueva. La única adición real es el Runbook 2
(`runbooks.md`) para el fallo específico de la migración Alembic de este
intent, que bloquea el arranque del backend si falla (mismo mecanismo ya
vigente de "migración corre antes de uvicorn" — no un mecanismo nuevo).

## Proceso durante un incidente

1. **Detectar**: healthcheck de Docker Compose falla → contenedor entra en
   `Restarting`/`Unhealthy` (ver `dashboards.md`/`alarms.md` de
   `observability-setup` — sin alerta automatizada, detección manual vía
   `docker ps`/`docker logs`).
2. **Diagnosticar**: `docker logs prosell-prod-<servicio> --tail 200`; si es
   la migración de este intent, ver el log de resumen (`log-queries.md` de
   `observability-setup`).
3. **Mitigar**: ejecutar el runbook correspondiente de `runbooks.md`.
4. **Comunicar**: sin canal dedicado — ver `escalation-matrix.md` § Nota
   honesta.
5. **Resolver**: confirmar healthcheck en verde
   (`curl -fL https://api.prosellweb.com/api/v1/health/`).
6. **Post-mortem**: solo para incidentes reales con impacto de usuario —
   sin proceso formal de postmortem documentado en este proyecto todavía
   (fuera de alcance de este intent introducirlo).

## RTO / RPO

Documentado como el estado REAL, no aspiracional (Q3, confirmado por el
humano: "RPO = desde el último deploy"):

| Métrica | Target real                                                                                       | Justificación                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RTO     | Minutos a bajas decenas de minutos (tiempo de restart manual de contenedor o `docker compose up`) | Single-server, sin failover automático — el tiempo de recuperación depende de que el humano responsable actúe manualmente                                                                                                                                                   |
| RPO     | **Desde el último deploy a producción**, no desde hace minutos                                    | `scripts/deploy-production.sh` corre `pg_dump` automáticamente ANTES de cada deploy (retiene los últimos 10), pero **no hay backup programado independiente entre deploys** — si algo corrompe datos entre dos deploys, se pierde todo lo escrito desde el último `pg_dump` |

## Gap conocido (no resuelto por este intent)

Sin backup de base de datos programado (cron) independiente del ciclo de
deploy — el humano decidió explícitamente no agregarlo en esta etapa (Q3,
opción A). Si el intervalo entre deploys a producción crece, el RPO real
se degrada proporcionalmente. Candidato para un intent/Bolt futuro si el
equipo decide que el riesgo lo amerita.
