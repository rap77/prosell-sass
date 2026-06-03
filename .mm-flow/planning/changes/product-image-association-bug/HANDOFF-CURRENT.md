# Handoff — product-image-association-bug

## Current objective
- `product-image-association-bug` — P0 production incident on prosellweb.com
- Active since 2026-06-03

## Decisions already made
- Single source of truth: `products.image_urls` top-level JSONB column
- Legacy `product_images` table will be dropped (verified 0 rows in prod)
- Workflow: mm-flow scaffolding + TDD (RED → GREEN → REFACTOR) as engineering technique
- Deploy sequence: local (tests green) → staging (smoke test) → prod (maintenance window)
- No patches, no `--no-verify`, no AI attribution on commits

## What was done in 2026-06-03 session
- Phase 1 root cause investigation: COMPLETE
- Read 20+ files: hooks, DTOs, use cases, migrations, env config
- Verified prod state on server: 4 commands (alembic, \\d products, env, DB queries)
- 3 initial hypotheses proven wrong: not the migration, not the region, not the credentials
- Real root cause found: schema mismatch between frontend write (`attributes.image_urls`) and backend read (`products.image_urls` top-level)
- engram session summary saved

## Blockers / risks
- None blocking; prod has the bug but data is recoverable
- Maintenance window for prod deploy needs to be scheduled with user
- T3 (failing tests) requires the test environment to be running and configured

## Context (for the next session)
- Three inconsistent image storage locations in the system (see `requirements.md`)
- The frontend `create/page.tsx:59` is the bug site for the write
- The use cases `create_product.py` and `bulk_upload_vehicles.py:286` are the bug sites for the read/write coordination
- DO Spaces config is correct; `remotePatterns` in `next.config.ts` is correct; `useProductImageUrls` hook is correct
- The `product_images` legacy table is empty in prod and a candidate for drop

## Exact next recommended task
- `/mm:complete-task T3 --brief` (start with the 3 failing tests)

## Validation commands
- `cd apps/api && uv run pytest tests/integration/test_create_product_image_urls.py -v` (should FAIL initially)
- `cd apps/web && pnpm test --filter products` (should FAIL initially)
- After GREEN: `cd apps/api && uv run pytest` (full suite, 1124 tests should pass)
- `cd apps/web && pnpm test` (full suite, 840 tests should pass)
- Manual: drag-and-drop test in `https://staging.prosell.saas/catalog/create`
