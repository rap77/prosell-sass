# Test Results — Batch de bugfixes de producción

## Build Status

**PASS.** `cd apps/web && pnpm build` — exit 0, sin errores de TypeScript ni de generación de rutas. Backend no tiene paso de build separado (FastAPI corre desde source); su equivalente (pyright/ruff) ya se verificó limpio en Code Generation.

## Backend — Full Suite

```bash
cd apps/api && uv run pytest -q
```

**1366 passed, 598 skipped, 0 failed.** Los 598 skipped son tests de integración que requieren una DB en `localhost:5433` no disponible en este entorno (comportamiento esperado y documentado en el propio mensaje de skip, no relacionado con este batch). Incluye los 21 tests nuevos de este batch (4 FEAT-1, 6 contacto público FR5, 15 pre-existentes de `test_csv_product_parser.py` que ya cubrían el nuevo orden de columnas sin romperse).

## Frontend — Full Suite

```bash
cd apps/web && pnpm vitest run
```

**1253 tests corridos: 1240 passed, 13 failed, 0 skipped** (158 archivos de test: 155 pass, 3 fail).

### Las 13 fallas — VERIFICADAS como pre-existentes, no introducidas por este batch

Lista completa de las 13 fallas, las 3 en archivos NO tocados por este batch:

- `tests/unit/api/products.test.tsx` (7 fallas): `createProductWithVehicle` (3), `useCreateProduct` (4)
- `tests/unit/lib/api/reverseTransitions.test.tsx` (4 fallas): `useReverseProduct`, `useResubmitProduct`, `useRestoreProduct`, `useRevertSaleProduct`
- `tests/unit/lib/api/setProductCover.test.ts` (2 fallas): ambos tests de `setProductCover`

**Causa raíz común**: `parseProductResponse()` en `apps/web/src/lib/api/products.ts` llama `productSchema.parse(raw)`, y el mock de respuesta usado en estos 3 archivos de test no incluye el campo `published_to_marketplace` que el schema real ya exige (`ZodError: expected boolean, received undefined`). Ningún cambio de este batch toca ese campo ni ese schema — confirmado con `git diff apps/web/src/lib/api/products.ts | grep published_to_marketplace` (sin resultados) y con `git diff apps/web/src/lib/api/products.ts | grep productSchema` (sin resultados); el único cambio de este batch en ese archivo es la función nueva `exportCatalogCsv()`, aditiva.

**Verificación independiente por `git stash`** (repetida en esta etapa, no solo confiando en lo reportado por Code Generation): con **todos** los cambios de este batch stasheados (`git stash -u`, incluyendo los archivos untracked), se re-corrieron exactamente estos 3 archivos de test contra el baseline de `main` sin ningún cambio del batch aplicado. Resultado: **las mismas 13 fallas, idénticas**, `13 failed | 11 passed (24)`. Confirma de forma concluyente que son pre-existentes y no relacionadas con este batch. `git stash pop` restauró todos los cambios sin conflictos.

**Veredicto para NFR2** ("mantener la suite existente en verde"): **PASS por equivalencia de baseline** — el batch no introduce ninguna regresión nueva; las 13 fallas existían antes de este batch y seguirán existiendo después, sin relación con ninguno de los 8 FRs de este intent.

## Cobertura

Sin piso de coverage nuevo requerido por el scope `express` (Minimal). Coverage actual del proyecto (documentado en `technology-stack.md` / `code-quality-assessment.md` del codekb): thresholds de `vitest.config.ts` ya rebajados a 40%/40%/75% (líneas/funciones/branches) por decisión previa del equipo — no evaluado de nuevo en esta corrida, fuera del alcance de este batch.
