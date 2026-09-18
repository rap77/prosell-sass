# CI/CD Pipeline — U1 (`u1-vehicle-catalog-api`)

Sin cambio de pipeline — U1 se integra al pipeline ya vigente del backend (`ci.yml`, `deploy.yml`), sin build stage, gate, ni estrategia de despliegue nueva.

## Build & Test

Mismo pipeline ya vigente: pre-commit (GGA → secret scan → spec-status → lint-staged → ruff/ruff-format → pyright → hooks estándar) y CI (`test-python` job, suite completa de pytest) — el piso de test nuevo de este Unit (6 puntos de `team-practices.md`) se agrega a la suite existente, sin infraestructura de test nueva.

## Deployment Strategy

Sin cambio — deploy-on-merge a staging (ya vigente), gate manual para producción (input de texto exacto `"deploy"`, ya vigente). U1 no introduce una estrategia de despliegue distinta (sin blue-green/canary nuevo, sin feature flag nuevo).

## Rollback

Sin procedimiento nuevo — mismo mecanismo ya vigente (revert de commit + re-deploy). La migración legacy (BR3.1), implementada como archivo Alembic (ver `infrastructure-specification.md` § Mecanismo de ejecución, corrección post-revisión), hereda el rollback ya vigente del mecanismo Alembic (`downgrade()` + `alembic_version`) — no "sin rollback automatizado" como se afirmaba antes de esta corrección. Las guardas de seguridad (BR3.1) siguen siendo la primera línea de defensa (evitar aplicar cambios incorrectos), y el `downgrade()` de Alembic es la segunda línea si hiciera falta revertir después de aplicar.

## Secrets Management

Sin secreto nuevo — este Unit no introduce ninguna credencial nueva (el catálogo es dato en memoria, sin API key ni conexión externa nueva).
