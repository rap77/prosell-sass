# Unit Test Instructions — Fix invalid Tailwind spacing classes

Test strategy: **Minimal** (requirement-driven, one verifiable test at the narrowest effective level + happy-path floor per component).

## Test Framework Setup

Existing project setup — no new configuration needed:

- Runner: Vitest (`apps/web/vitest.config.ts`, `environment: "jsdom"`)
- Package: `@prosell/web`

## Exact Run Command (scoped to this unit's test file only)

```bash
pnpm --filter @prosell/web exec vitest run tests/config/tailwind-spacing.test.ts
```

Verified runnable before Step 3 (Frontend behavior — write and run test): the existing Vitest runner/config in `apps/web/vitest.config.ts` already covers `.test.ts` files anywhere under `apps/web/`, no changes needed to run a new file at `apps/web/tests/config/tailwind-spacing.test.ts`.

## Tests to Write (1 file, 3 assertions — one per new spacing token, FR1)

`apps/web/tests/config/tailwind-spacing.test.ts`:

1. **Happy path — `4.5` spacing step**: `tailwindConfig.theme.extend.spacing["4.5"]` equals `"1.125rem"` (18px equivalent, matches the `px-4.5` instances in `privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx`, `AppointmentForm.tsx`)
2. **Happy path — `8.5` spacing step**: `tailwindConfig.theme.extend.spacing["8.5"]` equals `"2.125rem"` (34px equivalent, matches `KanbanBoard.tsx`)
3. **Happy path — `9.5` spacing step**: `tailwindConfig.theme.extend.spacing["9.5"]` equals `"2.375rem"` (38px equivalent, matches `OnboardingStep3.tsx`, `publications/page.tsx`, `PublishForm.tsx`)

This is the narrowest effective level per the Minimal strategy: the fix is entirely in `tailwind.config.ts`'s data (the theme scale), so asserting the config's shape directly verifies FR1 without needing a rendered-DOM/computed-style test (Tailwind's JIT compiler is not invoked under jsdom). FR2.1–FR2.7 (the 7 affected files) require no markup change and no new test — their existing className strings become valid once FR1's config change lands; this is verified by Step 4 of the code-generation plan (grep confirmation), not a new test.

## Coverage Targets

No new coverage threshold — the existing project floor (`lines:40 functions:40 branches:75 statements:40` in `apps/web/vitest.config.ts`) applies unchanged; a 3-assertion config test does not move it meaningfully.

## Mocking / Stubbing Guidance

None needed — direct import of `apps/web/tailwind.config.ts` and plain object assertions.

## Test Data Management

None needed — no fixtures, no external data.
