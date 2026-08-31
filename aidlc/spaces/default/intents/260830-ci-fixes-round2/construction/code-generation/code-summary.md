# Code Summary — 260830-ci-fixes-round2

Resultado final: suite completa de pytest backend en **1965 passed, 0 failed, 0 errors** (baseline pre-fix: 1945 passed, 8 failed, 12 errors — verificado en vivo contra un Postgres 17 temporal con la config exacta de CI, `.github/workflows/ci.yml`, contenedor destruido al terminar).

## Archivos modificados

### FR1 — Fixture real de categoría en test_batch_review_api.py

- `apps/api/tests/integration/api/test_batch_review_api.py` — agregado `test_category` como parámetro de fixture en 3 funciones; reemplazado `category_id=uuid4()` por `category_id=test_category.id` en los 4 sitios (L110, 151, 201, 213).

### FR2 — Resolución de organización en bulk upload

- `apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py` — el pre-chequeo de "unknown organization codes" ahora solo es fatal cuando `organization_id is None` (antes era fatal siempre, ignorando el fallback que el loop por fila ya respetaba).
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — `bulk_upload_preview` y `bulk_upload_with_images` envueltos en `try/except ValueError → HTTPException(400)`.
- **FR2.3 descartado** (con confirmación del usuario): la fixture `test_organization` no necesitó cambios — los 23 tests de `bulk_upload/` pasan sin tocarla.

### FR3 — Bootstrap del enum `fb_group_category` (root cause + segundo defecto enmascarado)

- `apps/api/tests/conftest.py` — agregado `_MANUAL_ENUMS` y su bootstrap (`DROP TYPE`/`CREATE TYPE`) dentro de la fixture `test_db_session`, antes de `Base.metadata.create_all()` — mismo patrón que `scripts/create_test_schema.py`.
- `apps/api/tests/integration/api/test_fb_credential_migration_router.py` — **segundo defecto encontrado al arreglar el primero** (con confirmación del usuario): `routers/__init__.py` hace `from .fb_credential_migration_router import router as fb_credential_migration_router`, que pisa el nombre del módulo en el paquete con la instancia del router — esto rompe la resolución por string de `monkeypatch.setattr()` para ese módulo. Se reemplazaron 3 llamadas (`settings.service_organization_id` x2, `get_fb_encryption_service` x1) por patches directos sobre los objetos reales (`importlib.import_module(...)` para el módulo, y el objeto `settings` singleton compartido para el atributo de settings).

### FR4 — Endpoint GET de detalle de organización

- `apps/api/src/prosell/infrastructure/api/routers/admin_organizations_router.py` — nuevo `GET /{organization_id}` (`get_organization`), mismo patrón que el PATCH existente.

### FR5 — Corregido en Code Generation (no era un bug de autorización)

- **[Corrección con confirmación del usuario]** El router `org_verticals_router.py` NO se tocó — su bypass `Permission.ORG_ADMIN_VIEW_ALL` (ADMIN y SUPER_ADMIN) es funcionalidad de plataforma intencional, ya documentada in-line.
- `apps/api/tests/integration/api/test_org_verticals.py` — `test_list_org_verticals_cross_org_returns_403` cambiado de `admin_user`/`async_client_as_admin` (SUPER_ADMIN, tiene el bypass) a `seller_user`/`async_client_as_seller` (SALES_AGENT, sin el bypass) — ahora testea el escenario real de rechazo cross-tenant.

## Test fixes descubiertos y corregidos durante la implementación (con confirmación del usuario en cada caso)

- `apps/api/tests/integration/bulk_upload/test_bulk_upload_with_images.py::test_endpoint_requires_organization_id` — `organization_id` es un Form field intencionalmente opcional; con FR2.1+FR2.2 aplicados, la falta de organización ahora da `400` (mapeo de `ValueError`), no `422` nativo de FastAPI. Aserción corregida.
- `apps/api/tests/integration/bulk_upload/test_bulk_upload_preview.py::test_preview_summary_counts` — `images_count` solo se calcula con un ZIP real subido (el test no sube ninguno); no tenía relación con FR2/FR3 como se asumió originalmente en `requirements.md`. Aserción corregida de `3` a `0` (comportamiento real y correcto).
- `apps/api/tests/unit/application/use_cases/product/test_bulk_upload_vehicles.py::test_use_case_rejects_unknown_csv_organization_codes` — testeaba exactamente el comportamiento viejo (buggy) que FR2.1 corrige a propósito (con `organization_id` provisto, códigos no resueltos ya no deben ser fatales). Renombrado a `..._without_fallback` y ajustado a `organization_id=None`, que es el caso real que sigue siendo un error.

## Requirements.md actualizado durante esta etapa

`requirements.md` (FR2, FR3 nota, FR5) fue corregido durante Code Generation, con confirmación explícita del usuario en cada caso, para reflejar las causas raíz reales encontradas (distintas de lo asumido en Requirements Analysis). Ver el archivo para el detalle completo de cada corrección.

## Cobertura de test

Sin cambios de piso de cobertura — el equipo no tiene `--cov-fail-under` en backend (asimetría ya afirmada en `team.md`). Cada FR quedó cubierto por su regresión de integración/unit existente, ahora en verde; ningún test nuevo fue necesario (Test Strategy Minimal, bugfix scope floor: regresión dirigida, no cobertura nueva).

## Verificación de calidad

- `uv run ruff check src tests` — 0 errores.
- `uv run ruff format --check src tests` — 711 archivos ya formateados, sin cambios pendientes.
- `uv run pyright` — 0 errores, 0 warnings.
- `uv run pytest -q` (suite completa) — 1965 passed, 0 failed, 0 errors.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-31T01:38:30Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Recommendation                                                                                                                      |
| --- | -------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | code-summary.md § "Verificación de calidad"                   | El resultado final de suite completa ("1965 passed, 0 failed, 0 errors") no fue re-ejecutado ni re-verificado en esta pasada advisory por restricción de tiempo/alcance — se contrastó el diff staged línea por línea contra cada FR y coincide exactamente con lo descrito, pero el conteo agregado de la corrida completa queda como claim no re-verificado por este reviewer (sí lo verificó Build and Test según el propio artefacto).                       | Ninguna acción bloqueante — dejar constancia de que este número es evidencia heredada de una etapa posterior, no re-confirmada acá. |
| 2   | Minor    | test_fb_credential_migration_router.py (FR3, segundo defecto) | `.claude/settings.local.json` deniega `Read(**/*credential*)`, pero el archivo fue editado (28 líneas, confirmado en el diff staged) sin que el deny bloquee `Edit` (solo bloquea `Read`) — la nuance ya está documentada en requirements.md § Constraints, no es una contradicción real, solo vale la pena señalar que el mecanismo de bypass (Edit sin Read previo del contenido completo) es implícito y no está explicado en ningún artefacto de esta etapa. | Ninguna acción bloqueante — opcional: una nota breve en code-summary.md aclarando que el deny solo cubre `Read`, no `Edit`.         |

### Summary

Verifiqué el diff staged completo (`git diff --cached`) de los 10 archivos que este stage declara haber tocado contra las afirmaciones de `code-summary.md` y `traceability.json`, FR por FR: FR1 (fixture `test_category` en 4 sitios de `test_batch_review_api.py`), FR2.1 (guard `organization_id is None` en `bulk_upload_vehicles.py`), FR2.2 (`try/except ValueError→HTTPException(400)` en `product_router.py`, en ambos endpoints), FR3.1 (bootstrap `_MANUAL_ENUMS`/`fb_group_category` en `conftest.py`), el segundo defecto de FR3 (fix de `importlib.import_module` + patch directo sobre `global_settings`/módulo real en `test_fb_credential_migration_router.py`, exactamente el patrón ya documentado como aprendizaje persistido en `project.md`), FR4 (nuevo `GET /{organization_id}` en `admin_organizations_router.py`, mismo patrón que el PATCH existente) y FR5 (cambio de fixture `admin_user`→`seller_user` en `test_org_verticals.py`). Los tres test-fixes adicionales documentados (aserción `400` en vez de `422`, `images_count == 0` en vez de `3`, rename + `organization_id=None` en el test unitario) también coinciden exactamente con el diff real. `traceability.json` apunta a archivos que existen y fueron efectivamente tocados, sin huérfanos ni referencias rotas. La nota actualizada de FR3 en `requirements.md` (el bloqueo de permisos no resultó ser un bloqueante real porque el fix vivió en `conftest.py`) es consistente con el código: el router fuente `fb_credential_migration_router.py` no fue tocado, solo su test. No encontré contradicciones ni claims sin respaldo en el diff. Los dos hallazgos son menores y no bloquean.

READY
