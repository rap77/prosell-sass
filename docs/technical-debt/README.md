# Technical Debt Tracker

> **Last Updated**: 2026-10-03
> **Total Items**: 3
> **Resolved**: 0
> **Pending**: 3

---

## 📋 Overview

This directory tracks technical debt items that require attention but are not blocking current development. Each debt item has:

- Detailed documentation
- Time estimate
- Priority level
- Implementation guide
- Resolution checklist

---

## 🎯 Current Technical Debt

### 1. OAuth External Setup (Google + Facebook)

**Status**: ⏳ Pending
**Priority**: P1 (High)
**Estimate**: 30 minutes
**Complexity**: Low
**Created**: 2026-02-20

**Description**:
OAuth code is 100% implemented but requires external OAuth app creation (Google Cloud Console + Meta Developers) to function.

**Impact**:

- OAuth login cannot be used without external credentials
- Not blocking other development (email/password login works)
- Required for production deployment

**Documentation**: [`oauth-external-setup.md`](./oauth-external-setup.md)

**What's Needed**:

1. Create Google OAuth app (15 min)
2. Create Facebook OAuth app (15 min)
3. Configure environment variables

**Next Steps**:

- See `oauth-external-setup.md` for complete implementation guide
- Can be done independently when needed
- No code changes required

### 2. Component Decomposition — Staged Mitigation Plan

**Status**: ⏳ Pending
**Priority**: Mixed (5 stages, Critical → Low, see the doc)
**Estimate**: ~6-8 weeks of incremental work
**Complexity**: High
**Created**: 2026-10-03

**Description**:
Full-codebase `react-doctor` scan (score 55/100, 252 findings) filtered to the 3 rules that are about structural
decomposition (`no-high-complexity-react-function`, `no-giant-component`, `only-export-components`) → 34 components
investigated for real responsibilities, SOLID/DRY violations, and existing test coverage, staged by criticality with
explicit dependencies between items and a non-regression protocol per extraction.

**Impact**:

- Not blocking — every stage is independently shippable, no feature depends on this completing
- 3 of the 34 (CatalogPage, UnifiedProductForm, useCatalogFilterPanelState/CatalogFilterPanel) already partially
  improved during the session that produced this plan
- Highest single-function complexity in the codebase (41/39, `SortableRow` in `category-schema-editor.tsx`) lives here

**Documentation**: [`component-decomposition-plan.md`](./component-decomposition-plan.md)

**What's Needed**:

1. Stage 1 (Critical, tested) — `category-schema-editor.tsx`, continue `UnifiedProductForm`, continue `CatalogPage`
2. Stage 2 (Critical, untested) — `PublishForm`, write characterization tests first
3. Stage 3 (High, cross-cutting DRY) — shared `formatProductPrice`/`ModalShell`/`useOrganizationFormState` extractions + their consumers
4. Stage 4 (Medium) — 10 items, real debt but contained risk
5. Stage 5 (Low) — polish items + confirm `ProductsPage` isn't dead code before touching it

**Next Steps**:

- See `component-decomposition-plan.md` for the full staged plan, per-item decomposition with named design patterns, and the non-regression protocol
- Work through stages in order — later stages assume earlier ones are either done or explicitly skipped
- Check off items in the plan's own checklist as they land

### 3. Backend Decomposition — Staged Mitigation Plan

**Status**: ⏳ Pending
**Priority**: Mixed (5 stages, Critical → Low, see the doc)
**Estimate**: ~6-8 weeks of incremental work
**Complexity**: High
**Created**: 2026-10-03

**Description**:
Same methodology as item #2, applied to `apps/api` (Python/FastAPI, Clean Architecture). Full
`uvx radon cc src/prosell --exclude "*/tests/*"` scan → 55 flagged functions/methods/classes across 31 files,
investigated via 5 parallel deep-dives for real responsibilities, SOLID/DRY violations (several real
cross-file duplications found, not just complexity noise), existing test coverage, and security implications
(credential-handling code flagged independently of its raw complexity score). Includes an explicit
Cross-Stack Coordination section mapping the backend files this plan touches to their exact frontend
consumers, plus a stated recommendation to run this and item #2 as two separate parallel tracks rather than
one merged sequential plan — see that section for why.

**Impact**:

- Not blocking — every stage is independently shippable, same non-regression discipline as item #2
- Worst single function in the backend: `nhtsa_normalizer.normalize_nhtsa_value` (F=63), zero test coverage
- 4 files/use cases found with **zero** existing test coverage despite real business-rule risk
  (`PatchCategorySchemaUseCase`, `get_team_metrics.py`, `publish_product_task.py`/`update_listing_task.py`,
  `category_field.py`) — staged separately (Stage 2) since they need characterization tests before any
  refactor, not just a complexity fix
- A real, latent security risk found (not hypothetical): two Facebook publish/update background tasks
  stringify the full exception from the publisher adapter to classify retry-vs-block, which could leak a
  decrypted session cookie/token into persisted error storage if the adapter's exception message ever embeds
  one — currently untested on either task
- A real cross-file DRY violation found with correctness implications: `bulk_upload_vehicles.py`'s
  `_build_attributes` and `bulk_upload_preview.py`'s `_analyze_row` independently duplicate the same ~16-field
  vehicle attribute list — same risk shape as the already-known NHTSA/Facebook catalog mismatch (hallazgo #87)
- The originally-assumed NHTSA/Facebook dual-catalog mismatch (English backend vs. Spanish frontend) is
  **already fixed** — investigation found a narrower, backend-only remaining issue instead (hardcoded Spanish
  literals duplicating a canonical catalog they claim to track, never importing it)

**Documentation**: [`backend-decomposition-plan.md`](./backend-decomposition-plan.md)

**What's Needed**:

1. Stage 1 (Critical, tested) — `update_product.py`, `create_product.py`, `bulk_upload_vehicles.py`,
   `publish_product_task.py`/`update_listing_task.py`, `fb_sync_router.py`/`fb_credential_migration_router.py`,
   `create_lead.py`
2. Stage 2 (Critical, untested) — `PatchCategorySchemaUseCase`, `get_team_metrics.py`, `nhtsa_normalizer.py`,
   `category_field.py`, write characterization tests first
3. Stage 3 (High, cross-cutting DRY) — `InternalCodeResolver`, shared image-field sanitizer, shared
   vehicle-attribute field table, shared image-sign helper, shared CSV validation, `Organization.apply_patch`,
   shared publisher-selector factory — extract before their consumers
4. Stage 4 (Medium) — 9 items, real debt but contained risk, mostly well-tested
5. Stage 5 (Low) — polish items + explicit "leave alone" calls where touching well-tested, hard-won code
   (`do_spaces_service.py`) carries more risk than the complexity score benefit justifies

**Next Steps**:

- See `backend-decomposition-plan.md` for the full staged plan, per-item decomposition, the Cross-Stack
  Coordination table, and the non-regression protocol
- Run this track in parallel with item #2 (frontend), not as one merged sequential plan — see that doc's
  "Cross-Stack Coordination" section for the reasoning and the narrow set of files that actually need
  coordination between the two
- Check off items in the plan's own checklist as they land

---

## 📊 Summary

| Item                              | Priority | Estimate   | Status     | Blocking? |
| --------------------------------- | -------- | ---------- | ---------- | --------- |
| OAuth External Setup              | P1       | 30 min     | ⏳ Pending | No        |
| Component Decomposition Plan (FE) | Mixed    | ~6-8 weeks | ⏳ Pending | No        |
| Backend Decomposition Plan (BE)   | Mixed    | ~6-8 weeks | ⏳ Pending | No        |

**Total Time Estimate**: 30 minutes + ~12-16 weeks combined (incremental, not blocking, parallel tracks)

---

## 🔍 How to Use This Tracker

### For Planning

Review technical debt items when planning sprints to decide if any should be addressed.

### For Implementation

Each debt item has a dedicated markdown file with:

- Detailed steps
- Troubleshooting guide
- Security best practices
- Checklist for completion

### For Tracking

Mark items as resolved by updating the status in their respective documentation files.

---

## 📝 Adding New Technical Debt

When identifying new technical debt:

1. Create a new markdown file in this directory
2. Use the template below
3. Update this README.md
4. Update project MEMORY.md

### Template

```markdown
# [Title]

> **Priority**: Px | **Estimate**: X hours | **Complexity**: Low/Medium/High
> **Created**: YYYY-MM-DD | **Status**: ⏳ Pending | **Blocking**: Yes/No

---

## Overview

[Brief description of the technical debt]

## Why This Is Technical Debt

[Explanation of why this exists and what debt it represents]

## Current State

[What's implemented vs what's missing]

## Proposed Solution

[How to resolve the technical debt]

## Implementation Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Estimate

- Time: X hours
- Complexity: Low/Medium/High
- Risk: Low/Medium/High

## Checklist

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

---

**Last Updated**: YYYY-MM-DD
```

---

## 🎯 Best Practices

1. **Document debt early** - Capture debt when identified
2. **Estimate accurately** - Include time for testing and validation
3. **Prioritize wisely** - Not all debt needs immediate resolution
4. **Track resolution** - Update status when completed
5. **Learn from it** - Note patterns to avoid similar debt

---

**Last Updated**: 2026-02-20
**Maintained By**: Claude Code (Serena MCP)
