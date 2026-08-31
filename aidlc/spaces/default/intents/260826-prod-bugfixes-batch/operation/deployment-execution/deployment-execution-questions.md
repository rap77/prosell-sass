# Deployment Execution — Pre-Deployment Checks

## Sources

- [desc] Intent 260826-prod-bugfixes-batch: batch de 7 bugfixes de producción + export CSV, ya mergeado a `main` local (commit `a1a78eee`, merge `bb298161`).
- [memory:project.md] "En Build and Test: no confiar en que una falla de test es 'pre-existente' solo porque una etapa anterior ya lo dijo — re-verificar independientemente."
- Verificación en vivo esta etapa: `git push origin main` (17 commits, incluye este batch + 4 intents posteriores), CI run `33292657961` en GitHub, `gh run list` histórico de los últimos 15 runs en `main`.

## Q1: ¿Están pasando todos los pre-deployment checks?

**NO.** El push a `origin/main` (necesario para que dispare el pipeline real) disparó CI, y **CI falló** en el job `Test Node` (13 fallas frontend — el mismo baseline preexistente ya documentado en `test-results.md` de Build and Test, confirmado de nuevo acá) y en `Test Python` (**21 fallidos + 12 errores**, tests de integración contra una DB real que Build and Test nunca corrió localmente — ahí estaban "skipped" por falta de DB en `localhost:5433`).

Verificación de que esto es **preexistente y no introducido por este batch**: `gh run list --workflow=CI --branch main --limit 15` muestra CI en rojo de forma consecutiva desde el 2026-08-17 (15/15 runs fallidos), 2 semanas antes de que este batch siquiera se mergeara a `main` localmente. El patrón dominante en las fallas de integración es `ForeignKeyViolationError: products_category_id_fkey` — la seed data de categorías no parece llegar correctamente al entorno de CI (afecta múltiples suites no relacionadas entre sí: `test_batch_review_api`, `test_seed_car_attributes`, `test_bulk_upload_with_images`, `test_org_verticals`), consistente con un problema de infraestructura del pipeline de CI, no con el código de este batch.

[Answer]: A. Confirmado — no están pasando, es un bloqueo preexistente de CI/infra, no de este batch

A. Confirmado — no están pasando, es un bloqueo preexistente de CI/infra, no de este batch
B. Investigar la causa raíz ahora en esta misma sesión
C. Tratar como falso bloqueo y proceder igual
X. Other (please specify)

## Q2: ¿Se requieren y probaron migraciones de base de datos?

**No aplica.** Verificado con `git log`/`git show --stat` sobre el commit del batch (`a1a78eee`): no toca `apps/api/alembic/versions/`. El batch es de bugfixes de producto (7 bugs) + export CSV, sin cambios de schema.

[Answer]: A. Confirmado — sin migraciones nuevas en este batch

A. Confirmado — sin migraciones nuevas en este batch
X. Other (please specify)

## Q3: ¿Están disponibles y sanos los servicios dependientes?

**No verificable en este momento** — el deploy nunca llegó a ejecutarse (CI rojo bloquea el `workflow_run` que dispara `deploy.yml`), así que no hay contenedores nuevos que chequear. El runner self-hosted de staging (la PC local del usuario) no se tocó en esta sesión.

[Answer]: A. N/A — el deploy no llegó a ejecutarse, no hay nada que verificar todavía

A. N/A — el deploy no llegó a ejecutarse, no hay nada que verificar todavía
X. Other (please specify)

## Q4: ¿Cuál es la ventana de deployment?

**No aplica todavía** — el deploy está bloqueado, no hay ventana que definir hasta que el equipo decida cómo resolver el CI roto (arreglarlo, o accionar el deploy manual bypasseando el gate).

[Answer]: A. N/A — bloqueado, sin ventana definida

A. N/A — bloqueado, sin ventana definida
X. Other (please specify)

## Consolidated Summary Confirmation

Resumen antes de generar los artefactos finales: el código de este intent (y 4 intents más que se acumularon en `main` local) se pusheó a `origin/main` exitosamente. Esto disparó CI, que **falló** — no por este batch, sino por un problema preexistente de CI/infra (seed data de categorías rota en el entorno de integración) que viene fallando en rojo desde hace 2 semanas. Como consecuencia, el deploy automático a staging (`deploy.yml`, gateado por CI verde) **no se ejecutó**. Esta etapa documenta el bloqueo (`deployment-log.md`, `smoke-test-results.md` y `health-check-report.md` marcados N/A por deploy no ejecutado) y no fuerza un deploy manual — la investigación del CI roto queda para un intent dedicado, según decisión explícita del usuario.

[Answer]: Looks correct
