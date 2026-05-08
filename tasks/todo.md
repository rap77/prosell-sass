# ProSell MVP Implementation Checklist

> **MasterMind checklist file:** this checklist is consumed by `/mm:complete-task` using positional checkbox mapping.
> **Do not use as executive status source.** Official consolidated status: `docs/mvp-status.md`

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
- [x] Create EmailService class for SendGrid
- [x] Create email template for appointment notifications
- [x] Implement error handling (retry with exponential backoff)
- [x] Add logging for email delivery status
- [x] Create AppointmentResponse DTO
- [x] Create CreateAppointmentRequest DTO
- [x] Create POST /api/v1/appointments endpoint
- [x] Create GET /api/v1/appointments endpoint (role-based filtering)
- [x] Create PUT /api/v1/appointments/{id}/status endpoint
- [x] Create Appointment interface
- [x] Create CreateAppointmentRequest interface
- [x] Create useAppointments hook
- [x] Create useCreateAppointment mutation hook
- [x] Add toast notifications
- [x] Create LeadDetails page at /vendedor/leads/{id}
- [x] Create AppointmentForm modal (date-time picker, dealer selection, notes)
- [x] Implement time validation (business hours)
- [x] Show appointment conflicts warning
- [x] Add "Agendar Cita" button to lead details
- [x] Write unit tests for Appointment entity (time validation)
- [x] Write integration tests for CreateAppointmentUseCase (mocked SendGrid)
- [x] Write integration tests for API endpoints
- [x] Write E2E test for appointment creation flow

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

- [x] Extend GET /api/v1/leads with manager scope (all team leads, not just own)
- [x] Create AssignLeadToVendedorUseCase (if not in A1)
- [x] Create PUT /api/v1/leads/{id}/assign endpoint
- [x] Extend useLeads hook with manager scope
- [x] Create useReassignLead mutation hook
- [x] Create TeamLeadList component (extends LeadList)
- [x] Create LeadReassignModal component (vendedor dropdown, confirm button)
- [x] Create TeamMetricsCard component (leads per vendedor, conversion rates)
- [x] Create /manager/team/leads page
- [x] Add filter by vendedor dropdown
- [x] Show all leads across team (not just assigned to manager)
- [x] Implement reassign lead mutation
- [x] Add export to CSV button
- [x] Write E2E test for manager view
- [x] Test filter by vendedor
- [x] Test lead reassignment

**Verification**:
```bash
cd tests/e2e && pnpm test specs/manager-leads.spec.ts
```

---

### A6: Dealer Calendar (Dealer Feature)

- [x] Extend GET /api/v1/appointments with dealer scope (own appointments only)
- [x] Create PUT /api/v1/appointments/{id}/status endpoint (confirm, cancel)
- [x] Extend useAppointments hook with dealer scope
- [x] Create useUpdateAppointmentStatus mutation hook
- [x] Create CalendarView component (use calendar library)
- [x] Show day/week/month toggle
- [x] Create AppointmentCard component (buyer name, vehicle, time, status)
- [x] Add confirm/cancel buttons
- [x] Create /dealer/appointments page
- [x] Show appointment details modal
- [x] Add today's appointments badge
- [x] Implement status update mutation
- [x] Write E2E test for dealer calendar
- [x] Test calendar view (day/week/month)
- [x] Test confirm/cancel buttons

**Verification**:
```bash
cd tests/e2e && pnpm test specs/dealer-calendar.spec.ts
```

---

### A7: E2E Verification (Final Task)

- [x] Create E2E test for Facebook webhook lead capture
- [x] Test webhook endpoint receives Facebook payload
- [x] Test lead creation from webhook
- [x] Test duplicate lead detection
- [x] Create E2E test for vendedor leads list view
- [x] Test lead list loads from API
- [x] Test lead status update
- [x] Test search and filter
- [x] Create E2E test for appointment creation
- [x] Test appointment creation from lead
- [x] Test appointment form validation
- [x] Test dealer email notification (mocked)
- [x] Create E2E test for manager view
- [x] Test manager team leads view
- [x] Test lead reassignment
- [x] Create E2E test for dealer calendar
- [x] Test dealer calendar view
- [x] Test appointment confirm/cancel
- [x] Add 5 critical lead tests to smoke.spec.ts
- [x] Test: Facebook webhook → lead → status update → appointment
- [x] Run all E2E tests
- [x] Measure test execution time (target: < 5 minutes)
- [x] Fix any failing tests

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
**Next Action**: Execute Phase Completion B1-B4
**Owner**: Engineering Team
**Stakeholders**: Product, QA, DevOps, Security

---

## Phase Completion: 100% Module Completion

> **Goal**: Complete all remaining gaps to reach 100% module completion across all ProSell SaaS features.
> 
> **Current Status**: 88% complete → Target: 100% complete
> **Estimated Effort**: 284 hours (7 weeks with 1 dev, 4-5 weeks with 2 devs)

### Sprint B1: Security & Release Readiness (48 hours)

#### B1.1: E2E Integrated Flow Validation (8 hours)
- [x] Create integrated-critical-path.spec.ts test
- [x] Implement complete sales cycle scenario
- [x] Mock Facebook Graph API for publish
- [x] Mock webhook endpoint for lead capture
- [x] Mock SendGrid for email notifications
- [ ] Verify test execution time < 3 minutes
- [x] Add test to smoke suite
- [ ] Test passes consistently (>95% success rate)

#### B1.2: Multi-Tenant Isolation Security Tests (8 hours)
- [ ] Create test_tenant_isolation.py suite
- [ ] Test user cannot access other tenant leads
- [ ] Test user cannot access other tenant products
- [ ] Test user cannot access other tenant appointments
- [ ] Verify API filtering enforces tenant_id
- [ ] Verify repository queries include tenant_id
- [ ] Verify webhook respects tenant context
- [ ] Test SQL injection attempts
- [ ] Test IDOR (Insecure Direct Object Reference) vectors
- [ ] All tenant isolation tests pass

#### B1.3: Lead Duplicate Detection Implementation (12 hours)
- [ ] Create LeadDuplicateDetector service
- [ ] Implement email matching (exact match)
- [ ] Implement phone matching (normalized)
- [ ] Implement email + phone combination matching
- [ ] Extend LeadRepository with find_by_email
- [ ] Extend LeadRepository with find_by_phone
- [ ] Extend LeadRepository with find_potential_duplicates
- [ ] Integrate detector into CreateLeadUseCase
- [ ] Create duplicate warning UI component
- [ ] Display duplicates in lead detail view
- [ ] Unit tests for detection logic
- [ ] Integration tests for API

#### B1.4: Smoke Test Suite Expansion (12 hours)
- [ ] Add 5 Auth smoke tests (login, OAuth, 2FA, reset, refresh)
- [ ] Add 8 Catalog smoke tests (CRUD, VIN, pagination, search)
- [ ] Add 8 Leads smoke tests (webhook, assign, update, reassign, duplicates, audit)
- [ ] Add 6 Appointments smoke tests (create, calendar, confirm, cancel, email, conflicts)
- [ ] Total smoke tests: 30+ (up from 20)
- [ ] Group tests by feature area
- [ ] Optimize test execution time < 5 minutes
- [ ] Add retry mechanism for flaky tests
- [ ] Add to CI/CD pipeline
- [ ] Verify >95% pass rate

#### B1.5: Password Reset Flow Tests (8 hours)
- [ ] Create test_auth_password_reset.py integration tests
- [ ] Test user can request password reset
- [ ] Test reset token expires after 1 hour
- [ ] Test user can reset password with valid token
- [ ] Test invalid token returns 400
- [ ] Test password requires new different from old
- [ ] Test password successfully updates hash
- [ ] Create frontend password-reset.test.tsx
- [ ] Test user can request reset from login page
- [ ] Test user receives email with reset link
- [ ] Test user can reset password with valid token
- [ ] Test invalid token shows error message
- [ ] Test user can login with new password
- [ ] All password reset tests pass

### Sprint B2: Core Feature Completion (54 hours)

#### B2.1: Facebook Webhook Polling Completion (16 hours)
- [ ] Review TODO comments in poll_facebook_leads_task.py (lines 56-82)
- [ ] Implement error handling for API rate limits
- [ ] Implement retry logic with exponential backoff
- [ ] Add metrics tracking (leads polled, created, errors)
- [ ] Implement deduplication in polling
- [ ] Configure polling interval (10 minutes)
- [ ] Configure timeout (30 seconds per page)
- [ ] Configure retry policy
- [ ] Remove all TODO comments
- [ ] Integration tests pass

#### B2.2: VIN Decode Integration Tests (6 hours)
- [ ] Create test_vin_decode_integration.py
- [ ] Test VIN decode calls NHTSA API successfully
- [ ] Test VIN decode caches results
- [ ] Test VIN decode handles API errors
- [ ] Test VIN decode timeout returns cached data
- [ ] Test VIN decode populates vehicle attributes
- [ ] Mock NHTSA API responses
- [ ] Test success scenarios
- [ ] Test error scenarios (timeout, 404, 500)
- [ ] Verify caching behavior

#### B2.3: Team Switching UI Implementation (8 hours)
- [ ] Create TeamSwitcher component
- [ ] Create useTeams hook
- [ ] Implement getUserTeams API call
- [ ] Implement switchTeam API call
- [ ] Add TeamSwitcher to Header component
- [ ] Display team dropdown in header
- [ ] Show all user's teams
- [ ] Handle team switching
- [ ] Update context on switch
- [ ] Refresh page with new team context
- [ ] Unit tests for TeamSwitcher component
- [ ] E2E test for team switching flow

#### B2.4: Calendar Integration (12 hours)
- [ ] Install @fullcalendar/react dependencies
- [ ] Create FullCalendarView component
- [ ] Integrate dayGridPlugin
- [ ] Integrate timeGridPlugin
- [ ] Integrate interactionPlugin
- [ ] Configure header toolbar
- [ ] Map appointments to calendar events
- [ ] Implement click on appointment handler
- [ ] Implement select empty slot handler
- [ ] Implement drag to reschedule
- [ ] Replace basic CalendarView with FullCalendarView
- [ ] Verify responsive design
- [ ] Unit tests for FullCalendarView
- [ ] E2E test for calendar interactions

#### B2.5: Role-Based Permission Tests (12 hours)
- [ ] Create test_role_based_permissions.py
- [ ] Define PERMISSION_MATRIX (admin, manager, vendedor, viewer)
- [ ] Test admin: full access (create, read, update, delete, assign)
- [ ] Test manager: team management (create, read, update, assign)
- [ ] Test vendedor: own leads/appointments (create, read, update)
- [ ] Test viewer: read-only
- [ ] Test all role combinations
- [ ] Verify authorization at API layer
- [ ] Verify cross-tenant access blocked
- [ ] Verify role escalation blocked
- [ ] Document permission matrix

#### B2.6: API Contract Test Completion (8 hours)
- [ ] Identify missing contract test coverage
- [ ] Compare routers with contract tests
- [ ] Add missing product schema tests
- [ ] Add missing appointment schema tests
- [ ] Create teams schema tests
- [ ] Verify request DTOs match OpenAPI
- [ ] Verify response DTOs match OpenAPI
- [ ] Verify status codes correct
- [ ] Verify validation rules documented
- [ ] All API endpoints have contract tests

### Sprint B3: UX Enhancements (44 hours)

#### B3.1: Multi-Image Gallery Implementation (12 hours)
- [ ] Create ProductImageGallery component
- [ ] Implement main image display
- [ ] Implement prev/next navigation
- [ ] Implement thumbnail selection
- [ ] Add keyboard navigation
- [ ] Integrate with VehicleForm
- [ ] Verify responsive design
- [ ] Unit tests for ProductImageGallery
- [ ] E2E test for gallery interactions

#### B3.2: Image Optimization Service (8 hours)
- [ ] Create ImageOptimizer service
- [ ] Implement resize to max 1920x1080
- [ ] Implement JPEG compression at 85%
- [ ] Implement EXIF data stripping
- [ ] Implement alpha channel removal
- [ ] Add /optimize endpoint to router
- [ ] Integrate optimization before upload
- [ ] Verify file size reduced >50%
- [ ] Unit tests for optimizer
- [ ] Test with real images

#### B3.3: Appointment Email Notifications (4 hours)
- [ ] Review existing email_service.py
- [ ] Verify send_appointment_confirmation exists
- [ ] Verify send_appointment_cancellation exists
- [ ] Wire up confirmation in ConfirmAppointmentUseCase
- [ ] Wire up cancellation in CancelAppointmentUseCase
- [ ] Test confirmation email sent
- [ ] Test cancellation email sent
- [ ] Verify email templates
- [ ] Integration tests pass

#### B3.4: Product Edit Mode Implementation (8 hours)
- [ ] Review TODO at line 440 in VehicleForm.tsx
- [ ] Add mode prop to VehicleForm ('create' | 'edit')
- [ ] Add productId prop to VehicleForm
- [ ] Create useProduct hook for edit mode
- [ ] Load product data in edit mode
- [ ] Pre-fill form with existing values
- [ ] Add updateProduct API call
- [ ] Handle validation in edit mode
- [ ] Remove TODO comment
- [ ] Unit tests for edit mode
- [ ] E2E test for edit flow

#### B3.5: CSV Parser for Bulk Upload (12 hours)
- [ ] Create CSVProductParser service
- [ ] Implement CSV parsing with DictReader
- [ ] Validate required columns (vin, title, price, category_id)
- [ ] Parse VIN data
- [ ] Create CreateProductRequest from CSV row
- [ ] Create BulkUploadProductsUseCase
- [ ] Implement partial failure handling
- [ ] Return BulkUploadResult with counts
- [ ] Add /bulk-upload endpoint to router
- [ ] Integration tests with sample CSV
- [ ] Test error handling
- [ ] Test partial failures

### Sprint B4: Advanced Features (42 hours)

#### B4.1: Team Invitation System (16 hours)
- [ ] Create TeamInvitation entity
- [ ] Add invitation fields (team_id, email, role, token, expires_at)
- [ ] Create InviteTeamMemberUseCase
- [ ] Generate invitation token
- [ ] Send invitation email
- [ ] Create AcceptTeamInvitationUseCase
- [ ] Validate invitation token
- [ ] Add user to team
- [ ] Mark invitation as accepted
- [ ] Add /invite endpoint to router
- [ ] Add /accept-invitation endpoint to router
- [ ] Create invitation acceptance page
- [ ] Test invitation expires after 7 days
- [ ] Test already member validation
- [ ] Unit tests for use cases
- [ ] Integration tests for flow

#### B4.2: Appointment Conflict Detection (6 hours)
- [ ] Create AppointmentConflictDetector service
- [ ] Implement times_overlap logic
- [ ] Detect dealer unavailability conflicts
- [ ] Integrate into CreateAppointmentUseCase
- [ ] Return conflicts to user
- [ ] Allow override with confirmation
- [ ] Unit tests for detection logic
- [ ] Integration tests for conflict scenarios

#### B4.3: Lead Assignment Rules Engine (8 hours)
- [ ] Create LeadAssignmentRulesEngine
- [ ] Implement round-robin assignment
- [ ] Implement vehicle owner assignment
- [ ] Implement workload balancing
- [ ] Implement geographic proximity (if data available)
- [ ] Integrate into CreateLeadUseCase
- [ ] Make rules configurable
- [ ] Unit tests for each rule
- [ ] Integration test for flow

#### B4.4: Lead Audit Trail UI (6 hours)
- [ ] Create getLeadAuditTrail API call
- [ ] Create useLeadAuditTrail hook
- [ ] Create LeadAuditTrail component
- [ ] Display audit trail chronologically
- [ ] Show status changes
- [ ] Show who made changes
- [ ] Show reasons for changes
- [ ] Integrate into lead detail page
- [ ] Unit tests for component
- [ ] E2E test for display

#### B4.5: 2FA Backup Code Regeneration (6 hours)
- [ ] Create RegenerateBackupCodesUseCase
- [ ] Generate new backup codes
- [ ] Hash and store new codes
- [ ] Invalidate old codes
- [ ] Add /regenerate-backup-codes endpoint
- [ ] Create BackupCodesDisplay component
- [ ] Display codes once to user
- [ ] Add save codes warning
- [ ] Unit tests for use case
- [ ] Integration test for flow

### Phase Completion Success Criteria

#### Module Completion Targets

##### Auth (95% → 100%)
- [ ] Password reset flow complete
- [ ] Session management tested
- [ ] 2FA backup codes regeneratable
- [ ] OAuth session handling verified

##### Organizations & Teams (90% → 100%)
- [ ] Team switching UI implemented
- [ ] Role-based permissions tested
- [ ] Team invitation system functional
- [ ] Tenant isolation verified

##### Catalog C3 (95% → 100%)
- [ ] VIN decode integration tested
- [ ] CSV parser implemented
- [ ] Image gallery functional
- [ ] Edit mode complete

##### Image Upload (85% → 100%)
- [ ] Image optimization implemented
- [ ] Multi-image upload working
- [ ] Upload progress tracked
- [ ] Image deletion functional

##### Leads (90% → 100%)
- [ ] Duplicate detection implemented
- [ ] Webhook polling complete
- [ ] Assignment rules working
- [ ] Audit trail UI displayed

##### Appointments (85% → 100%)
- [ ] Calendar integration complete
- [ ] Email notifications wired
- [ ] Conflict detection working
- [ ] Recurring appointments supported

##### E2E / QA (80% → 100%)
- [ ] Integrated flow validated
- [ ] Smoke test suite expanded (30+ tests)
- [ ] Contract tests complete
- [ ] Flaky tests eliminated

#### Overall Completion Targets
- [ ] All 4 sprints (B1 through B4) implemented
- [ ] All modules at 100% completion
- [ ] All security tests passing
- [ ] All E2E tests passing
- [ ] All UX enhancements deployed
- [ ] All advanced features functional
- [ ] Overall readiness: 100%

---

## Notes

- **Phase 13 is COMPLETE** (all 6 tasks done)
- **Phase A7 is COMPLETE** (E2E verification done)
- **Phase Completion B1-B4 follows priority order**: Security → Core → UX → Advanced
- **Parallel execution** is encouraged where dependency graph allows
- **Test-driven development** is required for all backend code
- **E2E tests** are mandatory for all user-facing features
- **CI/CD gates** will enforce all critical tests pass before merge
- **Estimated effort**: 284 hours (7 weeks solo, 4-5 weeks with 2 devs)
