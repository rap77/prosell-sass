# Deployment Log — 260826-prod-bugfixes-batch

## Status: BLOQUEADO — deploy no ejecutado

**Fecha**: 2026-08-30

## Consumes referenciados

Esta etapa consume `build-test-results` de `<record>/construction/build-and-test/test-results.md` (referenciado en Q1 arriba). `cd-config` y `deployment-strategy` (de Deployment Pipeline) no existen — esa etapa reportó `STAGE_SKIPPED` porque este batch no crea ni modifica el pipeline de CD (deploya vía la infraestructura existente: `deploy.yml`, `promote-prod.yml`, `docker/docker-compose.staging.yml`/`prod.yml`). `environment-inventory` (de Environment Provisioning) tampoco existe — esa etapa está scope-skipped por diseño para el scope `express` de este intent.

## Secuencia de eventos

1. **Verificación de estado del repo**: `main` local estaba 17 commits adelante de `origin/main` (nada pusheado) — incluye el merge `fix/prod-bugfixes-batch` de este intent (commit `a1a78eee`, merge `bb298161`) más 15 commits posteriores de otros 4 intents ya completados (react-doctor-cleanup, fix-invalid-tailwind-spa, nextjs-react-bump, auth-navigation-refactor). Confirmado con el usuario antes de proceder.
2. **Formateo pre-push**: el hook `prettier-push` corre `prettier --check .` sobre todo el repo, no solo el diff — encontró 47+8 archivos sin formatear (bookkeeping de AI-DLC de intents previos + los 9 artefactos recién reescritos del codekb en esta misma sesión). Corregido con `prettier --write .` antes de reintentar el push (sin `--no-verify`, consistente con la regla `NEVER` del equipo).
3. **Push exitoso**: `git push origin main` → `b7915083..c82b20c6 main -> main`.
4. **CI disparado**: run `33292657961` en GitHub Actions, sobre `c82b20c6`.
5. **CI FALLÓ**:
   - `Test Node`: 13 fallas — el mismo baseline preexistente ya documentado en `build-and-test/test-results.md` (`products.test.tsx`, `reverseTransitions.test.tsx`, `setProductCover.test.ts` — mock sin `published_to_marketplace`). Confirmado que es el mismo hallazgo, no uno nuevo.
   - `Test Python`: **21 fallidos + 12 errores** — tests de integración contra una DB real de CI (`tests/integration/**`), que Build and Test nunca corrió localmente (reportados como "598 skipped" por falta de DB en `localhost:5433`). Patrón dominante: `sqlalchemy.exc.IntegrityError: ... products_category_id_fkey` — la seed data de categorías no está disponible/consistente en el entorno de CI. También: `test_org_verticals::test_list_org_verticals_cross_org_returns_403` devuelve 200 en vez de 403, y un `InvalidRequestError` de transacción cerrada en `test_fb_sync_router`.
6. **Verificación de que es preexistente, no de este batch**: `gh run list --workflow=CI --branch main --limit 15` muestra **15/15 runs fallidos consecutivos** en `main` desde 2026-08-17 — dos semanas antes de que este batch se mergeara siquiera localmente. Ninguno de los archivos de test que fallan en `Test Python` fue tocado por el commit del batch (`a1a78eee`); tampoco hay migraciones nuevas (`apps/api/alembic/versions/` sin cambios en ese commit).
7. **Deploy automático a staging: NO se ejecutó.** `deploy.yml` solo dispara `deploy-staging` cuando `workflow_run` de `CI` termina con `conclusion == 'success'` — con CI rojo, esa condición nunca se cumple.

## Decisión del usuario

Documentar el bloqueo y no forzar un deploy manual (`workflow_dispatch` bypasseando el gate de CI) ni investigar la causa raíz del CI roto dentro de esta sesión — ambas quedan para un intent dedicado. El batch de este intent (7 bugfixes de producto + export CSV) está mergeado y pusheado, listo para deployarse en cuanto el CI vuelva a estar verde (ya sea por el fix de la seed data de categorías, ya sea por un deploy manual explícito que el equipo decida ejecutar).

## Rollback plan

No aplica todavía — no hubo deploy que revertir. Si el equipo opta por el deploy manual bypasseando CI, el rollback estándar del proyecto sigue vigente: `recover-prod.yml` (reinicio de contenedores ya buildeados sin rebuild) para producción, y `docker compose down` / restaurar el commit previo + rebuild para staging.

## Próximo paso recomendado

Abrir un intent dedicado (scope `bugfix` o `security-patch` según se decida) para investigar y arreglar la seed data de categorías en el entorno de integración de CI — es un bloqueo de infraestructura de pipeline que afecta a **todo** merge a `main`, no solo a este batch.
