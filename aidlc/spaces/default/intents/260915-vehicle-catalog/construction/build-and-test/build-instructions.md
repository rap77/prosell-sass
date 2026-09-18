# Build Instructions — Catálogo Canónico de Vehículos para Facebook

Cubre `apps/api` (u1-vehicle-catalog-api) y `apps/web` (u2-vehicle-catalog-ui). Sin dependencia nueva ni variable de entorno nueva en ninguno de los dos Units — mismo stack ya vigente.

## Backend (`apps/api`)

### Instalación de dependencias

```bash
cd apps/api
uv venv  # si no existe ya
source .venv/bin/activate
uv pip install -e ".[dev]"
```

### Entorno / configuración

Sin variable de entorno nueva. Requiere Postgres accesible (staging local, o un contenedor temporal para verificación aislada — ver `test-results.md` para el comando exacto usado en esta corrida).

### Comandos de build/verificación

```bash
cd apps/api
uv run ruff check .          # lint
uv run ruff format --check . # formato
uv run pyright                # type check
uv run alembic heads          # confirma un solo head de migración (incluye 20260917_0001_migrate_legacy_vehicle_catalog)
```

No hay paso de "compilación" propiamente dicho (Python interpretado) — la verificación de build es lint + format + types + migraciones consistentes.

### Troubleshooting

- **`alembic heads` devuelve más de un head**: indica una migración con `down_revision` mal encadenado — no es el caso en esta corrida (confirmado un solo head).
- **Postgres no disponible en local**: levantar un contenedor temporal `postgres:17` con la config exacta de `postgres-test` en `.github/workflows/ci.yml` (usuario `prosell`, password `prosell_test_password`, db `prosell_test`, puerto `5433`), y correr `uv run python scripts/create_test_schema.py` antes de la suite — patrón ya documentado en `project.md`.

## Frontend (`apps/web`)

### Instalación de dependencias

```bash
pnpm install  # desde la raíz del monorepo, o cd apps/web && pnpm install
```

### Entorno / configuración

Sin variable de entorno nueva.

### Comandos de build/verificación

```bash
cd apps/web
pnpm tsc --noEmit   # type check
pnpm lint           # eslint --max-warnings=0
pnpm build          # Next.js production build (Turbopack)
```

### Troubleshooting

- **Warnings de ESLint bloqueando CI**: el proyecto corre con `--max-warnings=0` — cualquier warning nuevo falla el build. Confirmado en cero para los archivos tocados por este intent.

## Verificación ejecutada en esta corrida de Build and Test

Ver `test-results.md` para el detalle completo de comandos y resultados. Resumen: backend 2093/2093 tests, ruff/format/pyright limpios, un solo head de Alembic; frontend 1355/1355 tests, tsc/eslint limpios.
