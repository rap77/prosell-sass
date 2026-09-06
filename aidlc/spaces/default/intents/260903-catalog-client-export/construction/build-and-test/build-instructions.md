# Build Instructions — 260903-catalog-client-export

Cambio brownfield dentro de la app existente (`apps/api` + `apps/web`).
No hay build/despliegue nuevo — mismos comandos ya vigentes en el
repo y en `ci.yml`.

## Dependencias

Ya instaladas en este workspace (sin dependencias nuevas agregadas por
este intent, confirmado en `code-generation-plan.md`/`code-summary.md`
de ambos Units):

```bash
# Backend
cd apps/api && uv sync --all-extras

# Frontend
pnpm install --frozen-lockfile
```

## Entorno

- **Backend**: requiere Postgres 17 accesible. Para verificación local
  de este intent se levantó un contenedor temporal replicando
  `postgres-test` de `ci.yml` (`postgres:17`, usuario `prosell`,
  password `prosell_test_password`, DB `prosell_test`, puerto `5433`),
  luego bootstrapeado con `scripts/create_test_schema.py` y destruido
  al terminar — no se tocó `prosell-staging-db` (puerto 5432, contenedor
  separado y persistente).
- **Frontend**: sin servicios externos — todos los tests nuevos mockean
  `fetch`/`products.ts`, sin red real.
- Sin variables de entorno nuevas, sin config files nuevos.

## Build

```bash
# Backend — lint, format, types
cd apps/api
uv run ruff check src
uv run ruff format --check src
uv run pyright

# Frontend — lint, types
pnpm --filter @prosell/web lint
pnpm --filter @prosell/web typecheck
```

No hay paso de "build" de producto separado para el backend (FastAPI
corre directo desde fuente); el frontend usa `pnpm build` (Next.js)
solo como parte del pipeline de deploy — no ejecutado acá porque no es
parte del criterio de build-verification de este intent (sin cambios
de configuración de build, confirmado en `code-summary.md` de ambos
Units).

## Verificación de build

Todos los comandos de arriba se corrieron en vivo en este Build and
Test — ver `test-results.md` para el output real. Resultado: limpio en
los cuatro (ruff, ruff format, pyright, eslint/tsc ya cubiertos en la
sección de tests).

## Troubleshooting

- Si `uv run pytest` falla con errores de conexión a Postgres: verificar
  que el contenedor temporal esté corriendo en el puerto `5433`
  (`docker ps`) y que `scripts/create_test_schema.py` ya corrió contra
  él — el schema no persiste entre contenedores nuevos.
- Si el diagnóstico en vivo del IDE muestra `reportMissingImports` para
  módulos nuevos (`export_catalog_client_format`) pese a que
  `uv run pyright` da 0 errores: gotcha ya documentado en `project.md`
  — el diagnóstico de Pyright del editor queda stale, confiar en la
  corrida directa de `uv run pyright`.
