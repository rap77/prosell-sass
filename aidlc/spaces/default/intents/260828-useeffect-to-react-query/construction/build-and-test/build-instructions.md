# Build Instructions — useEffect → React Query (onboarding / invite)

Frontend-only bugfix (`apps/web`) — no backend build, migration, or container changes. Consumes `code-generation-plan.md`, `unit-test-instructions.md`, and `code-summary.md` from the zero-Unit `construction/code-generation/` record.

## Dependency installation

No new dependencies added — `@tanstack/react-query` was already installed (`^5.0.0`, confirmed in `apps/web/package.json` and already used by `notificationsApi.ts`/`leads.ts`). Standard monorepo install is sufficient if a clean checkout is needed:

```bash
pnpm install
```

## Environment setup

No new env vars, config files, or local services required. The two touched pages (`onboarding/page.tsx`, `invite/[token]/page.tsx`) already ran against the existing dev stack (`ReactQueryProvider` already wired at the app root).

## Build commands

```bash
pnpm --filter web exec tsc --noEmit -p .
pnpm --filter web build
```

## Build verification

- `tsc --noEmit` must exit 0 with no errors touching `orgApi.ts`, `teamApi.ts`, `onboarding/page.tsx`, or `invite/[token]/page.tsx` (already verified during Code Generation — re-verified in Step 10 below against the current tree).
- `pnpm --filter web build` must complete without new build-time errors in the touched routes.

## Troubleshooting common build issues

- **`useMyOrganization is not a function` / `useAcceptInvitation is not a function`**: the hooks are standalone exports from `orgApi.ts`/`teamApi.ts` (same pattern as `notificationsApi.ts`), not methods on the `orgApi`/`teamApi` objects — import them directly (`import { useMyOrganization } from "@/lib/api/orgApi"`), never call `orgApi.useMyOrganization()`. (Hit and fixed once already during Code Generation — see `code-summary.md`.)
- **Type errors on `Organization | undefined`**: `useQuery`'s `data` is `Organization | undefined`, not `Organization | null` — call sites already use optional chaining (`org?.name`) and truthy checks (`if (org)`), both of which tolerate `undefined` the same as `null`.
