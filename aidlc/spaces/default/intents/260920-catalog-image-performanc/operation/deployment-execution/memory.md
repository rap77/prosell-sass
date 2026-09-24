<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-24T04:35:00Z — Ran Step 2/3 (pre-deployment checks, execute deployment) conversationally, with explicit human confirmation gates before each consequential git action (commit, pull --rebase, push), rather than through the file-backed questions flow first — the actual work (diagnosing a diverged `main`, staging/committing, fixing real GGA findings, rebasing, pushing, monitoring CI/staging deploy, smoke-testing) happened before this stage's formal Q&A file was written. `deployment-execution-questions.md` was written retroactively to document what was confirmed. Same deviation category already recorded for `observability-setup` in a prior intent — no harm since the human explicitly approved the consequential actions in real time.
- 2026-09-24T04:35:00Z — The staging admin password documented in project memory (`Admin123#`) is stale/wrong. The actual working password is `Admin123!` — `scripts/seed-staging-admin.sql` (run automatically by `deploy.yml` on every staging deploy) hardcodes this value and re-applies it every time, overriding whatever the memory note claimed was corrected. Confirmed by testing both values against a fresh deploy.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-24T04:35:00Z — Discovered during smoke testing: application-level `logger.info()` calls (used throughout the backend, including this intent's NFR4.1/NFR4.2 audit logging) never reach `docker logs` in production — no `logging.basicConfig()` exists anywhere in the app, so the root logger defaults to Python's `WARNING` level and silently drops every `INFO` call from `prosell.*` loggers. Uvicorn's own access-log lines are unaffected (uvicorn configures its own loggers independently). This is pre-existing and project-wide, not introduced by this intent — flagged to the human, not fixed here (would expand this bugfix's scope into an application-wide observability change). Worth a dedicated fast-follow intent.
- 2026-09-24T04:35:00Z — Staging currently has zero published products with any image data (`image_urls` empty, no `cover_image_key`/`thumbnail_image_key` on either test product used for the smoke test) — the new batch endpoint could only be smoke-tested against the "no cover at all" empty-response path, not the signed-URL-returned path. A fuller manual/staging verification with a product that actually has images would give more confidence before promoting to production.
