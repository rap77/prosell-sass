# Build Instructions — 260911-cross-org-export-ux

Cambio brownfield dentro de la app existente (`apps/api` + `apps/web`).
No hay build/despliegue nuevo — mismos comandos ya vigentes en el repo
y en `ci.yml`. Confirmado en `code-summary.md` de ambos Units: sin
dependencia nueva, sin variable de entorno nueva, sin migración de
base de datos.

## Dependencias

Ya instaladas en este workspace (sin dependencias nuevas):

```bash
# Backend
cd apps/api && uv sync --all-extras

# Frontend
pnpm install --frozen-lockfile
```

## Entorno

- **Backend**: requiere Postgres 17 accesible. Verificación local de
  este intent usó el contenedor temporal ya existente `prosell-test-pg`
  (matching exacto de `postgres-test` en `ci.yml`: `postgres:17`,
  usuario `prosell`, password `prosell_test_password`, DB
  `prosell_test`, puerto `5433`) — no se tocó `prosell-staging-db`
  (puerto 5432, contenedor separado y persistente).
- **Frontend**: sin servicios externos — todos los tests nuevos
  mockean `fetch`/`window.prompt`/módulos de `products.ts`,
  `organizations.ts`, `organizationStore.ts` — sin red real.
- Sin variables de entorno nuevas, sin config files nuevos.

## Build

```bash
# Backend — lint, format, types
cd apps/api
uv run ruff check src
uv run ruff format --check src
uv run pyright

# Frontend — lint, types
cd apps/web
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
```

No hay paso de "build" de producto separado para el backend (FastAPI
corre directo desde fuente); el frontend usa `pnpm build` (Next.js)
solo como parte del pipeline de deploy — no ejecutado acá porque este
intent no cambia configuración de build (confirmado en
`tech-stack-decisions.md` de ambos Units).

## Verificación de build

Todos los comandos de arriba se corrieron en vivo en este Build and
Test — ver `test-results.md` para el output real. Resultado: limpio en
los cuatro (ruff, ruff format, pyright, eslint/tsc), sin warnings ni
errores.

## Troubleshooting

- Si `uv run pytest` falla con errores de conexión a Postgres:
  verificar que `prosell-test-pg` esté corriendo (`docker ps`) en el
  puerto `5433`.
- Si aparece "closed transaction" en un test que hace `db.commit()`
  explícito dentro de un fixture con `session.begin()`: gotcha ya
  documentado en `project.md` (patrón "Joining a Session into an
  External Transaction") — no relevante para este intent (ningún test
  nuevo de este Bolt necesitó ese patrón), se deja la nota por si un
  test futuro en esta misma área lo requiere.
