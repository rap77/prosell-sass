# ProSell MVP Implementation Checklist

> **MasterMind checklist file:** this checklist is consumed by `/mm:complete-task` using positional checkbox mapping.
> **Do not use as executive status source.** Official consolidated status: `docs/mvp-status.md`

**Milestone**: Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version**: 2.0
**Status**: Active
**Last Updated**: 2026-05-09

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

## Phase 4: Leads & Appointments (COMPLETE ✅)

### A1: Lead Capture Foundation
- [x] Create Lead entity with 5-state lifecycle
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

### A2: Facebook Lead Webhook
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

### A3: Vendedor Leads List
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

### A4: Appointment Scheduling
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

### A5: Manager Team View
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

### A6: Dealer Calendar
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

### A7: E2E Verification
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

---

## Phase Completion: 100% Module Completion

### B1: Security & Release Readiness

#### B1.1: E2E Integrated Flow Validation (8 hours)
- [x] Create integrated-critical-path.spec.ts test
- [x] Implement complete sales cycle scenario
- [x] Mock Facebook Graph API for publish
- [x] Mock webhook endpoint for lead capture
- [x] Mock SendGrid for email notifications
- [x] Verify test execution time < 3 minutes
- [x] Add test to smoke suite
- [x] Test passes consistently (>95% success rate)

#### B1.2: Multi-Tenant Isolation Security Tests (8 hours)
- [x] Create test_tenant_isolation.py suite
- [x] Test user cannot access other tenant leads
- [x] Test user cannot access other tenant products
- [x] Test user cannot access other tenant appointments
- [x] Verify API filtering enforces tenant_id
- [x] Verify repository queries include tenant_id
- [x] Verify webhook respects tenant context
- [x] Test SQL injection attempts
- [x] Test IDOR (Insecure Direct Object Reference) vectors
- [x] All tenant isolation tests pass

#### B1.3: Lead Duplicate Detection Implementation (12 hours)
- [x] Create LeadDuplicateDetector service
- [x] Implement email matching (exact match)
- [x] Implement phone matching (normalized)
- [x] Implement email + phone combination matching
- [x] Extend LeadRepository with find_by_email
- [x] Extend LeadRepository with find_by_phone
- [x] Extend LeadRepository with find_potential_duplicates
- [x] Integrate detector into CreateLeadUseCase
- [x] Create duplicate warning UI component
- [x] Display duplicates in lead detail view
- [x] Unit tests for detection logic
- [x] Integration tests for API

#### B1.4: Smoke Test Suite Expansion (12 hours)
- [x] Add 5 Auth smoke tests (login, OAuth, 2FA, reset, refresh)
- [x] Add 8 Catalog smoke tests (CRUD, VIN, pagination, search)
- [x] Add 8 Leads smoke tests (webhook, assign, update, reassign, duplicates, audit)
- [x] Add 6 Appointments smoke tests (create, calendar, confirm, cancel, email, conflicts)
- [x] Total smoke tests: 30+ (up from 20)
- [x] Group tests by feature area
- [x] Optimize test execution time < 5 minutes
- [x] Add retry mechanism for flaky tests
- [x] Add to CI/CD pipeline
- [x] Verify >95% pass rate

#### B1.5: Password Reset Flow Tests (8 hours)
- [x] Create test_auth_password_reset.py integration tests
- [x] Test user can request password reset
- [x] Test reset token expires after 1 hour
- [x] Test user can reset password with valid token
- [x] Test invalid token returns 400
- [x] Test password requires new different from old
- [x] Test password successfully updates hash
- [x] Create frontend password-reset.test.tsx
- [x] Test user can request reset from login page
- [x] Test user receives email with reset link
- [x] Test user can reset password with valid token
- [x] Test invalid token shows error message
- [x] Test user can login with new password
- [x] All password reset tests pass

### B2: Core Feature Completion

#### B2.1: Facebook Webhook Polling Completion (16 hours)
- [x] Review TODO comments in poll_facebook_leads_task.py (lines 56-82)
- [x] Implement error handling for API rate limits
- [x] Implement retry logic with exponential backoff
- [x] Add metrics tracking (leads polled, created, errors)
- [x] Implement deduplication in polling
- [x] Configure polling interval (10 minutes)
- [x] Configure timeout (30 seconds per page)
- [x] Configure retry policy
- [x] Remove all TODO comments
- [x] Integration tests pass

#### B2.2: VIN Decode Integration Tests (6 hours)
⏱️ **Estimate**: (6 hours) | **Actual**: 0.08 hours | **Deviation**: -98.7% | **Progress**: 10/10 (100%)
📊 **Avg/subtask**: 0.5 min | **ETA**: 2026-05-09 07:57

- [x] Create test_vin_decode_integration.py
- [x] Test VIN decode calls NHTSA API successfully
- [x] Test VIN decode caches results
- [x] Test VIN decode handles API errors
- [x] Test VIN decode timeout returns cached data
- [x] Test VIN decode populates vehicle attributes
- [x] Mock NHTSA API responses
- [x] Test success scenarios
- [x] Test error scenarios (timeout, 404, 500)
- [x] Verify caching behavior

#### B2.3: Team Switching UI Implementation (8 hours)
- [x] Create TeamSwitcher component
- [x] Create useTeams hook
- [x] Implement getUserTeams API call
- [x] Implement switchTeam API call
- [x] Add TeamSwitcher to Header component
- [x] Display team dropdown in header
- [x] Show all user's teams
- [x] Handle team switching
- [x] Update context on switch
- [x] Refresh page with new team context
- [x] Unit tests for TeamSwitcher component
- [x] E2E test for team switching flow

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

### B3: UX Enhancements

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

### B4: Advanced Features

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

---

## Notes

- **Phase 13 is COMPLETE** (all 6 tasks done)
- **Phase A7 is COMPLETE** (E2E verification done)
- **Phase B1 is COMPLETE** (Security & Release Readiness)
- **Phase Completion B2-B4 follows priority order**: Core → UX → Advanced
- **Parallel execution** is encouraged where dependency graph allows
- **Test-driven development** is required for all backend code
- **E2E tests** are mandatory for all user-facing features
- **CI/CD gates** will enforce all critical tests pass before merge
- **Checkbox format**: Use `- [ ]` for pending, `- [x]` for complete

---

**Document Status**: Active — Ready for execution
**Next Action**: Execute B2 (Core Feature Completion)
**Owner**: Engineering Team
**Stakeholders**: Product, QA, DevOps, Security
