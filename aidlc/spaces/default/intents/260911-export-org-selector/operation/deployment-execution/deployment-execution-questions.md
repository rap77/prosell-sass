# Deployment Execution — Pre-Deployment Checks (260911-export-org-selector)

Deployment Pipeline y Environment Provisioning fueron SKIP (CD/ambiente
ya operativos, sin cambios de topología para este intent) — per
`aidlc-common/stages/operation/deployment-execution.md` Step 2, se
inventarían los workflows reales del repo como fuente de verdad
(`deploy.yml`, `promote-prod.yml`), consistente con el precedente ya
establecido en `260910-export-cross-org`/`260826-prod-bugfixes-batch`.

## Pre-Deployment Checks

1. **¿Los checks previos al deploy pasan?** Sí — Build and Test (etapa
   previa) verificó build limpio (`tsc --noEmit`, `next build`) y suite
   completa verde (166/166 archivos, 1303/1303 tests).
2. **¿Se requieren migraciones de base de datos?** No — cambio 100%
   frontend, sin cambios de schema ni backend.
3. **¿Los servicios dependientes están disponibles/saludables?** El
   backend del que depende este feature (`organization_id` en
   `GET /api/v1/products/export-client-format.zip`) ya está en
   producción/staging desde `260910-export-cross-org` (merged
   `264d99f1`), verificado en vivo en esa sesión previa.
4. **¿Ventana de deploy?** Sin restricción — `deploy.yml` dispara
   automáticamente el deploy a staging cuando CI termina verde en
   `main` (self-hosted runner en la máquina local). Producción NO se
   toca en esta etapa — requiere confirmación manual explícita
   (`promote-prod.yml`, input de texto `"deploy"`), fuera del alcance
   de este stage de AI-DLC (mandate ya afirmado en `project.md`).

## Plan de ejecución propuesto

1. Dos commits separados (convención ya usada en este repo — ver
   `5a3d9afe chore(aidlc): sync operation-phase artifacts for
260903-catalog-client-export`):
   - `feat(catalog): let cross-org admins export another organization's
catalog` — los 4 archivos de código/test de este Unit.
   - `chore(aidlc): sync workflow artifacts for
260911-export-org-selector` — el árbol `aidlc/` completo de este
     intent (codekb actualizado, memory con los learnings de esta
     sesión, registro del intent, audit shards).
2. `git push origin main` — dispara CI (`ci.yml`) en GitHub Actions.
3. Monitorear el run de CI (`gh run watch` o `gh run list`).
4. Si CI termina verde en `main`, `deploy.yml` dispara el deploy a
   staging — pero corre en un runner self-hosted (la PC local); si esa
   máquina está apagada o el runner no está online, el job queda en
   cola sin fallar, y el smoke test/health check de este stage lo
   documenta como "pendiente de runner", no como fallo.

**Nota importante**: pushear a `origin/main` es una acción que afecta
estado compartido — CI real, y un deploy real a staging si el runner
está online. Antes de ejecutar el push, se presenta este plan al humano
para confirmación explícita (no solo el gate de fin de stage).

[Answer]: Sí, commitear y pushear

## Consolidated Summary Confirmation

Deploy a staging completado: push a `origin/main` (`264d99f1..756ae5e0`),
CI 7/7 jobs verdes, `Deploy Staging` exitoso en 16m58s, smoke test
manual OK (frontend 200, `/catalog` 307 esperado, backend 200), sin
rollback. Ver `deployment-log.md`, `smoke-test-results.md`,
`health-check-report.md`.

```question
prompt: "Does this all look correct before I generate the artifacts?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien"
  - label: "Request changes"
    description: "Algo hay que ajustar"
```

[Answer]: Looks correct
