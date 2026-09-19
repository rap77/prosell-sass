# Dashboards — Intent 260915-vehicle-catalog

## Resumen

Sin dashboard nuevo. `performance-design.md` y `security-design.md` de
ambas Units (`u1-vehicle-catalog-api`, `u2-vehicle-catalog-ui`, ambos READY)
concluyeron que este intent no introduce ningún SLI/SLO ni servicio con
métrica propia distinta de la ya vigente para el backend/frontend — mismos
endpoints extendidos, mismo bundle desplegado, sin componente nuevo que
justifique un dashboard dedicado.

El proyecto no usa AWS (sin CloudWatch) ni tiene una plataforma de
observabilidad centralizada (verificado: sin Grafana/Prometheus/Datadog/Sentry
configurado en `docker/` ni en `.github/workflows/`). La única visibilidad
operativa hoy son los healthchecks de Docker Compose ya vigentes (ver
`health-check-report.md` de `deployment-execution`) y `docker logs` sobre
los contenedores `prosell-{prod,staging}-api`/`-web`.

## Decisión de esta etapa (Q1, confirmada por el humano)

Sin dashboard nuevo — se confirma la conclusión del diseño. No hay superficie
que agregar antes de cerrar este stage.
