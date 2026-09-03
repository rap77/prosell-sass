# Build Instructions — Migración Zod 3 → Zod 4

Consumido de: `code-generation-plan.md`, `unit-test-instructions.md`, `code-summary.md`. Alcance zero-Unit (`refactor`), solo `apps/web`.

## Dependency installation

Ninguna dependencia nueva — `zod: ^4.4.0` y `@hookform/resolvers: ^5.4.0` ya están instalados (confirmado en Reverse Engineering y en el plan de Code Generation). Si el checkout es limpio:

```bash
cd apps/web && pnpm install --frozen-lockfile
```

## Environment setup

No se requieren variables de entorno ni servicios locales para esta migración — es un cambio de sintaxis de validación puro en `apps/web/src`, sin tocar backend, DB, ni configuración de build.

## Build commands

```bash
cd apps/web && pnpm tsc --noEmit
```

(`code-summary.md` ya registra esta corrida en 0 errores durante Code Generation; se repite en Step 10 de esta etapa para confirmación live.)

## Build verification steps

1. `pnpm tsc --noEmit` sale con código 0 — confirma que no hay imports colgantes tras el `apps/web/src/lib/zod-resolver.ts` eliminado (FR4) ni errores de tipos introducidos por `z.looseObject()`/`z.enum()`.
2. `pnpm eslint <18 archivos tocados> --max-warnings=0` sale con código 0.
3. `gga run --no-cache` sale PASSED — confirma empíricamente NFR2 (la eliminación del bloque `## Legacy Exceptions` en `AGENTS.md` desbloquea GGA para este idioma Zod).

## Troubleshooting

- **`tsc` reporta un import roto a `lib/zod-resolver`**: no debería ocurrir — `code-summary.md` confirma cero imports vía `rg` antes de borrar el archivo. Si aparece, es una regresión introducida después de Code Generation; revisar `git log` sobre esa ruta.
- **GGA vuelve a bloquear citando "Zod 4 Rule" sobre `.passthrough()`/`z.nativeEnum()`**: revisar que la sección `## Legacy Exceptions (DO NOT flag as errors)` de `AGENTS.md` siga eliminada (`rg -n "Legacy Exceptions" AGENTS.md` no debe dar match); si el bloque reapareció por un merge/rebase, es una regresión de FR3.
- **Vitest falla en los 3 archivos nuevos**: los tests son parse-only (sin red, sin mocks) — una falla indica una regresión real de comportamiento de validación, no un problema de entorno.
