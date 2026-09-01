# Unit Test Instructions — useEffect → React Query (onboarding / invite)

## Framework and setup

- **Framework**: Vitest + `@testing-library/react` (already configured — `apps/web/vitest.config.ts`, no new runner setup needed).
- **Query wrapper pattern** (already established by `apps/web/src/lib/api/leads.test.tsx` and `apps/web/src/components/leads/TeamLeadList.test.tsx`): each test creates a fresh `new QueryClient({ defaultOptions: { queries: { retry: false } } })` and wraps the component/hook under test in `<QueryClientProvider client={queryClient}>`.
- **Mocking**: mock `orgApi.getMyOrganization` / `teamApi.acceptInvitation` at the module level (`vi.mock`) rather than mocking `fetch` directly — matches the existing convention in this area (both API clients are plain objects with methods, easy to mock per-method).
- **Router**: mock `next/navigation`'s `useRouter`/`useParams` (`vi.mock("next/navigation", ...)`), asserting on the mock's `push`/`replace` calls.

## Run command (exact, unit-scoped)

```bash
pnpm --filter web exec vitest run tests/app/onboarding/page.test.tsx tests/app/invite/\[token\]/page.test.tsx
```

(Both new test files together — this bugfix touches exactly these two components; no broader suite re-run needed for this stage's scope, though Build and Test will run the full suite per NFR2.)

## Test strategy: Minimal (bugfix floor)

One test per requirement at the narrowest effective level (component test), covering happy path + the documented error/edge scenarios per FR — approximately 7 tests total across the two files, within the Minimal ~5-15 range.

## `apps/web/tests/app/onboarding/page.test.tsx`

1. **Happy path — org exists, setup incomplete** (FR1.1, FR1.2): mock `orgApi.getMyOrganization` to resolve `{ ...org, setup_complete: false }`; render; wait for the fetching spinner to disappear; assert Step 1 renders with `org.name` pre-filled as the default value; assert `router.replace` was NOT called.
2. **Setup-complete redirect** (FR1.2): mock `orgApi.getMyOrganization` to resolve `{ ...org, setup_complete: true }`; render; wait for `router.replace` to have been called with `"/dashboard"`.
3. **No org / fetch error** (FR1.2, preserves original catch-and-continue behavior): mock `orgApi.getMyOrganization` to reject; render; wait for the fetching spinner to disappear; assert Step 1 renders with an empty default name (no crash, no error UI shown — matches the original's silent-catch behavior), and `router.replace` was NOT called.

## `apps/web/tests/app/invite/[token]/page.test.tsx`

4. **Happy path — invitation accepted** (FR2.1, FR2.2): mock `teamApi.acceptInvitation` to resolve a `TeamMember`; render with a valid token param; assert the success state renders ("¡Bienvenido al equipo!"); advance fake timers 2000ms; assert `router.push` was called with `"/dashboard?welcome=team"`.
5. **Expired token** (FR2.2, FR2.3): mock `teamApi.acceptInvitation` to reject with `new ApiError("Invitation expired", 410)`; render; assert the expired state renders with the expected message; assert no redirect timer fires for this state.
6. **Already a member** (FR2.2, FR2.3): mock `teamApi.acceptInvitation` to reject with `new ApiError("User is already a member", 409)`; render; assert the already_member state renders; advance fake timers 2000ms; assert `router.push` was called with `"/dashboard"`.
7. **No token param** (FR2.1 guard, FR2.4): render with `params.token` undefined; assert the error state renders with "No se proporcionó el token de invitación"; assert `teamApi.acceptInvitation` (the mocked mutation fn) was NEVER called — proves the anti-double-fire/no-token guard short-circuits before triggering the mutation.

## Coverage target

These 7 tests plus the existing suite satisfy: (a) the Minimal strategy's one-test-per-requirement + happy-path floor, (b) the `bugfix` scope's targeted-regression floor (both prior `useEffect` violations are directly exercised), and (c) NFR2 (existing suite stays green — no other file is touched). No integration or E2E test files are added: per the already-affirmed project practice for UI-kind changes with no service/domain crossing, and per requirements.md (no NFR performance/security target for this bugfix), component tests already exercise the real interaction end-to-end within the page component's boundary.

## Mocking/stubbing guidance

- Do not mock `@tanstack/react-query` itself — use the real `QueryClient`/`QueryClientProvider` with `retry: false` so `useQuery`/`useMutation` behave as they will in production, just without retry-induced test flakiness/slowness.
- Use `vi.useFakeTimers()` for the two `setTimeout(..., 2000)` redirect assertions (tests 4 and 6); restore real timers in `afterEach`.

## Test data management

No fixtures beyond inline mock objects (`Organization`, `TeamMember` shapes) — both are small, page-local test doubles; no shared fixture file needed for this scope.
