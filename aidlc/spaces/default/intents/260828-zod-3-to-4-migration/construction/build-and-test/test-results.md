# Test Results — Build and Test

## Build status

**SUCCESS**

- `pnpm tsc --noEmit` (apps/web) — exit 0, sin errores.

## Test results

### Nuevos tests (unit-scoped, FR1/FR1.4/FR2/FR5)

```bash
cd apps/web && pnpm vitest run tests/unit/lib/api/zod4-loose-object.test.ts tests/unit/lib/api/zod4-enum-migration.test.ts tests/unit/lib/schemas/profile-schema.test.ts
```

- Test Files: 3 passed (3)
- Tests: 10 passed (10)
- Failed: 0 / Skipped: 0

### Suite completa (NFR1 — cero regresión)

```bash
cd apps/web && pnpm vitest run
```

- Test Files: 166 passed (166)
- Tests: 1282 passed (1282)
- Failed: 0 / Skipped: 0
- Baseline pre-intent (registrado en `project.md`, confirmado en el intent 260902-teamapi-create-param): 163 archivos / 1272 tests. Delta exacto: +3 archivos / +10 tests — coincide 1:1 con los 3 archivos nuevos de esta migración. Cero regresión confirmada.

### Lint

```bash
cd apps/web && pnpm eslint <18 archivos tocados: 15 fuente + 3 test> --max-warnings=0
```

- Exit 0, sin warnings ni errores.

### GGA (AI code review, provider codex, STRICT_MODE) — NFR2

```bash
gga run --no-cache
```

- **STATUS: PASSED** — sin hallazgos bloqueantes en ninguna de las 15 rutas de fuente migradas. Confirma en vivo, en esta etapa (no solo en Code Generation), que la eliminación del bloque `## Legacy Exceptions` de `AGENTS.md` (FR3) desbloquea GGA para `.passthrough()`→`z.looseObject()` y `z.nativeEnum()`→`z.enum()` sin excepción vigente.

## Coverage report

Sin cambio en el piso de cobertura del equipo (`vitest.config.ts`: lines 40% / functions 40% / branches 75% / statements 40%) — este scope (`refactor`) no agrega piso nuevo por Testing Posture afirmada (`org.md`/`team.md`). No se generó reporte de cobertura adicional para esta corrida: el requerimiento es "suite existente en verde", ya confirmado arriba.

## Failure details

Ninguna — build y las 4 corridas de verificación (tsc, vitest scoped, vitest full, eslint) + GGA pasaron en el primer intento de esta etapa. Sin rungs de la escalera de falla activados.

## Cross-reference con Code Generation

Estos mismos comandos ya se habían corrido y registrado en `code-summary.md` durante Code Generation (incluyendo las 2 rondas de hallazgos GGA pre-existentes ya corregidas en esa etapa). Esta etapa los re-ejecuta de forma independiente per Build and Test's propio mandato de verificación — sin depender de que "una etapa anterior ya lo dijo" (aprendizaje ya persistido en `project.md`). Resultado: exactamente los mismos números, cero divergencia.
