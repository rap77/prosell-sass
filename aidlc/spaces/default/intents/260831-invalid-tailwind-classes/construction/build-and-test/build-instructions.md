# Build Instructions — Fix Invalid Tailwind Classes (publications/page.tsx)

## Dependency Installation

No new dependencies added — `pnpm install` at the repo root is already satisfied by the existing lockfile. No action needed for this fix.

## Environment Setup

None required. This is a pure config-value + test-file change in `apps/web` — no env vars, no config files, no local services (DB/Redis) needed to build or test it.

## Build Commands

```bash
cd apps/web && npx next build
```

This compiles the Next.js app, including running Tailwind's JIT compiler against `tailwind.config.ts` and all `className` usages — the load-bearing verification that the two new `theme.extend.spacing` entries parse correctly and that `publications/page.tsx`'s `gap-1.25`/`p-0.75`/`mt-0.25`/`mb-0.75` classes now resolve.

## Build Verification Steps

1. Build exits 0.
2. No new TypeScript errors (Next.js build includes type-checking).
3. No new build warnings referencing `tailwind.config.ts` or `publications/page.tsx`.

## Troubleshooting Common Build Issues

- If the build fails on an unrelated pre-existing issue (not touching `tailwind.config.ts` or the touched test file), treat it as a pre-existing baseline failure per the project's established convention (verify with `git stash`/`pop` against the pre-fix baseline before attributing it to this change).
- Tailwind class changes never cause a _build failure_ on their own (an unmatched utility class simply compiles to no CSS, not an error) — this bug class is a silent runtime/visual defect, not a build blocker. The build succeeding does not by itself prove the spacing renders correctly; the unit tests in `tailwind.config.test.ts` are the load-bearing regression for the actual fix.
