# Requirements — 260901-frontend-test-debt

## Intent analysis

The user wants to eliminate a specific, already-diagnosed slice of
pre-existing frontend unit-test debt: `products.test.tsx` and
`reverseTransitions.test.tsx` are failing in the `main` baseline, not
because of a regression, but because their mocks of the `Product` shape
were never updated after a schema field became required. The underlying
goal is a fully green frontend test suite for this area with zero
production-code behavior change — this is test-fixture maintenance, not a
feature or a bugfix in application logic.

During Requirements Analysis the user chose to widen the verbatim-named
scope by one file (`setProductCover.test.ts`), after Reverse Engineering
flagged it as sharing the identical symptom and Code Generation-scope
verification (see FR3) confirmed it live.

## Functional Requirements

### FR1 — Fix `products.test.tsx` mocks

**FR1.1** Every `Product`-shaped mock object in
`apps/web/tests/unit/api/products.test.tsx` that is consumed by
`parseProductResponse()` (directly or via a hook under test) MUST include
`published_to_marketplace: false`. Confirmed sites (developer scan, live
`pnpm vitest run`): 7 mock literals across the file (`mockProduct` at
lines ~54, 115, 174, 298, 357, 408, and one inline response object at
lines ~512-533).

**FR1.2** After the fix, all 12 tests in this file MUST pass. Before the
fix: 7 failing (all on the success path that reaches
`parseProductResponse()`), 5 passing (error-path tests that never reach
the parse call and are unaffected — do not touch these).

### FR2 — Fix `reverseTransitions.test.tsx` mocks

**FR2.1** The shared `mockProductResponse()` helper (lines ~38-58) in
`apps/web/tests/unit/lib/api/reverseTransitions.test.tsx` MUST include
`published_to_marketplace: false` in its base object. This single fix
point backs all 4 undo-transition mutations under test
(`useReverseProduct`, `useResubmitProduct`, `useRestoreProduct`,
`useRevertSaleProduct`).

**FR2.2** After the fix, all 9 tests in this file MUST pass. Before the
fix: 4 failing (the 4 mutations above, all timing out in `waitFor` because
the mutation's `queryFn` throws before `onSuccess` fires), 5 passing
(2 `useAvailableTransitions` tests + 2 `useProductAuditLogs` tests, which
use unrelated schemas, plus 1 error-path test — do not touch these).

### FR3 — Fix `setProductCover.test.ts` mocks

**FR3.1** The `productFixture()` helper (lines 23-43) in
`apps/web/tests/unit/lib/api/setProductCover.test.ts` MUST include
`published_to_marketplace: false` in its base object. **Correction to the
Reverse Engineering artifact**: `reverse-engineering-timestamp.md` /
`architecture.md` named this file's path as
`apps/web/tests/unit/components/upload/setProductCover.test.ts`; the real
path, confirmed live in this stage, is
`apps/web/tests/unit/lib/api/setProductCover.test.ts`. Code Generation
MUST use the real path.

**FR3.2** After the fix, all 3 tests in this file MUST pass. Confirmed
live in this stage (`pnpm vitest run tests/unit/lib/api/setProductCover.test.ts`):
2 of 3 failing with the identical `ZodError` on `published_to_marketplace`
(both reach `setProductCover()` → `parseProductResponse()`), 1 passing
(the 422-rejection error-path test, which never reaches the parse call).

### FR4 — No production-code or other-test changes

**FR4.1** The fix MUST be limited to adding the missing
`published_to_marketplace` field to the mock objects identified in FR1-FR3.
No change to `apps/web/src/lib/api/products.ts` (the schema/source code) is
required or permitted — the schema already correctly mirrors the backend
contract (`apps/api/src/prosell/domain/entities/product.py`,
`infrastructure/models/product_model.py`: `nullable=False, default=False`).

**FR4.2** Every currently-passing test in the three files (13 total: 5 +
5 + 1, plus the two green error-path tests already counted in FR1.2/FR2.2/
FR3.2) MUST remain passing and MUST NOT be modified.

**FR4.3** No shared mock factory, fixture consolidation, or structural
refactor of the three files' test helpers is in scope — each mock literal
is patched individually (or, where a file already shares one helper
function per FR2.1/FR3.1, that single helper is patched once).

## Non-Functional Requirements

**NFR1** (regression floor, per team's affirmed bugfix testing posture):
after the fix, the full frontend suite (`pnpm test` in `apps/web`) MUST
remain green outside of the pre-existing, unrelated failing baseline
already documented in project memory (independent of `published_to_marketplace`).
No new test file is added — this is a targeted regression fix, not new
feature coverage.

## Constraints

- **C1**: Every mock's `published_to_marketplace` value defaults to
  `false`. A mock may only use a different value if, during Code
  Generation, a specific test is found to genuinely require it (verified
  against the test's actual assertions or the domain lifecycle in
  `codekb/prosell-sass/business-overview.md` — never guessed speculatively
  in advance). No mock is currently known to require `true`.
- **C2**: Diff surface is minimized — patch each existing mock literal /
  shared helper in place; do not introduce new fixture files or shared
  factories (see FR4.3).
- **C3**: `apps/web/tests/unit/lib/api/products.test.tsx` (note: `.ts`, not
  `.tsx`) is the sibling file already fixed by commit `7315fdf2` and is the
  exact precedent pattern to replicate (`published_to_marketplace: false,`
  added next to existing fields) — out of scope itself (already green), but
  the reference implementation for FR1-FR3.

## Assumptions

- **A1**: `false` is an acceptable literal for every mock's
  `published_to_marketplace` unless Code Generation finds concrete evidence
  otherwise (see C1). Rationale: none of the 21 tests across the two RE-analyzed
  files assert on this field's value directly, and the 3 newly-confirmed
  `setProductCover.test.ts` tests likewise don't assert on it — the field
  exists in the mocks solely to satisfy the Zod schema's parse step.
- **A2**: The three files' currently-passing tests (13 total, listed in
  FR1.2/FR2.2/FR3.2) have no other pre-existing failure unrelated to this
  root cause — confirmed by live test runs in Reverse Engineering (products.test.tsx,
  reverseTransitions.test.tsx) and in this stage (setProductCover.test.ts).

## Out of scope

- Any of the other pre-existing frontend test failures documented in
  project memory that are unrelated to `published_to_marketplace` (this
  intent's title and verbatim description name only this specific debt).
- Fixing or backfilling `apps/web/src/lib/api/products.ts` itself — it is
  already correct.
- Consolidating the duplicated `ApiError`/mock-shape patterns across the
  three test files into a shared test utility (a legitimate future
  cleanup, but explicitly declined for this intent per FR4.3/Q3).
- Any Tailwind, useEffect-to-React-Query, or other unrelated technical debt
  already tracked in separate intents (`260828-*`, `260830-*`, `260831-*`).

## Open questions

- **OQ1**: None blocking Code Generation — the root cause is confirmed by
  live test execution for all three files, and the fix is mechanical per
  C1/C2. Flagged only as informational: if a future audit finds additional
  `Product`-mock call sites elsewhere in the frontend suite sharing this
  same root cause, they are explicitly out of scope for this intent (see
  "Out of scope") and should be raised as a separate intent, consistent
  with the project's already-learned convention of not expanding scope
  without asking.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-01T23:59:37Z
**Iteration:** 1

### Findings

| #   | Severity | Location | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major    | NFR1     | NFR1's pass/fail criterion carves out "the pre-existing, unrelated failing baseline already documented in project memory (independent of `published_to_marketplace`)". A live `pnpm vitest run` of the full `apps/web` suite (verified in this review, 163 files / 1272 tests) shows exactly 13 failing tests, and all 13 are the three files this intent targets (`products.test.tsx`: 7, `reverseTransitions.test.tsx`: 4, `setProductCover.test.ts`: 2) — zero failures anywhere else in the suite. The "pre-existing, unrelated ... independent of `published_to_marketplace`" baseline this NFR references does not currently exist in the repo; the project-memory entry it appears to paraphrase (`project.md`, "Hay 13 tests frontend pre-existentes fallando...") describes this exact same 13-test set, not a separate one. As written, the carve-out is unverifiable (QA cannot point to what it excludes) and risks being misread during Build and Test as license to leave some subset of these same three files red. | Rewrite NFR1's criterion as unconditional for the current baseline: "after the fix, the full frontend suite (`pnpm test` in `apps/web`) MUST be 100% green (currently 1259/1272 passing, 13 failing — all in the three target files)." If the intent means to hedge against _future_ unrelated regressions discovered mid-implementation, say that explicitly instead of citing a "documented" baseline that isn't independently verifiable today. |
| 2   | Minor    | FR4.2    | The parenthetical "(13 total: 5 + 5 + 1, ...)" is an arithmetic error — 5 + 5 + 1 = 11, not 13, and 11 matches the actual live-verified currently-passing count across the three files (confirmed in this review: 5 passing in `products.test.tsx`, 5 in `reverseTransitions.test.tsx`, 1 in `setProductCover.test.ts`). The "13" appears to be carried over from the project-memory entry describing 13 _failing_ tests (the mirror-image count), not the passing count FR4.2 is actually enumerating.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Correct "13 total" to "11 total" in FR4.2, or drop the redundant total and keep only the per-file breakdown (5 + 5 + 1), which is already correct and sufficient.                                                                                                                                                                                                                                                                                  |

### Summary

All load-bearing factual claims were independently re-verified against the real files and a live `pnpm vitest run`: the FR1–FR3 line numbers, mock counts, and pass/fail splits per file are exactly correct (12/9/3 tests, 7/4/2 failing, 5/5/1 passing); the `setProductCover.test.ts` path correction is accurate (no stale duplicate exists at the codekb's claimed `components/upload/` path); the precedent commit `7315fdf2` and its schema tightening (`published_to_marketplace: z.boolean().optional()` → `z.boolean()`) are confirmed; and the backend schema claim in FR4.1 (`nullable=False, default=False`) matches `product_model.py`. Every FR/NFR/constraint traces cleanly to either the verbatim intent, Reverse Engineering, or an explicit Q&A answer (Q1/Q2/Q3/Q4 answers are faithfully reflected in FR3, C1/A1, and FR4.3/C2 respectively) — no invented requirements found. The two findings above are both about the accuracy of secondary/summary arithmetic and framing (an unverifiable NFR carve-out and a wrong subtotal), not about the core fix instructions, which are unambiguous and directly testable by running the three files. Neither blocks a developer from implementing correctly, but both should be corrected before or during Code Generation to avoid confusion when someone tries to reconcile the numbers against a live test run.
