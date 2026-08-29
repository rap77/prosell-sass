# Unit Test Instructions — Next.js / React version bump (apps/web)

## Alcance

Test Strategy Minimal (express scope): requirement-driven, 1 test nuevo (happy-path floor sobre el componente "pines de versión"), más verificación mediante la suite existente (no se agregan tests nuevos de comportamiento — decisión explícita del usuario en Requirements Analysis, P2).

## Framework y configuración

- Framework: Vitest (ya configurado en `apps/web/vitest.config.ts`), sin cambios de configuración necesarios.
- Patrón a seguir: `apps/web/tests/unit/config/<config-file>.test.ts`, importando el archivo con `await import("../../../<config-file>")` y aserciones directas sobre el objeto/JSON exportado — mismo patrón que `tailwind.config.test.ts` y `next.config.test.ts` (registrado en memoria del proyecto).

## Comando exacto para correr ESTE test (scoped, no project-wide)

```bash
pnpm --filter web exec vitest run tests/unit/config/package-versions.test.ts
```

## Test nuevo

**Archivo**: `apps/web/tests/unit/config/package-versions.test.ts`

**Qué verifica** (happy-path floor, FR1/FR2/FR3):

1. `next` en `package.json` es `^16.3.3` (o superior dentro del mismo major).
2. `react` y `react-dom` son `^19.2.8` (o superior dentro del mismo major).
3. `@types/react` y `@types/react-dom` están en la línea `19.2.x`.
4. `eslint-config-next` es `^16.3.3` (o superior dentro del mismo major).

No usar mocks — leer el `package.json` real del workspace `apps/web` (import JSON directo, patrón ya usado por los tests de config existentes).

## Cobertura del resto de los requirements (sin test nuevo)

- **NFR1** (suite Vitest existente en verde) — verificado corriendo la suite completa de `apps/web` en Step 11 del plan, comparando contra el baseline del Step 1. No es un test nuevo, es la suite existente re-ejecutada.
- **NFR2/NFR3** (typecheck/lint) — verificado por `pnpm --filter web typecheck` y `pnpm --filter web lint`, no son tests de Vitest.
- **NFR4** (suite e2e) — verificado por la suite Playwright existente de `tests/e2e`, no es un test nuevo.
- **FR4** (lockfile) — verificado por `pnpm install` sin errores, no es un test.
- **FR5** (revisión de changelog) — es documentación (`code-summary.md`), no un test automatizado.

## Gestión de datos de test

No aplica — este cambio no introduce datos ni fixtures nuevos.

## Mocking/stubbing

No aplica — el test nuevo lee `package.json` directamente, sin mocks.
