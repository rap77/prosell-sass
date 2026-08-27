# ProSell MVP Specification

**Milestone:** Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-04-26

---

## 1. Problem Statement

### 1.1 The Problem

Dealerships struggle to efficiently manage vehicle sales across multiple channels:

- **Manual listing management**: Sales staff spend hours manually posting vehicles to Facebook Marketplace
- **Lost leads**: Facebook messages go untracked, leading to missed opportunities
- **Appointment chaos**: No centralized system to schedule and track buyer appointments with dealers
- **Fragmented workflow**: Sales staff, managers, and dealers use disconnected tools (spreadsheets, phone calls, WhatsApp)

### 1.2 The Solution

ProSell provides a unified platform that:

1. **Publishes vehicles to Facebook Marketplace** with one click (Phase 1 — COMPLETE ✅)
2. **Captures leads automatically** from Facebook messages (Phase 4 — IN SCOPE)
3. **Schedules appointments** between buyers and dealers (Phase 4 — IN SCOPE)
4. **Manages inventory** with role-based access control (Phase 2 + Phase 13 — IN SCOPE)

### 1.3 Target Users

- **Primary**: Vendedores (sales staff) at dealerships
- **Secondary**: Managers (sales team leads)
- **Tertiary**: Dealers (business owners)
- **Admin**: System administrators

---

## 2. User Personas

### 2.1 Vendedor (Seller)

**Profile**: Sales staff at a dealership, 5-50 vehicles under active management

**Jobs-to-be-Done**:

- Publish vehicles to Facebook Marketplace quickly
- Respond to leads from Facebook messages
- Schedule appointments for interested buyers
- Track which vehicles are getting the most leads
- Update vehicle details (price, description, photos)

**Pain Points**:

- Copy-pasting vehicle data to Facebook is tedious
- Missing Facebook messages means lost sales
- No visibility into which vehicles are performing best
- Difficult to coordinate appointment times with dealers

**Success Metric**: Can publish a vehicle and capture a lead within 5 minutes

### 2.2 Manager

**Profile**: Sales team lead, manages 3-10 vendedores

**Jobs-to-be-Done**:

- View team performance (leads per vendedor, conversion rates)
- Assign leads to team members
- Monitor publication status across team inventory
- Approve bulk actions (e.g., price updates, mass publications)

**Pain Points**:

- No visibility into individual vendedor performance
- Difficult to reassign leads when vendedor is absent
- Manual tracking of team KPIs in spreadsheets

**Success Metric**: Can view team performance metrics in real-time

### 2.3 Dealer

**Profile**: Business owner, owns inventory but may not sell directly

**Jobs-to-be-Done**:

- View their inventory and publication status
- Receive appointment notifications with buyer details
- Access vehicle performance reports (leads, views)
- Manage dealership settings

**Pain Points**:

- No direct visibility into inventory status
- Miss appointments due to poor communication
- Don't know which vehicles are generating leads

**Success Metric**: Receives appointment notifications with complete buyer information

### 2.4 Admin

**Profile**: System administrator, manages organizations and users

**Jobs-to-be-Done**:

- Create and manage organizations (dealerships)
- Add/remove users and assign roles
- Configure system settings (Facebook OAuth, email providers)
- Monitor system health and API integrations

**Pain Points**:

- Manual user management is error-prone
- Difficult to troubleshoot integration issues
- No visibility into system-wide metrics

**Success Metric**: Can onboard a new dealership in under 10 minutes

---

## 3. User Stories

### 3.1 Must Have (MVP Core)

#### Phase 13 Completion (Frontend C3 Integration)

**FE-01**: As a **Vendedor**, I want to add a vehicle using the new C3 schema so that I can publish it to Facebook

- Acceptance: VehicleForm uses `/api/v1/products` endpoint with VIN auto-creating vehicle
- Acceptance: Category dropdown loads from `/api/v1/categories` with 5-min cache
- Acceptance: Form validates required fields before submission

**FE-02**: As a **Vendedor**, I want to see my inventory in the DataGrid so that I can manage my vehicles

- Acceptance: DataGrid loads vehicles from `/api/v1/vehicles` with cursor pagination
- Acceptance: Each row shows vehicle photo, title, price, status, actions
- Acceptance: Virtualization handles 1000+ vehicles at 60fps

**FE-03**: As a **Vendedor**, I want to upload vehicle images in bulk so that I can list vehicles faster

- Acceptance: Drag-drop zone accepts up to 20 images
- Acceptance: Parallel upload (3-4 concurrent) with progress bars
- Acceptance: Images are processed (thumbnails, WebP, EXIF stripped) on backend

**FE-04**: As a **Vendedor**, I want to search and filter vehicles so that I can find specific vehicles quickly

- Acceptance: Client-side instant search for title/ID/make/model
- Acceptance: Filter sidebar with faceted navigation (Brand, Status, Price, Year)
- Acceptance: Command palette (Cmd+K) for quick vehicle search

**FE-05**: As a **System**, I want all E2E tests passing so that the C3 integration is verified

- Acceptance: Smoke test suite (20 critical path tests) passes
- Acceptance: VehicleForm E2E tests pass with products API
- Acceptance: Category E2E tests pass with API integration
- Acceptance: DataGrid E2E tests pass with C3 join data
- Acceptance: Bulk upload E2E tests pass with products schema

#### Phase 4 Implementation (Leads & Appointments)

**LEAD-01**: As a **System**, I want to capture leads from Facebook webhooks so that no lead is lost

- Acceptance: Facebook webhook endpoint receives lead messages within 5 minutes
- Acceptance: Lead is created with listing_id, buyer_name, message_text, timestamp
- Acceptance: Fallback polling runs every 10 minutes if webhook fails
- Acceptance: Duplicate detection prevents duplicate leads (same buyer + listing)

**LEAD-02**: As a **Vendedor**, I want to see incoming leads so that I can follow up

- Acceptance: Leads list page shows all leads assigned to me
- Acceptance: Each lead shows buyer name, vehicle, message, timestamp, status
- Acceptance: Unread leads are highlighted
- Acceptance: Real-time updates via WebSocket or polling

**LEAD-03**: As a **Vendedor**, I want to update lead status so that I can track progress

- Acceptance: Lead lifecycle: new → contacted → qualified → appointment_set → lost
- Acceptance: Status change triggers notification to Manager
- Acceptance: Lost leads require reason selection (price, location, not interested)

**LEAD-04**: As a **Vendedor**, I want to create an appointment so that the buyer can visit the dealership

- Acceptance: Appointment form links Lead + Vehicle + Dealer + date/time
- Acceptance: Dealer receives email notification with appointment details
- Acceptance: Appointment appears in dealer's calendar view
- Acceptance: Confirmation is sent to buyer (optional)

**LEAD-05**: As a **Dealer**, I want to receive appointment emails so that I can prepare for the visit

- Acceptance: Email includes buyer name, contact, vehicle, date/time
- Acceptance: Email is sent via SendGrid immediately after appointment creation
- Acceptance: Dealer can accept/decline appointment from email link

**LEAD-06**: As a **Manager**, I want to view team leads so that I can assign and monitor

- Acceptance: Team leads view shows all leads across team members
- Acceptance: Filter by vendedor, status, date range
- Acceptance: Reassign lead to different vendedor
- Acceptance: Export leads to CSV for reporting

**LEAD-07**: As a **Vendedor**, I want to manually add a lead so that I can track walk-in or phone leads

- Acceptance: Manual lead form captures name, contact, vehicle, source
- Acceptance: Source options: Facebook, Phone, Walk-in, Referral, Other
- Acceptance: Manual leads appear in the same leads list

**LEAD-08**: As a **System**, I want lead data integrity so that reports are accurate

- Acceptance: Lead cannot be deleted (soft delete only)
- Acceptance: Lead audit log tracks all status changes
- Acceptance: Lead is linked to organization (tenant_id)
- Acceptance: Lead timestamps use UTC timezone

### 3.2 Should Have (Important but Not Blocking)

**LEAD-09**: As a **Vendedor**, I want to see lead history so that I can remember previous interactions
**LEAD-10**: As a **Manager**, I want to set lead assignment rules so that leads are auto-distributed
**LEAD-11**: As a **Vendedor**, I want to add notes to leads so that I can remember details
**LEAD-12**: As a **Dealer**, I want a mobile-friendly calendar view so that I can check appointments on-the-go

### 3.3 Nice to Have (Future Enhancements)

**LEAD-13**: As a **Vendedor**, I want WhatsApp integration so that I can respond to leads directly
**LEAD-14**: As a **Manager**, I want automated follow-up reminders so that leads don't go cold
**LEAD-15**: As a **System**, I want AI lead scoring so that vendedores prioritize high-quality leads

---

## 3.5 Vertical Slicing Strategy (Phase 4 Re-Planning)

**Updated**: 2026-04-27 — Phase 4 re-planned with vertical slicing

### Principle: One Task = One Complete Feature

**Old Approach (Horizontal Slicing)**: Tasks divided by technical layers

- 4-01: Domain entities only
- 4-02: Repository + use cases only
- 4-07: Frontend types only
- **Problem**: After 4 tasks, still no usable feature

**New Approach (Vertical Slicing)**: Each task delivers ONE complete user-facing feature

- A1: Lead Capture Foundation (domain + repo + API + tests)
- A3: Vendedor Leads List (API + frontend + E2E)
- **Benefit**: After A3, vendedor can use the feature

### Phase 4 Vertical Slices (A1-A7)

| Task   | Feature                 | User Stories               | Layers Included                                             |
| ------ | ----------------------- | -------------------------- | ----------------------------------------------------------- |
| **A1** | Lead Capture Foundation | LEAD-08, LEAD-03 (partial) | Domain, DB, Repo, Use Cases, API, Tests                     |
| **A2** | Facebook Lead Webhook   | LEAD-01                    | Webhook, GraphAPI, Background Tasks                         |
| **A3** | Vendedor Leads List     | LEAD-02, LEAD-03           | Frontend Types, API Client, Components, Pages, E2E          |
| **A4** | Appointment Scheduling  | LEAD-04, LEAD-05           | Domain, DB, Repo, Use Cases, SendGrid, API, Frontend, Tests |
| **A5** | Manager Team View       | LEAD-06                    | API Extensions, Frontend, E2E                               |
| **A6** | Dealer Calendar         | (Implied)                  | Frontend, E2E                                               |
| **A7** | E2E Verification        | All                        | E2E Tests, Smoke Tests                                      |

### Dependency Graph

```
A1: Lead Capture Foundation (backend complete)
  ↓
  ├─→ A2: Facebook Webhook (parallel with A1)
  │
  ├─→ A3: Vendedor Leads List (frontend)
  │     ↓
  │     └─→ A5: Manager Team View
  │
  └─→ A4: Appointment Scheduling (full feature)
        ↓
        └─→ A6: Dealer Calendar
              ↓
              └─→ A7: E2E Verification
```

**Parallel Execution**: A1+A2, A3+A4, A5+A6

### Acceptance Criteria per Vertical Slice

**A1 (Lead Capture Foundation)**:

- Lead entity with 5-state lifecycle (new → contacted → qualified → appointment_set → lost)
- LeadAuditLog tracks all status changes
- POST /api/v1/leads creates manual lead
- PUT /api/v1/leads/{id}/status updates status with audit trail
- Unit tests for state transitions pass
- Integration tests for use cases pass

**A2 (Facebook Lead Webhook)**:

- POST /api/v1/webhooks/facebook receives lead messages
- Webhook signature verification (X-Hub-Signature)
- Lead created from Facebook payload within 5 seconds
- Duplicate detection (same buyer + vehicle within 24h)
- Polling fallback runs every 10 minutes
- Integration test passes

**A3 (Vendedor Leads List)**:

- Vendedor views assigned leads at /vendedor/leads
- Status update dropdown works
- Search by buyer name/vehicle
- Filter by status
- Unread leads highlighted
- Real-time updates (polling 30s)
- E2E test passes

**A4 (Appointment Scheduling)**:

- Vendedor creates appointment from lead details
- AppointmentForm with date-time picker
- Time validation (business hours, conflicts)
- Lead status updates to "appointment_set"
- Dealer receives SendGrid email notification
- E2E test passes

**A5 (Manager Team View)**:

- Manager views all team leads at /manager/team/leads
- Filter by vendedor dropdown
- Reassign lead to different vendedor
- Export to CSV
- Team metrics card
- E2E test passes

**A6 (Dealer Calendar)**:

- Dealer views appointments at /dealer/appointments
- Calendar view (day/week/month)
- Confirm/cancel appointment buttons
- Appointment details modal
- E2E test passes

**A7 (E2E Verification)**:

- Facebook webhook → lead → appointment flow verified
- All E2E tests pass
- Smoke tests updated with 5 critical lead tests
- Test execution time < 5 minutes

---

## 4. Use Cases

### UC-01: Vendedor Publishes Vehicle to Facebook

**Primary Actor**: Vendedor
**Preconditions**:

- Vendedor is logged in
- Vendedor has access to at least one dealership
- Vehicle exists in inventory with valid VIN, photos, price

**Main Flow**:

1. Vendedor navigates to Catalog page
2. Vendedor clicks "Publicar" button on a vehicle row
3. System opens PublishModal with vehicle details pre-populated
4. Vendedor selects Facebook page (if multiple pages available)
5. Vendedor reviews listing title, description, price
6. Vendedor clicks "Confirmar Publicación"
7. System validates Facebook OAuth token
8. System publishes listing via Playwright (or Graph API if approved)
9. System creates Publication record with status "pending"
10. System updates UI to show "Publicando..." status
11. Background task completes publication within 2 minutes
12. System updates Publication status to "published" with listing URL
13. System schedules auto-republish for 7 days later

**Alternative Flows**:

- **5a. Facebook token expired**: System refreshes token via OAuth flow
- **8a. Publication fails**: System sets status to "failed", shows error message, allows retry
- **8b. Rate limit exceeded**: System queues publication for retry with exponential backoff

**Postconditions**:

- Vehicle appears on Facebook Marketplace within 2 minutes
- Publication record has status "published" or "failed"
- Auto-republish task is scheduled

---

### UC-02: System Captures Lead from Facebook

**Primary Actor**: System (background task)
**Preconditions**:

- Facebook page is connected via OAuth
- Webhook endpoint is registered with Facebook
- At least one vehicle is published on Facebook

**Main Flow**:

1. Buyer sends message to Facebook listing
2. Facebook sends webhook event to ProSell endpoint
3. System verifies webhook signature (X-Hub-Signature)
4. System extracts listing_id, sender_id, message_text, timestamp
5. System queries local database for vehicle by listing_id
6. System queries Facebook Graph API for buyer profile (name, profile_url)
7. System checks for duplicate lead (same buyer + vehicle within 24 hours)
8. System creates Lead record with status "new"
9. System determines assigned vendedor (vehicle's owner or round-robin)
10. System sends real-time notification to assigned vendedor
11. System increments lead count metrics

**Alternative Flows**:

- **4a. Webhook verification fails**: System returns 403, logs security event
- **5a. Vehicle not found**: System creates lead with null vehicle, logs error
- **7a. Duplicate lead detected**: System updates existing lead's timestamp, doesn't create duplicate
- **10a. Vendedor offline**: System queues notification for next login

**Postconditions**:

- Lead record exists in database
- Assigned vendedor receives notification
- Lead appears in vendedor's leads list

---

### UC-03: Vendedor Creates Appointment for Lead

**Primary Actor**: Vendedor
**Preconditions**:

- Vendedor is logged in
- Lead exists with status "qualified" or "new"
- Vehicle is linked to lead
- Dealer is assigned to vehicle

**Main Flow**:

1. Vendedor opens Leads page
2. Vendedor clicks on a lead to view details
3. Vendedor clicks "Agendar Cita" button
4. System opens AppointmentForm modal
5. System pre-populates form with lead name, vehicle, dealer
6. Vendedor selects date and time from date-time picker
7. Vendedor adds optional notes (e.g., "Buyer interested in financing")
8. Vendedor clicks "Confirmar Cita"
9. System validates appointment time (business hours, no conflicts)
10. System creates Appointment record with status "scheduled"
11. System updates Lead status to "appointment_set"
12. System sends email notification to dealer via SendGrid
13. System adds appointment to dealer's calendar
14. System shows success confirmation to vendedor

**Alternative Flows**:

- **6a. Time outside business hours**: System shows warning, allows override
- **9a. Dealer has conflicting appointment**: System shows conflict, allows double-book
- **12a. SendGrid API fails**: System logs error, retries with exponential backoff

**Postconditions**:

- Appointment record exists with status "scheduled"
- Lead status is "appointment_set"
- Dealer receives email notification
- Appointment visible in dealer's calendar

---

### UC-04: Vendedor Updates Lead Status

**Primary Actor**: Vendedor
**Preconditions**:

- Vendedor is logged in
- Lead exists and is assigned to vendedor

**Main Flow**:

1. Vendedor opens Leads page
2. Vendedor clicks on a lead to view details
3. Vendedor clicks "Status" dropdown
4. Vendedor selects new status (e.g., "contacted")
5. System shows confirmation dialog if status is "lost"
6. If "lost", vendedor selects reason (price, location, not interested)
7. Vendedor confirms status change
8. System updates Lead status
9. System creates audit log entry with timestamp, vendedor, old_status, new_status
10. System sends notification to Manager (if status changed to "appointment_set" or "lost")
11. System updates lead metrics in dashboard

**Postconditions**:

- Lead status is updated
- Audit log entry exists
- Manager receives notification (if applicable)

---

### UC-05: Vendedor Adds Vehicle Using C3 Schema

**Primary Actor**: Vendedor
**Preconditions**:

- Vendedor is logged in
- Vendedor has access to at least one dealership
- Categories are loaded in system

**Main Flow**:

1. Vendedor navigates to Catalog page
2. Vendedor clicks "Nuevo Vehículo" button
3. System opens VehicleForm
4. Vendedor enters VIN (or clicks "Decodificar VIN" if they have it)
5. System calls NHTSA API to decode VIN
6. System populates make, model, year, trim, engine, transmission
7. Vendedor selects category from dropdown (e.g., "Sedan", "SUV")
8. System renders category-specific attribute fields (from attribute_schema)
9. Vendedor enters price, mileage, condition
10. Vendedor uploads photos (drag-drop or click to upload)
11. Photos upload in parallel via presigned URLs
12. Vendedor clicks "Guardar Vehículo"
13. System calls `POST /api/v1/products` with `{ title, price_cents, category_id, attributes: { vin, make, model, ... } }`
14. Backend creates Product record
15. Backend detects VIN in attributes, creates Vehicle record in same transaction
16. Backend returns Product with id, status, timestamps
17. System invalidates `['vehicles']` and `['products']` queries
18. System redirects vendedor to Catalog page with new vehicle in list
19. System shows success toast notification

**Alternative Flows**:

- **4a. VIN decode fails**: System shows error, allows manual entry
- **7a. Category not selected**: System disables "Guardar" button
- **11a. Image upload fails**: System shows error for failed image, allows retry
- **15a. Transaction fails**: System rolls back Product, shows error message

**Postconditions**:

- Product record exists in database
- Vehicle record exists (linked to Product via product_id)
- Photos are uploaded and processed
- Vehicle appears in Catalog DataGrid

---

## 5. Architecture

### 5.1 System Components

#### Backend (Python/FastAPI)

```
apps/api/src/prosell/
├── domain/
│   ├── organizations/        # Multi-tenant entities
│   ├── users/                # User, roles, OAuth
│   ├── dealers/              # Dealership entities
│   ├── publications/         # Publication state machine
│   ├── products/             # Product entity (C3 schema)
│   ├── vehicles/             # Vehicle entity (C3 schema)
│   ├── categories/           # Category entity (C3 schema)
│   ├── leads/                # Lead entity, lifecycle
│   └── appointments/         # Appointment entity
├── application/
│   ├── publish/              # PublishListingUseCase, UpdateListingUseCase
│   ├── leads/                # CreateLeadUseCase, UpdateLeadStatusUseCase
│   ├── appointments/         # CreateAppointmentUseCase
│   └── tasks/                # Taskiq background tasks (auto-republish, polling)
└── infrastructure/
    ├── api/routers/
    │   ├── publication_router.py
    │   ├── lead_router.py
    │   └── appointment_router.py
    ├── external/
    │   ├── facebook/         # PlaywrightPublisherService, GraphAPIPublisherService
    │   └── sendgrid/         # EmailService
    └── tasks/                # Taskiq broker, workers
```

#### Frontend (Next.js 16 + React 19)

```
apps/web/src/
├── app/
│   ├── (role)/
│   │   ├── vendedor/
│   │   │   ├── catalog/
│   │   │   │   ├── page.tsx           # DataGrid, filters
│   │   │   │   └── [id]/page.tsx      # Vehicle details
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx           # Leads list
│   │   │   │   └── [id]/page.tsx      # Lead details
│   │   │   └── appointments/
│   │   │       └── page.tsx           # Calendar view
│   │   ├── manager/
│   │   │   └── team/
│   │   │       └── leads/page.tsx     # Team leads view
│   │   └── dealer/
│   │       └── appointments/page.tsx  # Dealer calendar
├── components/
│   ├── vehicle/
│   │   ├── VehicleForm.tsx            # C3-aware form
│   │   └── PublishModal.tsx
│   ├── leads/
│   │   ├── LeadList.tsx
│   │   ├── LeadDetails.tsx
│   │   └── AppointmentForm.tsx
│   └── datagrid/
│       └── DataGrid.tsx               # TanStack Virtual
├── lib/
│   ├── api/
│   │   ├── products.ts                # useCreateProduct hook
│   │   ├── categories.ts              # useCategories hook
│   │   ├── leads.ts                   # Lead API clients
│   │   └── appointments.ts            # Appointment API clients
│   └── stores/
│       └── uploadStore.ts             # Zustand upload progress
└── types/
    ├── product.ts
    ├── category.ts
    ├── lead.ts
    └── appointment.ts
```

### 5.2 Data Flow

#### Publish Flow (Phase 1 — Already Complete)

```
User clicks "Publicar" → PublishModal
  → PublishListingUseCase
  → PublisherStrategySelector (Playwright or GraphAPI)
  → Facebook Marketplace
  → Publication status: pending → published
  → Schedule AutoRepublishUseCase (7 days later)
```

#### Lead Capture Flow (Phase 4 — New)

```
Facebook Message → Webhook Endpoint (/api/v1/webhooks/facebook)
  → Verify webhook signature
  → Extract lead data (listing_id, sender_id, message)
  → Query vehicle by listing_id
  → Check duplicate lead
  → CreateLeadUseCase
  → Assign to vendedor (round-robin or vehicle owner)
  → Real-time notification to vendedor (WebSocket or polling)
  → Lead appears in vendedor's leads list
```

#### Appointment Creation Flow (Phase 4 — New)

```
Vendedor clicks "Agendar Cita" → AppointmentForm
  → CreateAppointmentUseCase
  → Validate appointment time
  → Create Appointment record
  → Update Lead status to "appointment_set"
  → Send email to dealer (SendGrid)
  → Add to dealer's calendar
  → Notify vendedor (success toast)
```

#### C3 Vehicle Creation Flow (Phase 13 — In Progress)

```
Vendedor fills VehicleForm → VIN decode (NHTSA API)
  → Select category (load from /api/v1/categories)
  → Upload images (presigned URLs, parallel)
  → Submit: POST /api/v1/products
  → Backend: CreateProductUseCase
  → Detect VIN in attributes
  → Create Vehicle record (same transaction)
  → Return Product with id
  → Invalidate queries: ['vehicles'], ['products']
  → Redirect to catalog
```

### 5.3 API Design

#### Phase 13 APIs (Already Implemented)

```
GET  /api/v1/categories          # List all categories (5-min cache)
POST /api/v1/products            # Create product + auto-create vehicle if VIN present
GET  /api/v1/vehicles            # List vehicles with cursor pagination
GET  /api/v1/vehicles/{id}       # Get vehicle details
PUT  /api/v1/vehicles/{id}       # Update vehicle
DELETE /api/v1/vehicles/{id}     # Delete vehicle (CASCADE to product)
```

#### Phase 4 APIs (To Be Implemented)

```
# Leads
GET    /api/v1/leads                    # List leads (filtered by user role)
POST   /api/v1/leads                    # Manually create lead
GET    /api/v1/leads/{id}               # Get lead details
PUT    /api/v1/leads/{id}/status        # Update lead status
GET    /api/v1/leads/{id}/history       # Get lead audit log

# Appointments
POST   /api/v1/appointments             # Create appointment
GET    /api/v1/appointments             # List appointments (filtered by user role)
GET    /api/v1/appointments/{id}        # Get appointment details
PUT    /api/v1/appointments/{id}/status # Update appointment status (cancel, complete)

# Webhooks
POST   /api/v1/webhooks/facebook        # Facebook lead webhook endpoint
```

### 5.4 Database Schema (C3 + Lead/Appointment)

```
organizations (id, name, tenant_id)
users (id, email, role, organization_id, tenant_id)
roles (id, name, permissions)
user_roles (user_id, role_id)
dealers (id, name, organization_id, tenant_id)
user_dealers (user_id, dealer_id) -- Vendedor-to-dealer assignment

# C3 Schema (Phase 11+12)
categories (id, name, slug, attribute_schema, tenant_id)
products (id, title, price_cents, category_id, attributes, tenant_id)
vehicles (id, product_id, vin, make, model, year, mileage, tenant_id) -- Linked to products
product_images (id, product_id, image_url, sort_order, tenant_id)

# Publications (Phase 1)
publications (id, vehicle_id, facebook_listing_id, status, published_at, expires_at, tenant_id)

# Leads & Appointments (Phase 4)
leads (id, buyer_name, buyer_email, buyer_phone, vehicle_id, listing_id, message, status, source, assigned_vendedor_id, tenant_id)
lead_audit_log (id, lead_id, old_status, new_status, changed_by, changed_at, tenant_id)
appointments (id, lead_id, dealer_id, vehicle_id, scheduled_at, status, notes, tenant_id)

# Facebook OAuth
facebook_accounts (id, user_id, page_id, page_name, access_token, token_expires_at, tenant_id)
```

---

## 6. Testing Strategy

### 6.1 Phase 13 Testing (C3 Frontend Integration)

#### E2E Tests (Playwright)

**File**: `tests/e2e/smoke.spec.ts` (NEW — 20 critical path tests)

- Auth flow: Login, logout, protected route redirect
- Vehicle form: VIN decode, category select, form submit, validation
- DataGrid: Load vehicles, pagination, filtering, sorting
- Bulk upload: CSV parse, image upload, progress bars
- Publish flow: Publish modal, Facebook connection, status update

**File**: `tests/e2e/specs/vehicle-form-vin.spec.ts` (UPDATE)

- Test against `/api/v1/products` endpoint (not mocks)
- Verify VIN decode populates correct fields
- Verify category selection loads from API
- Verify form submit creates product + vehicle

**File**: `tests/e2e/specs/categories.spec.ts` (NEW)

- Test category dropdown loads from `/api/v1/categories`
- Test category selection triggers attribute_schema fields
- Test role-based filtering (admin vs. vendedor)

**File**: `tests/e2e/specs/vehicles.spec.ts` (UPDATE)

- Test DataGrid loads from `/api/v1/vehicles`
- Test cursor pagination (load more, scroll)
- Test C3 join data (product + vehicle fields displayed)

**File**: `tests/e2e/specs/bulk-upload.spec.ts` (UPDATE)

- Test CSV upload creates products via API
- Test image upload uses presigned URLs
- Test progress bar updates correctly

#### Integration Tests (Backend)

**File**: `apps/api/tests/integration/api/test_product_c3.py` (EXISTING)

- Test product creation with VIN creates vehicle
- Test product creation without VIN creates product only
- Test category validation

**File**: `apps/api/tests/integration/api/test_vehicle_api.py` (EXISTING)

- Test vehicle CRUD operations
- Test C3 join queries (product + vehicle)
- Test role-based filtering (tenant_id)

**File**: `apps/api/tests/integration/api/test_category_api.py` (EXISTING)

- Test category CRUD
- Test attribute_schema validation
- Test role-based access control

#### Unit Tests (Frontend)

**File**: `apps/web/tests/unit/api/categories.test.ts` (EXISTING)

- Test `useCategories` hook
- Test `useCategoryOptions` transformation
- Test 5-min cache behavior

**File**: `apps/web/tests/unit/api/products.test.ts` (NEW)

- Test `useCreateProduct` mutation
- Test query invalidation on success
- Test error handling

### 6.2 Phase 4 Testing (Leads & Appointments)

#### E2E Tests (Playwright)

**File**: `tests/e2e/specs/leads.spec.ts` (NEW)

- Test lead list loads from API
- Test lead status update
- Test lead details view
- Test manual lead creation
- Test real-time lead notification (mocked WebSocket)

**File**: `tests/e2e/specs/appointments.spec.ts` (NEW)

- Test appointment creation from lead
- Test appointment form validation
- Test dealer calendar view
- Test appointment status update

**File**: `tests/e2e/specs/facebook-webhook.spec.ts` (NEW)

- Test webhook endpoint receives Facebook payload
- Test lead creation from webhook
- Test duplicate lead detection
- Test webhook signature verification

#### Integration Tests (Backend)

**File**: `apps/api/tests/integration/test_facebook_lead_webhook.py` (NEW)

- Test webhook endpoint creates lead
- Test webhook verification (X-Hub-Signature)
- Test duplicate lead detection
- Test vendedor assignment logic

**File**: `apps/api/tests/integration/test_lead_usecases.py` (NEW)

- Test `CreateLeadUseCase`
- Test `UpdateLeadStatusUseCase`
- Test lead audit log creation
- Test lead filtering by tenant_id

**File**: `apps/api/tests/integration/test_appointment_usecases.py` (NEW)

- Test `CreateAppointmentUseCase`
- Test appointment time validation
- Test lead status update to "appointment_set"
- Test SendGrid email notification (mocked)

#### Unit Tests (Backend)

**File**: `apps/api/tests/unit/domain/test_lead_entity.py` (NEW)

- Test lead lifecycle state machine
- Test lead status transitions
- Test lead validation rules

**File**: `apps/api/tests/unit/domain/test_appointment_entity.py` (NEW)

- Test appointment validation
- Test appointment status transitions
- Test appointment-dealer relationship

#### Contract Tests

**File**: `tests/contract/openapi/test_leads_schema.py` (NEW)

- Test lead DTO matches OpenAPI schema
- Test lead list response schema
- Test lead creation request schema

**File**: `tests/contract/openapi/test_appointments_schema.py` (NEW)

- Test appointment DTO matches OpenAPI schema
- Test appointment creation request schema

---

## 7. Acceptance Criteria

### 7.1 Phase 13 Completion (C3 Frontend Integration)

**FE-01**: VehicleForm uses C3 API

- [ ] VehicleForm calls `POST /api/v1/products` on submit
- [ ] VIN in attributes triggers auto-creation of vehicle record
- [ ] Category dropdown loads from `/api/v1/categories` with 5-min cache
- [ ] Form validation prevents submission with missing required fields
- [ ] Success toast shows on creation, redirects to catalog

**FE-02**: DataGrid uses C3 API

- [ ] DataGrid loads vehicles from `/api/v1/vehicles` with cursor pagination
- [ ] Each row displays product + vehicle fields (title, price, VIN, status)
- [ ] Virtualization maintains 60fps with 1000+ vehicles
- [ ] Search/filter works with real data (not mocks)

**FE-03**: Image Upload works

- [ ] Drag-drop zone accepts up to 20 images
- [ ] Images upload in parallel (3-4 concurrent) via presigned URLs
- [ ] Progress bars show 0-100% per file
- [ ] Backend processes images (thumbnails, WebP, EXIF strip)

**FE-04**: Search & Filters work

- [ ] Client-side instant search for title/ID/make/model
- [ ] Filter sidebar with Brand, Status, Price, Year filters
- [ ] Command palette (Cmd+K) opens with fuzzy search
- [ ] URL state sync (shareable filtered links)

**FE-05**: E2E Tests Pass

- [ ] Smoke test suite (20 tests) passes in < 2 minutes
- [ ] VehicleForm E2E tests pass with `/api/v1/products`
- [ ] Category E2E tests pass with `/api/v1/categories`
- [ ] DataGrid E2E tests pass with C3 join data
- [ ] Bulk upload E2E tests pass with products schema
- [ ] No regressions in existing E2E tests

### 7.2 Phase 4 Implementation (Leads & Appointments)

**LEAD-01**: Facebook Lead Capture

- [ ] Webhook endpoint `POST /api/v1/webhooks/facebook` exists
- [ ] Webhook signature verification implemented
- [ ] Lead created from Facebook message within 5 minutes
- [ ] Duplicate detection prevents duplicate leads
- [ ] Fallback polling runs every 10 minutes if webhook fails

**LEAD-02**: Leads List View

- [ ] Vendedor can view assigned leads
- [ ] Each lead shows buyer name, vehicle, message, status
- [ ] Unread leads are highlighted
- [ ] Real-time updates (WebSocket or polling)

**LEAD-03**: Lead Status Update

- [ ] Lead lifecycle: new → contacted → qualified → appointment_set → lost
- [ ] Status change creates audit log entry
- [ ] Manager receives notification on critical status changes

**LEAD-04**: Appointment Creation

- [ ] Appointment form links Lead + Vehicle + Dealer + date/time
- [ ] Appointment time validation (business hours, conflicts)
- [ ] Lead status updates to "appointment_set"
- [ ] Dealer receives email notification via SendGrid

**LEAD-05**: Dealer Email Notifications

- [ ] SendGrid email sent immediately after appointment creation
- [ ] Email includes buyer name, contact, vehicle, date/time
- [ ] Email has accept/decline action links
- [ ] Email delivery confirmed (not in spam folder)

**LEAD-06**: Manager Team Leads View

- [ ] Manager can view all team leads
- [ ] Filter by vendedor, status, date range
- [ ] Reassign lead to different vendedor
- [ ] Export leads to CSV

**LEAD-07**: Manual Lead Creation

- [ ] Manual lead form captures name, contact, vehicle, source
- [ ] Source options: Facebook, Phone, Walk-in, Referral, Other
- [ ] Manual leads appear in same leads list

**LEAD-08**: Lead Data Integrity

- [ ] Soft delete only (no hard delete)
- [ ] Audit log tracks all status changes
- [ ] All leads have tenant_id
- [ ] Timestamps use UTC timezone

### 7.3 System-Wide Acceptance Criteria

**SEC-01**: Authentication & Authorization

- [ ] All endpoints require valid JWT token
- [ ] Role-based access control enforced (vendedor, manager, admin, dealer)
- [ ] Tenant isolation enforced (tenant_id in all queries)
- [ ] OAuth flow works for Facebook, Google

**SEC-02**: Data Validation

- [ ] All user inputs sanitized (SQL injection, XSS prevention)
- [ ] File uploads validated (type, size, dimensions)
- [ ] API rate limiting enforced
- [ ] Webhook signature verification

**PERF-01**: Performance

- [ ] Vehicle list page loads in < 2 seconds (1000 vehicles)
- [ ] VIN decode completes in < 3 seconds
- [ ] Lead webhook processes in < 1 second
- [ ] Email notification sends in < 5 seconds

**PERF-02**: Scalability

- [ ] DataGrid virtualization handles 10,000+ vehicles
- [ ] Background task queue processes 100+ publications/hour
- [ ] Webhook endpoint handles 100+ concurrent requests

**REL-01**: Reliability

- [ ] Auto-republish schedules 7 days before expiry
- [ ] Failed publications retry with exponential backoff
- [ ] Email notifications retry on failure
- [ ] Database transactions roll back on error

---

## 8. Out of Scope

Explicitly **OUT OF SCOPE** for this milestone:

### Phase 3: Scraping

- Automated dealer website sync
- CarGurus price extraction
- Scraping anti-detection measures
- Duplicate vehicle detection from scraping

### Phase 5: Dashboards

- Admin dashboard with global metrics
- Manager dashboard with team performance
- Vendedor dashboard with personal KPIs
- Dealer dashboard with inventory views

### Phase 6: Market Intelligence

- Price benchmarking vs. market
- Market position indicators
- Price trend analysis
- Outlier price detection

### Phase 7: Visibility

- Public-facing catalog
- SEO-friendly URLs
- Landing page optimization
- AI-generated listing titles

### Nice-to-Have Features (Future)

- WhatsApp integration for lead responses
- Automated follow-up reminders
- AI lead scoring
- SMS notifications
- Mobile apps (iOS/Android)
- Advanced reporting and analytics

---

## 9. Dependencies

### Technical Dependencies

- **SendGrid Account**: Required for appointment email notifications (Phase 4)
- **Facebook Graph API**: App Review approval pending (Playwright fallback available)
- **Redis**: Required for background task queue (Taskiq)
- **PostgreSQL 17**: Required for C3 schema (already installed)

### Phase Dependencies

- **Phase 13 must complete before Phase 4**: C3 integration provides the foundation
- **Phase 1 must be complete**: Already complete ✅
- **Phase 2 must be complete**: Already complete ✅
- **Phase 8 must be complete**: Already complete ✅

### External Services

- **NHTSA VIN API**: Free, no API key required
- **Facebook OAuth**: Requires Facebook Developer account
- **SendGrid**: Requires account with API key
- **DigitalOcean Spaces**: Presigned URL storage for images

---

## 10. Risks & Mitigations

### Risk 1: Facebook Graph API Approval Pending

**Impact**: HIGH — Can't use Graph API for publishing
**Mitigation**: Playwright fallback is already implemented and tested
**Contingency**: Continue with Playwright until App Review approved

### Risk 2: SendGrid Not Wired

**Impact**: HIGH — Dealers won't receive appointment notifications
**Mitigation**: Wire SendGrid in Phase 4, implementation task
**Contingency**: Use console.log fallback for development

### Risk 3: Lead Webhook Delay

**Impact**: MEDIUM — Leads not captured in real-time
**Mitigation**: Implement polling fallback (every 10 minutes)
**Contingency**: Manual lead entry as backup

### Risk 4: Phase 13 Test Flakiness

**Impact**: MEDIUM — Blocks Phase 4 development
**Mitigation**: Smoke test suite runs fast (2 min), catch regressions early
**Contingency**: Manual testing if E2E tests unstable

### Risk 5: Email Deliverability

**Impact**: LOW — Dealers might not see appointment emails
**Mitigation**: Use SendGrid with SPF/DKIM records
**Contingency**: In-app notification center

---

## 11. Success Metrics

### Phase 13 Success

- [ ] All E2E tests passing (smoke suite + feature-specific tests)
- [ ] VehicleForm creates products + vehicles via API
- [ ] DataGrid loads 1000+ vehicles at 60fps
- [ ] Image upload completes with progress tracking
- [ ] No regressions in existing functionality

### Phase 4 Success

- [ ] Vendedor can publish vehicle → capture lead → create appointment (end-to-end flow)
- [ ] Lead webhook captures Facebook messages within 5 minutes
- [ ] Dealer receives appointment email within 10 seconds
- [ ] Manager can view and reassign team leads
- [ ] All E2E tests passing for lead/appointment flows

### MVP Complete

- [ ] Vendedor can complete full sales cycle: Publish → Lead → Appointment
- [ ] All Phase 13 acceptance criteria met
- [ ] All Phase 4 Must Have user stories implemented
- [ ] System deployed to staging with real Facebook page
- [ ] Pilot dealer successfully uses system for 1 week

---

## 12. Next Steps

1. **Complete Phase 13** (Frontend C3 Integration)
   - Execute plans 13-01 through 13-06
   - Run E2E verification (plan 13-06)
   - Fix any failing tests

2. **Implement Phase 4** (Leads & Appointments)
   - Create detailed task breakdown for Phase 4
   - Implement lead entities and use cases
   - Implement appointment entities and use cases
   - Wire SendGrid for email notifications
   - Implement Facebook webhook endpoint

3. **Deploy to Staging**
   - Deploy all changes to staging environment
   - Test with real Facebook page
   - Verify email notifications work
   - Run full E2E test suite

4. **Pilot with Dealer**
   - Onboard 1-2 dealers for pilot
   - Monitor system for 1 week
   - Collect feedback and fix critical bugs
   - Iterate based on feedback

---

**Document Status**: Draft — Ready for review and approval
**Next Review**: After Phase 13 completion
**Owner**: Product Team
**Stakeholders**: Engineering, Design, QA
