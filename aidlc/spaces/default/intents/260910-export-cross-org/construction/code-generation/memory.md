<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-10T00:00:00Z — reconfirmed the zero-Unit code-generation workaround (generate directly in the developer role instead of Task/Agent dispatch) to avoid the known plan-approval-guard path-doubling bug; computed the Plan Approval fingerprint via a direct `bun -e` call to `approvalFingerprint()` instead of the CLI's `--unit` subcommand.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-10T00:00:00Z — implemented the audit requirement (FR2/NFR2) as a plain `logger.info()` call rather than a new DB table; a dedicated audit table would be over-engineering for a Minimal-depth bugfix, and the codebase already has a lightweight logging precedent in this exact file (bulk-upload preview logging).

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-10T00:00:00Z — `get_category_filter_values`/`list_products` have no dedicated integration test file in the repo (only `get_featured_products` does, via `test_featured_route.py`) — a pre-existing coverage gap on the shared `_check_org_scope_permission()` guard, not introduced by this bugfix, flagged by the reviewer for whoever next touches that guard.
