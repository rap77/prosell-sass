# Build Instructions — 260830-ci-fixes-round2

Cambios exclusivamente backend (Python/FastAPI). No hay pasos de build de frontend en este intent.

## Instalación de dependencias

```bash
cd apps/api
uv sync --all-extras
```

## Setup de entorno

Este intent no requiere variables de entorno nuevas ni archivos de config nuevos. Para correr la suite de tests de integración localmente (no hay Postgres de test corriendo por defecto), levantar un contenedor temporal con la config EXACTA de `postgres-test` en `.github/workflows/ci.yml`:

```bash
docker run -d --name prosell-bt-postgres \
  -e POSTGRES_USER=prosell \
  -e POSTGRES_PASSWORD=prosell_test_password \
  -e POSTGRES_DB=prosell_test \
  -p 5433:5432 \
  postgres:17

# Esperar a que esté listo
docker exec prosell-bt-postgres pg_isready -U prosell

cd apps/api
uv run python scripts/create_test_schema.py
```

**Nunca** apuntar la suite de tests a `prosell_staging` — es destructiva (DROP/CREATE DATABASE por test). Al terminar:

```bash
docker stop prosell-bt-postgres && docker rm prosell-bt-postgres
```

## Comandos de build

Backend Python no tiene paso de "build" (no hay transpilación/bundling) — `uv sync` ya deja el entorno ejecutable. Verificación de build equivalente:

```bash
cd apps/api
uv run ruff check src tests
uv run ruff format --check src tests
uv run pyright
```

## Verificación de build

- `ruff check` — 0 errores
- `ruff format --check` — sin cambios pendientes
- `pyright` — 0 errores, 0 warnings

## Troubleshooting

- **`localhost:5433 not available`**: la mayoría de los tests de integración se skippean automáticamente si no hay Postgres en el puerto 5433 (ver `tests/integration/conftest.py`) — levantar el contenedor de arriba antes de correr la suite completa.
- **CWD drift**: los comandos de `uv run` deben correrse desde `apps/api/` — si un `cd apps/api` previo queda activo en la sesión, un segundo `cd apps/api` fallará; usar rutas absolutas o `pwd` para confirmar el directorio actual.
