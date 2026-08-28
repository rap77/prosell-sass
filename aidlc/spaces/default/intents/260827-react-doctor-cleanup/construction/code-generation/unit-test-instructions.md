# Unit Test Instructions — react-doctor cleanup

## Framework y configuración

Vitest + Testing Library (ya configurado en `apps/web/vitest.config.ts`,
`apps/web/tests/setup.tsx`). No requiere bootstrap — comando ya verificado
funcional en esta misma sesión.

## Comandos (scopeados por archivo, nunca `pnpm test` a secas)

- `pnpm --filter web vitest run src/app/onboarding/page.test.tsx` (si existe; si no, crear un smoke test mínimo cubriendo `checkSetup`/`completeSetup`/`handleStep1` no rompen el flujo — Minimal: 1 test por requerimiento, no piso nuevo obligatorio dado que la suite existente ya cubre estos flujos según `code-quality-assessment.md`).
- `pnpm --filter web vitest run "src/components/forms/UnifiedProductForm.test.tsx"` (si existe).
- `pnpm --filter web vitest run "src/components/upload/BulkUploadCSV.test.tsx"` (si existe).
- `pnpm --filter web vitest run src/lib/api/organizations.test.tsx src/lib/api/userApi.test.ts src/lib/api/verticals.test.ts` (FR2.7, si existen).
- `pnpm --filter web vitest run src/lib/api/extractErrorMessage.test.ts src/lib/api/schemas/appointments.test.ts` (FR2.1, si existen).
- `pnpm --filter web vitest run "src/app/(admin)/admin/fb-accounts/[id]/page.test.tsx"` (FR2.3, si existe).
- `pnpm --filter web vitest run "src/app/(admin)/admin/review-queue/page.test.tsx"` (FR2.4, si existe).
- `pnpm --filter web vitest run "src/app/(admin)/admin/fb-accounts/page.test.tsx"` (FR2.6a, si existe).
- `pnpm --filter web eslint "src/app/api/v1/auth/2fa/disable/route.ts" --max-warnings 0` (FR2.6b — route handler, sin test unitario dedicado esperado; lint + typecheck son la verificación).

## Regla de piso (Minimal, scope refactor)

La obligación real (por FR3 y el piso de testing-posture del scope
`refactor`, que "no agrega piso de test nuevo") es: **la suite existente
debe seguir en verde**. No se backfillea cobertura para archivos que ya
carecían de test file antes de este intent, aunque el archivo se toque acá
— hacerlo excede el alcance de "refactor de comportamiento idéntico" y no
es parte de FR3. Ver `memory.md` de este stage para el caso concreto
(`onboarding/page.tsx`, `BulkUploadCSV.tsx`, sin test previo, tocados sin
crear test nuevo).

## Cobertura esperada

No hay meta de cobertura % nueva — la obligación de scope es "la suite
existente sigue en verde" (ver `apps/web/vitest.config.ts`, thresholds
`lines: 40, functions: 40, branches: 75` ya vigentes, no se tocan).

## Mocking/Stubbing

Reusar los mocks ya establecidos en `apps/web/tests/setup.tsx` (incluye el
mock de `framer-motion` con `useReducedMotion` agregado esta sesión). No
introducir mocks nuevos salvo que un archivo tocado los necesite y no los
tenga.

## Test data

Reusar fixtures/factories existentes bajo `apps/web/tests/` — no crear
fixtures nuevas para este intent.
