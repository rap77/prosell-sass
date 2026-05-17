# Phase 13 Resumption Plan - prosell-ecommerce

**Status**: Ready to execute (Phase 13 analyzed in prior session 2026-04-12)
**Current phase (DB)**: 1
**Target phase**: 13 (Generic Catalog Frontend)

---

## Quick Context

Phase 13 was analyzed in the prior session but never executed. Two key decisions were recorded:

1. **UX Strategy** (Engram #398):
   - Two-step vehicle creation (Product → Vehicle) MUST be transparent to users
   - VIN decode happens FIRST (provides make/model data)
   - Category selection: searchable Select with fuzzy matching
   - DataGrid: skeleton loaders + optimistic UI, pagination 50 items/page

2. **Testing Strategy** (Engram #399):
   - Current: 210 tests passing, 6 VIN tests marked fixme
   - Breaking changes: VehicleForm submit endpoints, Category API, DataGrid mocks→real data
   - Missing: DataGrid performance tests for 1000+ rows

---

## Execution Steps (Copy-Paste Ready)

### Step 1: Initialize Context
```bash
cd /home/rpadron/proy/prosell-sass
mm-flow init --org Prosell-CA --project prosell-ecommerce
```

### Step 2: Re-discuss Phase 13 (Brains #1,2,3,7)
```bash
/mm:discuss-phase 13 --project prosell-ecommerce
# Recovers UX strategy, validates scope, generates 13-DISCUSSION.md
# Takes ~5-10 minutes (parallel brain consultation)
```

### Step 3: Re-plan Phase 13 (Brains #4,5,6,7)
```bash
/mm:plan-phase 13 --project prosell-ecommerce
# Frontend: VehicleForm refactor, DataGrid integration
# Backend: Two-step endpoints, Category API, real DataGrid data
# QA: Testing strategy, fix breaking changes
# Generates 13-PLAN.md with task breakdown
# Takes ~10-15 minutes
```

### Step 4: Execute Phase 13

**Option A: Controlled Execution**
```bash
mm-flow execute-phase --phase 13
# See outputs in real-time
# Watch for test failures, Brain #7 gates
```

**Option B: Overnight Automation (Recommended)**
```bash
mm-flow night-run --project prosell-ecommerce --phase 13 --max-hours 8
# Runs 5-min loop intervals for 8 hours
# Auto-switches backend if z_ai depletes
# Brain #7 validates every gate
```

### Step 5: Monitor Status
```bash
# In another terminal, watch real-time
mm-flow status
```

### Step 6: Complete Phase 13
```bash
/mm:complete-phase 13 --project prosell-ecommerce
# Brain #7 validates acceptance criteria
# Auto-updates STATE.md (phase 13 → completed)
# Persists learnings in audit trail
```

---

## Expected Outcomes

✅ Phase 13 DISCUSSION.md — Scope validated, UX strategy approved
✅ Phase 13 PLAN.md — Tasks broken down, testing strategy defined
✅ Phase 13 EXECUTION.md — Features built, tests passing
✅ Phase 13 VERIFICATION.md — Brain #7 gate passed, ready for Phase 14

---

## If Something Breaks

1. **Brain rejects DISCUSSION**: Review problem statement with Brain #1, retry
2. **Brain rejects PLAN**: Review architecture with Brain #5, adjust task breakdown
3. **Tests fail during execution**: Check test strategy (Engram #399), review breaking changes
4. **Backend limits hit**: MM-Flow auto-switches from z_ai → openrouter → claude

---

## Next Phase (After Phase 13)

Phase 14: Multi-Channel Marketplace Integration
- Same workflow: discuss → plan → execute → complete

---

**Execution time estimate:**
- Discussion: 10 min
- Planning: 15 min
- Execution: 2-8 hours (depending on Option A vs B)
- Verification: 5 min
**Total: ~3-9 hours autonomous**

---

**Engram Context**: Check `mem_search --query "prosell phase 13"` for full decision trail
**Last updated**: 2026-04-12 (by Claude Code)
