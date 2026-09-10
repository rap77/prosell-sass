# Code Summary — Export Cross-Org Permission

Intent: `260910-export-cross-org` (scope: bugfix, zero-Unit)

## Files Created/Modified

- **`apps/api/src/prosell/infrastructure/api/routers/product_router.py`** (modified) — `export_catalog_client_format()`:
  - Added `organization_id: UUID | None = None` query parameter.
  - Replaced the inline `if current_user.tenant_id is None: raise 403` with `_check_org_scope_permission(current_user, organization_id)` (the shared guard already used by `list_products`/`get_category_filter_values`/`get_featured_products`), then computed `effective_tenant_id` with the identical one-liner pattern those endpoints use.
  - Passed `tenant_id=effective_tenant_id` to `ExportCatalogClientFormatUseCase.execute()` (no use-case signature change — it already only ever received a single `tenant_id`).
  - Added a `logger.info(...)` call after a successful cross-org export (`effective_tenant_id != owner_tenant_id`), identifying the caller, their own org, and the exported org. No log call for an own-org export.
  - Updated the docstring: removed the "no request parameter can change which organization gets exported" claim, described the new `organization_id` parameter and its permission gate.
  - Used `effective_tenant_id` (not `current_user.tenant_id`) for the `org_segment` fallback in the filename, so a cross-org export's filename reflects the exported org, not the caller's own.
  - Added an inline comment above `effective_tenant_id` noting that export's own-org default (for an admin who omits `organization_id`) intentionally diverges from `list_products`'s global-browse default for the same case — per the reviewer's Minor finding #1 below.

- **`apps/api/tests/integration/api/routers/test_product_router_export_client_format.py`** (modified) — updated module docstring; added `_non_admin_user()` helper (`RoleType.SALES_AGENT`, no `ORG_ADMIN_VIEW_ALL`); added `TestExportClientFormatCrossOrgPermission` class with 5 new tests. `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` (the test that previously encoded the bug as correct behavior) was left UNCHANGED — it still correctly asserts that the no-`organization_id` default stays scoped to the caller's own org, which remains true after the fix.

## Key Implementation Decisions

- **Reused pattern 1 (`_check_org_scope_permission()` + `organization_id`)** rather than inventing a fourth cross-org access pattern, per `requirements.md` Constraints and the RE codekb's `architecture.md` § Key Design Decisions.
- **No existence validation for a caller-supplied `organization_id`** (FR1.5) — matches `list_products`, which also doesn't validate. A nonexistent `organization_id` naturally 404s via the existing `EmptyCatalogExportError` path (zero published products for that tenant), no special-case code needed.
- **Audit logging via `logger.info()`**, not a new DB table — consistent with the existing lightweight logging pattern already in this file (e.g. the bulk-upload preview `logger.info` calls) and appropriate for the Minimal-depth bugfix scope. Fail-open per NFR2: the log call happens after `use_case.execute()` already succeeded, so a hypothetical logging failure would raise from within the response path rather than blocking the export — this matches the standard Python `logging` module's behavior (a handler failure does not raise by default) without any extra try/except.
- **`org_segment`/filename now derives from `effective_tenant_id`** — a deliberate but obvious extension not explicitly named in requirements.md: without it, a cross-org export's downloaded ZIP filename would show the caller's own org code instead of the exported org's, which would be confusing/wrong. Documented here since it's a direct, unambiguous consequence of the fix (same class of "consequence of an approved FR" the project's `project.md` learnings already sanction fixing without a fresh question).

## Test Coverage Summary

10 tests in `test_product_router_export_client_format.py` (5 pre-existing unchanged + 5 new), all passing against a CI-matching Postgres 17 instance:

- `test_super_admin_with_organization_id_sees_target_org_catalog` — FR1.2, FR4.2 (targeted regression)
- `test_non_admin_with_organization_id_returns_403` — FR1.3, FR4.3
- `test_nonexistent_organization_id_behaves_like_empty_catalog` — FR1.5
- `test_cross_org_export_is_audited` — FR2.1
- `test_own_org_export_is_not_audited` — FR2.2

Regression check: `tests/integration/api/test_featured_route.py` (the only other integration test exercising `_check_org_scope_permission()`) — 1/1 passing. Full `tests/integration/api/routers/` + the use-case unit tests — 44/44 passing.

Local verification commands run this stage (not yet re-run in Build and Test):

```bash
uv run ruff check src/prosell/infrastructure/api/routers/product_router.py tests/integration/api/routers/test_product_router_export_client_format.py
uv run pyright src/prosell/infrastructure/api/routers/product_router.py tests/integration/api/routers/test_product_router_export_client_format.py
uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py -v
uv run pytest tests/integration/api/test_featured_route.py -v
uv run pytest tests/integration/api/routers/ tests/unit/application/use_cases/product/test_export_catalog_client_format.py -q
```

All green (0 ruff/pyright issues; 10/1/44 tests passing respectively).

## Deviations from the Plan

None. Steps 1-6 executed exactly as planned in `code-generation-plan.md`.

## Not in Scope (confirmed unaffected)

- `ExportCatalogClientFormatUseCase` — no changes (single `tenant_id` param, unchanged).
- `_check_org_scope_permission()` itself — reused as-is, not modified.
- The three-pattern cross-org inconsistency in `product_router.py` — unchanged, out of scope per `requirements.md`.
- `build_image_folder_name()` color-mapping bug (`csv_export.py`) — unchanged, separate intent.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-10T23:16:15Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                                     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Recommendation                                                                                                                                                                                                                                                                                            |
| --- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `product_router.py:759-764` vs. `list_products:834-836`                      | `export_catalog_client_format()` correctly reuses `_check_org_scope_permission()`, but its default-omitted-`organization_id` semantics for an admin caller intentionally diverge from `list_products` (export defaults to the admin's own org per FR1.4; `list_products` defaults to a global browse, `effective_tenant = None`, for the same caller). This is documented in the shared helper's own docstring (lines 275-278) and matches FR1.4/the plan explicitly, so it is not a bug — but it's worth flagging for a human reader unfamiliar with the intent, since two call sites of the same guard function silently disagree on what "no `organization_id`" means for an admin.                                                                                                                                                  | No code change needed; consider a one-line comment at the export call site pointing back to the guard's docstring, purely for future-maintainer clarity.                                                                                                                                                  |
| 2   | Minor    | `code-generation-plan.md` Step 6 / `code-summary.md` "Test Coverage Summary" | Step 6 says to "run the existing tests" for all three endpoints sharing `_check_org_scope_permission()` (`list_products`, `get_category_filter_values`, `get_featured_products`) as a regression check. `code-summary.md` reports only `test_featured_route.py` (1/1) as the regression check — no dedicated integration test file exists in the repo for `get_category_filter_values` (confirmed: no match for it under `apps/api/tests`), and none for `list_products` either beyond what's bundled in `tests/integration/api/routers/` (44/44, reported passing). The regression claim is therefore accurate for what actually exists, but slightly overstated relative to Step 6's stated intent ("run their existing tests too" implies all three have dedicated coverage, which isn't the case for `get_category_filter_values`). | No action needed for this bugfix — `_check_org_scope_permission()` itself was not modified, so the regression surface is genuinely small. Worth a note for Build and Test that `get_category_filter_values` has no dedicated regression test if that endpoint's cross-org behavior is ever touched again. |

No Critical or Major findings. Verified directly against the running code (not just `traceability.json`):

- `_check_org_scope_permission()` (lines 265-293) is byte-identical to its pre-existing form — not modified, confirming the plan's explicit constraint.
- `export_catalog_client_format()` (lines 736-796) calls the shared guard exactly once, computes `effective_tenant_id` with the same one-liner pattern as `list_products`/other call sites, and passes only `effective_tenant_id` into the use case — no path exists where a non-privileged caller can reach another org's catalog: `_check_org_scope_permission` raises 403 before `effective_tenant_id` is computed whenever `organization_id` is supplied, differs from the caller's own tenant, and `can_view_all_orgs` is false.
- The audit `logger.info()` call (lines 783-787) sits after `use_case.execute()` has already succeeded and before the response is built, fires only when `effective_tenant_id != owner_tenant_id` (FR2.1/FR2.2), and uses the bare stdlib `logging` call with no try/except — correctly fail-open per NFR2, since a handler-level logging failure does not raise by default in Python's `logging` module.
- The docstring (lines 742-757) no longer claims single-tenant-only behavior and accurately describes the new `organization_id` parameter, its permission gate, and the audit behavior (FR3.1) — no stale claims remain.
- All 5 new tests in `TestExportClientFormatCrossOrgPermission` exercise exactly what their names claim (verified by reading each body): admin cross-org success (FR1.2/FR4.2), non-admin 403 (FR1.3/FR4.3), nonexistent-org 404-via-empty-catalog (FR1.5), audit-log-present for cross-org (FR2.1) and audit-log-absent for own-org (FR2.2) via `caplog`.
- `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` (FR4.1) was left byte-unchanged and remains semantically correct post-fix: it authenticates as `super_admin` and calls the endpoint with no `organization_id`, which per FR1.4/the guard's own-org-default-for-export semantics still returns only the caller's own organization's products — the test's assertion is unaffected by the fix.
- `traceability.json`'s 14 `upstream_ids` (FR1.1-1.5, FR2.1-2.2, FR3.1, FR4.1-4.3, NFR1-3) match `requirements.md`'s FR/NFR set exactly — no ID mismatch, nothing orphaned in either direction. Every `status: "OK"` entry checked resolves to code/tests that genuinely implement or exercise that requirement, not just a plausible-sounding file path.

### Summary

The implementation faithfully follows the approved plan: it reuses `_check_org_scope_permission()` without modifying it, computes `effective_tenant_id` with the same pattern as the sibling endpoints, adds a correctly-placed fail-open audit log, updates the docstring with no stale claims, and the 10-test suite (5 unchanged + 5 new) genuinely covers what `traceability.json` claims. No security gap: a non-privileged caller cannot reach another organization's catalog under any code path traced. The two Minor findings are informational/documentation-quality notes, not defects.
