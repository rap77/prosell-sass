# Test Results — useEffect → React Query (onboarding / invite)

## Build status

**SUCCESS.**

```
$ pnpm --filter web exec tsc --noEmit -p .
(clean, exit 0)

$ pnpm --filter web build
(completed successfully — /onboarding and /invite/[token] listed as dynamic routes, no build-time errors)
```

## Unit test results (this intent's tests)

Command from `unit-test-instructions.md`:

```
$ pnpm --filter web exec vitest run tests/app/onboarding/page.test.tsx "tests/app/invite/[token]/page.test.tsx"
✓ tests/app/invite/[token]/page.test.tsx (4 tests)
✓ tests/app/onboarding/page.test.tsx (3 tests)
Test Files  2 passed (2)
     Tests  7 passed (7)
```

All 7 tests pass: onboarding happy path, onboarding setup-complete redirect, onboarding no-org/fetch-error path, invite happy path + redirect, invite expired-token path, invite already-member path + redirect, invite no-token guard.

## Full repo test suite (NFR2: existing suite stays green)

```
$ pnpm --filter web exec vitest run
Test Files  3 failed | 160 passed (163)
     Tests  13 failed | 1261 passed (1274)
```

**13 failures are pre-existing and unrelated to this intent** — confirmed independently via `git stash`/`pop` per project practice (never trust a prior stage's "pre-existing" claim without re-verifying):

1. Stashed the 4 files this intent modified (`orgApi.ts`, `teamApi.ts`, `onboarding/page.tsx`, `invite/[token]/page.tsx`).
2. Re-ran the 3 failing test files (`tests/unit/api/products.test.tsx`, `tests/unit/lib/api/reverseTransitions.test.tsx`, `tests/unit/lib/api/setProductCover.test.ts`) against that unmodified baseline.
3. Result: same 13 failures, same assertions (missing `published_to_marketplace` field in test mocks vs. the real schema, and related `useResubmitProduct`/`useRestoreProduct`/`useRevertSaleProduct` mutation-success assertions) — identical to the documented pre-existing baseline in `project.md` (already flagged in an earlier session, unrelated to any specific batch).
4. Restored the 4 files (`git stash pop`).

None of the 4 files this intent touches (`orgApi.ts`, `teamApi.ts`, `onboarding/page.tsx`, `invite/[token]/page.tsx`) are imported by, or related to, the failing test files (`products.ts`/`products.test.tsx`, `reverseTransitions.ts`, `setProductCover.ts`) — confirms NFR2 is satisfied: this change introduces zero new failures.

## Coverage report

Not collected in this run (Vitest coverage reporter not invoked) — consistent with the Minimal test strategy, which does not require a coverage-percentage gate for a `bugfix` scope change (only the targeted regression + green-suite floor).

## Integration / performance / security test instructions

Not generated — Test Strategy is **Minimal** for this workflow, and this stage's own instructions state "Minimal strategy — generate no additional test instruction files. Unit tests are covered per-unit by Code Generation." No NFR performance or security targets exist in `requirements.md` to justify an exception (consistent with the already-affirmed project practice for this exact scenario).

## Known limitations / outstanding items

- The architecture reviewer's advisory Major finding from Code Generation (potential double-`mutate()` call under React 18 Strict Mode dev double-invoke in `invite/[token]/page.tsx`) was accepted as-is at that stage's gate — not re-tested here, since it is a dev-only Strict Mode concern with no automated regression test written for it (would require simulating React's Strict Mode double-effect-invoke, which the current test setup does not do). Flagged again here for visibility at this gate.
