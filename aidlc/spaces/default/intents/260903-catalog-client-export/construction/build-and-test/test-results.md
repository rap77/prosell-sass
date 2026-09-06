# Test Results — 260903-catalog-client-export

Todos los comandos de esta página se corrieron en vivo por el
conductor en este stage (no reportados por un subagent sin
re-verificar).

## Build status

| Chequeo           | Comando                          | Resultado                               |
| ----------------- | -------------------------------- | --------------------------------------- |
| Ruff (lint)       | `uv run ruff check src`          | ✅ All checks passed!                   |
| Ruff (format)     | `uv run ruff format --check src` | ✅ 435 files already formatted          |
| Pyright           | `uv run pyright`                 | ✅ 0 errors, 0 warnings, 0 informations |
| ESLint (frontend) | `pnpm --filter web eslint ...`   | ✅ sin salida                           |
| tsc (frontend)    | `pnpm --filter web tsc --noEmit` | ✅ sin salida                           |

## Backend — suite completa

```
uv run pytest --cov=prosell --cov-report=term-missing -q
```

- **1999 passed** en 77.61s
- Cobertura total: **75%** (17125 statements, 4278 sin cubrir — sin
  piso `--cov-fail-under` enforced, consistente con la asimetría de
  cobertura ya afirmada en `team.md`)
- Entorno: contenedor Postgres 17 temporal (`prosell-test-db-bt`,
  puerto 5433, credenciales idénticas a `postgres-test` de `ci.yml`),
  schema bootstrapeado con `scripts/create_test_schema.py`, destruido
  al terminar. No se tocó `prosell-staging-db` (contenedor separado,
  puerto 5432).

### Backend — tests específicos de este intent (aislados)

```
uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py tests/integration/api/routers/test_product_router_export_csv.py -v
```

**7 passed** en 0.82s:

- `test_returns_zip_content_type_and_disposition` — PASSED
- `test_empty_catalog_returns_404` — PASSED
- `test_non_published_products_do_not_count` — PASSED
- `test_cap_exceeded_returns_413` — PASSED
- `test_other_organizations_products_never_appear` — PASSED
- `test_image_folder_path_uses_exterior_color` — PASSED
- `test_image_folder_path_drops_color_segment_without_exterior_color` — PASSED

## Frontend — suite completa

```
pnpm --filter web vitest run
```

**166 archivos, 1292 tests, todos passed** (~36s). Incluye:

- `tests/components/catalog/CatalogPage.test.tsx` — 16 tests (9 del
  flujo de export formato cliente originales + 1 agregado por el
  fix de red del conductor).
- `src/app/api/v1/products/[...path]/route.test.ts` — 3 tests (2
  preexistentes de `If-Match`/`Content-Type` + 1 nuevo de esta etapa,
  ver "Gap encontrado" en `build-and-test-summary.md`).

## Integration tests

Ver arriba (backend, tests específicos) — cadena Boundary 1
(`integration-test-instructions.md`). El Boundary 2 (proxy BFF) corre
como parte de la suite completa de frontend de arriba, no como un
comando separado (mismo runner, mismo archivo).

## Coverage report

Backend: 75% total (ver arriba). Frontend: sin piso `--coverage`
corrido en este stage — la suite completa ya confirma 0 regresiones;
el piso de cobertura del proyecto (`lines:40 functions:40 branches:75
statements:40`) se valida en CI Pipeline, próxima etapa.

## Failure details

Ninguno — cero fallas en ninguna corrida de este stage. La
escalera de fallas (Steps "On failure") no se activó.

## Loop-Back Log

Ninguna entrada — no hubo loop-back a Code Generation desde este
stage.
