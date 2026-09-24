# Deployment Pipeline Questions — Catalog Image Load Optimization

Este bugfix es incremental sobre `apps/api` + `apps/web`, brownfield, scope
`bugfix`. Las etapas `ci-pipeline` e `infrastructure-design` fueron salteadas
por diseño de alcance — este stage inspecciona directamente el pipeline y la
infraestructura reales del workspace (`.github/workflows/`,
`docker/docker-compose.*.yml`) en vez de esperar artefactos generados que
ese diseño de scope nunca produce.

## Q1

[Q1]: ¿Confirmás el mismo camino de deploy ya existente (docker compose
recreate, staging automático, prod manual con confirmación tipeada), sin
blue/green, canary ni feature flags?

A. Sí, mismo camino de siempre
B. Necesito algo distinto para este bugfix
X. Other (please specify)

[Answer]: A. Sí, mismo camino de siempre

## Q2

[Q2]: ¿Hace falta un runbook de rollback más detallado que el `downgrade()`
de la migración `thumbnail_image_key`?

A. No, el downgrade ya alcanza
B. Sí, necesito un runbook más detallado
X. Other (please specify)

[Answer]: A. No, el downgrade ya alcanza

## Consolidated Summary Confirmation

**Resumen antes de generar los artefactos:**

- Estrategia de deploy: sin cambios respecto al pipeline ya existente —
  `docker compose ... up -d --build` (recreate, no blue/green/canary) en
  ambos entornos.
- Staging: automático, disparado por `workflow_run` cuando CI termina verde
  en `main` (`.github/workflows/deploy.yml`), corre en runner self-hosted.
- Producción: `promote-prod.yml`, `workflow_dispatch` únicamente, gateado
  por el input `confirm` que debe ser exactamente el texto `"deploy"`.
- Migración: `20260922_0001_add_thumbnail_image_key_to_product.py` corre
  automáticamente vía `alembic upgrade head` como parte del healthcheck de
  arranque del contenedor API — mismo mecanismo ya usado para migraciones
  previas de este proyecto (`20260812_0002_migrate_legacy_sedan_products.py`).
  Columna nullable, sin backfill destructivo — el `downgrade()` estándar
  alcanza para revertir.
- Health check post-deploy: `curl -fL .../api/v1/health/` ya existe en
  `promote-prod.yml`, sin cambios necesarios.
- Feature flags: no aplica — este proyecto no usa feature flags en ningún
  lado del pipeline.

**Does this all look correct before I generate the artifact?**

[Answer]: Looks correct
