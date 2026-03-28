# Phase 8 Strategy: Hybrid Approach Validated

## Decision: Option 3 - Hybrid MVP

**What**: Layout mínimo + CRUD básico → UAT datos reales → UI premium

**Why**:
- Phase 8 includes Vehicle Management (CRUD + bulk upload) which is prerequisite for UAT with real dealer data
- Without Vehicle Management, dealers can't load inventory → UAT with mock data is "vanity metric" (WYSIATI bias)
- Brain #7 (Growth) validated: "Optimizing a broken bucket" = fixing UI before core value works

**Timeline**: 4-5 days total
- Wave 1 (MVP): Layout mínimo + CRUD básico + CSV upload → 1-1.5 days
- Wave 2 (UAT): 1-2 dealers load real inventory → UAT with real data → 0.5 day
- Wave 3 (UI Premium): MagicUI + advanced features → 2-3 days

## Technical Stack Confirmed

**Frontend:**
- Shadcn UI (Core): Sidebar, Breadcrumb, UserNav
- MagicUI (Feedback): BorderBeam, RetroGrid, Marquee
- TanStack Table (headless): DataGrid with virtualization
- Zustand 5: layoutStore with persist
- Next.js 16 route groups: ((admin), (seller), (dealer))

**Backend:**
- FastAPI: /vehicles CRUD, /bulk-upload, /publish-batch
- Taskiq + Redis: async bulk processing
- Cloudinary: image storage (time-to-value < 1h)

**Testing:**
- Coverage: 90%+ backend, 80%+ frontend
- Fermi estimation: test 10K when expecting 1K
- Performance: +200ms guardrail for DataGrid

## Key Insight from Growth Brain

**WYSIATI (What You See Is All There Is)**:
- Mock data (3 vehicles) is "perfect" — real dealer data will bring "chaos" (inconsistent CSV, heavy images, validation errors)
- Approving system that "works technically" but fails with real data = failure
- Pre-mortem: "What guarantees failure?" → Dealers can't upload their photos

## Navigation by Role (UX Brain)

**Admin/Manager** (Systems Thinking → Outcomes):
- Priority: Dashboard analítica + Configuración
- Access: Todo (Admin) menos configuración (Manager)

**Seller/Dealer** (System 1 → Fast):
- Priority: Catálogo + Publicaciones + Leads
- Access: Solo ejecución, no configuración

**Anti-pattern**: NO "grisado" para items sin permiso → filtra estrictamente

## Reference

Session: 2026-03-27
Brains consulted: #7 (Growth), #2 (UX), #3 (Backend), #4 (Frontend), #6 (QA)
