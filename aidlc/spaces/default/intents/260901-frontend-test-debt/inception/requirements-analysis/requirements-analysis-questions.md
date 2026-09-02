# Requirements Analysis — Questions

Intent: 260901-frontend-test-debt
Depth: Minimal (2-4 questions)

Reverse Engineering already confirmed the root cause with high confidence
(git history + live `pnpm vitest run`): `productSchema` in
`apps/web/src/lib/api/products.ts` requires `published_to_marketplace`
(no `.optional()`), and 8 mock objects across `products.test.tsx` (7) and
`reverseTransitions.test.tsx` (1 shared helper) never got that field added
after commit `7315fdf2` tightened the schema. This is a mechanical fix with
almost no design ambiguity — the questions below cover only the genuine
open points.

## Q1: Scope — third file with the same suspected symptom

The scan found `apps/web/tests/unit/components/upload/setProductCover.test.ts`,
which likely fails for the identical reason (a `Product`-shaped mock missing
`published_to_marketplace`), but it was NOT named in the intent's verbatim
description ("Fix pre-existing frontend unit tests debt (products.test.tsx
and reverseTransitions.test.tsx)"). Should this intent also fix
`setProductCover.test.ts`, or stay strictly limited to the two named files?

A. Strictly the two named files only (products.test.tsx, reverseTransitions.test.tsx) — leave setProductCover.test.ts for a separate/future intent
B. Include setProductCover.test.ts too — same root cause, fix it in this intent while we're here
X. Other (please specify)

[Answer]: B. Include setProductCover.test.ts too — same root cause, fix it in this intent while we're here

## Q2: Mock field value — always `false`, or scenario-appropriate?

The precedent fix (commit `7315fdf2`, applied to the sibling file
`products.test.ts`) always set `published_to_marketplace: false` regardless
of test scenario. Should Code Generation follow that same precedent exactly
(literal `false` everywhere), or should any mock instead reflect a
scenario-appropriate value (e.g. `true` for a mock representing an
already-published product before a "revert-sale"/"reverse" transition)?

A. Always `false`, matching the exact precedent in products.test.ts — no scenario-specific values
B. Scenario-appropriate value per mock (e.g. true where the test's narrative implies an already-published product) — evaluate case by case
X. Other (please specify)

[Answer]: B. Scenario-appropriate value per mock (e.g. true where the test's narrative implies an already-published product) — evaluate case by case

## Q3: Fix style — minimal patch vs. light consolidation

The 7 mock objects in `products.test.tsx` and the 1 shared helper in
`reverseTransitions.test.tsx` duplicate the `Product` shape across multiple
literals. Should Code Generation apply the minimal patch only (add the
missing field to each existing mock literal, no structural changes), or is
light consolidation acceptable (e.g. extracting a shared base mock/factory
to reduce future duplication-drift risk), as long as all currently-passing
tests stay green?

A. Minimal patch only — add the missing field to each existing mock literal, touch nothing else (smallest possible diff, per the project's already-learned bugfix convention)
B. Light consolidation acceptable — a shared mock factory/base object is fine if it keeps the diff reasonable and doesn't change other passing tests' behavior
X. Other (please specify)

[Answer]: A. Minimal patch only — add the missing field to each existing mock literal, touch nothing else (smallest possible diff, per the project's already-learned bugfix convention)

## Q4 (follow-up to Q2): pinning down "scenario-appropriate"

Q2's answer ("evaluate case by case") is a judgment call, not a concrete rule
— per Requirements Analysis's mandatory ambiguity check, this needs to be
made concrete before Code Generation, not left open-ended. Concretely:

- In `products.test.tsx`, all 7 mocks back `createProductWithVehicle`/
  `useCreateProduct` — a NEWLY CREATED product, which is unpublished by
  definition. `false` is unambiguous there regardless of "scenario."
- In `reverseTransitions.test.tsx`, the single shared `mockProductResponse()`
  helper backs the mocked server response for all 4 undo transitions
  (reverse/resubmit/restore/revert-sale). None of the 9 tests in that file
  assert on `published_to_marketplace` itself (confirmed by the developer's
  scan) — the field is only there because the schema requires it to parse
  the mock at all.

Given that, does "scenario-appropriate" mean: default every mock to `false`
(safe, matches precedent, no test asserts otherwise), and only deviate from
`false` for a SPECIFIC mock if, while implementing, the developer finds a
test whose narrative genuinely requires a different value to pass or to stay
faithful to the domain (e.g. a mock explicitly representing an already-
published product) — rather than picking values speculatively up front?

A. Yes — default to false everywhere; only deviate per-mock if the implementation genuinely requires it (verified against real test assertions/domain lifecycle, not guessed in advance)
B. No — I want to specify exact values for specific mocks right now (please tell me which ones)
X. Other (please specify)

[Answer]: A. Yes — default to false everywhere; only deviate per-mock if the implementation genuinely requires it (verified against real test assertions/domain lifecycle, not guessed in advance)

## Consolidated Summary Confirmation

- Alcance ampliado a 3 archivos: `products.test.tsx`, `reverseTransitions.test.tsx`, y `setProductCover.test.ts` (mismo síntoma sospechado, no verificado en profundidad todavía).
- Causa raíz confirmada por Reverse Engineering: `productSchema` requiere `published_to_marketplace` (sin `.optional()`) desde el commit `7315fdf2` (2026-08-22); los mocks de los 3 archivos nunca fueron actualizados tras ese cambio (a diferencia del archivo hermano `products.test.ts`, que sí se arregló en el mismo commit).
- Regla concreta para el valor del mock: `false` por defecto en todos los mocks; desviar de `false` en un mock puntual solo si, durante la implementación, se verifica que un test específico realmente lo necesita (no se adivinan valores de antemano).
- Estilo de fix: patch mínimo — agregar el campo faltante a cada mock/literal existente, sin refactors ni consolidación de fixtures compartidas.
- Piso de test (bugfix, Test Strategy Minimal): no se agregan tests nuevos — el objetivo es que los tests ya existentes (11 actualmente fallando en products.test.tsx/reverseTransitions.test.tsx, más los que resulten fallando en setProductCover.test.ts) vuelvan a pasar, y que el resto de la suite frontend siga en verde.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
