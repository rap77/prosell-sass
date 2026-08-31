# Test Results — 260829-auth-navigation-refactor

> Consume `construction/u1-auth-navigation-refactor/code-generation/{code-generation-plan,unit-test-instructions,code-summary}.md`.

## Build Status

**SUCCESS**

- `pnpm exec tsc --noEmit` (apps/web): sin output, sin errores.
- `pnpm exec eslint . --max-warnings=0` (apps/web): sin output, cero warnings/errores.

## Test Results

Comandos ejecutados (deduplicados — el comando de `unit-test-instructions.md` para
u1-auth-navigation-refactor se corrió una sola vez):

```bash
cd apps/web && pnpm exec vitest run src/lib/auth/oauthRedirect.test.ts \
  tests/app/auth/login/page.test.tsx tests/app/auth/register/page.test.tsx \
  tests/unit/lib/api/fetchWithAuth.test.ts tests/unit/lib/auth/oauthRedirect.test.ts
```

| Test Files | Passed | Failed |
| ---------- | ------ | ------ |
| 4          | 4      | 0      |

| Tests | Passed | Failed |
| ----- | ------ | ------ |
| 27    | 27     | 0      |

Suite completa de `apps/web` (`pnpm exec vitest run`, sin filtro), corrida de forma
independiente en este stage (no solo tomada de `code-summary.md`):

| Test Files | Passed | Failed |
| ---------- | ------ | ------ |
| 161        | 158    | 3      |

| Tests | Passed | Failed |
| ----- | ------ | ------ |
| 1265  | 1252   | 13     |

## Failure Details — Pre-Existing, No Relacionadas

Las 13 fallas (3 archivos) son las mismas ya documentadas en `project.md` (learned
2026-08-26) y en `code-summary.md` de Code Generation. Re-verificadas de forma
**independiente** en este stage con `git stash -u` (aislando los cambios de este Unit) +
re-corrida contra el baseline de `main`, siguiendo el aprendizaje ya registrado de no
confiar en la palabra de una etapa anterior:

| Archivo                                          | Tests fallando | Causa raíz                                                         | Confirmado en baseline (`git stash`)                |
| ------------------------------------------------ | -------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| `tests/unit/api/products.test.tsx`               | 7              | Mock sin `published_to_marketplace` que el schema real ya requiere | Sí — 7/12 fallan igual sin los cambios de este Unit |
| `tests/unit/lib/api/reverseTransitions.test.tsx` | 4              | Mismo mock incompleto                                              | Sí — 4/6 fallan igual sin los cambios de este Unit  |
| `tests/unit/lib/api/setProductCover.test.ts`     | 2              | Mismo mock incompleto                                              | Sí — 2/2 fallan igual sin los cambios de este Unit  |

Ninguno de estos 3 archivos, ni `apps/web/src/lib/api/products.ts` (la fuente del
`ZodError`), fue tocado por este Unit — confirmado por `git status` (los archivos
tocados son exclusivamente los 6 listados en `code-summary.md`, en el área de
navegación auth). **NFR1 se cumple**: la suite existente permanece en verde respecto
al baseline propio de este cambio (cero regresiones nuevas introducidas).

## Coverage Report

Sin cambio de piso de cobertura (NFR2) — `vitest.config.ts` no fue tocado por este
Unit. Los 27 tests nuevos/extendidos de FR5 son adicionales sobre el piso ya vigente
(40% frontend).
