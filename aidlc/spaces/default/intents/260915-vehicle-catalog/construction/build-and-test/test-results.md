# Test Results — Catálogo Canónico de Vehículos para Facebook

## Backend (`apps/api`)

### Entorno de verificación

Contenedor Postgres temporal (`prosell-bt-test-pg`, `postgres:17`, usuario `prosell`, password `prosell_test_password`, db `prosell_test`, puerto `5433`) — config idéntica a `postgres-test` en `.github/workflows/ci.yml`. Schema bootstrapeado con `uv run python scripts/create_test_schema.py` (1 ENUM + 41 tablas). Contenedor detenido y eliminado al finalizar esta verificación.

### Comando y resultado

```
cd apps/api && uv run pytest -q
```

**2093 passed in 61.08s. 0 failed, 0 skipped.**

### Lint / formato / tipos

```
uv run ruff check .           → All checks passed!
uv run ruff format --check .  → 822 files already formatted
uv run pyright                → 0 errors, 0 warnings, 0 informations
uv run alembic heads           → un solo head (20260917_0001_migrate_legacy_vehicle_catalog)
```

## Frontend (`apps/web`)

### Comando y resultado

```
cd apps/web && pnpm vitest run
```

**Test Files: 169 passed (169). Tests: 1355 passed (1355). Duration 40.33s.**

### Lint / tipos

```
pnpm tsc --noEmit   → sin errores
pnpm lint            → eslint --max-warnings=0, sin warnings
```

## Coverage report

Sin herramienta de coverage-report dedicada corrida en esta etapa (el piso de cobertura de línea del proyecto — 80% backend implícito, 40% frontend ya aceptado como asimétrico per `team.md`/`project.md` — se aplica en CI, no se re-mide manualmente acá). El piso de test explícito de `team-practices.md` (6 puntos) se verifica por presencia y resultado de los tests dedicados, no por porcentaje de línea — ver `cross-unit-traceability.md`.

## Boundary / integration tests

Ver `integration-test-instructions.md` para el detalle de los 2 contratos inter-Unit verificados (shape idéntico backend↔frontend, confirmado por lectura de código en esta misma corrida) y los subconjuntos de test de cada lado que ya los ejercitan (incluidos en los totales de arriba, no un conteo separado).

## Hallazgos de esta etapa

Ninguno de build o de test — ambas suites completas en verde, sin regresión. El único hallazgo de esta etapa es de COBERTURA DE REQUISITO (no de test que falla): 4 de las 5 AC de US2.1 quedan sin flujo end-to-end alcanzable — ver `cross-unit-traceability.md` § Cross-Unit Final Coverage Gate para el detalle completo. No es un `## Loop-Back Log` (no aplica — no hubo falla de build/test que justifique un loop-back a Code Generation; es un gap de alcance ya documentado y transparente desde Code Generation, no un defecto a reparar automáticamente).
