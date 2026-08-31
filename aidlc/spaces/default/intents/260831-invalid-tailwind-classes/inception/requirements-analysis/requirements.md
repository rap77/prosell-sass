# Requirements — Fix Invalid Tailwind Classes (publications/page.tsx)

Intent: `260831-invalid-tailwind-classes` | Scope: bugfix | Depth: Minimal | Project type: Brownfield

## Sources

- `[desc]` Initial description: "Fix invalid Tailwind CSS classes (h-9.5, px-4.5, and similar fractional spacing/sizing utilities...) across [5 files]... following the same pattern already used to fix BulkUploadCSV.tsx in the prior intent 260828-fix-invalid-tailwind-spa."
- `[memory:M1]` Reverse Engineering (focused scan) — `reverse-engineering-timestamp.md`, `code-quality-assessment.md` §33-35, `component-inventory.md` § Inventario de bug: reframed the intent's real scope. Commit `624819e3` (already merged to `main` before this intent started) resolved the `h-9.5`/`px-4.5`/`h-8.5` family in all 4 originally-suspected files. The only file with confirmed, re-verified invalid classes is `apps/web/src/app/(seller)/publications/page.tsx`, with a different, previously uncatalogued fractional family (`.25`/`.75`).
- `[Q1]` User answer: fix scope limited to `publications/page.tsx` only.
- `[Q2]` User answer: treat the `.25`/`.75` values as potentially intentional — preserve the exact value, do not assume typo.
- `[Q3]` User answer: fix mechanism is extending `tailwind.config.ts`'s `theme.extend.spacing`, not inline arbitrary-value syntax.

## Intent Analysis

The user wants the invalid-CSS-class bug family fixed: certain Tailwind utility classes in this codebase use fractional spacing steps (e.g. `gap-1.25`, `p-0.75`) that do not exist in Tailwind 3.4.17's default scale and are not covered by this project's `tailwind.config.ts` extension. These classes compile to empty CSS — a silent layout bug (no build error, no lint warning) where the intended spacing simply does not render.

Reverse Engineering's focused scan established that most of the originally-described bug instances were already fixed by a prior, unrelated commit (`624819e3`) that extended the config for the `.5`-family fractions (`4.5`, `8.5`, `9.5`). The genuinely open bug today is narrower than the intent's initial description: 5 occurrences of a different fractional family (`.25`/`.75`) in one file, `apps/web/src/app/(seller)/publications/page.tsx`.

The goal is to make these 5 classes render their intended spacing, using the same "extend the config" pattern the codebase already established for the `.5` family, so the fix is consistent with precedent and reusable if this fractional family appears elsewhere later.

## Functional Requirements

### FR1: Extend Tailwind spacing scale to cover the `.25`/`.75` fractional steps

**FR1.1** — The system shall add `"0.25"` and `"0.75"` entries to `theme.extend.spacing` in `apps/web/tailwind.config.ts`, with pixel values computed from Tailwind's standard spacing formula (`step × 0.25rem` = `step × 4px`): `"0.25": "1px"`, `"0.75": "3px"`.

**FR1.2** — The system shall NOT remove or modify the existing `"4.5"`, `"8.5"`, `"9.5"` entries already present in `theme.extend.spacing` (added by commit `624819e3`).

### FR2: Fix `publications/page.tsx` to use the extended, valid classes

**FR2.1** — The system shall ensure the 5 known occurrences of invalid classes in `apps/web/src/app/(seller)/publications/page.tsx` — `gap-1.25` (lines 208, 488), `p-0.75` (line 479), `mt-0.25` (line 524), `mb-0.75` (line 594) — compile to non-empty CSS after the fix. Since FR1 makes these exact class names valid via the config extension, this requirement is satisfied by FR1 alone — no source-line edits to `publications/page.tsx` are required, PROVIDED the visual result after FR1 is confirmed to look correct (see Open Questions).

**FR2.2** — The system shall NOT modify any file outside `apps/web/tailwind.config.ts` and its backing test as part of this fix (explicit out-of-scope boundary — see Out of Scope).

### FR3: Test coverage for the config change

**FR3.1** — The system shall add test coverage confirming `"0.25"` and `"0.75"` are present in `theme.extend.spacing` with the correct pixel values, following the existing pattern in `apps/web/tests/unit/config/tailwind.config.test.ts` (one assertion/test per step, matching the 3 existing tests for `4.5`/`8.5`/`9.5`).

## Non-Functional Requirements

None identified. This is a config-value bugfix with no performance, security, scalability, or reliability targets beyond "the existing test suite and lint/typecheck remain green" (covered by the team's standard bugfix testing posture, not a new NFR).

## Constraints

- **C1**: The project remains on `tailwindcss: 3.4.17` — this is NOT a Tailwind 4 migration. No class-syntax or engine changes beyond the spacing-scale extension.
- **C2**: Team testing posture (bugfix scope, Minimal test strategy): a targeted regression for the specific bug is required; the existing suite must remain green. No new integration/E2E artifacts are warranted for a pure config-value change.
- **C3**: Fix mechanism is fixed by user decision (Q3): extend `tailwind.config.ts`, not inline arbitrary-value classes.

## Assumptions

- **A1**: The pixel values `1px` (`0.25 × 4px`) and `3px` (`0.75 × 4px`) are the correct interpretation of the fractional step formula, consistent with how `4.5`/`8.5`/`9.5` were computed by commit `624819e3` (`4.5 × 4px = 18px`... actually verify against the existing config values directly at Code Generation time rather than assuming the formula holds exactly — see Open Questions). Owner: Code Generation. Status: unvalidated.

## Out of Scope

- Fixing the same `.25`/`.75` pattern in `PublicationStatus.tsx`, `LeadStatusBadge.tsx`, or `ProductImageGallery.tsx` (heretofore catalogued in the codekb from a prior scan pass, not re-verified in this intent's focused scan). Explicitly deferred to a future intent per user decision (Q1).
- Any Tailwind 3→4 migration work.
- Fixing the CLAUDE.md "TailwindCSS 4" documentation drift at "Key Conventions" line ~194 (separately tracked, out of this intent's approved FR3 boundary per prior intent `260828-fix-invalid-tailwind-spa`).

## Open Questions

- **OQ1**: FR1's exact pixel values (`0.25` → `1px`, `0.75` → `3px`) should be verified against the actual rem-to-px formula the existing `4.5`/`8.5`/`9.5` entries use in `tailwind.config.ts`, rather than assumed from the general Tailwind formula — Code Generation must read the file directly and confirm the pattern before writing new entries.
- **OQ2**: Whether the resulting visual spacing at the 5 line locations in `publications/page.tsx` looks correct once the config extension makes the classes valid is not something this stage can verify from static analysis. If Code Generation or Build and Test finds the rendered spacing looks visually wrong (e.g. via a screenshot check), that is new information the user should confirm before considering the fix complete — this was accepted as a residual risk by the user's Q2 answer ("preserve the exact value, don't assume typo").

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-31T11:43:39Z
**Iteration:** 1

### Findings

| #   | Severity | Location      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major    | FR1.1         | Verified against the live `apps/web/tailwind.config.ts` (lines 132-135): the existing `4.5`/`8.5`/`9.5` entries are written as **rem** strings (`"1.125rem"`, `"2.125rem"`, `"2.375rem"` — i.e. `step × 0.25rem`), not px. FR1.1 nonetheless states a hard "shall" requirement with **px** string literals (`"0.25": "1px"`, `"0.75": "3px"`). Numerically equivalent (`1px = 0.0625rem`, `3px = 0.1875rem`), but a different unit than the precedent FR1.2 requires be left untouched — rem scales with the user's root font-size/zoom, px does not, so this is a real (if small) behavioral divergence from the established pattern, not just a formatting nit. FR1.1's "shall" phrasing reads as a fixed literal, while Assumption A1 and OQ1 simultaneously tell Code Generation not to trust that literal and to re-derive it from the file. The two instructions in the same artifact point in different directions. | Either state FR1.1's target values in rem (`"0.0625rem"`, `"0.1875rem"`) to match the file's own convention, or explicitly say the literal in FR1.1 is illustrative only and the rem-based precedent format governs — don't leave both a "shall" literal and a contradicting "don't assume" caveat live at once. Given OQ1 already directs Code Generation to verify before writing, this is not blocking, but the human should confirm which literal is the actual intent before Code Generation runs. |
| 2   | Minor    | Sources / FR1 | Q2's answer (`C`) textually resolves to "use arbitrary-value syntax (option B)" as the fix mechanism, but Q3's later, more specific answer (`B`: extend `tailwind.config.ts`) supersedes it for the mechanism, while only the "preserve exact value, don't assume typo" part of Q2 survives into the requirement. The artifact applies this resolution correctly (C3, FR1) but never states the supersession explicitly, so a reader comparing the raw Q&A file to `requirements.md` could mistake it for an unflagged contradiction.                                                                                                                                                                                                                                                                                                                                                                                      | Add a one-line note under Sources or Constraints: "Q3's mechanism choice supersedes the syntax detail in Q2's answer; Q2's 'preserve exact value' intent is carried into FR1 regardless."                                                                                                                                                                                                                                                                                                               |
| 3   | Minor    | Sources       | Confirmed the 5 line/class occurrences cited (208, 488 `gap-1.25`; 479 `p-0.75`; 524 `mt-0.25`; 594 `mb-0.75`) match the live file exactly — good, evidence-grounded. The `[memory:M1]` citation covers Reverse Engineering's own artifacts but the stage's `consumes[]` also lists `business-overview`/`architecture`/`code-structure` (conditional on brownfield); none of the three codekb docs are cited directly, only the RE memory shard. For a fix this narrow the omission is immaterial to correctness, but note it in case the `upstream-coverage` sensor flags it.                                                                                                                                                                                                                                                                                                                                             | No action required unless the sensor fires; if it does, a one-line acknowledgment that those three docs are not relevant to a single-file config change would satisfy it.                                                                                                                                                                                                                                                                                                                               |

### Summary

The artifact follows the stage's required structure fully (Intent Analysis, FR/NFR with stable IDs, Constraints, Assumptions, Out of Scope, Open Questions), traces cleanly to the Q&A answers, and every factual claim I spot-checked against the live repo (config values, the 5 flagged class occurrences and their line numbers) held up exactly as stated — no invented claims found. FR2.1's dependency on FR1 is testable and FR3.1 gives Code Generation a concrete test pattern to follow. The one substantive gap is the px/rem unit mismatch in FR1.1 against the file's own rem-based precedent (Finding 1); it's self-flagged via OQ1/A1 as needing verification, which keeps this from blocking, but the human approving the gate should notice the tension between the "shall...1px" literal and the "don't assume the formula holds" caveat sitting in the same document.
