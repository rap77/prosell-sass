# Test Results — 260911-cross-org-export-ux

## Build status

| Comando                                              | Resultado                            |
| ---------------------------------------------------- | ------------------------------------ |
| `cd apps/api && uv run ruff check src`               | All checks passed!                   |
| `cd apps/api && uv run ruff format --check src`      | 436 files already formatted          |
| `cd apps/api && uv run pyright`                      | 0 errors, 0 warnings, 0 informations |
| `cd apps/web && pnpm exec eslint . --max-warnings=0` | Sin output (limpio)                  |
| `cd apps/web && pnpm exec tsc --noEmit`              | Sin output (limpio)                  |

**Build: SUCCESS** en ambos stacks.

## Unit tests — backend (`apps/api`)

```
cd apps/api
DATABASE_URL="postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test" \
uv run pytest -q
```

Contra el contenedor `prosell-test-pg` (Postgres 17, matching exacto de
`postgres-test` en `ci.yml`):

```
2032 passed in 58.44s
```

**Total: 2032, Passed: 2032, Failed: 0, Skipped: 0.**

## Unit tests — frontend (`apps/web`)

```
cd apps/web
pnpm exec vitest run
```

```
Test Files  166 passed (166)
     Tests  1322 passed (1322)
  Duration  39.50s
```

**Total: 1322, Passed: 1322, Failed: 0, Skipped: 0.**

## Integration tests (boundaries cross-unit/cross-stack)

Ver `integration-test-instructions.md` para el detalle de cada
boundary. Comandos dirigidos re-corridos independientemente en este
paso (subconjunto ya incluido en las corridas completas de arriba):

```
cd apps/api
uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py \
  tests/unit/application/use_cases/product/test_export_catalog_client_format.py -q
# 25 passed in 1.55s

cd apps/web
pnpm exec vitest run tests/unit/lib/api/products.test.ts \
  tests/components/catalog/CatalogPage.test.tsx \
  "src/app/api/v1/products/[...path]/route.test.ts"
# 3 test files, 56 tests passed
```

**Todos los boundaries cross-unit verdes.**

## Regresión respecto al baseline

La suite completa de ambos stacks ya se corrió en verde múltiples veces
durante Code Generation (al cierre de cada Unit, y otra vez tras la
revisión del arquitecto reviewer para `u2`) — sin fallas en ninguna
corrida. Esta re-corrida en Build and Test es la confirmación final,
independiente, después de que ambos Units quedaron aprobados: **mismo
resultado, cero regresiones** (2032/2032 backend, 1322/1322 frontend,
en ambos casos igual o mayor al conteo reportado al cierre de Code
Generation — 1322 incluye los tests agregados en este mismo stage's
predecesor inmediato, Code Generation Steps 10-12 de `u2`).

## Coverage

Sin piso de cobertura numérico nuevo para este Test Strategy (Standard)
— el piso real es cualitativo, ya verificado punto por punto en
`cross-unit-traceability.md` (los 31 AC / 9 grupos de FR / 4 NFR
enumerados en `requirements.md`/`stories.md`).

## Loop-Back Log

Ninguno — build y tests pasaron en verde en el primer intento de este
stage, sin necesidad de la escalera de fallas.
