# Build Instructions — Fix invalid Tailwind spacing classes

## Dependency Installation

No new dependencies. Existing install is sufficient:

```bash
pnpm install
```

## Environment Setup

No new env vars or config files. The change is scoped to `apps/web/tailwind.config.ts` (build-time config, no runtime env dependency) and `CLAUDE.md` (documentation only).

## Build Commands

```bash
pnpm --filter @prosell/web build
```

Tailwind's JIT compiler reads `theme.extend.spacing` at build time — the new `4.5`/`8.5`/`9.5` steps are picked up automatically, no separate CSS build step.

## Build Verification Steps

1. `pnpm --filter @prosell/web build` completes with exit code 0.
2. `pnpm --filter @prosell/web exec tsc --noEmit` — no new type errors.
3. `pnpm --filter @prosell/web exec eslint tailwind.config.ts tests/unit/config/tailwind.config.test.ts` — no lint violations on touched files.

## Troubleshooting

- If a `h-9.5`/`px-4.5`/`h-8.5` class still renders with no visible spacing after the build, confirm `theme.extend.spacing` (not `theme.spacing`) carries the three keys — an accidental override of `theme.spacing` would silently drop Tailwind's entire default scale.
- If the config test fails to import `tailwind.config.ts`, confirm the file still `export default`s the `Config` object (no change expected here, but flagged as the only way this specific test could break).
