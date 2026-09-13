# Deployment Log — 260911-cross-org-export-ux

## Resumen

Commit `4dd7bcd2` (feat(catalog): export cross-org catalog for all
organizations, fix CSV mapping, wire real grid filtering) pusheado a
`origin/main` — dispara `deploy.yml` (deploy-on-merge a staging, ya
afirmado en `team.md` § Deployment). Consume `cd-config`/
`deployment-strategy`/`environment-inventory` per el camino real del
repo (Deployment Pipeline y Environment Provisioning quedaron SKIP en
este intent — sin artefactos propios que consumir, se leyó
`.github/workflows/deploy.yml` directamente como fuente de verdad, per
convención ya aprendida en `project.md`).

## Secuencia real

1. **Commit**: 148 archivos, +34351/-324. Pre-commit completo en verde
   (GGA, ruff, pyright, eslint/prettier, react-doctor).
2. **GGA bloqueó el primer intento de commit** con 2 hallazgos reales en
   archivos tocados por este intent (ver "Hallazgos de seguridad
   cerrados" abajo) — corregidos antes de reintentar, no se usó
   `--no-verify` en ningún momento.
3. **Push a `origin/main`**: primer intento cortado por timeout externo
   durante el pre-push hook (suite completa de pytest, ~58s, dentro del
   pipeline de pre-push más largo) — gotcha ya documentado en
   `project.md` (mismo patrón que el de pre-commit). Reintentado con
   timeout más largo, exitoso: `cff92e8d..4dd7bcd2 main -> main`.
4. **CI** (`ci.yml`): verde — `lint-node`, `test-python`, `test-node`
   (run `34765017908`, 3m25s).
5. **Deploy Staging** (`deploy.yml`, `workflow_run` tras CI verde):
   **falló 3 veces consecutivas** con el mismo error de infraestructura
   ("`_diag/pages/<guid>_<guid>_1.log` already exists" en el paso "Set
   up job", antes de ejecutar cualquier comando real de deploy) — **no
   relacionado con el código de este intent**.
6. **Causa raíz investigada y confirmada**: dos procesos runner corrían
   en paralelo para el mismo agente (`prosell-staging-local`, agentId 21) — el servicio systemd correcto
   (`actions.runner.rap77-prosell-sass.prosell-staging-local.service`,
   activo) y un proceso SUELTO arrancado manualmente con `./run.sh` en
   algún momento anterior (PID 294, huérfano bajo init, sin relación
   con systemd), ambos compitiendo por el mismo job.
7. **Fix**: matado el proceso suelto (`kill 304 300 294`) tras
   confirmación explícita del usuario, dejando intacto el servicio
   systemd. Cuarto intento (`gh run rerun 34765190714`) corrió limpio:
   **`deploy-staging` completado en 5m16s**.

## Hallazgos de seguridad cerrados (GGA, pre-commit)

| #   | Archivo                                   | Hallazgo                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `export_catalog_client_format.py`         | `organization_id=None` con `all_organizations=False` deja `tenant_filter=None` → podría exportar todos los tenants si un caller futuro omite ambos    | Guard fail-closed al inicio de `execute()`: `ValueError` si `not all_organizations and organization_id is None`. El router real YA garantiza `organization_id` no-None en ese caso (defensa en profundidad, no cambia comportamiento actual). Test de regresión agregado.                            |
| 2   | `product_router.py` (bulk upload preview) | `BulkUploadPreviewUseCase.execute()` resolvía códigos de organización SIN scope a `tenant_id`, filtrando existencia de códigos cross-tenant al caller | `tenant_id` agregado como parámetro requerido, pasado a `get_by_codes(..., tenant_id=tenant_id)` (mismo patrón de scoping que `_resolve_org_codes()` de `bulk_upload_vehicles.py`, ya citado en `team.md`). Test de regresión agregado (`test_preview_scopes_org_code_lookup_to_the_caller_tenant`). |

Ambos son hallazgos preexistentes en archivos tocados por este intent,
no relacionados con el cambio que motivó tocarlos — corregidos por
mandato ya afirmado en `project.md` § Forbidden ("ALWAYS corregir TODO
lo que GGA señale al revisar un archivo tocado").

## Migraciones de base de datos

Ninguna — sin cambio de schema en este intent.

## Rollback

Sin rollback runbook dedicado (Deployment Pipeline SKIP). El camino de
rollback real del repo: `git revert 4dd7bcd2` + push a `main` dispara
un nuevo deploy-on-merge con el estado anterior — mismo mecanismo ya
usado implícitamente para cualquier commit en este proyecto (sin
mecanismo de rollback dedicado más allá de revert-and-redeploy,
consistente con la ausencia de blue/green o feature flags en este
stack).
