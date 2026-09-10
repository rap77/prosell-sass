# Code Generation — Plan Approval

Intent: `260910-export-cross-org` (scope: bugfix, zero-Unit)

## Plan Approval

Review `code-generation-plan.md` and `unit-test-instructions.md` in this directory. The plan modifies `export_catalog_client_format()` in `apps/api/src/prosell/infrastructure/api/routers/product_router.py` to accept an optional `organization_id` query parameter, reusing the existing `_check_org_scope_permission()` guard (same pattern as `list_products`), adds a fail-open audit log line for cross-org exports, updates the endpoint's docstring, and adds/updates 6 integration tests.

[Approval Fingerprint]: sha256:e7dea2abfb465bb6b690bdf66bbe9a150a75a2ac202b7b650a2ba83cc7204267

- Approve Plan
- Request Changes

[Answer]: Approve Plan
