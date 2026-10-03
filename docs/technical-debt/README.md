# Technical Debt Tracker

> **Last Updated**: 2026-10-03
> **Total Items**: 2
> **Resolved**: 0
> **Pending**: 2

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

---

## 📊 Summary

| Item                         | Priority | Estimate   | Status     | Blocking? |
| ---------------------------- | -------- | ---------- | ---------- | --------- |
| OAuth External Setup         | P1       | 30 min     | ⏳ Pending | No        |
| Component Decomposition Plan | Mixed    | ~6-8 weeks | ⏳ Pending | No        |

**Total Time Estimate**: 30 minutes + ~6-8 weeks (incremental, not blocking)

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
