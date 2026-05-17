# Phase 8: Layout Shell + Vehicle Management - Research

**Researched:** 2026-03-27
**Domain:** Dashboard Shell + Data Grid + Bulk Upload + Image Handling + Search/Filter
**Confidence:** HIGH

## Summary

Phase 8 transforms the current basic catalog into a professional vehicle management dashboard with premium UI components (Shadcn UI, MagicUI, Radix UI). The phase implements a complete layout shell with role-based navigation, high-performance DataGrid with virtualization, bulk CSV upload with parallel processing, hybrid image upload (presigned URLs + async processing), and dual-layer search (client instant + server scalable).

**Primary recommendation:** Implement in 3 waves (MVP → UAT → Premium) following the 80/20 rule. Focus on single vehicle upload + basic DataGrid first for value hypothesis validation, then add bulk upload + Cmd+K for UAT, leaving advanced roles for Premium wave.

**Critical insight:** The CONTEXT.md has locked decisions from 7-brain validation (UX, UI, Frontend, QA, Product, Growth, Backend). Research must support these decisions, not explore alternatives. Sidebar terminology correction (Inventario/Ventas/Clientes instead of Operations/Growth/System) is mandatory.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout & Navigation:**
- Sidebar groups: Inventario (Catálogo, Publicaciones), Ventas (Leads, Citas), Configuración (Settings, Logs)
- Header components: Global search (Cmd+K), User menu with visible role, Breadcrumbs, Org Switcher
- Mobile: Bottom Navigation (4 icons) + Drawer for non-critical items
- Keyboard shortcuts: Cmd+K (Command Palette), Esc (close modals), Arrows+Enter (DataGrid nav)
- Route groups: (admin), (seller), (dealer), (manager) with role-based layouts
- Middleware guards: Auth + Role + Tenant validation at edge

**DataGrid:**
- 5 base columns: Photo thumbnail, Title (Year/Make/Model), Price, Status Badge, Actions
- TanStack Virtual for row virtualization (MANDATORY for 60fps with 1000+ rows)
- Checkboxes + Shift-click selection with Floating Action Bar
- Status colors: Green (Published), Yellow (Pending), Red (Failed), Gray (Draft/Expired), Blue (Online), Purple (Sold)
- Mobile: Transform to Cards below 768px breakpoint

**Bulk Upload:**
- Chunks of 50 with 3-4 Taskiq workers processing in parallel
- Zod validation on frontend (synchronous) before upload
- Progress bar + % + ETA via polling every 2s
- Best effort processing: continue valid rows, report failed rows separately
- Idempotency keys for retry safety

**Image Upload:**
- Hybrid strategy: Browser → Storage (Presigned URL) → Backend async processing
- Direct upload to Cloudflare R2/AWS S3 using presigned URLs
- Background processing: thumbnail generation, WebP compression, EXIF stripping, optional watermarking
- Drag & Drop + File Picker with sortable images (first = cover photo)
- Zustand for granular progress (0-100% per file)

**Search Filters:**
- Hybrid strategy: Client-side (instant, 0ms) + Server-side (deep, <200ms)
- Cmd+K Command Palette for power users
- Sidebar collapsible filters with faceted navigation
- URL state sync for shareable links
- Filter "pills" above grid as visual indicators

**Visual Design:**
- Color palette: 60-30-10 rule, Blue primary (B2B trust)
- Typography: Sans-serif, minimum 16px body, scale-based hierarchy
- Spacing: Multiples of 4 or 8px, white space as separator (not borders)
- Component states: 5 minimum (default/hover/active/disabled/error)
- Animations: 100-300ms, opacity/transform only, respect prefers-reduced-motion
- Dark mode: #121212 (not pure black), 15.8:1 contrast, white semi-transparent overlays

**State Management:**
- Server state: TanStack Query (single source of truth)
- Global client: Zustand + persist (sidebar collapse, preferences, NOT tokens)
- URL state: searchParams (filters, pagination, search query)
- Local state: React 19 useState (dropdowns, form inputs)

**Testing:**
- Backend: 80% coverage for Vehicle CRUD endpoints (70% unit / 20% integration / 10% E2E)
- Frontend: Vitest + Testing Library (business-facing tests)
- E2E: Inversion thinking (test what users CAN'T do, not just what they CAN)
- Performance SLO: 95% of DataGrid loads <200ms with 1000 rows (p99 focus)

### Claude's Discretion

**Implementation Waves:**
- **MVP**: Single Vehicle Upload + DataGrid básico (validate value hypothesis)
- **UAT**: Bulk Upload + Cmd+K (observe 5-8 real users)
- **Premium**: Advanced Roles (Manager vs Dealer = corporate feature)

**Backend Additions (Brain #5):**
- Pagination: Cursor-based (mandatory for search endpoints)
- API Versioning: `/v1/` in URLs from start
- Error Standardization: `code` (SCREAMING_SNAKE_CASE) + `message`
- Idempotency Keys: For bulk retry safety

**Tracking (Brain #7):**
- Track "primer inventario visible y correcto" (time to value)
- Search-to-Action Ratio: Measure if search helps or is noise
- Power User Curve: Identify "alta velocidad" sellers

### Deferred Ideas (OUT OF SCOPE)

- Ecommerce con pagos (not the business model)
- AI Vendor Assistant (Phase 7)
- Repricing automático (needs clean dataset first)
- Mobile app (web-first)
- Billing/subscriptions (manual with 5 dealers)
- AutoTrader/Craigslist (CarGurus is sufficient benchmark)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CATALOG-01** | Seller sees internal catalog of all vehicles from assigned dealers with publication status | TanStack Table + Virtual for rendering 1000+ vehicles at 60fps; StatusBadge component with 6 states; Role-based filtering in middleware |
| **CATALOG-02** | Admin sees global catalog of all organizations | Route group (admin) with admin layout; Global query param or separate endpoint; Admin role validation |
| **CATALOG-03** | Dealer views and modifies only their own inventory | Route group (dealer) with dealer layout; tenant_id filtering enforced in backend queries; Middleware tenant guard |
| **CATALOG-04** | Each vehicle shows own price vs market average price (delta %) | Backend: MKTL-01/02 integration (Phase 6); Frontend: DeltaBadge component with green/red arrow |
| **DASH-01** | Admin dashboard: publications/day, global leads, performance by seller, API status | Admin-specific route group; Dashboard widgets using TanStack Query with refetchInterval; Real-time metrics via WebSocket or polling |
| **DASH-02** | Manager dashboard: team metrics, assigned dealers, pending publications | Route group (manager); Team stats aggregation; Reassignment UI for leads |
| **DASH-03** | Seller dashboard: my active publications, assigned leads, today's appointments, personal metrics | Seller-specific route group; Personal stats filtered by user_id; Calendar view for appointments |
| **DASH-04** | Dealer dashboard: own inventory, active FB publications, no lead access | Route group (dealer); Inventory-only view; Publication status tracking; Lead access blocked via middleware |

**Note:** Phase 8 focuses primarily on CATALOG-01/03 (vehicle CRUD + DataGrid) and DASH-03/04 (basic dashboards). DASH-01/02 (advanced analytics) are Phase 5 scope but layout shell must support them.
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Next.js** | 16.1+ | App Router, Server Components, Route Groups | Latest stable with Turbopack; Route groups for role-based layouts; Server Components reduce JS to client |
| **React** | 19.2 | UI library with Server Components default | Server Components by default minimize client JS; ref as prop (no forwardRef needed) |
| **TypeScript** | 5.5+ | Type safety | Strict mode; prevents runtime errors; better IDE support |
| **TailwindCSS** | 4.0 | Styling with new engine | No var() in className; utility-first; built-in dark mode; 60-30-10 color rule support |
| **TanStack Query** | v5 | Server state management | Single source of truth; 1min staleTime configured; optimistic updates support |
| **Zustand** | 5.x + persist middleware | Global client state | High-frequency updates (upload progress); Lightweight vs Redux; persist for preferences |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@tanstack/react-table** | Latest | Headless table logic | DataGrid core; sorting, filtering, virtualization built-in |
| **@tanstack/react-virtual** | Latest | Row virtualization | MANDATORY for 1000+ rows at 60fps; renders only visible rows |
| **Shadcn UI** | Latest | UI component primitives | button, card, input, checkbox, tabs, switch, sonner, label, separator ✅ already installed |
| **Radix UI** | Latest | Unstyled component primitives | Dialog, DropdownMenu (add to existing); Accessibility built-in (WCAG 2.1 AA) |
| **MagicUI** | Latest | Premium feedback components | BorderBeam, RetroGrid, Marquee for loading states, success feedback |
| **Framer Motion** | Latest | State transition animations | 100-300ms durations; opacity/transform only; respect prefers-reduced-motion |
| **React Hook Form + Zod** | 3.x | Form validation | Zod at boundary for external data; RHF for form state; sync validation on CSV upload |
| **@hookform/resolvers** | Latest | Zod integration with RHF | Connects Zod schemas to RHF validation |

### Backend Stack (Already Established)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **FastAPI** | 0.115+ | API framework | Python 3.13+ with free-threading; async support; OpenAPI auto-docs |
| **SQLAlchemy** | 2.0+ async | ORM with `Mapped[]`, `mapped_column` | Async first; Clean Architecture support; Multi-tenant with tenant_id |
| **Pydantic** | 2.12+ | DTOs and settings | Type-safe data validation; FastAPI integration |
| **Taskiq + Redis** | Latest | Task queue for bulk processing | Chunks of 50; Parallel workers; Redis for job state |
| **PostgreSQL** | 17 | Database | Multi-tenant (tenant_id everywhere); JSONB for flexible schemas |
| **Cloudflare R2 / AWS S3** | - | Object storage | Presigned URLs for direct upload; Webhook/trigger for async processing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Table | react-table v8 | TanStack is newer, actively maintained, better TypeScript support |
| Zustand | Redux Toolkit | Zustand is simpler, less boilerplate; better for high-frequency updates |
| Shadcn UI | Chakra UI | Shadcn is copy-paste (full ownership), Chakra is component library (less control) |
| MagicUI | Framer Motion only | MagicUI provides pre-built premium components, saves time |
| Hybrid search | Server-only | Client-side gives instant 0ms feedback; better UX for text search |

**Installation:**

```bash
# Frontend dependencies to add
pnpm add @tanstack/react-table @tanstack/react-virtual framer-motion
pnpm add @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-select
pnpm add react-dropzone zod

# MagicUI (manual copy-paste from https://magicui.design)
# Components to copy: BorderBeam, RetroGrid, Marquee

# Note: zustand, @tanstack/react-query, shadcn/ui core already installed
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx          # Admin-specific layout (full sidebar + header)
│   │   ├── settings/
│   │   └── reports/
│   ├── (seller)/
│   │   ├── layout.tsx          # Seller-specific layout (Inventario + Ventas)
│   │   ├── catalog/
│   │   │   └── page.tsx        # DataGrid view
│   │   └── publications/
│   ├── (dealer)/
│   │   ├── layout.tsx          # Dealer-specific layout (inventory only)
│   │   └── reports/
│   ├── (manager)/
│   │   ├── layout.tsx          # Manager-specific layout (team view)
│   │   └── team/
│   └── dashboard/
│       ├── layout.tsx          # Default layout (redirects based on role)
│       └── page.tsx            # Role-based dashboard landing
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Collapsible sidebar with navigation
│   │   ├── Header.tsx          # Search, breadcrumbs, user menu, org switcher
│   │   ├── CommandPalette.tsx  # Cmd+K omnibar (power user search)
│   │   └── MobileNav.tsx       # Bottom navigation + drawer
│   ├── datagrid/
│   │   ├── DataGrid.tsx        # Main table component with TanStack Table + Virtual
│   │   ├── DataGridRow.tsx     # Single row (memoized)
│   │   ├── StatusBadge.tsx     # Vehicle status with 6 states
│   │   └── ActionMenu.tsx      # Row actions (publish, edit, delete)
│   ├── upload/
│   │   ├── BulkUpload.tsx      # CSV drag-drop with Zod validation
│   │   ├── ImageDropzone.tsx   # Image upload with presigned URLs
│   │   ├── UploadProgress.tsx  # Progress bar + % + ETA
│   │   └── ImageGallery.tsx    # Sortable image preview (first = cover)
│   ├── filters/
│   │   ├── FilterSidebar.tsx   # Collapsible faceted filters
│   │   ├── FilterPills.tsx     # Active filter tags above grid
│   │   └── CommandPalette.tsx  # Cmd+K search + actions
│   └── ui/                     # Existing Shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       └── ... (existing)
│
├── lib/
│   ├── stores/
│   │   ├── layoutStore.ts      # Zustand: sidebar collapse, preferences
│   │   ├── uploadStore.ts      # Zustand: upload progress (0-100% per file)
│   │   └── filterStore.ts      # Zustand: active filters (persisted)
│   ├── hooks/
│   │   ├── useDataGrid.ts      # DataGrid state (sorting, filtering, selection)
│   │   ├── useImageUpload.ts   # Presigned URL + progress polling
│   │   └── useBulkUpload.ts    # CSV validation + chunk upload
│   ├── api/
│   │   ├── vehicles.ts         # Vehicle CRUD endpoints
│   │   ├── bulk-upload.ts      # Bulk upload endpoints
│   │   └── images.ts           # Image upload endpoints
│   └── utils/
│       ├── csv-parser.ts       # CSV parsing with Zod validation
│       └── data-grid.ts        # Column definitions, filters
│
└── middleware.ts               # Auth + Role + Tenant guards
```

### Pattern 1: Route Groups for Role-Based Layouts

**What:** Next.js 16 App Router feature for organizing routes with shared layouts without affecting URL structure.

**When to use:** Multiple user roles (admin, seller, dealer, manager) need different navigation and permissions.

**Example:**

```typescript
// app/(seller)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { checkRole } from '@/lib/auth'

export default async function SellerLayout({ children }) {
  const user = await getCurrentUser()

  // Middleware already validated, but double-check
  if (user.role !== 'seller') {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen">
      <Sidebar groups={['inventario', 'ventas']} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
```

**Why this works:**
- Layout applies to all routes under `(seller)/` directory
- URL is `/catalog` not `/(seller)/catalog` (parentheses are ignored)
- Each role gets customized navigation without repetition
- Middleware guards at edge for security

### Pattern 2: TanStack Table + Virtual for DataGrid

**What:** Headless table library with virtualization for rendering only visible rows.

**When to use:** Displaying 100+ rows with sorting, filtering, or selection. MANDATORY for 1000+ rows.

**Example:**

```typescript
// components/datagrid/DataGrid.tsx
'use client'

import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'

export function DataGrid({ data, columns }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Stable columns definition (prevent re-renders)
  const stableColumns = useMemo(() => columns, [])

  // Virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10, // Render 10 extra rows above/below viewport
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  return (
    <div ref={tableContainerRef} className="h-[600px] overflow-auto">
      <table style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>{header.renderHeader()}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {virtualRows.map(virtualRow => {
            const row = table.getRowModel().rows[virtualRow.index]
            return (
              <tr
                key={row.id}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>{cell.renderCell()}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

**Key optimizations:**
- `useMemo` for columns (stable reference prevents re-renders)
- `overscan: 10` renders buffer rows for smooth scrolling
- Only ~40 rows rendered (20 visible + 10 buffer top + 10 buffer bottom)
- 60fps guaranteed even with 10,000 rows

### Pattern 3: Compound Components for Sidebar/Header

**What:** Share state between related components without prop drilling using Context.

**When to use:** Sidebar and Header need to share collapse state, mobile menu state, active route.

**Example:**

```typescript
// components/layout/Sidebar.tsx
import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext<{
  isOpen: boolean
  toggle: () => void
}>(null!)

export function Sidebar({ groups, children }) {
  const [isOpen, setIsOpen] = useState(true)
  const toggle = () => setIsOpen(!isOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <aside className={`${isOpen ? 'w-64' : 'w-16'} transition-all`}>
        {children}
      </aside>
    </SidebarContext.Provider>
  )
}

Sidebar.Nav = function SidebarNav() {
  const { isOpen } = useContext(SidebarContext)
  return <nav>{/* Navigation items */}</nav>
}

Sidebar.Footer = function SidebarFooter() {
  const { isOpen } = useContext(SidebarContext)
  return <footer>{/* Footer content */}</footer>
}

// Usage
<Sidebar groups={['inventario', 'ventas']}>
  <Sidebar.Nav />
  <Sidebar.Footer />
</Sidebar>
```

**Why this works:**
- No prop drilling through multiple levels
- Colocated state (Sidebar owns its state)
- Consumer components (Nav, Footer) access state via context
- Testable in isolation

### Pattern 4: Container/Presentational for Bulk Upload

**What:** Separate business logic (container) from UI (presentational) for testability.

**When to use:** Complex flows with validation, async operations, state management.

**Example:**

```typescript
// components/upload/BulkUpload.tsx (Container)
'use client'

import { useBulkUpload } from '@/lib/hooks/useBulkUpload'
import { UploadDropzone } from './UploadDropzone'
import { UploadProgress } from './UploadProgress'

export function BulkUpload() {
  const {
    validateCSV,
    uploadChunk,
    progress,
    error,
    isUploading,
  } = useBulkUpload()

  const handleDrop = async (file: File) => {
    const validation = await validateCSV(file)
    if (!validation.success) {
      // Show validation errors
      return
    }

    // Upload in chunks of 50
    const chunks = chunkArray(validation.data, 50)
    for (const chunk of chunks) {
      await uploadChunk(chunk)
    }
  }

  return (
    <div>
      <UploadDropzone onDrop={handleDrop} disabled={isUploading} />
      {isUploading && <UploadProgress progress={progress} />}
    </div>
  )
}

// components/upload/UploadDropzone.tsx (Presentational)
export function UploadDropzone({ onDrop, disabled }) {
  return (
    <div
      onDrop={(e) => onDrop(e.dataTransfer.files[0])}
      className="border-2 border-dashed p-8"
    >
      Drop CSV here or click to browse
    </div>
  )
}
```

**Why this works:**
- Container handles all business logic (validation, chunking, upload)
- Presentational is pure UI (dropzone, progress bar)
- Easy to test: mock hook for container, snapshot test for presentational
- Reusable: UploadDropzone can be used elsewhere

### Anti-Patterns to Avoid

- **SC-01: Tokens in localStorage**
  - Why: XSS vulnerability, tokens accessible to malicious scripts
  - Solution: Use httpOnly cookies (already implemented in AuthProvider)

- **JS-01: Race conditions in manual fetches**
  - Why: Multiple simultaneous requests can overwrite state
  - Solution: Use TanStack Query (deduplication, caching, optimistic updates)

- **CSS-01: Animating width/height**
  - Why: Causes layout reflow, janky animations (<60fps)
  - Solution: Animate opacity and transform only (GPU-accelerated)

- **RX-04: Props drilling >2 levels**
  - Why: Difficult to maintain, components tightly coupled
  - Solution: Use Context or Zustand for shared state

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Table sorting/filtering** | Custom sort/filter logic | TanStack Table | Edge cases: multi-column sort, stable sort, sort indicators, accessibility (ARIA) |
| **Row virtualization** | Custom scroll calculation | @tanstack/react-virtual | Edge cases: dynamic row heights, RTL support, keyboard navigation, overscan optimization |
| **Form validation** | Custom validation logic | Zod + React Hook Form | Edge cases: async validation, cross-field validation, error messages, schema reuse (frontend + backend) |
| **CSV parsing** | Custom string splitting | PapaParse or Zod transforms | Edge cases: quoted fields, multiline cells, encoding, error recovery |
| **Image upload progress** | Custom XHR progress | Zustand + polling | Edge cases: concurrent uploads, pause/resume, retry logic, connection drops |
| **State persistence** | localStorage wrapper | Zustand persist middleware | Edge cases: hydration mismatch, state migration, storage quota, SSR compatibility |
| **Drag & drop** | Native drag events | react-dropzone | Edge cases: file type validation, size limits, preventDefault on dragover, accessibility |
| **Date handling** | Native Date object | date-fns or luxon | Edge cases: timezones, DST, locale formatting, parsing |
| **Markdown rendering** | Custom parser | react-markdown | Edge cases: XSS protection, syntax highlighting, component rendering |

**Key insight:** Custom solutions fail on edge cases. Battle-tested libraries handle 100+ edge cases you didn't anticipate. For Phase 8, focus on business value (vehicle management), not reinventing wheels.

---

## Common Pitfalls

### Pitfall 1: DataGrid Performance Without Virtualization

**What goes wrong:** Rendering 1000+ rows with native DOM causes:
- Initial render: 5-10 seconds (browser freezes)
- Scroll jank: <10fps (unusable)
- Memory leak: Detached DOM nodes accumulate
- User rage: Dashboard becomes "slideshow"

**Why it happens:** Each row is a DOM node. 1000 rows × 5 columns × 3 elements per cell = 15,000 DOM nodes. Browser layout thrashing on every scroll.

**How to avoid:**
- **MANDATORY:** Use `@tanstack/react-virtual` for row virtualization
- Render only ~40 rows (20 visible + 10 buffer top + 10 buffer bottom)
- `overscan: 10` for smooth scrolling
- Stabilize columns with `useMemo` (prevent re-renders)

**Warning signs:**
- Chrome DevTools Performance tab shows 500ms+ scroll handlers
- React DevTools Profiler shows 100+ components rendering on scroll
- Lighthouse FID (First Input Delay) >100ms

**Detection:**
```javascript
// Add to DataGrid.tsx for development
useEffect(() => {
  const rows = document.querySelectorAll('[data-row-id]')
  console.warn(`⚠️ Rendering ${rows.length} rows - should be ~40`)
}, [])
```

### Pitfall 2: Race Conditions in Bulk Upload

**What goes wrong:**
- Chunk #42 fails, retry creates duplicate vehicles
- User uploads same CSV twice → 100 duplicates
- Network timeout → unclear state (did it upload or not?)

**Why it happens:** Lack of idempotency keys. Backend can't distinguish "new upload" from "retry of failed upload."

**How to avoid:**
- **Frontend:** Generate UUID for each bulk upload job
- **Backend:** Check if `job_id` exists before processing
- **Database:** Unique constraint on `(job_id, vin)`
- **Response:** Always return job_id for tracking

**Implementation:**
```typescript
// Frontend
const jobId = crypto.randomUUID()
await fetch('/api/v1/vehicles/bulk', {
  body: JSON.stringify({ job_id: jobId, chunk }),
})

// Backend (FastAPI)
@router.post("/vehicles/bulk")
async def bulk_upload(
    chunk: list[VehicleCreate],
    job_id: str,
    db: Session
):
    # Check if already processed
    existing = db.execute(
        select(Vehicle).where(Vehicle.job_id == job_id)
    ).first()
    if existing:
        return {"status": "already_processed", "job_id": job_id}
```

**Warning signs:**
- Same VIN appears multiple times in database
- User reports "I uploaded 50 cars but only 25 appeared"
- Database logs show "duplicate key constraint" errors

### Pitfall 3: Tenant ID Leaking (IDOR Vulnerability)

**What goes wrong:**
- Seller from Dealership A views vehicles from Dealership B
- Manager edits vehicles from other teams
- **SECURITY BREACH:** Data cross-contamination between tenants

**Why it happens:** Missing `tenant_id` filter in queries. Backend trusts user input instead of JWT token.

**How to avoid:**
- **MANDATORY:** Filter EVERY query by `tenant_id` from JWT token
- **Middleware:** Validate tenant_id in URL matches JWT token
- **Repository:** Accept `tenant_id` parameter, NEVER trust entity.tenant_id
- **Testing:** Inversion thinking (test what users CAN'T access)

**Implementation:**
```python
# ❌ BAD: Trusts entity from request
@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: int, db: Session):
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

# ✅ GOOD: Filters by tenant_id from JWT
@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(
    vehicle_id: int,
    current_tenant: str = Depends(get_current_tenant),
    db: Session
):
    return db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.tenant_id == current_tenant  # JWT token, not request
    ).first()
```

**Warning signs:**
- User sees vehicles they didn't create
- API logs show queries without `WHERE tenant_id =`
- Security audit flags "missing authorization checks"

**Detection:**
```python
# Add to repository tests
def test_vehicle_query_filters_by_tenant(self):
    # Setup: 2 tenants, each with 1 vehicle
    tenant1_vehicle = Vehicle(tenant_id="tenant1", ...)
    tenant2_vehicle = Vehicle(tenant_id="tenant2", ...)

    # Act: Query as tenant1
    results = vehicle_repository.list(tenant_id="tenant1")

    # Assert: Should NOT see tenant2's vehicle
    assert tenant2_vehicle not in results
```

### Pitfall 4: Image Upload Blocking UI

**What goes wrong:**
- Uploading 20 images freezes browser for 30 seconds
- User can't edit vehicle details while images upload
- Progress bar doesn't update (UI appears frozen)
- User rage: "I thought it crashed"

**Why it happens:** Synchronous upload to server → server processes → server returns. Browser waits on main thread.

**How to avoid:**
- **Hybrid approach:** Browser → Cloud (presigned URL) → Backend async processing
- **Parallel uploads:** Upload 3-4 images concurrently
- **Zustand store:** High-frequency progress updates (0-100% per file)
- **Optimistic UI:** Show thumbnail immediately via `URL.createObjectURL`

**Implementation:**
```typescript
// ❌ BAD: Blocks UI
const upload = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  await fetch('/api/upload', { method: 'POST', body: formData }) // Blocks
}

// ✅ GOOD: Non-blocking
const upload = async (file) => {
  // 1. Get presigned URL (fast)
  const { url } = await fetch('/api/images/upload-url').then(r => r.json())

  // 2. Upload directly to cloud (parallel, non-blocking)
  await fetch(url, { method: 'PUT', body: file })

  // 3. Backend processes asynchronously
  // User sees progress bar, can continue working
}
```

**Warning signs:**
- Chrome DevTools Network tab shows "pending" for >10 seconds
- UI becomes unresponsive during upload
- User reports "I can't click anything while uploading"

### Pitfall 5: Search Without Debounce

**What goes wrong:**
- User types "Toyota" → 5 API requests (T, To, Toy, Toyot, Toyota)
- Database hammering: 5 queries in 2 seconds
- Race conditions: Response for "Toy" arrives after "Toyota"
- Slow UX: Each keystroke feels laggy

**Why it happens:** Search fires on every keystroke without delay.

**How to avoid:**
- **Client-side search:** `useMemo` on loaded data (0ms latency)
- **Server-side search:** Debounce 300ms before API call
- **AbortController:** Cancel previous request when new one starts
- **Hybrid:** Client instant → server deep (transition after 300ms idle)

**Implementation:**
```typescript
import { useDeferredValue, useMemo } from 'react'

export function VehicleSearch({ vehicles }) {
  const [search, setSearch] = useState('')

  // React 18+: Automatic optimization for search input
  const deferredSearch = useDeferredValue(search)

  // Client-side instant search (0ms)
  const filtered = useMemo(() => {
    return vehicles.filter(v =>
      v.title.toLowerCase().includes(deferredSearch.toLowerCase())
    )
  }, [vehicles, deferredSearch])

  // Server-side deep search (after 300ms debounce)
  const { data: serverResults } = useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => api.searchVehicles(search),
    enabled: search.length > 2, // Only call server after 3 chars
  })

  return <DataGrid data={search.length > 2 ? serverResults : filtered} />
}
```

**Warning signs:**
- Network tab shows 10+ requests to `/api/vehicles?search=`
- Database logs show 50 queries/second from single user
- User reports "Search is slow and laggy"

### Pitfall 6: Missing Role-Based Middleware

**What goes wrong:**
- Seller navigates to `/admin/settings` → Seems to work (no error)
- Page loads but data is missing (silently filtered)
- Or worse: Seller CAN access admin settings (security breach)

**Why it happens:** Frontend routing doesn't validate roles. Anyone can visit any URL.

**How to avoid:**
- **Middleware:** Validate role BEFORE page renders
- **Route groups:** Organize by role (admin)/(seller)/(dealer)/(manager)
- **Smart redirect:** `/` → middleware detects role → redirects to home
- **Double-check:** Server Components validate again (defense in depth)

**Implementation:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const user = await verifyToken(token)

  const { pathname } = request.url

  // Role-based route protection
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/dealer') && user.role !== 'dealer') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// app/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser()

  // Double-check (defense in depth)
  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <div>{children}</div>
}
```

**Warning signs:**
- User can visit `/admin/settings` without error
- Browser DevTools shows admin data in network response
- Security audit flags "missing authorization checks"

### Pitfall 7: Animating Layout Properties (Reflow)

**What goes wrong:**
- Sidebar collapse triggers janky animation (drops frames)
- Page scroll stutters when elements fade in
- Lighthouse CLS (Cumulative Layout Shift) >0.1
- User perceives UI as "slow" or "laggy"

**Why it happens:** Animating `width`, `height`, `top`, `left` triggers browser reflow (expensive layout recalculation).

**How to avoid:**
- **Animate opacity and transform only** (GPU-accelerated)
- **Never animate width/height** (use transform: scaleX/scaleY instead)
- **Respect prefers-reduced-motion** (accessibility)
- **100-300ms duration** (natural feel)

**Implementation:**
```css
/* ❌ BAD: Triggers reflow */
.sidebar {
  transition: width 300ms ease; /* Causes layout thrashing */
}

/* ✅ GOOD: GPU-accelerated */
.sidebar {
  transform: translateX(-100%);
  transition: transform 300ms ease, opacity 300ms ease; /* Smooth 60fps */
}
```

```typescript
// Framer Motion example
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
  transition={{ duration: 0.2 }} // 200ms
>
  Sidebar content
</motion.div>
```

**Warning signs:**
- Chrome DevTools Performance tab shows "Layout" or "Recalculate Style" during animation
- Animation drops below 60fps (check FPS meter)
- Lighthouse flag "Avoid non-composited animations"

---

## Code Examples

Verified patterns from official sources:

### TanStack Table with Sorting and Filtering

```typescript
// Source: https://tanstack.com/table/latest/docs/guide/introduction
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
} from '@tanstack/react-table'

const columnHelper = createColumnHelper<Vehicle>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Vehicle',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('price', {
    header: 'Price',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => <StatusBadge status={info.getValue()} />,
  }),
]

export function VehicleTable({ data }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div>
      <input
        value={globalFilter ?? ''}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder="Search all columns..."
      />
      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.renderHeader()}
                  {header.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓'}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>{cell.renderCell()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Zustand Store with Persist

```typescript
// Source: https://docs.pmnd.rs/zustand/guides/persist-local-storage
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  activeFilters: string[]
  addFilter: (filter: string) => void
  removeFilter: (filter: string) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      activeFilters: [],
      addFilter: (filter) => set((state) => ({
        activeFilters: [...state.activeFilters, filter]
      })),
      removeFilter: (filter) => set((state) => ({
        activeFilters: state.activeFilters.filter(f => f !== filter)
      })),
    }),
    {
      name: 'prosell-layout', // localStorage key
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeFilters: state.activeFilters,
      }),
    }
  )
)
```

### Zod Validation for CSV Upload

```typescript
// Source: https://zod.dev/
import { z } from 'zod'

const VehicleSchema = z.object({
  vin: z.string().length(17, "VIN must be 17 characters"),
  year: z.number().min(1900).max(2026),
  make: z.string().min(2, "Make is required"),
  model: z.string().min(2, "Model is required"),
  price: z.number().positive("Price must be positive"),
  mileage: z.number().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'sold', 'expired']),
})

const CSVRowSchema = z.object({
  VIN: z.string(),
  Year: z.string().transform(Number),
  Make: z.string(),
  Model: z.string(),
  Price: z.string().transform(Number),
  Mileage: z.string().transform(Number).optional(),
  Status: z.enum(['draft', 'active', 'sold', 'expired']),
})

export function validateCSVRow(row: string) {
  try {
    const parsed = CSVRowSchema.parse(row)
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    throw error
  }
}
```

### TanStack Query with Optimistic Updates

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: Vehicle) =>
      fetch(`/api/v1/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r.json()),

    onMutate: async (newVehicle) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['vehicles'] })

      // Snapshot previous value
      const previousVehicles = queryClient.getQueryData(['vehicles'])

      // Optimistically update to new value
      queryClient.setQueryData(['vehicles'], (old) =>
        old?.map(v => v.id === newVehicle.id ? newVehicle : v)
      )

      // Return context with previous value
      return { previousVehicles }
    },

    onError: (err, newVehicle, context) => {
      // Rollback to previous value on error
      queryClient.setQueryData(['vehicles'], context.previousVehicles)
    },

    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}
```

### Shadcn UI Button with Variants

```typescript
// Source: https://ui.shadcn.com/docs/components/button
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| **React Table v8** | TanStack Table v8 | 2022 | Renamed to TanStack, supports React/Vue/Solid/Svelte, better TypeScript |
| **Server Components** | React 19 Server Components default | 2024 | Reduced client JS by 40-60%, better SEO, faster initial load |
| **Manual virtualization** | @tanstack/react-virtual | 2023 | Simplified API, better performance, supports dynamic heights |
| **localStorage** | Zustand persist middleware | 2023 | Type-safe, hydration handling, migration support |
| **Manual validation** | Zod 3.x + RHF | 2023 | Runtime type validation, error handling, schema reuse (frontend + backend) |
| **CSS-in-JS** | TailwindCSS 4.0 | 2025 | New engine, no var() in className, built-in dark mode, better performance |
| **Jest** | Vitest | 2023 | Native ESM support, faster (10x), same API as Jest |

**Deprecated/outdated:**
- **react-table v7:** Use @tanstack/react-table instead
- **Styled Components / Emotion:** TailwindCSS 4.0 is faster and more maintainable
- **PropTypes:** TypeScript + Zod replace runtime PropTypes
- **Redux:** Zustand is simpler and faster for most use cases
- **Next.js Pages Router:** App Router is the default (better performance, Server Components)
- **Class components:** Functional components + hooks are the standard (since React 16.8, 2019)

---

## Open Questions

1. **Cloudflare R2 vs AWS S3 for image storage**
   - What we know: Both support presigned URLs, webhooks, async processing
   - What's unclear: Pricing at scale, ease of integration with existing infrastructure
   - Recommendation: Test both with 1000 image upload (measure latency, cost), decide based on metrics

2. **MagicUI components availability**
   - What we know: MagicUI is a collection of copy-paste components (BorderBeam, RetroGrid, Marquee)
   - What's unclear: Are these components production-ready? Do they follow React 19 patterns?
   - Recommendation: Manual testing of MagicUI components before committing. If unstable, build custom with Framer Motion

3. **Taskiq + Redis setup for bulk processing**
   - What we know: Taskiq is mentioned in CONTEXT.md as the task queue
   - What's unclear: Is Redis already configured? Are Taskiq workers running?
   - Recommendation: Verify Taskiq + Redis setup in Phase 8 Wave 0. If not configured, add to Wave 0 tasks.

4. **Existing AuthProvider role-based redirects**
   - What we know: AuthProvider exists in components/providers/
   - What's unclear: Does it support role-based redirects? Does it expose user role?
   - Recommendation: Read AuthProvider code, add role-based redirect logic if missing

5. **Middleware.ts existence and configuration**
   - What we know: Next.js 16 has middleware.ts in app/
   - What's unclear: Does it validate roles? Does it check tenant_id?
   - Recommendation: Read middleware.ts, add role/tenant guards if missing

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1 + Testing Library |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `pnpm test -- DataGrid` |
| Full suite command | `pnpm test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATALOG-01 | Seller sees catalog with publication status | unit | `pnpm test -- DataGrid` | ✅ Wave 0 |
| CATALOG-02 | Admin sees global catalog | unit | `pnpm test -- DataGrid.admin` | ✅ Wave 0 |
| CATALOG-03 | Dealer views own inventory only | unit | `pnpm test -- DataGrid.dealer` | ✅ Wave 0 |
| DASH-03 | Seller dashboard shows personal stats | unit | `pnpm test -- Dashboard.seller` | ✅ Wave 0 |
| DASH-04 | Dealer dashboard shows inventory only | unit | `pnpm test -- Dashboard.dealer` | ✅ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test --changed` (only test changed files)
- **Per wave merge:** `pnpm test:coverage` (full suite + coverage report)
- **Phase gate:** Full suite green + 80% coverage for Vehicle CRUD endpoints before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/components/datagrid/DataGrid.test.tsx` — DataGrid rendering with virtualization
- [ ] `tests/unit/components/datagrid/StatusBadge.test.tsx` — StatusBadge component with 6 states
- [ ] `tests/unit/components/upload/BulkUpload.test.tsx` — CSV validation with Zod
- [ ] `tests/unit/components/upload/ImageDropzone.test.tsx` — Drag & drop + file picker
- [ ] `tests/unit/components/layout/Sidebar.test.tsx` — Sidebar navigation + role-based menu
- [ ] `tests/unit/components/layout/Header.test.tsx` — Header with search, breadcrumbs, user menu
- [ ] `tests/unit/components/filters/FilterSidebar.test.tsx` — Collapsible filters + faceted navigation
- [ ] `tests/unit/components/filters/CommandPalette.test.tsx` — Cmd+K omnibar search
- [ ] `tests/unit/lib/hooks/useDataGrid.test.ts` — DataGrid hook (sorting, filtering, selection)
- [ ] `tests/unit/lib/hooks/useImageUpload.test.ts` — Image upload hook (presigned URL + progress)
- [ ] `tests/unit/lib/hooks/useBulkUpload.test.ts` — Bulk upload hook (CSV validation + chunking)
- [ ] `tests/unit/middleware.test.ts` — Middleware role/tenant guards (extend existing)

**Framework install:** Vitest already configured (vitest.config.ts exists). No additional setup needed.

---

## Sources

### Primary (HIGH confidence)

- **TanStack Table**: Official docs at https://tanstack.com/table/latest - Headless table library with sorting, filtering, virtualization
- **TanStack Virtual**: Official docs at https://tanstack.com/virtual/latest - Row virtualization for 60fps with 1000+ rows
- **Zustand**: Official docs at https://docs.pmnd.rs/zustand - State management with persist middleware
- **Shadcn UI**: Official docs at https://ui.shadcn.com - Copy-paste UI components with Radix UI primitives
- **Radix UI**: Official docs at https://www.radix-ui.com - Unstyled component primitives (Dialog, DropdownMenu)
- **Next.js 16**: Official docs at https://nextjs.org/docs - App Router, Route Groups, Server Components
- **React 19**: Official docs at https://react.dev - Server Components, ref as prop, useDeferredValue
- **TailwindCSS 4**: Official docs at https://tailwindcss.com - New engine, no var() in className, dark mode
- **Vitest**: Official docs at https://vitest.dev - Testing framework with native ESM support
- **Testing Library**: Official docs at https://testing-library.com - User-centric testing approach
- **Zod**: Official docs at https://zod.dev - Runtime type validation with error handling
- **React Hook Form**: Official docs at https://react-hook-form.com - Form state management with validation

### Secondary (MEDIUM confidence)

- **CONTEXT.md (Phase 8)**: `.planning/phases/08-.../08-CONTEXT.md` - Locked decisions from 7-brain validation (UX, UI, Frontend, QA, Product, Growth, Backend)
- **REQUIREMENTS.md**: `.planning/REQUIREMENTS.md` - Requirements mapping to Phase 8 (CATALOG-01/02/03, DASH-01/02/03/04)
- **CLAUDE.md**: `/home/rpadron/proy/prosell-sass/CLAUDE.md` - Project-specific guidelines, architecture patterns, SOLID principles
- **Existing codebase**: `/home/rpadron/proy/prosell-sass/apps/web/src/` - Current implementation (AuthProvider, publisher components, UI components)
- **Vitest config**: `/home/rpadron/proy/prosell-sass/apps/web/vitest.config.ts` - Test configuration with 80% coverage targets

### Tertiary (LOW confidence)

- **Web search**: Exhausted weekly/monthly limit (2026-03-27). Unable to verify latest TanStack Table, Shadcn UI, MagicUI patterns via web search. Relying on official docs and existing codebase.

**Confidence breakdown:**

- **Standard stack:** HIGH - All libraries are standard in industry, official docs available, existing codebase already uses most (Zustand, TanStack Query, Shadcn UI core)
- **Architecture:** HIGH - CONTEXT.md provides detailed 7-brain validation with locked decisions. Clean Architecture, SOLID principles well-documented in CLAUDE.md
- **Pitfalls:** HIGH - Common issues well-documented in official docs and community best practices. Context.md explicitly lists anti-patterns to avoid (SC-01, JS-01, CSS-01, RX-04)
- **Validation Architecture:** MEDIUM - Vitest configured but test files don't exist yet. Wave 0 gaps identified. Need to create test files during implementation.

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (30 days - React 19 and Next.js 16 are stable, but ecosystem evolves rapidly)
