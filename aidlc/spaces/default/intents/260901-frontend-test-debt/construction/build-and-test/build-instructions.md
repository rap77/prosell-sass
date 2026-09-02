# Build Instructions — 260901-frontend-test-debt

## Scope

Zero-Unit stage-level equivalent (no Units Generation for this bugfix). This
intent touched only test files (`apps/web/tests/unit/...`), so there is no
new dependency, no new environment variable, and no new build artifact.

## Dependency Installation

None required — no `package.json` change. Existing `apps/web` install
(`pnpm install`, already present) is sufficient.

## Environment Setup

None required — the touched tests run against mocked `fetch`, no real
backend/DB/service dependency.

## Build Commands

**Convention note (already established, project memory)**: this project does
not run a full production build (`pnpm build` / `next build`) as a smoke
test in AI-DLC stages — `tsc --noEmit` + `eslint` are the substitute
verification. Both already ran clean in Code Generation on the 3 touched
files/project (see `code-summary.md`), and are re-confirmed in Step 10 below.

- Typecheck: `pnpm exec tsc --noEmit` (run from `apps/web/`)
- Lint (touched files): `pnpm exec eslint tests/unit/api/products.test.tsx tests/unit/lib/api/reverseTransitions.test.tsx tests/unit/lib/api/setProductCover.test.ts` (run from `apps/web/`)

## Build Verification Steps

1. `pnpm exec tsc --noEmit` exits 0.
2. `pnpm exec eslint` on the touched files exits 0 with no warnings.

## Troubleshooting

Not applicable — no build step introduced by this intent's change.
