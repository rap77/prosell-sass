# ProSell MVP Implementation Checklist

**Milestone**: Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version**: 1.0
**Status**: Active
**Last Updated**: 2026-04-26

---

## Phase 13: Frontend C3 Integration (Existing Plans)

> **Note**: These plans are already defined in `.planning/phases/13-frontend/`. Execute them first before Phase 4.

### 13-01: VehicleForm Refactor for C3 API
- [x] Implement VehicleForm to use `POST /api/v1/products` endpoint
- [x] Add VIN decode integration with NHTSA API
- [x] Implement category dropdown loaded from `/api/v1/categories`
- [x] Add category-specific attribute rendering based on attribute_schema
- [x] Write unit tests for VehicleForm component
- [x] Write E2E test for vehicle creation flow

### 13-02: DataGrid Integration with Vehicles API
- [x] Implement DataGrid to load from `/api/v1/vehicles` endpoint
- [x] Add cursor pagination (load more on scroll)
- [x] Display product + vehicle fields (title, price, VIN, status)
- [x] Verify TanStack Virtual handles 1000+ vehicles at 60fps
- [x] Write unit tests for DataGrid component
- [ ] Write E2E test for DataGrid loading and pagination

### 13-03: Category Dropdown and Attribute Rendering
- [x] Implement `useCategories` hook with 5-min cache
- [x] Create `useCategoryOptions` transformation hook
- [x] Implement category selection in VehicleForm
- [x] Add conditional attribute rendering based on attribute_schema
- [x] Write unit tests for category hooks
- [x] Write E2E test for category selection flow

### 13-04: Image Upload with Presigned URLs
- [x] Implement drag-drop zone for image upload (up to 20 images)
- [x] Create `useImageUpload` hook with Zustand progress store
- [x] Implement parallel upload (3-4 concurrent) via presigned URLs
- [x] Add progress bars for each file (0-100%)
- [x] Backend: Create presigned URL endpoint
- [x] Backend: Process images (thumbnails, WebP, EXIF strip)
- [x] Write unit tests for upload hook
- [x] Write E2E test for bulk image upload

### 13-05: Search and Filters with Real Data
- [x] Implement client-side instant search for title/ID/make/model
- [x] Add FilterSidebar with Brand, Status, Price, Year filters
- [x] Implement CommandPalette (Cmd+K) with fuzzy search
- [x] Add URL state sync for shareable filtered links
- [x] Write unit tests for filter hooks
- [x] Write E2E test for search and filter functionality

### 13-06: E2E Verification (Smoke Tests)
- [x] Create smoke test suite (`tests/e2e/smoke.spec.ts`) with 20 critical path tests
- [x] Add auth flow tests (login, logout, protected route)
- [x] Add VehicleForm E2E tests (VIN decode, category select, submit)
- [x] Add Category E2E tests (dropdown load, attribute rendering)
- [x] Add DataGrid E2E tests (load, pagination, C3 join data)
- [x] Add Bulk Upload E2E tests (CSV, images, progress)
- [x] Verify all smoke tests pass in < 2 minutes
- [x] Verify no regressions in existing E2E tests

---

## Phase 4: Leads & Appointments (New Plans)

### 4-01: Lead Domain & Database Schema
- [ ] Create Lead entity with all fields and validation
- [ ] Implement lead lifecycle state machine (new → contacted → qualified → appointment_set → lost)
- [ ] Create LeadStatus enum and LeadStateTransitionException
- [ ] Create Appointment entity with time validation
- [ ] Create LeadAuditLog entity for audit trail
- [ ] Write Alembic migration for leads, appointments, lead_audit_log tables
- [ ] Add tenant_id indexes for multi-tenant isolation
- [ ] Write unit tests for lead state transitions
- [ ] Write unit tests for appointment validation
- [ ] Verify migration applies successfully (`alembic upgrade head`)

### 4-02: Lead Repository & Use Cases
- [ ] Create ILeadRepository interface in domain layer
- [ ] Implement LeadRepository with async SQLAlchemy
- [ ] Add tenant_id filtering to all queries
- [ ] Implement create() method with duplicate detection
- [ ] Implement update_status() with audit log creation
- [ ] Implement list_by_vendedor() with pagination
- [ ] Implement list_by_manager() (all team leads)
- [ ] Create CreateLeadUseCase with business logic
- [ ] Create UpdateLeadStatusUseCase with state validation
- [ ] Create AssignLeadToVendedorUseCase
- [ ] Create ListLeadsUseCase with role-based filtering
- [ ] Write integration tests for repository
- [ ] Write integration tests for use cases

### 4-03: Appointment Repository & Use Cases
- [ ] Create IAppointmentRepository interface in domain layer
- [ ] Implement AppointmentRepository with async SQLAlchemy
- [ ] Add tenant_id filtering to all queries
- [ ] Implement time conflict detection in repository
- [ ] Create CreateAppointmentUseCase with validation
- [ ] Wire SendGrid email service for dealer notifications
- [ ] Create email template for appointment notifications
- [ ] Implement error handling for SendGrid API failures
- [ ] Create ListAppointmentsUseCase with role-based filtering
- [ ] Write integration tests for repository (with mocked SendGrid)
- [ ] Write integration tests for use cases (with mocked SendGrid)

### 4-04: Facebook Lead Webhook Endpoint
- [ ] Create POST /api/v1/webhooks/facebook endpoint
- [ ] Implement X-Hub-Signature verification
- [ ] Parse Facebook webhook payload (leadgen_id, listing_id, sender_id)
- [ ] Query vehicle by facebook_listing_id from publications table
- [ ] Query Facebook Graph API for buyer profile
- [ ] Check for duplicate lead (same buyer + vehicle within 24 hours)
- [ ] Call CreateLeadUseCase with extracted data
- [ ] Return 200 OK to Facebook within 1 second
- [ ] Add logging for webhook events
- [ ] Implement polling fallback (Taskiq task every 10 minutes)
- [ ] Write integration test for webhook endpoint
- [ ] Write contract test for OpenAPI schema
- [ ] Verify webhook signature security (403 if invalid)

### 4-05: Lead API Endpoints
- [ ] Create LeadResponse DTO
- [ ] Create CreateLeadRequest DTO
- [ ] Create UpdateLeadStatusRequest DTO
- [ ] Create GET /api/v1/leads endpoint with pagination
- [ ] Add role-based filtering (vendedor vs manager)
- [ ] Create POST /api/v1/leads for manual lead creation
- [ ] Create GET /api/v1/leads/{id} for lead details
- [ ] Create PUT /api/v1/leads/{id}/status for status updates
- [ ] Add authentication/authorization middleware
- [ ] Add tenant_id filtering to all endpoints
- [ ] Write integration tests for all endpoints
- [ ] Write contract tests for DTO schemas

### 4-06: Appointment API Endpoints
- [ ] Create AppointmentResponse DTO
- [ ] Create CreateAppointmentRequest DTO
- [ ] Create POST /api/v1/appointments endpoint
- [ ] Implement time validation (business hours, conflicts)
- [ ] Create GET /api/v1/appointments with filtering
- [ ] Add role-based filtering (dealer vs vendedor)
- [ ] Create PUT /api/v1/appointments/{id}/status (cancel, complete)
- [ ] Add authentication/authorization middleware
- [ ] Add tenant_id filtering to all endpoints
- [ ] Write integration tests for all endpoints
- [ ] Write contract tests for DTO schemas

### 4-07: Frontend Lead Types & API Clients
- [ ] Create Lead TypeScript interface
- [ ] Create Appointment TypeScript interface
- [ ] Create CreateLeadRequest, UpdateLeadStatusRequest interfaces
- [ ] Create useLeads hook with queryKey ['leads']
- [ ] Add role-based query parameters (vendedor vs manager)
- [ ] Create useLead hook for single lead details
- [ ] Create useCreateLead mutation hook
- [ ] Create useUpdateLeadStatus mutation hook
- [ ] Add toast notifications for success/error
- [ ] Implement useAppointments hook
- [ ] Implement useCreateAppointment mutation hook
- [ ] Add query invalidation for related queries
- [ ] Write unit tests for hooks (mocked fetch)

### 4-08: Frontend Leads List View
- [ ] Create leads list page at /vendedor/leads
- [ ] Implement LeadList component with DataGrid
- [ ] Create LeadListItem component (one row per lead)
- [ ] Create LeadStatusBadge component (5 states with colors)
- [ ] Add status dropdown for quick updates
- [ ] Implement search by buyer name, vehicle
- [ ] Add filter by status (new, contacted, qualified, etc.)
- [ ] Add highlight for unread leads
- [ ] Implement pagination or infinite scroll
- [ ] Add real-time updates (polling every 30s)
- [ ] Write E2E tests for leads list

### 4-09: Frontend Lead Details & Appointment Form
- [ ] Create lead details page at /vendedor/leads/{id}
- [ ] Implement LeadDetails component
- [ ] Show buyer contact info, vehicle details, message
- [ ] Add "Agendar Cita" button
- [ ] Create AppointmentForm modal
- [ ] Add date-time picker (shadcn/ui DatePicker)
- [ ] Pre-populate form with lead, vehicle, dealer
- [ ] Implement time validation (business hours)
- [ ] Show appointment conflicts warning
- [ ] Create LeadHistory component (audit log)
- [ ] Implement status update dropdown
- [ ] Write E2E tests for appointment creation

### 4-10: Frontend Manager Team Leads View
- [ ] Create manager team leads page at /manager/team/leads
- [ ] Implement TeamLeadList component
- [ ] Add filter by vendedor dropdown
- [ ] Show all leads across team (not just assigned to manager)
- [ ] Create LeadReassignModal component
- [ ] Implement reassign lead mutation
- [ ] Add export to CSV button
- [ ] Show team metrics card (leads per vendedor)
- [ ] Write E2E tests for manager view

### 4-11: Frontend Dealer Calendar View
- [ ] Create dealer appointments page at /dealer/appointments
- [ ] Implement CalendarView component (day/week/month)
- [ ] Create AppointmentCard component
- [ ] Show buyer name, vehicle, time, status
- [ ] Add confirm/cancel buttons
- [ ] Implement status update mutation
- [ ] Show appointment details modal
- [ ] Add today's appointments badge
- [ ] Write E2E tests for dealer calendar

### 4-12: E2E Verification & Smoke Tests
- [ ] Create E2E test for Facebook webhook lead capture
- [ ] Create E2E test for vendedor leads list view
- [ ] Create E2E test for lead status update
- [ ] Create E2E test for appointment creation
- [ ] Create E2E test for dealer email verification (mocked)
- [ ] Create E2E test for manager lead reassignment
- [ ] Create E2E test for dealer calendar view
- [ ] Update smoke.spec.ts with 5 critical lead tests
- [ ] Verify all E2E tests pass
- [ ] Measure test execution time (target: < 5 minutes)

---

## Checkpoints

### Checkpoint 1: Foundation Complete (After 4-01, 4-02, 4-03)
- [ ] All unit tests for domain entities pass
- [ ] All integration tests for repositories pass
- [ ] All integration tests for use cases pass
- [ ] Database tables created with proper schema
- [ ] Alembic migration applies successfully

### Checkpoint 2: API Complete (After 4-04, 4-05, 4-06)
- [ ] Facebook webhook endpoint works
- [ ] Lead API endpoints work (list, create, update, details)
- [ ] Appointment API endpoints work (create, list, update)
- [ ] All API integration tests pass
- [ ] Contract tests verify schema compliance

### Checkpoint 3: Frontend Complete (After 4-07, 4-08, 4-09)
- [ ] Frontend API clients work
- [ ] Leads list view functional
- [ ] Lead details and appointment form functional
- [ ] Frontend unit tests pass
- [ ] E2E tests for core flows pass

### Checkpoint 4: Full Integration Complete (After 4-10, 4-11, 4-12)
- [ ] Manager view functional
- [ ] Dealer calendar view functional
- [ ] All E2E tests pass
- [ ] Smoke test suite passes (20+ tests)
- [ ] Test execution time < 5 minutes

---

## MVP Complete Checklist

### Phase 13 Complete
- [ ] All 6 Phase 13 plans executed
- [ ] VehicleForm uses C3 API
- [ ] DataGrid uses vehicles API
- [ ] Image upload with presigned URLs works
- [ ] Search and filters work with real data
- [ ] All Phase 13 E2E tests pass
- [ ] No regressions in existing tests

### Phase 4 Complete
- [ ] All 12 Phase 4 plans executed
- [ ] Lead domain and database schema implemented
- [ ] Lead and appointment repositories work
- [ ] Facebook webhook captures leads
- [ ] Lead API endpoints functional
- [ ] Appointment API endpoints functional
- [ ] Frontend leads list view works
- [ ] Frontend appointment form works
- [ ] Manager team leads view works
- [ ] Dealer calendar view works
- [ ] All Phase 4 E2E tests pass
- [ ] SendGrid email notifications work

### End-to-End Flow Verified
- [ ] Vendedor can publish vehicle to Facebook
- [ ] Facebook message creates lead via webhook
- [ ] Lead appears in vendedor's leads list
- [ ] Vendedor can update lead status
- [ ] Vendedor can create appointment
- [ ] Dealer receives email notification
- [ ] Dealer can view appointment in calendar
- [ ] Manager can view and reassign team leads

### Deployment Ready
- [ ] All changes deployed to staging
- [ ] Smoke tests pass on staging
- [ ] Manual testing confirms end-to-end flow
- [ ] SendGrid configured and verified
- [ ] Facebook webhook registered and verified
- [ ] Pilot dealer onboarded
- [ ] One week pilot testing complete
- [ ] Critical bugs fixed
- [ ] Ready for production deployment

---

## Notes

- **Execute Phase 13 plans first** (13-01 through 13-06) before starting Phase 4
- **Parallel execution** is encouraged where dependency graph allows
- **Test-driven development** is required for all backend code
- **E2E tests** are mandatory for all user-facing features
- **SendGrid API key** must be configured before 4-03 execution
- **Facebook webhook** must be registered before 4-04 testing
- **Checkbox format**: Use `- [ ]` for pending, `- [x]` for complete

---

**Document Status**: Active — Ready for execution
**Next Action**: Execute Phase 13 plans, then Phase 4 plans 4-01 through 4-12
**Owner**: Engineering Team
**Stakeholders**: Product, QA, DevOps
