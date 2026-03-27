---
phase: 8
slug: layout-shell-vehicle-management-sidebar-header-navigation-crud-vehicles-bulk-upload-csv-drag-and-drop-image-upload-multi-publish-search-filter-sort-using-premium-ui-components-magicui-shadcn-ui-radix-ui
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-27
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend) + Pytest (backend) |
| **Config file** | `apps/web/vitest.config.ts` · `apps/api/pytest.ini` |
| **Quick run command** | `cd apps/web && pnpm test --run` (frontend) · `cd apps/api && uv run pytest -x` (backend) |
| **Full suite command** | `pnpm test` (all) · `cd apps/api && uv run pytest --cov` (backend coverage) |
| **Estimated runtime** | ~30 seconds (frontend) · ~45 seconds (backend) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/web && pnpm test --run` OR `cd apps/api && uv run pytest -x` (depending on task)
- **After every plan wave:** Run full suite with coverage
- **Before `/gsd:verify-work`:** Full suite must be green (80% coverage minimum)
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-00-01 | 00 | 0 | Infrastructure | unit | `cd apps/web && pnpm test tests/unit/components/datagrid/ -x` | ✅ | ⬜ pending |
| 08-00-02 | 00 | 0 | Infrastructure | unit | `cd apps/web && pnpm test tests/unit/components/layout/ -x` | ✅ | ⬜ pending |
| 08-00-03 | 00 | 0 | Infrastructure | unit | `cd apps/web && pnpm test tests/unit/components/upload/ -x` | ✅ | ⬜ pending |
| 08-00-04 | 00 | 0 | Infrastructure | unit | `cd apps/web && pnpm test tests/unit/hooks/ -x` | ✅ | ⬜ pending |
| 08-00-05 | 00 | 0 | Infrastructure | e2e | `cd apps/web && pnpm test tests/e2e/upload/ -x` | ✅ | ⬜ pending |
| 08-00-06 | 00 | 0 | Infrastructure | integration | `cd apps/api && uv run pytest tests/integration/bulk_upload/ -x` | ✅ | ⬜ pending |
| 08-01-01 | 01 | 1 | Layout Shell | component | `cd apps/web && pnpm test tests/unit/components/layout/Sidebar.test.tsx -x` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | Layout Shell | component | `cd apps/web && pnpm test tests/unit/components/layout/Header.test.tsx -x` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | DataGrid | component | `cd apps/web && pnpm test tests/unit/components/datagrid/DataGrid.test.tsx -x` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 2 | Single Upload | e2e | `cd apps/web && pnpm test tests/e2e/upload/ -x` | ✅ | ⬜ pending |
| 08-03-01 | 03 | 2 | Bulk Upload | integration | `cd apps/api && uv run pytest tests/integration/bulk_upload/ -x` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 2 | Cmd+K | component | `cd apps/web && pnpm test tests/unit/components/layout/CommandPalette.test.tsx -x` | ✅ | ⬜ pending |
| 08-03-03 | 03 | 2 | Filters | component | `cd apps/web && pnpm test tests/unit/components/filters/FilterSidebar.test.tsx -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/web/tests/unit/components/datagrid/DataGrid.test.tsx` — DataGrid component stubs
- [x] `apps/web/tests/unit/components/datagrid/DataGridRow.test.tsx` — Row component stubs
- [x] `apps/web/tests/unit/components/datagrid/StatusBadge.test.tsx` — Badge component stubs
- [x] `apps/web/tests/unit/components/layout/Sidebar.test.tsx` — Sidebar component stubs
- [x] `apps/web/tests/unit/components/layout/Header.test.tsx` — Header component stubs
- [x] `apps/web/tests/unit/components/layout/CommandPalette.test.tsx` — Cmd+K stubs
- [x] `apps/web/tests/unit/components/layout/MobileNav.test.tsx` — Mobile nav stubs
- [x] `apps/web/tests/unit/components/upload/BulkUpload.test.tsx` — Bulk upload stubs
- [x] `apps/web/tests/unit/components/upload/ImageDropzone.test.tsx` — Image dropzone stubs
- [x] `apps/web/tests/unit/components/upload/UploadProgress.test.tsx` — Progress stubs
- [x] `apps/web/tests/unit/components/filters/FilterSidebar.test.tsx` — Filters stubs
- [x] `apps/web/tests/unit/components/filters/FilterPills.test.tsx` — Filter pills stubs
- [x] `apps/web/tests/unit/hooks/useDataGrid.test.ts` — DataGrid hook stubs
- [x] `apps/web/tests/unit/hooks/useImageUpload.test.ts` — Upload hook stubs
- [x] `apps/web/tests/e2e/upload/` — E2E upload scenarios
- [x] `apps/api/tests/integration/bulk_upload/` — Bulk upload integration tests
- [x] `apps/web/tests/setup.ts` — Verify Testing Library setup
- [x] `apps/api/tests/conftest.py` — Verify Pytest fixtures

*Note: Wave 0 plan (08-00-PLAN.md) creates all 16 test stub files before execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| **Sidebar terminology validation** | UX req | Requires real seller feedback | Run guerrilla test with 3-5 sellers: show "Inventario/Ventas/Configuración" vs "Operations/Growth/System", capture preference |
| **DataGrid 1000+ rows performance** | SLO: <200ms p95 | Performance testing needs browser | Open DevTools Performance tab, load 1000 vehicles, measure interactive time |
| **Image upload to Cloudflare R2** | Integration | R2 presigned URL test | Upload 10 images (1-5MB each), verify presigned URL flow, check R2 bucket |
| **Multi-tenant isolation** | Security | Requires tenant context | Create vehicles in Tenant A, verify Tenant B cannot see them (use different sessions) |
| **Role-based access control** | Security | Requires auth context | Login as Seller, verify cannot access `/settings/tenant`. Login as Admin, verify access. |

*Note: Automated tests cover core logic. Manual verifications validate UX, performance, and security in real conditions.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (16 test files created via 08-00-PLAN.md)
- [x] No watch-mode flags (all tests use `--run`)
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase 8 — Layout Shell + Vehicle Management*
*Validation strategy created: 2026-03-27*
*Revised: 2026-03-27 (Wave 0 plan added, Nyquist compliant)*
