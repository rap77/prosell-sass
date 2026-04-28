# ProSell MVP Implementation Checklist

**Milestone**: Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version**: 2.0
**Status**: Active
**Last Updated**: 2026-04-27

---

## Phase 13: Frontend C3 Integration (COMPLETE ✅)

> **Note**: Phase 13 is COMPLETE. All 6 tasks have been executed.

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
- [x] Write E2E test for DataGrid loading and pagination

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

## Phase 4: Leads & Appointments (VERTICAL SLICING)

> **RE-PLANNED**: 2026-04-27 — Tasks now follow vertical slicing principle. Each task delivers ONE complete user-facing feature (backend + frontend + tests).
> **REPLACES**: Old tasks 4-01 through 4-12

### Phase 4 Overview

**Goal**: Implement lead capture from Facebook, lead lifecycle management, and appointment scheduling with dealers.

**Vertical Slicing Strategy**: Each task (A1-A7) delivers ONE complete user-facing feature with backend, frontend, and tests.

---

### A1: Lead Capture Foundation (Backend Complete)

- [x] Create Lead entity with 5-state lifecycle (new → contacted → qualified → appointment_set → lost)
- [x] Create LeadStatus enum and LeadStateTransitionException
- [x] Create LeadAuditLog entity for tracking status changes
- [x] Write Alembic migration for leads, lead_audit_log tables
- [x] Add tenant_id indexes for multi-tenant isolation
- [x] Create ILeadRepository interface in domain layer
- [x] Implement LeadRepository with async SQLAlchemy
- [x] Add tenant_id filtering to all queries
- [x] Implement create() method with duplicate detection
- [x] Implement update_status() with audit log creation
- [x] Implement list_by_vendedor() with pagination
- [x] Implement list_by_manager() (all team leads)
- [x] Create CreateLeadUseCase with business logic
- [x] Create UpdateLeadStatusUseCase with state validation
- [x] Create ListLeadsUseCase with role-based filtering
- [x] Create GetLeadDetailsUseCase
- [x] Create POST /api/v1/leads endpoint for manual lead creation
- [x] Create GET /api/v1/leads endpoint with pagination
- [x] Create GET /api/v1/leads/{id} for lead details
- [x] Create PUT /api/v1/leads/{id}/status for status updates
- [x] Add authentication/authorization middleware
- [x] Add tenant_id filtering to all endpoints
- [x] Write unit tests for lead state transitions
- [x] Write integration tests for repository
- [x] Write integration tests for use cases
- [x] Write integration tests for all endpoints
- [x] Write contract tests for DTO schemas

**Verification**:
```bash
cd apps/api && uv run alembic upgrade head
psql -c "\d leads lead_audit_log"
cd apps/api && uv run pytest tests/unit/domain/test_lead_entity.py -v
cd apps/api && uv run pytest tests/integration/test_lead_usecases.py -v
cd apps/api && uv run pytest tests/integration/api/test_lead_api.py -v
cd tests/contract && uv run pytest openapi/test_leads_schema.py -v
```

---

### A2: Facebook Lead Webhook (Backend Integration)

- [x] Create POST /api/v1/webhooks/facebook endpoint
- [x] Implement X-Hub-Signature verification (SHA256 HMAC)
- [x] Return 403 if signature missing/invalid (security)
- [x] Parse Facebook webhook payload (leadgen_id, listing_id, sender_id, message)
- [x] Return 200 OK within 1 second (quick response)
- [x] Create FacebookGraphApiClient class
- [x] Query buyer profile by sender_id (name, profile_url)
- [x] Handle access token refresh
- [x] Query vehicle by facebook_listing_id from publications table
- [x] Check for duplicate lead (same buyer + vehicle within 24 hours)
- [x] Extract lead data (buyer_name, buyer_email, buyer_phone, message, source="facebook")
- [x] Call CreateLeadUseCase (reused from A1)
- [x] Assign lead to vehicle's owner vendedor
- [x] Create Taskiq background task (runs every 10 minutes)
- [x] Implement polling fallback logic
- [x] Add logging for all webhook events
- [x] Track webhook success/failure metrics
- [x] Write integration test for webhook endpoint
- [x] Test webhook signature verification (403 on invalid)
- [x] Test lead creation from Facebook payload
- [x] Test duplicate detection
- [x] Write contract test for OpenAPI schema
- [x] Test polling fallback logic

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/test_facebook_webhook.py -v
cd tests/contract && uv run pytest openapi/test_webhooks_schema.py -v
curl -X POST http://localhost:8000/api/v1/webhooks/facebook \
  -H "X-Hub-Signature: sha256=..." \
  -d @test_payload.json
tail -f logs/webhook.log
```

---

### A3: Vendedor Leads List (Frontend Complete)

- [x] Create Lead interface (id, buyer_name, buyer_email, buyer_phone, vehicle, message, status, source, created_at, updated_at)
- [x] Create CreateLeadRequest interface
- [x] Create UpdateLeadStatusRequest interface (status + reason)
- [x] Create LeadStatus enum (5 states)
- [x] Create useLeads hook (queryKey: ['leads'])
- [x] Add role-based query parameters (vendedor vs manager)
- [x] Create useLead hook for single lead details
- [x] Create useUpdateLeadStatus mutation hook
- [x] Add toast notifications for success/error
- [x] Implement query invalidation on mutation
- [x] Create LeadList component (DataGrid pattern)
- [x] Create LeadListItem component (one row per lead)
- [x] Create LeadStatusBadge component (5 states with colors)
- [x] Create LeadStatusDropdown component (quick status update)
- [x] Create /vendedor/leads page
- [x] Implement search by buyer name, vehicle
- [x] Add filter by status (new, contacted, qualified, etc.)
- [x] Add highlight for unread leads (created_at < 5 min ago)
- [x] Implement pagination or infinite scroll
- [x] Add real-time updates (polling every 30s via refetchInterval)
- [x] Write unit tests for API hooks (mocked fetch)
- [x] Write component tests for LeadStatusBadge
- [x] Write E2E test for leads list view
- [x] Test search functionality
- [x] Test status filter
- [x] Test status update dropdown

**Verification**:
```bash
cd apps/web && pnpm test src/lib/api/leads.test.ts
cd tests/e2e && pnpm test specs/leads.spec.ts
```

---

### A4: Appointment Scheduling (Full Feature)

- [x] Create Appointment entity (lead_id, dealer_id, vehicle_id, scheduled_at, status, notes, tenant_id)
- [x] Implement AppointmentStatus enum (scheduled, completed, cancelled)
- [x] Implement time validation (business hours: 9am-6pm Mon-Fri)
- [x] Implement conflict detection (same dealer + time slot)
- [x] Write Alembic migration for appointments table
- [x] Add indexes on (tenant_id, dealer_id, scheduled_at)
- [x] Add foreign keys (lead_id → leads, dealer_id → dealers, vehicle_id → vehicles)
- [x] Create IAppointmentRepository interface
- [x] Implement AppointmentRepository with async SQLAlchemy
- [x] Implement create() with conflict detection
- [x] Implement list_by_dealer(), list_by_vendedor()
- [x] Create CreateAppointmentUseCase (validates time, checks conflicts)
- [x] CreateAppointmentUseCase updates lead status to "appointment_set"
- [x] Create ListAppointmentsUseCase (role-based filtering)
- [x] Create CancelAppointmentUseCase
- [ ] Create EmailService class for SendGrid
- [ ] Create email template for appointment notifications
- [ ] Implement error handling (retry with exponential backoff)
- [ ] Add logging for email delivery status
- [x] Create AppointmentResponse DTO
- [x] Create CreateAppointmentRequest DTO
- [x] Create POST /api/v1/appointments endpoint
- [x] Create GET /api/v1/appointments endpoint (role-based filtering)
- [x] Create PUT /api/v1/appointments/{id}/status endpoint
- [ ] Create Appointment interface
- [ ] Create CreateAppointmentRequest interface
- [ ] Create useAppointments hook
- [ ] Create useCreateAppointment mutation hook
- [ ] Add toast notifications
- [ ] Create LeadDetails page at /vendedor/leads/{id}
- [ ] Create AppointmentForm modal (date-time picker, dealer selection, notes)
- [ ] Implement time validation (business hours)
- [ ] Show appointment conflicts warning
- [ ] Add "Agendar Cita" button to lead details
- [ ] Write unit tests for Appointment entity (time validation)
- [ ] Write integration tests for CreateAppointmentUseCase (mocked SendGrid)
- [ ] Write integration tests for API endpoints
- [ ] Write E2E test for appointment creation flow

**Verification**:
```bash
cd apps/api && uv run alembic upgrade head
psql -c "\d appointments"
cd apps/api && uv run pytest tests/unit/domain/test_appointment_entity.py -v
cd apps/api && uv run pytest tests/integration/test_appointment_usecases.py -v
cd apps/api && uv run pytest tests/integration/api/test_appointment_api.py -v
cd tests/e2e && pnpm test specs/appointments.spec.ts
tail -f logs/sendgrid.log
```

---

### A5: Manager Team View (Manager Feature)

- [ ] Extend GET /api/v1/leads with manager scope (all team leads, not just own)
- [ ] Create AssignLeadToVendedorUseCase (if not in A1)
- [ ] Create PUT /api/v1/leads/{id}/assign endpoint
- [ ] Extend useLeads hook with manager scope
- [ ] Create useReassignLead mutation hook
- [ ] Create TeamLeadList component (extends LeadList)
- [ ] Create LeadReassignModal component (vendedor dropdown, confirm button)
- [ ] Create TeamMetricsCard component (leads per vendedor, conversion rates)
- [ ] Create /manager/team/leads page
- [ ] Add filter by vendedor dropdown
- [ ] Show all leads across team (not just assigned to manager)
- [ ] Implement reassign lead mutation
- [ ] Add export to CSV button
- [ ] Write E2E test for manager view
- [ ] Test filter by vendedor
- [ ] Test lead reassignment

**Verification**:
```bash
cd tests/e2e && pnpm test specs/manager-leads.spec.ts
```

---

### A6: Dealer Calendar (Dealer Feature)

- [ ] Extend GET /api/v1/appointments with dealer scope (own appointments only)
- [ ] Create PUT /api/v1/appointments/{id}/status endpoint (confirm, cancel)
- [ ] Extend useAppointments hook with dealer scope
- [ ] Create useUpdateAppointmentStatus mutation hook
- [ ] Create CalendarView component (use calendar library)
- [ ] Show day/week/month toggle
- [ ] Create AppointmentCard component (buyer name, vehicle, time, status)
- [ ] Add confirm/cancel buttons
- [ ] Create /dealer/appointments page
- [ ] Show appointment details modal
- [ ] Add today's appointments badge
- [ ] Implement status update mutation
- [ ] Write E2E test for dealer calendar
- [ ] Test calendar view (day/week/month)
- [ ] Test confirm/cancel buttons

**Verification**:
```bash
cd tests/e2e && pnpm test specs/dealer-calendar.spec.ts
```

---

### A7: E2E Verification (Final Task)

- [ ] Create E2E test for Facebook webhook lead capture
- [ ] Test webhook endpoint receives Facebook payload
- [ ] Test lead creation from webhook
- [ ] Test duplicate lead detection
- [ ] Create E2E test for vendedor leads list view
- [ ] Test lead list loads from API
- [ ] Test lead status update
- [ ] Test search and filter
- [ ] Create E2E test for appointment creation
- [ ] Test appointment creation from lead
- [ ] Test appointment form validation
- [ ] Test dealer email notification (mocked)
- [ ] Create E2E test for manager view
- [ ] Test manager team leads view
- [ ] Test lead reassignment
- [ ] Create E2E test for dealer calendar
- [ ] Test dealer calendar view
- [ ] Test appointment confirm/cancel
- [ ] Add 5 critical lead tests to smoke.spec.ts
- [ ] Test: Facebook webhook → lead → status update → appointment
- [ ] Run all E2E tests
- [ ] Measure test execution time (target: < 5 minutes)
- [ ] Fix any failing tests

**Verification**:
```bash
cd tests/e2e && pnpm test
cd tests/e2e && pnpm test smoke.spec.ts
```

---

## Checkpoints

### Checkpoint 1: Foundation Complete (After A1, A2)
- [ ] All unit tests for lead domain pass
- [ ] All integration tests for lead repository pass
- [ ] All integration tests for use cases pass
- [ ] Database tables created with proper schema
- [ ] Alembic migration applies successfully
- [ ] Facebook webhook endpoint works
- [ ] Webhook signature verification implemented
- [ ] Lead created from Facebook payload
- [ ] Duplicate detection prevents duplicate leads
- [ ] Integration tests for webhook pass

### Checkpoint 2: Core Features Complete (After A3, A4)
- [ ] Frontend API clients work
- [ ] Leads list view functional
- [ ] Lead details and appointment form functional
- [ ] Frontend unit tests pass
- [ ] E2E tests for core flows pass
- [ ] Appointment creation works end-to-end
- [ ] SendGrid email notifications work
- [ ] Appointment time validation works

### Checkpoint 3: Extended Features Complete (After A5, A6)
- [ ] Manager view functional
- [ ] Dealer calendar view functional
- [ ] Lead reassignment works
- [ ] Appointment confirm/cancel works
- [ ] Export to CSV works
- [ ] Team metrics display correctly

### Checkpoint 4: Full Integration Complete (After A7)
- [ ] All E2E tests pass
- [ ] Smoke test suite passes (25+ tests)
- [ ] Test execution time < 5 minutes
- [ ] No regressions in existing tests
- [ ] Manual testing confirms end-to-end flow

---

## MVP Complete Checklist

### Phase 13 Complete
- [x] All 6 Phase 13 plans executed
- [x] VehicleForm uses C3 API
- [x] DataGrid uses vehicles API
- [x] Image upload with presigned URLs works
- [x] Search and filters work with real data
- [x] All Phase 13 E2E tests pass
- [x] No regressions in existing tests

### Phase 4 Complete
- [ ] All 7 Phase 4 plans executed (A1-A7)
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

- **Phase 13 is COMPLETE** (all 6 tasks done)
- **Phase 4 follows vertical slicing** (7 tasks A1-A7)
- **Parallel execution** is encouraged where dependency graph allows
- **Test-driven development** is required for all backend code
- **E2E tests** are mandatory for all user-facing features
- **SendGrid API key** must be configured before A4 execution
- **Facebook webhook** must be registered before A2 testing
- **Checkbox format**: Use `- [ ]` for pending, `- [x]` for complete

---

**Document Status**: Active — Ready for execution
**Next Action**: Execute Phase 4 plans A1 through A7
**Owner**: Engineering Team
**Stakeholders**: Product, QA, DevOps
