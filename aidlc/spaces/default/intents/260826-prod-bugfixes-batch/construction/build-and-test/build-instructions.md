# Build Instructions — Batch de bugfixes de producción

Proyecto brownfield existente (Next.js 16 + FastAPI monorepo) — build ya establecido, sin bootstrap nuevo requerido por este batch.

## Dependency Installation

```bash
# Root (frontend, monorepo pnpm workspace)
pnpm install

# Backend
cd apps/api && uv sync
```

Sin dependencias nuevas agregadas por este batch (confirmado en code-summary.md Step 31).

## Environment Setup

Sin variables de entorno nuevas. `.env` / `.env.local` existentes del repo cubren lo necesario (backend en `apps/api`, frontend en `apps/web`).

## Build Commands

```bash
# Frontend (Next.js build — compila TS, valida rutas)
cd apps/web && pnpm build

# Backend: sin paso de compilación — FastAPI corre directo desde source (Python interpretado)
```

## Build Verification

- Frontend: `pnpm build` debe salir con código 0, sin errores de TypeScript ni de generación de rutas.
- Backend: no aplica build binario; la verificación equivalente es `uv run pyright` (type-check) + arranque del server (`fastapi dev` / `uvicorn`), ya cubiertos por el pipeline de CI existente (`ci.yml`), no repetido acá.

## Troubleshooting

- Si `pnpm build` falla por tipos: revisar que `apps/web/src/lib/api/schemas/categorySchema.ts` y `apps/web/src/types/category.ts` (tocados por este batch, Grupo A) no introduzcan un conflicto de tipos entre sí — son los dos contratos que Code Generation dejó deliberadamente sin unificar (ver traceability.json, FR3.3 GAP).
- Si `uv sync` falla: confirmar que el lockfile (`apps/api/uv.lock`) no fue tocado por este batch (no debería — no se agregaron dependencias).
