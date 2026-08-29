# Test Results — Next.js / React version bump (apps/web)

**Timestamp**: 2026-08-29T13:29:19Z

## Build status

- `pnpm --filter web run typecheck` (`tsc --noEmit`): **SUCCESS** — 0 errores.
- `pnpm --filter web run lint` (`eslint . --max-warnings=0`): **SUCCESS** — 0 errores, 0 warnings (tras 5 supresiones justificadas por hallazgo de la regla `@next/next/no-location-assign-relative-destination`, ver Code Generation `code-summary.md`).

## Unit tests (comando del stage-level `unit-test-instructions.md`)

```bash
pnpm --filter web exec vitest run tests/unit/config/package-versions.test.ts
```

**Resultado**: 1 test file, 4 tests, **4 passed**, 0 failed.

## Suite completa de Vitest (verificación de no-regresión, corrida en Code Generation)

|               | Baseline (pre-bump) | Post-bump                            |
| ------------- | ------------------- | ------------------------------------ |
| Test files    | 156                 | 157 (+1: `package-versions.test.ts`) |
| Tests totales | 1256                | 1260 (+4)                            |
| Passed        | 1243                | 1247 (+4)                            |
| Failed        | 13                  | 13 (sin cambios)                     |

Las 13 fallas son pre-existentes en `main`, documentadas en memoria del proyecto (`products.test.tsx`, `reverseTransitions.test.tsx`, `setProductCover.test.ts` — mocks sin el campo `published_to_marketplace`), en archivos que este cambio NO tocó. **0 regresiones nuevas** introducidas por el bump.

## Integration tests

No aplica — Test Strategy Minimal no genera `integration-test-instructions.md` para este cambio (bump de dependencias, sin nueva superficie de integración).

## Coverage

No se corrió reporte de coverage dedicado — fuera del piso exigido por Test Strategy Minimal para este tipo de cambio (bump, no funcionalidad nueva).

## Pendiente — tests/e2e (NFR4)

**NO EJECUTADO EN ESTE SANDBOX**: la suite Playwright de `tests/e2e` necesita Postgres + backend FastAPI + frontend Next.js corriendo (`webServer` de `playwright.config.ts`). Este entorno no tiene `docker` disponible ni ningún servicio escuchando en los puertos esperados (5433/8000/3000). Decisión explícita del usuario (Code Generation): dejarlo documentado como paso manual pendiente antes de mergear, en vez de bloquear el workflow.

**Acción requerida antes de mergear**: correr `pnpm --filter e2e test` (o el comando equivalente) en un entorno con Docker/Postgres disponible, y confirmar que la suite pasa contra la app con Next.js 16.3.3 / React 19.2.8.
