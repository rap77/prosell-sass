# Deployment Log — 260903-catalog-client-export

Consume: `build-and-test/test-results.md` (backend 1999 tests verde,
frontend 166 archivos/1292 tests verde, ambos re-verificados en vivo
en este mismo stage tras el fix descripto abajo).

## Pre-deployment checks

- Pre-commit y pre-push completos en verde (ruff, ruff-format, pyright,
  GGA, prettier, secret-scan, suite pytest completa) — corridos
  automáticamente por los hooks del repo al comitear/pushear.
- Sin migraciones de DB nuevas — este intent no agrega columnas ni
  tablas, solo endpoints/lógica de aplicación.
- Servicios dependientes: DO Spaces (ya provisto, sin cambios),
  Postgres de producción/staging (sin cambios de schema).
- Ventana de deploy: sin restricción — deploy-on-merge automático a
  staging, gate manual explícito para producción (`promote-prod.yml`).

## Hallazgo de GGA durante el commit (fuera del alcance original del intent, resuelto en esta etapa)

El pre-commit hook GGA revisa el archivo COMPLETO al tocarlo (no solo
el diff), y `product_router.py` ya estaba siendo tocado por este
intent (fix del bug de color + endpoint nuevo). GGA bloqueó el primer
intento de commit con 2 hallazgos reales, no relacionados
funcionalmente con el export pero sí con el archivo que este intent
ya modifica:

1. **Arquitectura**: la nueva `export_catalog_client_format.py`
   (capa `application/`) importaba `extract_storage_key_from_value`
   directo de `infrastructure/images/storage_keys.py` — viola la regla
   de dependencia (`Infrastructure → Application → Domain`). **Fix**:
   la función es lógica pura (solo `urllib.parse`, cero dependencias
   externas) — se movió a `domain/services/storage_keys.py` y se
   actualizaron los 3 call sites existentes (`product_router.py`,
   `fb_sync_router.py`, y el nuevo use case).
2. **Seguridad** (2 hallazgos en `product_router.py`, código 100%
   preexistente no tocado por el export en sí):
   - `get_product_audit_logs` no tenía el guard `tenant_id is None`
     que SÍ tiene la función hermana justo arriba (`inconsistencia
local`, no una decisión deliberada) — se agregó, mismo patrón.
   - `_key_tenant_allowed()` (usado solo para firmar URLs de imágenes
     de un producto ya tenant-scoped) aceptaba cualquier UUID con
     forma válida en el prefijo `orgs/<uuid>/`/`vehicles/<uuid>/` para
     super_admins, sin verificar contra la DB que ese tenant
     realmente existe. Decisión del humano (ver audit log,
     260903-catalog-client-export): endurecer con verificación
     DB-backed (`OrganizationRepository.get_by_tenant_id`) en vez de
     solo documentar la excepción — la función pasó a `async` y
     ahora requiere que el tenant extraído exista realmente.
   - 2 tests nuevos agregados en
     `test_get_product_image_urls.py::TestGetProductImageUrlsOrgAdminLegacyTenantValidation`
     cubriendo ambos casos (tenant real → firma; tenant inexistente →
     se descarta).

Suite completa backend re-verificada tras el fix: **2001 passed**
(1999 + 2 nuevos), `ruff`/`ruff format`/`pyright` limpios.

## Execute Deployment

- **Commit**: `9513ee33` — `feat(product): add catalog client-format CSV+ZIP export`
  (incluye la remediación de GGA de arriba en el mismo commit, ambos
  cambios relacionados por el mismo archivo tocado).
- **Push**: `git push origin main` — pre-push hook completo en verde
  (prettier, ruff, pyright, suite pytest completa contra DB de test
  sincronizada). `04c4831e..9513ee33 main -> main`.
- **CI** (`gh run 34036253442`, workflow `CI`): **success**, 3m31s —
  `test-python` (Postgres 17, `pytest --cov`) y `test-node`
  (`pnpm lint`/`typecheck`/vitest) ambos verdes.
- **React Doctor** y **graphify** (workflows disparados por el mismo
  push): ambos **success**.

## Deploy Staging — bloqueado por infraestructura preexistente, NO relacionado con este commit

`Deploy Staging` (`workflow_run` sobre CI verde) **falló dos veces**
tras este push:

1. Intento 1 (`gh run 34036436820`, primer run): falló en 10s, ANTES
   de "Set up job" — error de runner: archivo de diagnóstico
   `.../actions-runner/_diag/pages/....log` ya existe (colisión de
   log del propio runner self-hosted).
2. Intento 2 (mismo run, rerun manual vía `gh run rerun`): corrió
   13m11s y falló con: "The self-hosted runner lost communication
   with the server. Verify the machine is running and has a healthy
   network connection."

**Esto NO es causado por este commit** — el historial de
`Deploy Staging` muestra 2 fallas más, días antes de esta sesión
(`gh run 33710912017`, `33699303477`, ambas 2026-09-03, exit code 127
en el paso "Deploy to local staging"), con la última corrida exitosa
el 2026-09-02. El runner self-hosted que ejecuta el deploy local a
staging (`docker compose`, per `team.md`) viene con problemas de
salud/conectividad recurrentes desde hace días, independientes del
contenido de este o de commits anteriores.

**Escalera de fallas aplicada** (Steps "On failure" de
`build-and-test.md`, extendida a esta etapa por analogía): 1 intento
de fix in-stage (rerun) ya agotado, la causa raíz es de
infraestructura fuera del alcance de este repo (no hay ningún
archivo/config en el repo que controle la salud del runner
self-hosted) — halt-and-ask, no hay un fix identificable desde acá.

## Migraciones de DB

Ninguna — sin cambios de schema.

## Confirmación del humano

El humano confirmó cerrar esta etapa con staging pendiente (ver
`deployment-execution-questions.md` § Consolidated Summary
Confirmation).
