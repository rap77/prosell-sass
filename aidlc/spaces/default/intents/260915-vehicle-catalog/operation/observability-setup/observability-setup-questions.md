# Observability Setup — Preguntas

Etapa 4.4 (Operation phase) del intent **260915-vehicle-catalog**.

Contexto: NFR Design e Infrastructure Design de ambas Units (`u1-vehicle-catalog-api`,
`u2-vehicle-catalog-ui`) ya concluyeron, de forma consistente y verificada por
reviewer, que este intent **no introduce ningún dashboard, alerta, SLO/SLI ni
métrica nueva** — el volumen esperado de las dos señales nuevas (warning de
`field_key` sin catálogo canónico, log de resumen de la migración legacy) es
bajo/único y se revisa manualmente, no por un canal de alerta dedicado.

El proyecto no usa AWS (CloudWatch/X-Ray no aplican) ni tiene una plataforma
de observabilidad centralizada (Grafana/Prometheus/Datadog/Sentry — verificado,
no hay ninguna configurada en `docker/` ni en los workflows de GitHub Actions).
La infraestructura real es un droplet self-hosted con Docker Compose; la
única observabilidad hoy es `docker logs`/`journalctl` sobre los contenedores
`prosell-prod-api`/`prosell-staging-api`.

## Pregunta 1 — ¿Algo nuevo que monitorear antes de cerrar esta etapa?

El diseño (NFR Design + Infrastructure Design, ambos READY) concluyó que no
hace falta ninguna señal nueva. ¿Confirmás esa conclusión para el cierre de
esta etapa, o querés agregar algo (ej. un dashboard, una alerta) ahora que el
feature ya está en staging?

- A. Confirmar — sin dashboard/alerta/SLO nuevo, tal como concluyó el diseño
- B. Agregar algo puntual antes de cerrar (especificar qué)
- X. Other (please specify)

[Answer]: A

## Pregunta 2 — Cómo se revisan en la práctica las 2 señales nuevas

Las 2 señales nuevas (warning de `field_key` sin catálogo — NFR-OBS-1; log
de resumen de la migración legacy — NFR-OBS-2) van a `logger.warning`/log
estructurado del backend. Sin plataforma de agregación de logs en este
proyecto, ¿cómo las revisamos en la práctica?

- A. `docker logs prosell-prod-api --since <ventana>` / `docker logs prosell-staging-api` a mano, cuando haga falta investigar
- B. Documentar el comando exacto en el runbook de este stage para que quede repetible (mismo contenido que A, pero registrado formalmente acá)
- X. Other (please specify)

[Answer]: B

## Pregunta 3 — Retención de logs de Docker

Ningún `docker-compose.*.yml` de este proyecto configura `logging.driver`/
`max-size`/`max-file` — los contenedores usan el driver `json-file` por
defecto de Docker, sin límite de tamaño ni rotación explícita. Esto es
preexistente (no introducido por este intent) y no bloquea el cierre de esta
etapa. ¿Lo dejamos como nota de deuda técnica para un intent futuro, o
preferís que se resuelva ahora como parte de este stage?

- A. Nota de deuda técnica para más adelante — no bloquea este intent
- B. Resolver ahora (agregar `max-size`/`max-file` a los compose files)
- X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
