# Phase 8 CONTEXT — Layout Shell + Vehicle Management (FINAL)

**Phase**: 08-layout-shell-vehicle-management
**Status**: Discuss-phase COMPLETE + 7 Brains Consulted — Ready for planning
**Date**: 2026-03-27
**Sessions**: 4 hours — Complete UX/UI/Arch/QA/Product/Growth/Backend validation

---

## [7 BRAINS VALIDATION] — Critical Additions

### Brain #1 (Product) — OKR + Priority Adjustment

**OKR (North Star Metric):**
```
"Reducir el tiempo promedio de carga de inventario de 15 minutos a 3 minutos"
```

**Waves Adjusted:**
- **MVP**: Single Vehicle Upload + DataGrid básico (validate value hypothesis)
- **UAT**: Bulk Upload + Cmd+K (observe 5-8 real users)
- **Premium**: Advanced Roles (Manager vs Dealer = corporate feature)

### Brain #7 (Growth) — Tracking desde Día 1

**Aha Moment:** Track "primer inventario visible y correcto" (time to value)
**Search-to-Action Ratio:** Measure if search helps or is noise
**Power User Curve:** Identify "alta velocidad" sellers

### Brain #5 (Backend) — Critical Gaps

**❌ ADD: Pagination (Cursor-based)** — Mandatory for search endpoints
**❌ ADD: API Versioning** — `/v1/` in URLs from start
**❌ ADD: Error Standardization** — `code` (SCREAMING_SNAKE_CASE) + `message`
**❌ ADD: Idempotency Keys** — For bulk retry safety (prevent duplicates)
**⚠️ VALIDATE:** Domain entities NO SQLAlchemy decorators
**⚠️ VALIDATE:** Repository pattern with interfaces
**⚠️ VALIDATE:** `WHERE tenant_id = :current_tenant_id` in EVERY query

---

## Goal

Create a professional dashboard shell with vehicle management CRUD, bulk upload, image handling, and search/filter capabilities using premium UI components (Shadcn UI, MagicUI, Radix UI).

---

## Requirements Origin — UAT Phase 1 Feedback

**Source**: `.planning/todos/pending/catalog-enhancements.md` (2026-03-15)

The following features were explicitly requested during UAT Phase 1 and are now incorporated into Phase 8:

| UAT Request | Phase 8 Implementation | Status |
|-------------|----------------------|--------|
| **Buscador avanzado** — Filtrar por marca, modelo, año, precio, estado | Section 6: Search Filters (Hybrid Client + Server) | ✅ Planned |
| **Ordenamiento por columnas** — Click header ASC/DESC, multi-columna | Section 2: DataGrid Pattern (TanStack Table native sorting) | ✅ Planned |
| **Selección múltiple** — Checkboxes + bulk publish | Section 2: DataGrid Pattern (Checkboxes + Shift-click + Floating Action Bar) | ✅ Planned |

**User Context**: "El catálogo actual solo muestra tabla plana sin filtros ni bulk actions."

**Traceability**:
- **Origin**: UAT Phase 1 (2026-03-15)
- **Todo**: `catalog-enhancements.md` — Status: Pending (moves to done/ when Phase 8 completes)
- **Planning**: Phase 8 Discuss-phase (2026-03-27)
- **Execution**: Pending (next: `/gsd:plan-phase 8`)

This ensures complete traceability from user feedback → planning → execution → completion.

---

## [IMPLEMENTED REALITY] — Current Codebase

### ✅ Already Exists

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js 16 + App Router** | ✅ Installed | apps/web/src/app/ structure ready |
| **React 19** | ✅ Installed | Server Components enabled |
| **TypeScript 5.5** | ✅ Installed | Strict mode |
| **TailwindCSS 4** | ✅ Installed | globals.css configured |
| **TanStack Query v5** | ✅ Configured | ReactQueryProvider with 1min staleTime |
| **Shadcn UI Core** | ✅ Installed | button, card, input, checkbox, tabs, switch, sonner, label, separator |
| **AuthProvider** | ✅ Implemented | AuthProvider wrapper in root layout |
| **Publisher Components** | ✅ Implemented | PublishModal, PublishForm, PublicationStatus, HeroShotSelector |

### ❌ Gaps to Implement

| Component | Status | Needed |
|-----------|--------|--------|
| **Zustand 5** | ❌ Missing | stores/ directory doesn't exist |
| **Route Groups** | ❌ Missing | app/(admin), app/(seller), app/(dealer), app/(manager) |
| **Layout Shell** | ❌ Missing | Professional sidebar + header + mobile navigation |
| **DataGrid** | ❌ Missing | TanStack Table + Virtual implementation |
| **MagicUI** | ❌ Missing | BorderBeam, RetroGrid, Marquee feedback components |
| **Radix UI Primitives** | ⚠️ Partial | Some installed, need Dialog, DropdownMenu for DataGrid |
| **Middleware Guards** | ❌ Missing | Auth + Role + Tenant validation in middleware.ts |

---

## [CORRECTED ASSUMPTION] — Sidebar Terminology

**⚠️ CRITICAL FINDING from UX Brain (#2):**

Original design used **"Operations/Growth/System"** — flagged as **mental model mismatch**.

```
❌ DESIGNER MODEL:  "Operations / Growth / System"
✅ USER MODEL:     "Inventario / Ventas / Clientes"
```

**Correction applied:**
- **Operations** → **Inventario** (Catalog, Publications)
- **Growth** → **Ventas** (Leads, Appointments)
- **System** → **Configuración** (Settings, Logs)

**Validation required:** Guerrilla testing with 3-5 sellers to confirm terminology.

---

## 1. Layout Structure ✅

### Sidebar: By User Mental Language (CORRECTED)

**Groups:**
- **Inventario**: Catálogo, Publicaciones
- **Ventas**: Leads, Citas
- **Configuración**: Settings, Logs (Admin/Dealer only)

**Rationale:** Using user language reduces cognitive load and follows **Content-first** principle.

### Header: Functional Dense

**Components:**
- Global search (Cmd+K) — Omnibar for vehicles/leads
- User menu with visible role
- Breadcrumbs for nested navigation
- Org Switcher (multi-dealership)

**Rationale:** Sellers constantly jump between branches. Org Switcher + Search is non-negotiable.

### Mobile: Hybrid Ergonomic

**Pattern:**
- Bottom Navigation (4 critical icons): Catálogo, Publicar, Leads, Más (Drawer)
- Drawer lateral for rest (Configuración, Perfil, Logs)

**Rationale:** **Thumb Zone** — money-generating actions one thumb away. **44x44px** touch targets minimum (Fitts's Law).

### Keyboard: Performance Shortcuts

**Shortcuts:**
- `Cmd+K`: Command Palette (search + actions)
- `Esc`: Close modals / clear searches
- `Arrows + Enter`: DataGrid navigation

**Rationale:** Power user workflow — Nielsen's H7 (Flexibility and efficiency of use).

---

## 2. DataGrid Pattern ✅

### Columns: Compact (5) + Expandable

**Base columns:**
- Photo thumbnail (60x60px rounded)
- Title (Year/Make/Model combined)
- Price (local currency format)
- Status (Colored Badge)
- Actions (contextual button)

**Expandable:** VIN, Stock, Leads, Appointments in expandable row or tooltip

**Rationale:** 5 columns = no horizontal scroll on 13" laptops. **White space as separator**, not borders.

### Virtualization: TanStack Virtual (rows) ⭐ MANDATORY

**Spec:**
- Buffer: 10-15 rows off-camera
- 60fps smooth scroll
- Only renders ~40 rows (20 visible + buffer)

**Rationale:** Lightweight DOM, scales to thousands. **Mandatory** for performance.

### Selection: Checkboxes + Shift-click

**Pattern:**
- Checkbox per row
- Shift-click for ranges (Gmail/Google Sheets standard)
- Indeterminate checkbox in header (Select All)
- Floating Action Bar: "Publish X selected" appears on selection

**Rationale:** From 2 clicks to 50 selected. Batch efficiency.

### Status: Colored Badges (Visual Semantics + Accessibility)

**Colors:**
- 🟢 Green (Published): "Money on the table"
- 🟡 Yellow (Pending): "In process"
- 🔴 Red (Failed): "Action required"
- ⚪ Gray (Draft/Expired): "Inactive"
- 🔵 Blue (Online): "Live on marketplace" — **NEW (Brain #1)**
- 🟣 Purple (Sold): "Vehicle sold" — **NEW (Brain #1)**

**Accessibility:** Icon + text for 8% colorblind users (WCAG 2.1 AA).

**Critical Addition (Brain #1):** Vehicle must show clear status indicator — "En línea/Pendiente/Vendido" for seller visibility.

**Rationale:** **Von Restorff Effect** — items that stand out are remembered.

---

## 3. Bulk Upload Flow ✅

### Validation: Zod on Frontend (Synchronous)

**Checks:**
- Schema (CSV columns match template)
- Types (price is number, not string)
- Structure (empty rows, required fields)
- **Signifiers:** Asterisks/borders for required fields (H5: Prevention of errors)

**Instant feedback:** Modal lights up red as soon as CSV is dropped

**Rationale:** Clean backend — JSON arriving at API has correct structure.

### Processing: Chunks (50) + Parallel Workers

**Spec:**
- 3-4 Taskiq workers processing in parallel
- Resilience: If chunk #42 fails, you only lose 50, not 500
- **Idempotency:** Retry-safe (no duplicate data)
- Predictable memory usage

**Rationale:** One broken image doesn't block the other 450 cars. **Small batch deployment** reduces risk exponentially.

### Progress: Bar + % + ETA (H1: Visibility of System Status)

**Mechanism:**
- Polling every 2s at `/bulk-upload/{job_id}/status`
- Redis stores progress (completed chunks / total)
- Dynamic ETA based on previous chunk speed

**Rationale:** Eliminates anxiety — "ETA: 3 min" makes user relax. **Absence of feedback = anxiety**.

### Errors: Best Effort + Downloadable CSV (H9: Error Recovery)

**Flow:**
- Continue processing valid ones
- Final report: "450 successful | 50 failed"
- Downloadable CSV with failed rows + `error_reason` column
- **Inline validation** or step-by-step to avoid end frustration
- Correction flow: Download, fix 50 rows, re-upload

**Rationale:** Uninterrupted productivity — 450 cars are already working.

### Fixtures Strategy for Testing

**Three CSV types:**
- **Success**: 50 valid rows
- **Partial Success**: 30 valid + 20 Zod validation errors
- **Total Failure**: Wrong format

**Testing:** `pytest.mark.parametrize` for chunk scenarios (chunk 1 success, chunk 2 fail).

---

## 4. Role-based Navigation ✅

### Route Groups: 4 Levels

**Groups:**
- `(admin)`: Infrastructure (proxies, FB rotation, global billing)
- `(dealer)`: Business view (financial reports, ROI, statements)
- `(manager)`: Team supervision (DataGrid on steroids, reassign Leads)
- `(seller)`: Sales execution (only their cars, their leads, their publish button)

**Rationale:** Privacy + **Principle of least privilege** — prevents sellers from "stealing" customers.

### Middleware: Auth + Role + Tenant (Triple Check)

**Checks:**
- Authenticated (cookie/JWT exists)
- Role matches (user.role vs route allowed)
- Tenant scope (dealership tenant_id)

**Zero Trust on Edge:** Bounce before DB receives query

**Smart redirect:** `/` → middleware detects role → sends to their "home"

**Rationale:** Bank-level security + server optimization.

### Fallback: Redirect + Toast

**Flow:**
- Re-direct to role's dashboard
- Toast: "Esa sección es solo para administradores"
- Zero friction: User "bounces" to safe place

**Rationale:** Simpler than 403 page — fewer support tickets.

### Role Source: JWT Token (15-30 min) + Refresh Tokens

**Spec:**
- Stateless — zero latency on navigation
- Short access token + refresh token
- **SC-01 Anti-pattern:** NO localStorage for tokens (use httpOnly cookies)

**Rationale:** Maximum middleware speed without overloading DB.

---

## 5. Image Upload UX ✅

### Strategy: Hybrid (Presigned + Async Process) ⭐

**Flow:**
```
Browser → Storage (Presigned URL) → Backend task processes
```

**What happens:**
1. Browser uploads originals directly to Cloudflare R2/AWS S3 using Presigned URLs
2. User sees progress bars fly (perceived speed)
3. Storage triggers webhook (or Taskiq task) for backend processing:
   - Thumbnail generation for DataGrid
   - WebP compression for Marketplace posts
   - Optional watermarking (dealership logo)
   - EXIF stripping (privacy)

**Why:**
- ✅ Fast parallel upload (no server bandwidth bottleneck)
- ✅ Quality control (backend processes after upload)
- ✅ Resilience (if resize fails, original is safe in cloud)

### Implementation:

**Backend:**
- FastAPI generates presigned URLs (`POST /images/upload-url`)
- Taskiq worker processes in background
- Polling for processing status

**Frontend:**
- Zustand for granular progress (0-100% per file)
- TanStack Query `onMutate` for optimistic previews
- `onError` rollback if upload fails

---

### UX Pattern: Drag & Drop + File Picker (Interactive Dropzone)

**Desktop:**
- Large dropzone area (Dropbox/Google Drive style)
- Fallback: File picker multiple for non-drag users
- **Immediate Previews**: `URL.createObjectURL` for instant thumbnails
- **Sortable**: Drag-to-reorder (first image = Facebook cover photo)

**Mobile:**
- Camera button + Gallery picker
- Touch-friendly reordering

**Progress Feedback:**
- Upload progress bar per image
- Preview thumbnails while uploading
- Allow individual deletion

**Why:**
- Covers all user patterns (draggers + clickers)
- Visual confirmation before upload completes
- First image control (critical for Facebook "hook photo")

---

## 6. Search Filters ✅

### Strategy: Hybrid (Client-fast + Server-deep) ⭐

**Two layers:**

**1. Client-side (Instant):**
- Text search on loaded DataGrid data
- Zero latency (0ms network delay)
- Feels incredibly fluid

**2. Server-side (Deep):**
- Complex queries (price ranges, multi-faceted filters)
- Database does heavy lifting
- URL state changes (`?brand=toyota&min_price=5000`)
- **Shareable URLs**: Manager sends link to Dealer

**Why:**
- ✅ Instant text search (user delight)
- ✅ Scalable to 10,000+ vehicles (server-side)
- ✅ Shareable links (collaboration)
- ✅ URL state (browser back button works)

### Implementation:

**Client:**
- `useMemo` on current ~1000 rows
- Debounce: 300ms for hybrid transitions

**Server:**
- SQL with indexed filters
- Query optimization for large datasets

**URL sync:**
- `useSearchParams` for server filters
- Bookmarkeable state

---

### UI Pattern: Cmd+K + Sidebar Collapsible

**Dual Entry Points:**

**1. Command Palette (Cmd+K) — The "Brain"**
- Fast VIN/customer search without leaving keyboard
- Action execution (publish, edit, delete)
- Power user agility (Slack/Linear style)
- **Mobile alternative:** Prominent search button (fullscreen overlay)

**2. Sidebar Collapsible — The "Visual Filter"**
- Faceted filters: Brand, Price Range, Publication Status
- Collapses to 100% screen width for DataGrid
- E-commerce style (Amazon/Mercado Libre)
- **Progressive Disclosure:** Show only what's necessary (Hick's Law)

**Active Filter State:**
- Filter "Pills" above grid (visual indicator)
- User always knows why they see 5 cars not 500
- Clear all button

**Why:**
- ✅ Power user speed (Cmd+K)
- ✅ Discovery (Sidebar for exploration)
- ✅ Maximum DataGrid space (collapsible)
- ✅ Works for both Sellers (operational) and Managers (analytical)

---

## 7. Visual Design Decisions ✅ (Brain #3)

### Color Palette: 60-30-10 Rule

**Distribution:**
- **60%**: Neutrals (backgrounds)
- **30%**: White/surfaces
- **10%**: Primary accent (CTAs)

**Primary Color:** Blue (trust + technology for B2B SaaS)

**Rationale:** Don't overuse brand color on large backgrounds — loses CTA power.

---

### Typography: Sans-serif Professional

**Spec:**
- **Family**: Sans-serif (interfaces prioritize legibility)
- **Body**: Minimum 16px (professional readability)
- **Hierarchy**: Scale-based (no arbitrary sizes)

**Rationale:** Functional over expressive for dashboards.

---

### Spacing: Fixed Scale

**Spec:**
- Multiples of 4 or 8px
- **White space as separator**, not borders
- Eliminates arbitrary decisions

**Rationale:** Forced coherence + breathing room.

---

### Component States: 5 Minimum (Shadcn UI)

Every interactive component needs:
1. **Default**
2. **Hover**
3. **Active**
4. **Disabled**
5. **Error/Empty**

**DataGrid States:**
- **Loading**: Skeletons (respects grid structure for continuity)
- **Empty**: Icon + descriptive text (not color alone)
- **Error**: Icon + text + actionable next step

**Rationale:** **Absence of feedback = anxiety**.

---

### Accessibility: WCAG 2.1 AA

**Requirements:**
- **Contrast**: 4.5:1 for normal text
- **Focus Ring**: 3:1 contrast, clearly visible
- **Colorblind**: Icon + text (8% of users)
- **Keyboard**: Full navigation without mouse

**Rationale:** Inclusive design = larger market.

---

### Animations: Purposeful Motion (MagicUI)

**Spec:**
- **Duration**: 100-300ms for micro-interactions
- **Properties**: Animate `opacity` and `transform` only (60fps)
- **Easing**: Ease-in-out (natural, physical feel)
- **Reflow**: ❌ NEVER animate `width`/`height` (causes reflow)

**Respect:** `prefers-reduced-motion` media query

**Rationale:** Movement with functional purpose, not decoration.

---

### Dark Mode: Tailwind 4 Strategy

**Tokens:**
- ❌ NO pure black (#000000) — causes OLED smearing + eye fatigue
- ✅ Dark gray: #121212
- ❌ NO pure white text on dark
- ✅ Contrast: 15.8:1 for comfortable reading

**Elevation in Dark Mode:**
- Not shadows (invisible)
- **White semi-transparent overlays** (closer = lighter surface)

**Rationale:** Semantic elevation without visual artifacts.

---

### Mobile Responsive: DataGrid → Cards

**Breakpoint:** Transform rows to Cards below 768px

**Card Content:** Top 3 pieces seller needs while walking lot:
- Photo
- Title + Price
- Status

**Margins:** Minimum 16px lateral

**Rationale:** DataGrid with 5 columns doesn't work on mobile.

---

## 8. Frontend Architecture ✅ (Brain #4)

### Component Architecture

**Layout Shell (layout.tsx):**
- **Server Component** by default (minimize JS to client)
- **Compound Components Pattern** for Sidebar/Header (shared state without prop drilling)
- Example: `<Sidebar.Nav />`, `<Sidebar.Footer />`

**DataGrid Component:**
- Compositional architecture
- Fetching logic in Server Components or dedicated hooks
- Rendering as Client Component with virtualization

**BulkUpload Flow:**
- **Container/Presentational Pattern**
- Container: File handling, Zod validation, chunks
- Presentational: Progress UI, drag-drop zone
- **Zod at boundary** for external data validation

---

### State Management Strategy

| State Type | Tool | Examples |
|------------|------|----------|
| **Server State** | TanStack Query | Vehicles, bulk jobs, catalogs |
| **Global Client** | Zustand + persist | Sidebar collapse, user preferences, notifications |
| **URL State** | searchParams | Filters, pagination, search query |
| **Local State** | React 19 useState | Dropdown open/closed, form inputs |

**Golden Rule:** Don't duplicate server state in useState/Zustand (causes sync bugs).

**Zustand persist:** Only for data that survives reloads (filters, preferences, NOT tokens).

---

### Performance: DataGrid 1000+ Rows

**Mandatory Optimizations:**

1. **TanStack Virtual**: Non-negotiable. Only renders visible rows.
2. **Stabilize columns**: Define columns outside render or via `useMemo`.
3. **No premature memo**: Use React DevTools Profiler to find real bottlenecks.
4. **Web Workers**: If filtering 1000+ rows takes >50ms, delegate to worker (protects main thread → INP metric).

**Anti-patterns to avoid:**
- 🔴 **JS-01**: Race conditions in manual fetches (use TanStack Query)
- 🟠 **CSS-01**: Animating `width`/`height` (causes reflow)
- 🟠 **RX-04**: Props drilling >2 levels (use Context/Zustand)

---

### Multi-rol Layout & Security

**Route Groups Structure:**
```
app/
  (admin)/
    layout.tsx    # Admin-specific layout
    settings/
  (seller)/
    layout.tsx    # Seller-specific layout
    catalog/
  (dealer)/
    layout.tsx    # Dealer-specific layout
    reports/
  (manager)/
    layout.tsx    # Manager-specific layout
    team/
```

**Middleware Guards (middleware.ts):**
- Centralized route protection
- **Pre-render interception**: Validate before Server Components render
- Role-based redirects

**Security Layers:**
1. Middleware (Edge): Fast bounce
2. Server Actions: Validate permissions
3. UI: Hide elements (but NEVER trust client-side only)

**Sidebar Validation:**
- Use semantic HTML
- Keyboard navigation accessible
- Test "Inventario/Ventas/Clientes" terminology

---

### Image Upload State & Optimistic UI

**Upload Progress:**
- Zustand for high-frequency updates (0-100% per file)
- TanStack Query doesn't handle rapid progress well

**Optimistic Updates:**
- TanStack Query `onMutate`: Show immediate preview
- `onError`: Rollback if upload fails
- User sees change instantly, backend processes in background

**UX Fluidity:**
- **Framer Motion**: State transitions (drag-over, loading, success)
- Animate `opacity` and `transform` only (60fps)
- Respect `prefers-reduced-motion`

---

## 9. Testing Strategy ✅ (Brain #6)

### Backend Coverage: 80/20 Rule (Piranha AI recommendation)

**Split (70/20/10):**
- **70%**: Unit Tests (pytest) — Business logic, vehicle state validations
- **20%**: Integration Tests — DB async contracts, FastAPI endpoints
- **10%**: E2E — Critical flows only

**Coverage Minimum:**
- **80%** for Vehicle CRUD endpoints (core business)
- Don't blindly chase 100%
- Focus on complex "Tenant" + "Role" logic areas

**Shift-left:** Validate security and schemas early in pipeline (cheaper fixes).

---

### Bulk Upload CSV Testing

**Fixture Strategy:**
1. **Success CSV**: 50 valid rows
2. **Partial Success CSV**: 30 valid + 20 Zod validation errors
3. **Total Failure CSV**: Wrong format

**Chunk Testing:**
- `pytest.mark.parametrize` for chunk scenarios
- Test: chunk 1 success, chunk 2 fail
- Validate **idempotency** (no duplicates on retry)

**Observability:**
- **Structured logs** in bulk flow
- Identify exact failing row
- Discover "unknown-unknowns" in production

---

### Frontend Component Testing

**DataGrid (TanStack Virtual):**
- Don't test the library
- Test **visibility**: DOM contains only necessary nodes when scrolling
- Verify Badges show correct state

**Layout Guards (RBAC):**
- Mount Layout Shell with different user contexts
- Validate: Standard role sees "Inventario/Ventas/Clientes" but NOT "Configuración"
- Test menu items render/not render correctly

**Business-facing tests:** Confirm shared understanding of requirements.

---

### E2E Multi-rol & Inversion Thinking

**Principle of Least Privilege + OWASP Matrix:**

**Inversion Thinking:**
- Don't just test Admin *can* edit
- Test: Seller *CANNOT* access `/settings/tenant`
- Test: Seller *CANNOT* see "Delete Vehicle" button
- **Negative testing** catches authorization bypasses

**Permission Matrix:**
- "Permission Flags" for role/plan access
- Technical deployment independent of feature release

---

### Performance Testing & Guardrails

**Performance = Product Feature, not extra**

**SLO (Service Level Objective):**
- "95% of DataGrid loads with 1000 rows must be interactive in <200ms"

**P99 > Average:**
- Ignore averages
- Focus on **99th percentile** (real user experience in worst-case load)

**Automated Guardrails:**
- Load test in pipeline
- Fail build if change degrades performance below baseline
- Prevent performance regression

---

## Technical Stack Confirmed

### Frontend

| Component | Technology | Version/Notes |
|-----------|-----------|---------------|
| Framework | Next.js | 16.1+ (Turbopack) |
| React | 19.2 | Server Components default |
| TypeScript | 5.5+ | Strict mode |
| Styling | TailwindCSS | 4.0 (new engine) |
| Data Grid | TanStack Table + Virtual | Headless, 60fps |
| State Server | TanStack Query | v5, 1min staleTime ✅ |
| State Client | Zustand | 5.x + persist (NEW) |
| Forms | React Hook Form + Zod | 3.x |
| UI Core | Shadcn UI | button, card, input, tabs, switch, sonner, label, separator ✅ |
| UI Feedback | MagicUI | BorderBeam, RetroGrid, Marquee (NEW) |
| Primitives | Radix UI | Dialog, DropdownMenu (ADD) |
| Animations | Framer Motion | For state transitions |

### Backend

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | FastAPI | Python 3.13+ |
| ORM | SQLAlchemy | 2.0 async (Mapped[]) |
| Task Queue | Taskiq + Redis | Chunks of 50, parallel workers |
| Storage | Cloudinary/S3 | Image upload + optimization |
| Database | PostgreSQL | 17, multi-tenant (tenant_id) |

### Patterns

- **Clean Architecture**: domain → application → infrastructure
- **Multi-tenant**: All entities include `tenant_id`
- **Cookie-based auth**: httpOnly cookies (access_token, refresh_token)
- **SOLID Principles**: SRP, OCP, LSP, ISP, DIP

---

## Key Decisions Summary

| Decision | Choice | Rationale | Brain |
|----------|--------|-----------|-------|
| **Sidebar Terminology** | Inventario/Ventas/Clientes | User mental language (Content-first) | UX (#2) |
| **Layout Organization** | By User Language | Reduced cognitive load | UX (#2) |
| **DataGrid** | TanStack Virtual + Checkboxes | Scales to thousands, batch efficiency | Frontend (#4) |
| **Bulk Upload** | Chunks of 50 + Best Effort | Resilient — one error doesn't block | QA (#6) |
| **Role Navigation** | Route groups + Middleware | Bank-level security + zero friction | Frontend (#4) |
| **Image Upload** | Hybrid (Presigned + Async) | Fast upload + quality control | UX (#2) |
| **Image UX** | Drag & Drop + Sortable | Covers all patterns, cover photo control | UI (#3) |
| **Search Filters** | Hybrid (Client + Server) | Instant + scalable + shareable | UX (#2) |
| **Filter UI** | Cmd+K + Sidebar | Power users + discovery | UX (#2) |
| **Color Palette** | 60-30-10, Blue primary | B2B trust + CTA focus | UI (#3) |
| **Typography** | Sans-serif, 16px min | Professional legibility | UI (#3) |
| **Spacing** | 4/8px scale | Forced coherence | UI (#3) |
| **Component States** | 5 minimum (default/hover/active/disabled/error) | No ambiguity | UI (#3) |
| **Accessibility** | WCAG 2.1 AA | Inclusive design | UI (#3) |
| **Animations** | 100-300ms, opacity/transform only | 60fps, purposeful motion | UI (#3) |
| **Dark Mode** | #121212, 15.8:1 contrast | No OLED smearing | UI (#3) |
| **Mobile DataGrid** | Transform to Cards <768px | Mobile-first necessity | UX (#2) + UI (#3) |
| **State Server** | TanStack Query | Single source of truth | Frontend (#4) |
| **State Client** | Zustand + persist | High-frequency updates | Frontend (#4) |
| **Route Groups** | (admin)/(seller)/(dealer)/(manager) | Role-based layouts | Frontend (#4) |
| **Backend Coverage** | 80% Vehicle CRUD | Core business protection | QA (#6) |
| **Frontend Tests** | Vitest + Testing Library | Business-facing | QA (#6) |
| **E2E Strategy** | Inversion Thinking | Negative testing for auth | QA (#6) |
| **Performance SLO** | <200ms for 1000 rows (p95) | Performance = feature | QA (#6) |

---

## Implementation Gaps (Codebase vs. Target)

### ❌ Missing Components to Build

**Structure:**
```
apps/web/src/
├── app/
│   ├── (admin)/layout.tsx          # NEW
│   ├── (seller)/layout.tsx          # NEW
│   ├── (dealer)/layout.tsx          # NEW
│   ├── (manager)/layout.tsx         # NEW
│   └── dashboard/
│       ├── layout.tsx               # MODIFY (add sidebar/header)
│       ├── vehicles/page.tsx        # NEW (DataGrid)
│       └── bulk-upload/page.tsx     # NEW
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              # NEW
│   │   ├── Header.tsx               # NEW
│   │   ├── CommandPalette.tsx       # NEW
│   │   └── MobileNav.tsx            # NEW
│   ├── datagrid/
│   │   ├── DataGrid.tsx             # NEW
│   │   ├── DataGridRow.tsx          # NEW
│   │   └── StatusBadge.tsx          # NEW
│   ├── upload/
│   │   ├── BulkUpload.tsx           # NEW
│   │   ├── ImageDropzone.tsx        # NEW
│   │   └── UploadProgress.tsx       # NEW
│   └── filters/
│       ├── FilterSidebar.tsx        # NEW
│       └── FilterPills.tsx          # NEW
├── lib/
│   ├── stores/
│   │   ├── layoutStore.ts           # NEW (Zustand)
│   │   └── uploadStore.ts           # NEW (Zustand)
│   └── hooks/
│       ├── useDataGrid.ts           # NEW
│       └── useImageUpload.ts        # NEW
└── middleware.ts                    # MODIFY (add role guards)
```

**Dependencies to Install:**
- `zustand` + `zustand/middleware`
- `@tanstack/react-virtual` or `@tanstack/virtual-core`
- `framer-motion`
- MagicUI components (BorderBeam, RetroGrid, Marquee)
- Additional Radix UI primitives (Dialog, DropdownMenu)

---

## Anti-Patterns to Avoid

| Code | Anti-Pattern | Solution |
|------|--------------|----------|
| **SC-01** | Tokens in localStorage | Use httpOnly cookies |
| **JS-01** | Race conditions in manual fetches | Use TanStack Query |
| **CSS-01** | Animating width/height | Animate opacity/transform only |
| **RX-04** | Props drilling >2 levels | Use Context or Zustand |

---

## Performance Targets

- **DataGrid Render**: 60fps with 1000+ rows
- **Search Response**: 0ms client-side, <200ms server-side
- **Image Upload**: Parallel uploads (3-4 concurrent)
- **Bulk Processing**: ETA displayed, chunks of 50
- **Middleware**: Zero latency (JWT stateless)
- **SLO**: 95% of DataGrid loads <200ms (p95)

---

## Mobile Considerations

- **Bottom Navigation**: 4 critical icons (Catálogo, Publicar, Leads, Más)
- **Drawer**: For non-critical items (Configuración, Perfil, Logs)
- **Touch Targets**: 44x44px minimum (Fitts's Law)
- **DataGrid**: Transforms to Cards below 768px
- **Search**: Fullscreen overlay (no Cmd+K on mobile)
- **Margins**: Minimum 16px lateral

---

## Next Steps

1. ✅ Discuss-phase complete (all 6 areas defined)
2. ✅ 7 Brains consulted (UX, UI, Frontend, QA, Product, Growth, Backend)
3. ✅ Codebase filtered for gaps
4. **Next**: `/gsd:plan-phase 8` → Create RESEARCH.md + VALIDATION.md + PLAN.md

---

## [7 BRAINS CONSENSUS] — Ready for Planning ✅

**Validated:**
- ✅ Stack técnico sólido (FastAPI + SQLAlchemy async / Next.js 16 + React 19)
- ✅ Métricas guardrails definidas (SLO <200ms, 80% coverage)
- ✅ Multi-tenant strategy correcta (tenant_id everywhere)
- ✅ Clean Architecture facilitada por stack

**Gaps agregados:**
- ✅ Vehicle Status visibility (Online/Sold badges) — Brain #1
- ✅ North Star Metric (OKR: "15 min → 3 min carga inventario") — Brain #1
- ✅ Backend gaps identificados (pagination, API versioning, idempotency) — Brain #5
- ✅ Tracking metrics definidos (Aha Moment, Search-to-Action) — Brain #7

**Riesgos mitigados:**
- Build Trap → Focus en Outcome, no estética
- N+1 Problem → Bulk chunks con eager loading
- IDOR → tenant_id filter en CADA query
- Tenant isolation → Validar en middleware + queries

---

## Validation Checklist Before Planning

- [ ] Guerrilla testing with 3-5 sellers for Sidebar terminology (Inventario/Ventas/Clientes vs Operations/Growth/System)
- [ ] Confirm Cloudinary/S3 choice for image storage
- [ ] Verify Taskiq + Redis setup for bulk processing
- [ ] Confirm existing AuthProvider supports role-based redirects
- [ ] Validate that middleware.ts exists for Next.js

---

## Reference

- **Strategy validated**: Hybrid approach (MVP → UAT → Premium)
- **Timeline estimate**: 4-5 days total (1-1.5 MVP + 0.5 UAT + 2-3 Premium)
- **Brains consulted**: #2 (UX), #3 (UI), #4 (Frontend), #6 (QA)
- **User decisions captured**: Via AskUserQuestion tool (Image Upload, Search Filters, Filter UI)
- **Codebase analysis**: Existing components identified, gaps mapped

---

*Last updated: 2026-03-27 — Discuss-phase complete + 7 Brains + Codebase filtered + Critical gaps added*
