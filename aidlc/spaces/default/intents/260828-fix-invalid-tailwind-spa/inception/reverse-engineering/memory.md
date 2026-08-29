<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-28T23:55:00Z — Dispatched the Step 2 developer code scan with only a soft suggestion to use graphify ("check for it and use it"); the agent's returned Scan Coverage shows zero graphify query/explain/path calls and instead did full manual file-by-file reads and grep, even though `graphify-out/graph.json` existed and was fresh (generated same day, before dispatch) and this project's CLAUDE.md mandates graphify-first for codebase questions. User caught this and asked why the scan didn't use graphify. Correct approach going forward: brief scan/reverse-engineering dispatches with a MANDATORY Step 0 — use graphify query/explain/path first for structure/relationships/dependencies, and reserve raw Read calls only for literal values that must be quoted exactly (pinned versions, config strings) and business-purpose narrative graphify's AST graph doesn't capture. Also check graphify freshness (`graphify update .`) before trusting it, since a stale graph reintroduces the same problem a rescan is meant to fix.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
