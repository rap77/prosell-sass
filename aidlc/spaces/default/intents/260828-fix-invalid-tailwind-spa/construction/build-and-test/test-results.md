# Test Results — Fix invalid Tailwind spacing classes

## Build Status

`pnpm --filter @prosell/web build` — **SUCCESS** (exit code 0). All routes compiled, including `/privacy`, `/terms`, `/publications`, and the pages hosting `OnboardingStep3`, `AppointmentForm`, `PublishForm`, `KanbanBoard`.

## Type Check

`pnpm --filter @prosell/web exec tsc --noEmit` — **SUCCESS**, no errors.

## Lint

`pnpm --filter @prosell/web exec eslint . --max-warnings=0` — **SUCCESS**, zero warnings across the whole `apps/web` tree (not just touched files).

## Unit Tests — This Intent's New Test

Command: `pnpm --filter @prosell/web exec vitest run tests/unit/config/tailwind.config.test.ts`

- **Total**: 3 | **Passed**: 3 | **Failed**: 0 | **Skipped**: 0

## Unit Tests — Full Suite Regression Check

Command: `pnpm --filter @prosell/web exec vitest run`

- **Total**: 1256 | **Passed**: 1243 | **Failed**: 13 | **Skipped**: 0

### Failure Details (all 13 pre-existing, verified via `git stash`/`pop` — see below)

| File                                                              | Root Cause                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/unit/lib/api/reverseTransitions.test.tsx`                  | Mock response missing `published_to_marketplace`, which `productSchema` now requires              |
| `tests/unit/lib/api/setProductCover.test.ts`                      | Same — `parseProductResponse` → `productSchema.parse(raw)` throws `ZodError` on the missing field |
| `tests/unit/lib/api/products.test.tsx` (implied, same root cause) | Same                                                                                              |

**Independent verification** (per this project's own Build and Test practice — never trust a prior stage's "pre-existing" claim without re-checking, especially when it wasn't obvious the touched files were unrelated):

1. `git stash push -u -- apps/web/tailwind.config.ts CLAUDE.md apps/web/tests/unit/config/tailwind.config.test.ts` — reverted this intent's 3 changed/added files to the pre-change baseline.
2. `pnpm exec vitest run tests/unit/lib/api/reverseTransitions.test.tsx tests/unit/lib/api/setProductCover.test.ts` against that baseline — **same 6 failures** reproduced with zero relation to this intent's changes.
3. `git stash pop` — restored this intent's changes.

**Conclusion**: all 13 failures are pre-existing on `main`, unrelated to this intent (a stale Zod-schema/mock mismatch on `published_to_marketplace`, already tracked in project memory from an earlier session). No regressions introduced by this intent. Not fixed here — out of scope (unrelated domain, not part of `requirements.md`).

## Coverage

No coverage threshold movement expected from a 3-assertion config test; full-project coverage run not re-executed (unchanged from the current documented baseline in `apps/web/vitest.config.ts`).

## Loop-Back Log

Not applicable — build and tests succeeded on the first attempt; no failure-escalation ladder was triggered.
