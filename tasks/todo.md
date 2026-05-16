## Phase 13: Frontend C3 Integration (COMPLETE ✅)

## Phase 4: Leads & Appointments (COMPLETE ✅)

- [x] A1: Lead Capture Foundation
  - [x] A1.01: Create Lead entity with 5-state lifecycle
  - [x] A1.02: Create LeadStatus enum and LeadStateTransitionException [requires: 01]
  - [x] A1.03: Create LeadAuditLog entity for tracking status changes [requires: 02]
  - [x] A1.04: Write Alembic migration for leads, lead_audit_log tables [requires: 03]
  - [x] A1.05: Add tenant_id indexes for multi-tenant isolation [requires: 04]
  - [x] A1.06: Create ILeadRepository interface in domain layer [requires: 05]
  - [x] A1.07: Implement LeadRepository with async SQLAlchemy [requires: 06]
  - [x] A1.08: Add tenant_id filtering to all queries [requires: 07]
  - [x] A1.09: Implement create() method with duplicate detection [requires: 08]
  - [x] A1.10: Implement update_status() with audit log creation [requires: 09]
  - [x] A1.11: Implement list_by_vendedor() with pagination [requires: 10]
  - [x] A1.12: Implement list_by_manager() (all team leads) [requires: 11]
  - [x] A1.13: Create CreateLeadUseCase with business logic [requires: 12]
  - [x] A1.14: Create UpdateLeadStatusUseCase with state validation [requires: 13]
  - [x] A1.15: Create ListLeadsUseCase with role-based filtering [requires: 14]
  - [x] A1.16: Create GetLeadDetailsUseCase [requires: 15]
  - [x] A1.17: Create POST /api/v1/leads endpoint for manual lead creation [requires: 16]
  - [x] A1.18: Create GET /api/v1/leads endpoint with pagination [requires: 17]
  - [x] A1.19: Create GET /api/v1/leads/{id} for lead details [requires: 18]
  - [x] A1.20: Create PUT /api/v1/leads/{id}/status for status updates [requires: 19]
  - [x] A1.21: Add authentication/authorization middleware [requires: 20]
  - [x] A1.22: Add tenant_id filtering to all endpoints [requires: 21]
  - [x] A1.23: Write unit tests for lead state transitions [requires: 22]
  - [x] A1.24: Write integration tests for repository [requires: 23]
  - [x] A1.25: Write integration tests for use cases [requires: 06]
  - [x] A1.26: Write integration tests for all endpoints [requires: 25]
  - [x] A1.27: Write contract tests for DTO schemas [requires: 26]

- [x] A2: Facebook Lead Webhook
  - [x] A2.01: Create POST /api/v1/webhooks/facebook endpoint
  - [x] A2.02: Implement X-Hub-Signature verification (SHA256 HMAC) [requires: 01]
  - [x] A2.03: Return 403 if signature missing/invalid (security) [requires: 02]
  - [x] A2.04: Parse Facebook webhook payload (leadgen_id, listing_id, sender_id, message) [requires: 03]
  - [x] A2.05: Return 200 OK within 1 second (quick response) [requires: 04]
  - [x] A2.06: Create FacebookGraphApiClient class [requires: 05]
  - [x] A2.07: Query buyer profile by sender_id (name, profile_url) [requires: 06]
  - [x] A2.08: Handle access token refresh [requires: 07]
  - [x] A2.09: Query vehicle by facebook_listing_id from publications table [requires: 08]
  - [x] A2.10: Check for duplicate lead (same buyer + vehicle within 24 hours) [requires: 09]
  - [x] A2.11: Extract lead data (buyer_name, buyer_email, buyer_phone, message, source="facebook") [requires: 10]
  - [x] A2.12: Call CreateLeadUseCase (reused from A1) [requires: 11]
  - [x] A2.13: Assign lead to vehicle's owner vendedor [requires: 12]
  - [x] A2.14: Create Taskiq background task (runs every 10 minutes) [requires: 13]
  - [x] A2.15: Implement polling fallback logic [requires: 14]
  - [x] A2.16: Add logging for all webhook events [requires: 15]
  - [x] A2.17: Track webhook success/failure metrics [requires: 16]
  - [x] A2.18: Write integration test for webhook endpoint [requires: 17]
  - [x] A2.19: Test webhook signature verification (403 on invalid) [requires: 18]
  - [x] A2.20: Test lead creation from Facebook payload [requires: 19]
  - [x] A2.21: Test duplicate detection [requires: 20]
  - [x] A2.22: Write contract test for OpenAPI schema [requires: 21]
  - [x] A2.23: Test polling fallback logic [requires: 22]

- [x] A3: Vendedor Leads List
  - [x] A3.01: Create Lead interface (id, buyer_name, buyer_email, buyer_phone, vehicle, message, status, source, created_at, updated_at)
  - [x] A3.02: Create CreateLeadRequest interface [requires: 01]
  - [x] A3.03: Create UpdateLeadStatusRequest interface (status + reason) [requires: 02]
  - [x] A3.04: Create LeadStatus enum (5 states) [requires: 03]
  - [x] A3.05: Create useLeads hook (queryKey: ['leads']) [requires: 03]
  - [x] A3.06: Add role-based query parameters (vendedor vs manager) [requires: 05]
  - [x] A3.07: Create useLead hook for single lead details [requires: 03]
  - [x] A3.08: Create useUpdateLeadStatus mutation hook [requires: 03]
  - [x] A3.09: Add toast notifications for success/error [requires: 08]
  - [x] A3.10: Implement query invalidation on mutation [requires: 09]
  - [x] A3.11: Create LeadList component (DataGrid pattern) [requires: 08]
  - [x] A3.12: Create LeadListItem component (one row per lead) [requires: 08]
  - [x] A3.13: Create LeadStatusBadge component (5 states with colors) [requires: 08]
  - [x] A3.14: Create LeadStatusDropdown component (quick status update) [requires: 08]
  - [x] A3.15: Create /vendedor/leads page [requires: 14]
  - [x] A3.16: Implement search by buyer name, vehicle [requires: 15]
  - [x] A3.17: Add filter by status (new, contacted, qualified, etc.) [requires: 16]
  - [x] A3.18: Add highlight for unread leads (created_at < 5 min ago) [requires: 17]
  - [x] A3.19: Implement pagination or infinite scroll [requires: 18]
  - [x] A3.20: Add real-time updates (polling every 30s via refetchInterval) [requires: 19]
  - [x] A3.21: Write unit tests for API hooks (mocked fetch) [requires: 20]
  - [x] A3.22: Write component tests for LeadStatusBadge [requires: 08]
  - [x] A3.23: Write E2E test for leads list view [requires: 22]
  - [x] A3.24: Test search functionality [requires: 23]
  - [x] A3.25: Test status filter [requires: 24]
  - [x] A3.26: Test status update dropdown [requires: 25]

- [x] A4: Appointment Scheduling
  - [x] A4.01: Create Appointment entity (lead_id, dealer_id, vehicle_id, scheduled_at, status, notes, tenant_id)
  - [x] A4.02: Implement AppointmentStatus enum (scheduled, completed, cancelled) [requires: 01]
  - [x] A4.03: Implement time validation (business hours: 9am-6pm Mon-Fri) [requires: 02]
  - [x] A4.04: Implement conflict detection (same dealer + time slot) [requires: 03]
  - [x] A4.05: Write Alembic migration for appointments table [requires: 04]
  - [x] A4.06: Add indexes on (tenant_id, dealer_id, scheduled_at) [requires: 05]
  - [x] A4.07: Add foreign keys (lead_id → leads, dealer_id → dealers, vehicle_id → vehicles) [requires: 06]
  - [x] A4.08: Create IAppointmentRepository interface [requires: 07]
  - [x] A4.09: Implement AppointmentRepository with async SQLAlchemy [requires: 08]
  - [x] A4.10: Implement create() with conflict detection [requires: 09]
  - [x] A4.11: Implement list_by_dealer(), list_by_vendedor() [requires: 10]
  - [x] A4.12: Create CreateAppointmentUseCase (validates time, checks conflicts) [requires: 11]
  - [x] A4.13: CreateAppointmentUseCase updates lead status to "appointment_set" [requires: 12]
  - [x] A4.14: Create ListAppointmentsUseCase (role-based filtering) [requires: 13]
  - [x] A4.15: Create CancelAppointmentUseCase [requires: 14]
  - [x] A4.16: Create EmailService class for SendGrid [requires: 15]
  - [x] A4.17: Create email template for appointment notifications [requires: 16]
  - [x] A4.18: Implement error handling (retry with exponential backoff) [requires: 17]
  - [x] A4.19: Add logging for email delivery status [requires: 18]
  - [x] A4.20: Create AppointmentResponse DTO [requires: 19]
  - [x] A4.21: Create CreateAppointmentRequest DTO [requires: 20]
  - [x] A4.22: Create POST /api/v1/appointments endpoint [requires: 21]
  - [x] A4.23: Create GET /api/v1/appointments endpoint (role-based filtering) [requires: 22]
  - [x] A4.24: Create PUT /api/v1/appointments/{id}/status endpoint [requires: 23]
  - [x] A4.25: Create Appointment interface [requires: 24]
  - [x] A4.26: Create CreateAppointmentRequest interface [requires: 25]
  - [x] A4.27: Create useAppointments hook [requires: 26]
  - [x] A4.28: Create useCreateAppointment mutation hook [requires: 26]
  - [x] A4.29: Add toast notifications [requires: 28]
  - [x] A4.30: Create LeadDetails page at /vendedor/leads/{id} [requires: 29]
  - [x] A4.31: Create AppointmentForm modal (date-time picker, dealer selection, notes) [requires: 30]
  - [x] A4.32: Implement time validation (business hours) [requires: 31]
  - [x] A4.33: Show appointment conflicts warning [requires: 32]
  - [x] A4.34: Add "Agendar Cita" button to lead details [requires: 33]
  - [x] A4.35: Write unit tests for Appointment entity (time validation) [requires: 34]
  - [x] A4.36: Write integration tests for CreateAppointmentUseCase (mocked SendGrid) [requires: 35]
  - [x] A4.37: Write integration tests for API endpoints [requires: 36]
  - [x] A4.38: Write E2E test for appointment creation flow [requires: 30]

- [x] A5: Manager Team View
  - [x] A5.01: Extend GET /api/v1/leads with manager scope (all team leads, not just own)
  - [x] A5.02: Create AssignLeadToVendedorUseCase (if not in A1) [requires: 01]
  - [x] A5.03: Create PUT /api/v1/leads/{id}/assign endpoint [requires: 02]
  - [x] A5.04: Extend useLeads hook with manager scope [requires: 03]
  - [x] A5.05: Create useReassignLead mutation hook [requires: 04]
  - [x] A5.06: Create TeamLeadList component (extends LeadList) [requires: 05]
  - [x] A5.07: Create LeadReassignModal component (vendedor dropdown, confirm button) [requires: 05]
  - [x] A5.08: Create TeamMetricsCard component (leads per vendedor, conversion rates) [requires: 05]
  - [x] A5.09: Create /manager/team/leads page [requires: 08]
  - [x] A5.10: Add filter by vendedor dropdown [requires: 09]
  - [x] A5.11: Show all leads across team (not just assigned to manager) [requires: 10]
  - [x] A5.12: Implement reassign lead mutation [requires: 11]
  - [x] A5.13: Add export to CSV button [requires: 12]
  - [x] A5.14: Write E2E test for manager view [requires: 09]
  - [x] A5.15: Test filter by vendedor [requires: 14]
  - [x] A5.16: Test lead reassignment [requires: 15]

- [x] A6: Dealer Calendar
  - [x] A6.01: Extend GET /api/v1/appointments with dealer scope (own appointments only)
  - [x] A6.02: Create PUT /api/v1/appointments/{id}/status endpoint (confirm, cancel) [requires: 01]
  - [x] A6.03: Extend useAppointments hook with dealer scope [requires: 02]
  - [x] A6.04: Create useUpdateAppointmentStatus mutation hook [requires: 03]
  - [x] A6.05: Create CalendarView component (use calendar library) [requires: 04]
  - [x] A6.06: Show day/week/month toggle [requires: 05]
  - [x] A6.07: Create AppointmentCard component (buyer name, vehicle, time, status) [requires: 05]
  - [x] A6.08: Add confirm/cancel buttons [requires: 07]
  - [x] A6.09: Create /dealer/appointments page [requires: 07]
  - [x] A6.10: Show appointment details modal [requires: 09]
  - [x] A6.11: Add today's appointments badge [requires: 10]
  - [x] A6.12: Implement status update mutation [requires: 11]
  - [x] A6.13: Write E2E test for dealer calendar [requires: 09]
  - [x] A6.14: Test calendar view (day/week/month) [requires: 09]
  - [x] A6.15: Test confirm/cancel buttons [requires: 14]

## Phase Completion: 100% Module Completion

- [x] B1: Security & Release Readiness

- [x] B1.1: E2E Integrated Flow Validation (8 hours)
  - [x] B1.1.01: Create integrated-critical-path.spec.ts test
  - [x] B1.1.02: Implement complete sales cycle scenario [requires: 01]
  - [x] B1.1.03: Mock Facebook Graph API for publish [requires: 02]
  - [x] B1.1.04: Mock webhook endpoint for lead capture [requires: 03]
  - [x] B1.1.05: Mock SendGrid for email notifications [requires: 04]
  - [x] B1.1.06: Verify test execution time < 3 minutes [requires: 05]
- [x] B1.1.07: Add test to smoke suite [requires: 06]
- [x] B1.1.08: Test passes consistently (>95% success rate) [requires: 07]
- [x] Note: this task validates the mocked/smoke integrated path; final operational E2E with live web/api services is still tracked separately in release readiness.
- [x] Follow-up: operational `tests/e2e/specs/integrated-flow.spec.ts` validated against running Docker web/api services on 2026-05-16.

- [x] B1.2: Multi-Tenant Isolation Security Tests (8 hours)
  - [x] B1.2.01: Create test_tenant_isolation.py suite
  - [x] B1.2.02: Test user cannot access other tenant leads [requires: 01]
  - [x] B1.2.03: Test user cannot access other tenant products [requires: 02]
  - [x] B1.2.04: Test user cannot access other tenant appointments [requires: 03]
  - [x] B1.2.05: Verify API filtering enforces tenant_id [requires: 04]
  - [x] B1.2.06: Verify repository queries include tenant_id [requires: 05]
  - [x] B1.2.07: Verify webhook respects tenant context [requires: 06]
  - [x] B1.2.08: Test SQL injection attempts [requires: 07]
  - [x] B1.2.09: Test IDOR (Insecure Direct Object Reference) vectors [requires: 08]
  - [x] B1.2.10: All tenant isolation tests pass [requires: 09]

- [x] B1.3: Lead Duplicate Detection Implementation (12 hours)
  - [x] B1.3.01: Create LeadDuplicateDetector service
  - [x] B1.3.02: Implement email matching (exact match) [requires: 01]
  - [x] B1.3.03: Implement phone matching (normalized) [requires: 02]
  - [x] B1.3.04: Implement email + phone combination matching [requires: 03]
  - [x] B1.3.05: Extend LeadRepository with find_by_email [requires: 04]
  - [x] B1.3.06: Extend LeadRepository with find_by_phone [requires: 05]
  - [x] B1.3.07: Extend LeadRepository with find_potential_duplicates [requires: 06]
  - [x] B1.3.08: Integrate detector into CreateLeadUseCase [requires: 07]
  - [x] B1.3.09: Create duplicate warning UI component [requires: 08]
  - [x] B1.3.10: Display duplicates in lead detail view [requires: 09]
  - [x] B1.3.11: Unit tests for detection logic [requires: 10]
  - [x] B1.3.12: Integration tests for API [requires: 11]

- [x] B1.4: Smoke Test Suite Expansion (12 hours)
  - [x] B1.4.01: Add 5 Auth smoke tests (login, OAuth, 2FA, reset, refresh)
  - [x] B1.4.02: Add 8 Catalog smoke tests (CRUD, VIN, pagination, search) [requires: 01]
  - [x] B1.4.03: Add 8 Leads smoke tests (webhook, assign, update, reassign, duplicates, audit) [requires: 02]
  - [x] B1.4.04: Add 6 Appointments smoke tests (create, calendar, confirm, cancel, email, conflicts) [requires: 03]
  - [x] B1.4.05: Total smoke tests: 30+ (up from 20) [requires: 04]
  - [x] B1.4.06: Group tests by feature area [requires: 05]
  - [x] B1.4.07: Optimize test execution time < 5 minutes [requires: 06]
  - [x] B1.4.08: Add retry mechanism for flaky tests [requires: 07]
  - [x] B1.4.09: Add to CI/CD pipeline [requires: 08]
  - [x] B1.4.10: Verify >95% pass rate [requires: 09]

- [x] B1.5: Password Reset Flow Tests (8 hours)
  - [x] B1.5.01: Create test_auth_password_reset.py integration tests
  - [x] B1.5.02: Test user can request password reset [requires: 01]
  - [x] B1.5.03: Test reset token expires after 1 hour [requires: 02]
  - [x] B1.5.04: Test user can reset password with valid token [requires: 03]
  - [x] B1.5.05: Test invalid token returns 400 [requires: 04]
  - [x] B1.5.06: Test password requires new different from old [requires: 05]
  - [x] B1.5.07: Test password successfully updates hash [requires: 06]
  - [x] B1.5.08: Create frontend password-reset.test.tsx [requires: 07]
  - [x] B1.5.09: Test user can request reset from login page [requires: 08]
  - [x] B1.5.10: Test user receives email with reset link [requires: 09]
  - [x] B1.5.11: Test user can reset password with valid token [requires: 10]
  - [x] B1.5.12: Test invalid token shows error message [requires: 11]
  - [x] B1.5.13: Test user can login with new password [requires: 12]
  - [x] B1.5.14: All password reset tests pass [requires: 13]

- [~] B2: Core Feature Completion

- [x] B2.1: Facebook Webhook Polling Completion (16 hours)
  - [x] B2.1.01: Review TODO comments in poll_facebook_leads_task.py (lines 56-82)
  - [x] B2.1.02: Implement error handling for API rate limits [requires: 01]
  - [x] B2.1.03: Implement retry logic with exponential backoff [requires: 02]
  - [x] B2.1.04: Add metrics tracking (leads polled, created, errors) [requires: 03]
  - [x] B2.1.05: Implement deduplication in polling [requires: 04]
  - [x] B2.1.06: Configure polling interval (10 minutes) [requires: 05]
  - [x] B2.1.07: Configure timeout (30 seconds per page) [requires: 06]
  - [x] B2.1.08: Configure retry policy [requires: 07]
  - [x] B2.1.09: Remove all TODO comments [requires: 08]
  - [x] B2.1.10: Integration tests pass [requires: 09]

- [x] B2.2: VIN Decode Integration Tests (6 hours)
  - [x] B2.2.01: Create test_vin_decode_integration.py
  - [x] B2.2.02: Test VIN decode calls NHTSA API successfully [requires: 01]
  - [x] B2.2.03: Test VIN decode caches results [requires: 02]
  - [x] B2.2.04: Test VIN decode handles API errors [requires: 03]
  - [x] B2.2.05: Test VIN decode timeout returns cached data [requires: 04]
  - [x] B2.2.06: Test VIN decode populates vehicle attributes [requires: 05]
  - [x] B2.2.07: Mock NHTSA API responses [requires: 06]
  - [x] B2.2.08: Test success scenarios [requires: 07]
  - [x] B2.2.09: Test error scenarios (timeout, 404, 500) [requires: 08]
  - [x] B2.2.10: Verify caching behavior [requires: 09]

- [x] B2.3: Team Switching UI Implementation (8 hours)
  - [x] B2.3.01: Create TeamSwitcher component
  - [x] B2.3.02: Create useTeams hook [requires: 01]
  - [x] B2.3.03: Implement getUserTeams API call [requires: 02]
  - [x] B2.3.04: Implement switchTeam API call [requires: 03]
  - [x] B2.3.05: Add TeamSwitcher to Header component [requires: 02]
  - [x] B2.3.06: Display team dropdown in header [requires: 05]
  - [x] B2.3.07: Show all user's teams [requires: 06]
  - [x] B2.3.08: Handle team switching [requires: 07]
  - [x] B2.3.09: Update context on switch [requires: 08]
  - [x] B2.3.10: Refresh page with new team context [requires: 05]
  - [x] B2.3.11: Unit tests for TeamSwitcher component [requires: 02]
  - [x] B2.3.12: E2E test for team switching flow [requires: 11]

- [x] B2.4: Calendar Integration (12 hours)
  - [x] B2.4.01: Install @fullcalendar/react dependencies
  - [x] B2.4.02: Create FullCalendarView component [requires: 01]
  - [x] B2.4.03: Integrate dayGridPlugin [requires: 02]
  - [x] B2.4.04: Integrate timeGridPlugin [requires: 03]
  - [x] B2.4.05: Integrate interactionPlugin [requires: 04]
  - [x] B2.4.06: Configure header toolbar [requires: 05]
  - [x] B2.4.07: Map appointments to calendar events [requires: 06]
  - [x] B2.4.08: Implement click on appointment handler [requires: 07]
  - [x] B2.4.09: Implement select empty slot handler [requires: 08]
  - [x] B2.4.10: Implement drag to reschedule [requires: 09]
  - [x] B2.4.11: Replace basic CalendarView with FullCalendarView [requires: 10]
  - [x] B2.4.12: Verify responsive design [requires: 11]
  - [x] B2.4.13: Unit tests for FullCalendarView [requires: 12]
  - [x] B2.4.14: E2E test for calendar interactions [requires: 02]

- [x] B2.5: Role-Based Permission Tests (12 hours)
  - [x] B2.5.01: Create test_role_based_permissions.py
  - [x] B2.5.02: Define PERMISSION_MATRIX (admin, manager, vendedor, viewer) [requires: 01]
  - [x] B2.5.03: Test admin: full access (create, read, update, delete, assign) [requires: 02]
  - [x] B2.5.04: Test manager: team management (create, read, update, assign) [requires: 03]
  - [x] B2.5.05: Test vendedor: own leads/appointments (create, read, update) [requires: 04]
  - [x] B2.5.06: Test viewer: read-only [requires: 05]
  - [x] B2.5.07: Test all role combinations [requires: 06]
  - [x] B2.5.08: Verify authorization at API layer [requires: 07]
  - [x] B2.5.09: Verify cross-tenant access blocked [requires: 08]
  - [x] B2.5.10: Verify role escalation blocked [requires: 09]
  - [x] B2.5.11: Document permission matrix [requires: 10]

- [x] B2.6: API Contract Test Completion (8 hours)
  - [x] B2.6.01: Identify missing contract test coverage
  - [x] B2.6.02: Compare routers with contract tests [requires: 01]
  - [x] B2.6.03: Add missing product schema tests [requires: 02] - PLANNED (✅ complete)
  - [x] B2.6.04: Add missing appointment schema tests [requires: 03] - PLANNED (✅ complete)
  - [x] B2.6.05: Create teams schema tests [requires: 04] - PLANNED (✅ complete)
  - [x] B2.6.06: Verify request DTOs match OpenAPI [requires: 05] - PLANNED (✅ complete)
  - [x] B2.6.07: Verify response DTOs match OpenAPI [requires: 06] - PLANNED (✅ complete)
  - [x] B2.6.08: Verify status codes correct [requires: 07] - PLANNED (✅ complete)
  - [x] B2.6.09: Verify validation rules documented [requires: 08] - PLANNED (✅ complete)
  - [x] B2.6.10: All API endpoints have contract tests [requires: 09] - PLANNED (✅ complete)

- [~] B3: UX Enhancements

- [x] B3.1: Multi-Image Gallery Implementation (12 hours)
  - [x] B3.1.01: Create ProductImageGallery component
  - [x] B3.1.02: Implement main image display [requires: 01]
  - [x] B3.1.03: Implement prev/next navigation [requires: 02]
  - [x] B3.1.04: Implement thumbnail selection [requires: 03]
  - [x] B3.1.05: Add keyboard navigation [requires: 04]
  - [x] B3.1.06: Integrate with VehicleForm [requires: 05]
  - [x] B3.1.07: Verify responsive design [requires: 06]
  - [x] B3.1.08: Unit tests for ProductImageGallery [requires: 07]
  - [x] B3.1.09: E2E test for gallery interactions [requires: 01]

- [x] B3.2: Image Optimization Service (8 hours)
  - [x] B3.2.01: Create ImageOptimizer service
  - [x] B3.2.02: Implement resize to max 1920x1080 [requires: 01]
  - [x] B3.2.03: Implement JPEG compression at 85% [requires: 02]
  - [x] B3.2.04: Implement EXIF data stripping [requires: 03]
  - [x] B3.2.05: Implement alpha channel removal [requires: 04]
  - [x] B3.2.06: Add /optimize endpoint to router [requires: 05]
  - [x] B3.2.07: Integrate optimization before upload [requires: 06]
  - [x] B3.2.08: Verify file size reduced >50% [requires: 07] (verified in tests)
  - [x] B3.2.09: Unit tests for optimizer [requires: 08] (14 tests passing)
  - [x] B3.2.10: Test with real images [requires: 09] ✅ COMPLETADO - Testing manual exitoso (47-91% reducción)

- [x] B3.3: Appointment Email Notifications (4 hours)⏱️ **Estimate**: (4 hours) | **Actual**: 5.1m | **Deviation**: -3.9h | **Progress**: 9/9 (100%)
📊 **Avg/subtask**: 34s | **ETA**: 5.1m


  - [x] B3.3.01: Review existing email_service.py
  - [x] B3.3.02: Verify send_appointment_confirmation exists [requires: 01]
  - [x] B3.3.03: Verify send_appointment_cancellation exists [requires: 02]
  - [x] B3.3.04: Wire up confirmation in ConfirmAppointmentUseCase [requires: 03]
  - [x] B3.3.05: Wire up cancellation in CancelAppointmentUseCase [requires: 04]
  - [x] B3.3.06: Test confirmation email sent [requires: 05]
  - [x] B3.3.07: Test cancellation email sent [requires: 06]
  - [x] B3.3.08: Verify email templates [requires: 07]
  - [x] B3.3.09: Integration tests pass [requires: 08]

- [~] B3.4: Product Edit Mode Implementation (8 hours)
  - [x] B3.4.01: Review TODO at line 440 in VehicleForm.tsx
  - [x] B3.4.02: Add mode prop to VehicleForm ('create' | 'edit') [requires: 01]
  - [x] B3.4.03: Add productId prop to VehicleForm [requires: 02]
  - [x] B3.4.04: Create useProduct hook for edit mode [requires: 03]
  - [x] B3.4.05: Load product data in edit mode [requires: 04]
  - [x] B3.4.06: Pre-fill form with existing values [requires: 05]
  - [x] B3.4.07: Add updateProduct API call [requires: 06]
  - [x] B3.4.08: Handle validation in edit mode [requires: 07]
  - [x] B3.4.09: Remove TODO comment [requires: 08]
  - [x] B3.4.10: Unit tests for edit mode [requires: 09]
  - [~] B3.4.11: E2E test for edit flow [requires: 10]

- [x] B3.5: CSV Parser for Bulk Upload (12 hours)
  - [x] B3.5.01: Create CSVProductParser service
  - [x] B3.5.02: Implement CSV parsing with DictReader [requires: 01]
  - [x] B3.5.03: Validate required columns (vin, title, price, category_id) [requires: 02]
  - [x] B3.5.04: Parse VIN data [requires: 03]
  - [x] B3.5.05: Create CreateProductRequest from CSV row [requires: 04]
  - [x] B3.5.06: Create BulkUploadProductsUseCase [requires: 05]
  - [x] B3.5.07: Implement partial failure handling [requires: 06]
  - [x] B3.5.08: Return BulkUploadResult with counts [requires: 07]
  - [x] B3.5.09: Add /bulk-upload endpoint to router [requires: 08]
  - [x] B3.5.10: Integration tests with sample CSV [requires: 09]
  - [x] B3.5.11: Test error handling [requires: 10]
  - [x] B3.5.12: Test partial failures [requires: 11]

- [~] B4: Advanced Features

- [~] B4.1: Team Invitation System (16 hours)
  - [x] B4.1.01: Create TeamInvitation entity
  - [x] B4.1.02: Add invitation fields (team_id, email, role, token, expires_at) [requires: 01]
  - [x] B4.1.03: Create InviteTeamMemberUseCase [requires: 02]
  - [x] B4.1.04: Generate invitation token [requires: 03]
  - [x] B4.1.05: Send invitation email [requires: 04]
  - [x] B4.1.06: Create AcceptTeamInvitationUseCase [requires: 05]
  - [x] B4.1.07: Validate invitation token [requires: 06]
  - [x] B4.1.08: Add user to team [requires: 07]
  - [x] B4.1.09: Mark invitation as accepted [requires: 08]
  - [x] B4.1.10: Add /invite endpoint to router [requires: 09]
  - [x] B4.1.11: Add /accept-invitation endpoint to router [requires: 10]
  - [x] B4.1.12: Create invitation acceptance page [requires: 11] ✅ COMPLETE (apps/web/src/app/invite/[token]/page.tsx created)
  - [x] B4.1.13: Test invitation expires after 7 days [requires: 12]
  - [x] B4.1.14: Test already member validation [requires: 13]
  - [x] B4.1.15: Unit tests for use cases [requires: 14]
  - [x] B4.1.16: Integration tests for flow [requires: 15]

- [x] B4.2: Appointment Conflict Detection (6 hours)⏱️ **Estimate**: (6 hours) | **Actual**: 39.8m | **Deviation**: -5.3h | **Progress**: 8/8 (100%)⏱️ **Estimate**: (6 hours) | **Actual**: 39.8m | **Deviation**: -5.3h | **Progress**: 8/8 (100%)
📊 **Avg/subtask**: 5.0m | **ETA**: 39.8m


📊 **Avg/subtask**: 5.0m | **ETA**: 39.8m


  - [x] B4.2.01: Create AppointmentConflictDetector service
  - [x] B4.2.02: Implement times_overlap logic [requires: 01]
  - [x] B4.2.03: Detect dealer unavailability conflicts [requires: 02]
  - [x] B4.2.04: Integrate into CreateAppointmentUseCase [requires: 03]
  - [x] B4.2.05: Return conflicts to user [requires: 04]
  - [x] B4.2.06: Allow override with confirmation [requires: 05]
  - [x] B4.2.07: Unit tests for detection logic [requires: 06]
  - [x] B4.2.08: Integration tests for conflict scenarios [requires: 07]

- [x] B4.3: Lead Assignment Rules Engine (8 hours)
  - [x] B4.3.01: Create LeadAssignmentRulesEngine
  - [x] B4.3.02: Implement round-robin assignment [requires: 01]
  - [x] B4.3.03: Implement vehicle owner assignment [requires: 02]
  - [x] B4.3.04: Implement workload balancing [requires: 03]
  - [x] B4.3.05: Implement geographic proximity (if data available) [requires: 04]
  - [x] B4.3.06: Integrate into CreateLeadUseCase [requires: 05]
  - [x] B4.3.07: Make rules configurable [requires: 06]
  - [x] B4.3.08: Unit tests for each rule [requires: 07]
  - [x] B4.3.09: Integration test for flow [requires: 08, 06]

- [ ] B4.4: Lead Audit Trail UI (6 hours)
  - [ ] B4.4.01: Create getLeadAuditTrail API call
  - [ ] B4.4.02: Create useLeadAuditTrail hook [requires: 01]
  - [ ] B4.4.03: Create LeadAuditTrail component [requires: 02]
  - [ ] B4.4.04: Display audit trail chronologically [requires: 03]
  - [ ] B4.4.05: Show status changes [requires: 04]
  - [ ] B4.4.06: Show who made changes [requires: 05]
  - [ ] B4.4.07: Show reasons for changes [requires: 06]
  - [ ] B4.4.08: Integrate into lead detail page [requires: 03]
  - [ ] B4.4.09: Unit tests for component [requires: 02]
  - [ ] B4.4.10: E2E test for display [requires: 09]

## Notes
