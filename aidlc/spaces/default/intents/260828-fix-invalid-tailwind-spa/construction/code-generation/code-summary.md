# Code Summary — Fix invalid Tailwind spacing classes

## Files Created

- `apps/web/tests/unit/config/tailwind.config.test.ts` — 3 assertions verifying `theme.extend.spacing` carries `4.5` → `1.125rem`, `8.5` → `2.125rem`, `9.5` → `2.375rem`

## Files Modified

- `apps/web/tailwind.config.ts` — added `theme.extend.spacing` with the three missing half-steps (`4.5`, `8.5`, `9.5`), additive to the default scale
- `CLAUDE.md` (root) — corrected the "Tech Stack 2026" table row `Styling | TailwindCSS | 4.0` → `3.4.17` (FR3)

No changes were made to the 7 files that use the previously-invalid classes (`privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx`, `OnboardingStep3.tsx`, `AppointmentForm.tsx`, `PublishForm.tsx`, `KanbanBoard.tsx`) — their existing `h-9.5`/`px-4.5`/`h-8.5` className strings now resolve to valid CSS once the theme extension landed. Verified by `rg` grep confirming all 13 instances are present and unchanged (FR2.1–FR2.7).

## Key Implementation Decisions

- **Additive `theme.extend.spacing`, not `theme.spacing` override**: preserves Tailwind 3's entire default scale (including the `0.5`–`3.5` half-steps already used elsewhere in the project) — matches C2 from `requirements.md`.
- **Values expressed in `rem`**, consistent with the rest of the default scale's convention (not `px`), per FR1.2.
- **Test file location**: `apps/web/tests/unit/config/tailwind.config.test.ts`, not `apps/web/tests/config/tailwind-spacing.test.ts` as originally sketched in `unit-test-instructions.md` — discovered during generation that `apps/web/tests/unit/config/next.config.test.ts` already establishes this exact pattern (config-level test co-located under `tests/unit/config/`, named `<config-file>.test.ts`). Followed the existing precedent instead of introducing a second, inconsistent config-test location. Scope and assertions are unchanged from the approved plan — only the path.
- **No markup changes**: the fix is entirely config-level; FR2.1–FR2.7 are satisfied automatically once FR1 lands, verified by grep rather than a code change.

## Test Coverage Summary

- 1 new test file, 3 tests, all passing (`pnpm --filter @prosell/web exec vitest run tests/unit/config/tailwind.config.test.ts`)
- Existing test/lint/typecheck: `eslint` and `tsc --noEmit` both clean on the touched files; full-suite regression check deferred to Build and Test (3.6) per the stage split

## Deviations from the Plan

- Test file path changed from `apps/web/tests/config/tailwind-spacing.test.ts` (as sketched in `unit-test-instructions.md`) to `apps/web/tests/unit/config/tailwind.config.test.ts`, matching the existing `next.config.test.ts` precedent. Substance (3 assertions, same values) unchanged.
- **Not fixed, flagged for a follow-up**: `CLAUDE.md` line ~194 ("Key Conventions" → "TailwindCSS 4: New engine, no `var()` in className") repeats the same Tailwind-version drift as the Tech Stack table, but was outside FR3's stated scope (which named only the Tech Stack table). Left untouched to respect the approved plan; worth a one-line follow-up fix whenever this file is next touched.
