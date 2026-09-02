# Unit Test Instructions — 260901-frontend-test-debt

## Test Framework

Vitest (already configured, `apps/web/vitest.config.ts`) + Testing Library.
No new configuration needed.

## Scope

Minimal strategy + bugfix scope floor: no new test files. The targeted
regression IS the 3 already-existing failing test files turning green.

## Exact Run Commands (unit-scoped, from `apps/web/`)

- `pnpm vitest run tests/unit/api/products.test.tsx`
- `pnpm vitest run tests/unit/lib/api/reverseTransitions.test.tsx`
- `pnpm vitest run tests/unit/lib/api/setProductCover.test.ts`

## Expected Outcome

| File                        | Before              | After               |
| --------------------------- | ------------------- | ------------------- |
| products.test.tsx           | 12 tests, 7 failing | 12 tests, 0 failing |
| reverseTransitions.test.tsx | 9 tests, 4 failing  | 9 tests, 0 failing  |
| setProductCover.test.ts     | 3 tests, 2 failing  | 3 tests, 0 failing  |

Total: 24 tests, 13 currently failing → 0 failing after the fix.

## Coverage Targets

No new coverage target — this is a fixture-only fix on already-covered code.
The existing `vitest.config.ts` thresholds (`lines:40 functions:40
branches:75 statements:40`) are unaffected.

## Mocking/Stubbing Guidance

Each of the 3 files already mocks `global.fetch` (or `parseProductResponse`'s
upstream `fetch` response) and constructs `Product`-shaped literal objects.
The fix is: add `published_to_marketplace: false` to every such literal
(per requirements.md C1 — deviate from `false` only if a specific test is
found, during implementation, to genuinely require a different value).

## Test Data Management

No fixtures beyond the in-file literal mocks already present. Do not extract
a shared factory (requirements.md FR4.3/C2 — minimal patch only).
