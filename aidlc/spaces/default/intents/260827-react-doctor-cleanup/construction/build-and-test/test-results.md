# Test Results — react-doctor cleanup

## Build status

- `pnpm typecheck` (apps/web): **PASS** — `tsc --noEmit` sin errores.
- `pnpm lint` (apps/web, `eslint . --max-warnings=0`, todo el proyecto): **PASS** — 0 warnings.

## Test results (consolidado, `pnpm vitest run`)

| Métrica    | Valor                                    |
| ---------- | ---------------------------------------- |
| Test files | 158 (155 passed, 3 failed)               |
| Tests      | 1253 (1240 passed, 13 failed, 0 skipped) |

### Fallas (13) — baseline pre-existente, no relacionado a este intent

Los 13 tests que fallan están en 3 archivos, todos con la misma causa raíz
documentada en `project.md` desde una sesión anterior (2026-08-26): un mock
compartido no incluye el campo `published_to_marketplace`, que el schema
real ya requiere.

- `tests/unit/api/products.test.tsx` — 7 fallas
- `tests/unit/lib/api/reverseTransitions.test.tsx` — 4 fallas
- `tests/unit/lib/api/setProductCover.test.ts` — 2 fallas

Verificación independiente (no solo confiar en el registro de `project.md`,
por la regla ya aprendida de re-verificar): ninguno de estos 3 archivos, ni
`products.ts` (la fuente del schema real), fueron tocados por este intent.
El conteo (13) y los nombres de archivo coinciden exactamente con el
baseline documentado.

## Cobertura react-doctor (evidencia complementaria, no reemplaza los tests)

|                     | Antes de este intent | Después   |
| ------------------- | -------------------- | --------- |
| Score               | 53/100               | 54/100    |
| Diagnostics totales | 371                  | 346 (-25) |

## No aplica

- `## Loop-Back Log`: no aplica — ni build ni tests fallaron por causa de
  este batch, no se disparó ningún loop-back a Code Generation.
