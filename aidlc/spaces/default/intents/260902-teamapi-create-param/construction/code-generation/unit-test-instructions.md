# Unit Test Instructions — Fix teamApi.create mismatch parameter

## Test Framework Setup

No new framework/config needed — reusing the project's existing runners.

- **Frontend**: Vitest + Testing Library, already configured (`apps/web/vitest.config.ts`).
- **Backend**: pytest + pytest-asyncio, already configured (`apps/api/pyproject.toml`). The new backend tests use `httpx.AsyncClient`/`ASGITransport` with mocked repositories — no database container needed (same pattern as `test_team_invitation_api.py`).

## How to Run

Frontend (from repo root):

```bash
pnpm --filter web exec vitest run src/hooks/useTeams.test.ts src/components/teams/TeamSwitcher.test.tsx ../../tests/components/forms/TeamForm.test.tsx
```

Backend (from `apps/api`):

```bash
uv run pytest tests/contract/schema_matching/test_team_schema_drift.py tests/integration/api/test_team_api.py -q
```

Both commands are scoped to only the files this fix touches or adds — never the full suite (that is Build and Test's job).

## Expected Coverage Targets

Minimal test strategy + bugfix scope floor: one targeted regression for the defect, existing suite stays green. No new coverage-percentage target — the project has no backend coverage floor and an existing frontend floor (`lines:40 functions:40 branches:75 statements:40`) that this change does not need to move.

## Test List (~5 total: 3 updated existing + 2 new)

1. **`useTeams.test.ts`** (updated, not new) — "creates team when calling createTeam" now asserts `mockCreateTeam` was called with `{name, org_id}`; mock `Team` fixtures use `org_id`.
2. **`TeamSwitcher.test.tsx`** (updated, not new) — mock `Team` fixtures use `org_id` instead of `organization_id` so they satisfy the `Team`/`TeamListResponse` types.
3. **`TeamForm.test.tsx`** (updated, not new) — "calls createTeam with name on submit" now asserts the store action was called with `org_id: "org-123"`.
4. **`test_team_api.py`** (new, backend integration, happy path) — `POST /api/v1/teams` with `{"name": "Sales Team", "org_id": "<uuid>"}` (the corrected frontend wire shape) returns `201` and a body containing `org_id`. This is the targeted regression for the reported bug: it proves the real backend accepts what the fixed frontend now sends.
5. **`test_team_schema_drift.py`** (new, backend contract/schema-matching, 2 assertions) — `CreateTeamRequest` Pydantic fields vs. `teamApi.ts`'s `CreateTeamRequest` TS interface fields share `org_id` (not `organization_id`); `TeamResponse` Pydantic fields vs. `TeamSchema` (Zod) fields share `org_id` (not `organization_id`). This is the permanent structural regression against the bug class.

## Mocking/Stubbing Guidance

- Backend integration test: mock `get_team_repository` via `app.dependency_overrides` (per `test_team_invitation_api.py`'s established pattern) and `get_current_auth_user_from_cookie` for the authenticated-user dependency. No real database.
- Frontend test updates: no new mocking — only literal field-name edits inside already-mocked objects/assertions.

## Test Data Management

No fixtures or seed data needed. All test data is inline (mock objects, UUID literals) — consistent with the existing `test_team_invitation_api.py` and `useTeams.test.ts` patterns.
