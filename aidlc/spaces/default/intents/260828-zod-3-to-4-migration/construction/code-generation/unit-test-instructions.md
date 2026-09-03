# Unit Test Instructions — Zod 3 → Zod 4 Migration

## Test Framework Setup

Vitest is already configured for `apps/web` (`vitest.config.ts`, `pnpm test` → `vitest`). No new configuration needed.

## Test Scope (Minimal strategy — requirement-driven)

| Requirement                                | Test file                                                                                    | What it verifies                                                                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1 (`.passthrough()` → `z.looseObject()`) | `apps/web/tests/unit/lib/api/zod4-loose-object.test.ts`                                      | A migrated schema (`OrganizationSchema` from `schemas/organizations.ts`) still tolerates unknown backend fields after switching to `z.looseObject()`, and a migrated strict schema (`UserResponseSchema`) still rejects missing required fields.                             |
| FR1.4 (`UnifiedProductForm` outlier)       | same file, two more `it` blocks                                                              | The new `FIXED_FIELDS_SCHEMA_LOOSE` variant used at line 483 tolerates extra category attributes (loose), while `FIXED_FIELDS_SCHEMA` (used at line 290 via `.merge()`) still strips unknown fields via plain `z.object()` semantics (unchanged).                            |
| FR2 (`z.nativeEnum()` → `z.enum()`)        | `apps/web/tests/unit/lib/api/zod4-enum-migration.test.ts`                                    | `LeadStatus`/`AppointmentStatus` schemas still accept a valid enum member and reject an invalid string, after switching from `z.nativeEnum(Enum)` to `z.enum(Enum)`.                                                                                                         |
| FR5 (`profile/page.tsx:28` email field)    | `apps/web/tests/unit/lib/schemas/profile-schema.test.ts`                                     | The profile form's email validation (now `z.email({ error: ... })`) accepts a valid email and rejects an invalid one with the expected Spanish message. `profileSchema` was exported from the page for direct testability (narrowest level — no component rendering needed). |
| FR3 (AGENTS.md exception block)            | none — verified via Step 12's pre-commit/GGA dry run, not a unit test (documentation change) | —                                                                                                                                                                                                                                                                            |
| FR4 (delete `zod-resolver.ts`)             | none — verified via `tsc --noEmit` (Step 13) catching any dangling import                    | —                                                                                                                                                                                                                                                                            |

Total: 10 new tests across 3 new files (~5-15 tests is the Minimal-strategy target range; this migration's testable surface is small because it is a syntax-only change with no new business logic).

## Run Commands (unit-scoped, per stage-protocol.md requirement)

```bash
cd apps/web && pnpm vitest run tests/unit/lib/api/zod4-loose-object.test.ts tests/unit/lib/api/zod4-enum-migration.test.ts tests/unit/lib/schemas/profile-schema.test.ts
```

Full existing suite (NFR1 regression check, run once at the end — Step 13):

```bash
cd apps/web && pnpm vitest run
```

## Coverage Targets

No new coverage floor beyond the team's existing frontend threshold (`vitest.config.ts`: lines 40% / functions 40% / branches 75% / statements 40%) — this scope (`refactor`) adds no extra new-test floor per `org.md`/`team.md` Testing Posture.

## Mocking/Stubbing Guidance

None needed — these are pure Zod schema parse tests, no network/API mocking required.

## Test Data Strategy

Use small inline literal objects representative of real backend responses (e.g., one extra unknown field to prove passthrough/looseObject tolerance). No factories needed given the narrow scope.
