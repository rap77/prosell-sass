# Test Results — Export Cross-Org Permission

Intent: `260910-export-cross-org` (scope: bugfix)
Executed: 2026-09-10T23:26:29Z

## Build Status

**SUCCESS** — no compile/bundle step (Python backend). Verification:

- `ruff check` on the two changed files: **All checks passed!**
- `pyright` on the two changed files: **0 errors, 0 warnings, 0 informations**

## Test Results

### Targeted suite: `tests/integration/api/routers/test_product_router_export_client_format.py`

```
============================== 10 passed in 0.93s ==============================
```

| Test                                                                                                      | Result                                      |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `TestExportClientFormatContract::test_returns_zip_content_type_and_disposition`                           | PASSED                                      |
| `TestExportClientFormatStatusCodes::test_empty_catalog_returns_404`                                       | PASSED                                      |
| `TestExportClientFormatStatusCodes::test_non_published_products_do_not_count`                             | PASSED                                      |
| `TestExportClientFormatStatusCodes::test_cap_exceeded_returns_413`                                        | PASSED                                      |
| `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear`                   | PASSED                                      |
| `TestExportClientFormatCrossOrgPermission::test_super_admin_with_organization_id_sees_target_org_catalog` | PASSED (FR1.2, FR4.2 — targeted regression) |
| `TestExportClientFormatCrossOrgPermission::test_non_admin_with_organization_id_returns_403`               | PASSED (FR1.3, FR4.3)                       |
| `TestExportClientFormatCrossOrgPermission::test_nonexistent_organization_id_behaves_like_empty_catalog`   | PASSED (FR1.5)                              |
| `TestExportClientFormatCrossOrgPermission::test_cross_org_export_is_audited`                              | PASSED (FR2.1)                              |
| `TestExportClientFormatCrossOrgPermission::test_own_org_export_is_not_audited`                            | PASSED (FR2.2)                              |

### Regression: `tests/integration/api/test_featured_route.py` (shared `_check_org_scope_permission()` guard)

```
============================== 1 passed in 0.20s ===============================
```

### Full backend suite (`uv run pytest -q`, mandated per `project.md` — full suite green before merge)

```
============================ 2006 passed in 51.33s =============================
```

No failures, no regressions. This confirms the earlier "13 pre-existing frontend test failures" note (unrelated, frontend, and already fixed per `project.md` learning 260901) has no backend counterpart, and this change introduces no new backend failures.

## Coverage Report

No `--cov-fail-under` gate on this backend (per `team.md` Testing Posture, intentional asymmetry) — coverage not blocking. All 5 new FR-touching behaviors (FR1.2, FR1.3, FR1.5, FR2.1, FR2.2) have a dedicated passing test; FR1.1/FR1.4/FR3.1/FR4.1/NFR1/NFR3 are covered transitively by the same 10-test file (see `cross-unit-traceability.md`).

## Failure Details

None — build and all test runs succeeded on the first attempt. The failure-escalation ladder (Step 10) was not triggered.
