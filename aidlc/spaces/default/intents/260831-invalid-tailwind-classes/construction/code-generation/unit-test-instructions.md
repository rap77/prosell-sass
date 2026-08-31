# Unit Test Instructions — Fix Invalid Tailwind Classes (publications/page.tsx)

## Test Framework

Vitest, already configured for `apps/web` (`apps/web/vitest.config.ts`). No new runner or config needed — this fix reuses the existing config-test pattern in `apps/web/tests/unit/config/tailwind.config.test.ts`.

## Run Command (scoped to this fix only)

```bash
cd apps/web && npx vitest run tests/unit/config/tailwind.config.test.ts
```

This is the exact unit-scoped command — do not use the unscoped `pnpm test` / `npm test` (would run the whole `apps/web` suite).

## Tests (2 new, requirement-driven — Minimal strategy: 1 test per requirement)

Add to `apps/web/tests/unit/config/tailwind.config.test.ts`, following the exact pattern of the 3 existing tests (dynamic `import`, `toMatchObject` assertion on `config.default.theme?.extend?.spacing`):

1. **FR1.1 (`0.25` step)** — `should extend spacing with the 0.25 step (0.0625rem / 1px)`: asserts `theme.extend.spacing["0.25"] === "0.0625rem"`.
2. **FR1.1 (`0.75` step)** — `should extend spacing with the 0.75 step (0.1875rem / 3px)`: asserts `theme.extend.spacing["0.75"] === "0.1875rem"`.

## Scope Floor (bugfix — targeted regression)

The two tests above ARE the targeted regression for this bug: they fail against the pre-fix config (missing `0.25`/`0.75` entries) and pass once Step 1 of the plan lands. No additional integration/E2E test is warranted — this is a pure build-config value, and the existing `tailwind.config.test.ts` file/pattern is itself the established regression mechanism for this exact bug family (see the `4.5`/`8.5`/`9.5` precedent tests already in the file).

## Coverage Target

100% of the two new config entries covered by direct assertion — matches the existing file's coverage approach (every `theme.extend.spacing` entry gets its own test).

## Mocking / Stubbing

None needed — the test imports the real `tailwind.config.ts` module directly, same as the 3 existing tests.

## Test Data Management

None — no fixtures or external data; the config object itself is the subject under test.
