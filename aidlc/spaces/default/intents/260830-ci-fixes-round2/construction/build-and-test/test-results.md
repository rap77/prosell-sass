# Test Results — 260830-ci-fixes-round2

## Build status

✅ Success — `ruff check`: 0 errores. `ruff format --check`: 711 archivos ya formateados. `pyright`: 0 errores, 0 warnings.

## Test results

Ejecutado contra un Postgres 17 temporal con la config exacta de `.github/workflows/ci.yml` (`postgres-test`: user `prosell`, db `prosell_test`, puerto 5433), schema bootstrapeado con `scripts/create_test_schema.py`, contenedor destruido al terminar.

**Suite completa**: `uv run pytest -q`

```
1965 passed, 0 failed, 0 errors in 80.88s
```

**Baseline pre-fix** (confirmado en vivo durante Requirements Analysis, misma metodología): `1945 passed, 8 failed, 12 errors`.

### Resultados por FR/NFR (re-ejecutados individualmente para este stage)

```
tests/integration/api/test_batch_review_api.py .....                    [FR1: 5 passed]
tests/integration/bulk_upload/ .......................                  [FR2: 23 passed]
tests/integration/api/test_fb_credential_migration_router.py ............ [FR3: 12 passed]
tests/integration/api/test_admin_organizations_router.py::test_admin_patch_persists_contact_name . [FR4: 1 passed]
tests/integration/api/test_org_verticals.py ...                         [FR5: 3 passed]
tests/unit/application/use_cases/product/test_bulk_upload_vehicles.py .... [regresión FR2: 4 passed]

48 passed in 13.77s
```

Sin fallas, sin skips inesperados.

## Coverage report

Sin piso de cobertura enforced en backend (`--cov-fail-under` no configurado — asimetría ya afirmada en `team.md`); no se generó reporte de cobertura nuevo para este intent.

## Cross-check anti-falso-positivo

Confirmado que ninguna de las correcciones fue un "ya estaba arreglado" — cada uno de los 5 FRs fue reproducido fallando ANTES del fix correspondiente (ver `code-generation/memory.md` y las transcripciones de la sesión), y las 3 correcciones de aserciones de test (422→400, images_count 3→0, unit test _without_fallback) fueron confirmadas fallando con el código viejo antes de corregirlas.
