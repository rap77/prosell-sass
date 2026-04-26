# ProSell MVP Implementation Plan

**Milestone**: Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version**: 1.0
**Status**: Active
**Last Updated**: 2026-04-26

---

## Overview

This plan implements the ProSell MVP by completing **Phase 13** (C3 frontend integration) and implementing **Phase 4** (Leads & Appointments). The milestone delivers a complete sales cycle: vendedores can publish vehicles to Facebook, capture leads from messages, and schedule buyer appointments with dealers.

**Phase Status**:
- ✅ Phase 1: Hybrid Publisher (COMPLETE)
- ✅ Phase 2: Catalog & Roles (COMPLETE)
- ✅ Phase 8: Layout Shell (COMPLETE)
- ✅ Phase 11: C3 Schema Migration (COMPLETE)
- ✅ Phase 12: Backend API (COMPLETE)
- 🚧 Phase 13: Frontend C3 Integration (IN PROGRESS — 6 plans)
- 📋 Phase 4: Leads & Appointments (NEW — this plan)

---

## Phase 13: Frontend C3 Integration (Existing Plans)

**Status**: 6 plans already defined in `.planning/phases/13-frontend/`
**Goal**: Update frontend components to use the new C3 schema (categories+products+vehicles)

**Plans**:
- 13-01: VehicleForm refactor for C3 API
- 13-02: DataGrid integration with vehicles API
- 13-03: Category dropdown and attribute rendering
- 13-04: Image upload with presigned URLs
- 13-05: Search and filters with real data
- 13-06: E2E verification (smoke tests)

**Note**: These plans are already defined. This document focuses on Phase 4 (new work).

---

## Phase 4: Leads & Appointments (New Plans)

### Phase 4 Overview

**Goal**: Implement lead capture from Facebook, lead lifecycle management, and appointment scheduling with dealers.

**User Stories**:
- LEAD-01: Facebook lead capture via webhook
- LEAD-02: Vendedor leads list view
- LEAD-03: Lead status update lifecycle
- LEAD-04: Appointment creation
- LEAD-05: Dealer email notifications
- LEAD-06: Manager team leads view
- LEAD-07: Manual lead creation
- LEAD-08: Lead data integrity

**Vertical Slicing Strategy**: Each plan delivers ONE complete user-facing feature with backend, frontend, and tests.

---

## Phase 4 Plans

### P-01: Lead Domain & Database Schema

**Wave**: 1 (Foundation)
**Depends on**: Nothing
**Files Modified**:
- `apps/api/src/prosell/domain/leads/__init__.py`
- `apps/api/src/prosell/domain/leads/entities.py`
- `apps/api/src/prosell/domain/leads/exceptions.py`
- `apps/api/src/prosell/domain/appointments/__init__.py`
- `apps/api/src/prosell/domain/appointments/entities.py`
- `apps/api/alembic/versions/xxxx_add_leads_appointments_tables.py`

**Objective**:
Implement core domain entities for leads and appointments following Clean Architecture principles. Define lead lifecycle state machine, appointment validation rules, and database schema with proper foreign keys and tenant isolation.

**Description**:
Create Lead and Appointment entities in the domain layer with business logic, state transitions, and validation rules. Implement LeadAuditLog for tracking status changes. Create Alembic migration for leads, appointments, and lead_audit_log tables with proper indexes and constraints.

**Subtasks**:
1. Create Lead entity with fields: buyer_name, buyer_email, buyer_phone, vehicle_id, listing_id, message, status, source, assigned_vendedor_id, tenant_id
2. Implement lead lifecycle state machine: new → contacted → qualified → appointment_set → lost
3. Add lead validation rules (email format, phone format, required fields)
4. Create LeadStatus enum and LeadStateTransitionException
5. Create Appointment entity with fields: lead_id, dealer_id, vehicle_id, scheduled_at, status, notes, tenant_id
6. Implement appointment time validation (business hours, conflict detection)
7. Create LeadAuditLog entity for tracking status changes
8. Write Alembic migration for all three tables with indexes and foreign keys
9. Add tenant_id indexes for multi-tenant isolation
10. Write unit tests for lead state transitions and appointment validation

**Acceptance Criteria**:
- [ ] Lead entity created with all fields and validation
- [ ] Lead lifecycle state machine implemented with 5 states
- [ ] Appointment entity created with time validation
- [ ] LeadAuditLog entity created for audit trail
- [ ] Alembic migration creates tables with proper schema
- [ ] All entities include tenant_id for multi-tenancy
- [ ] Unit tests cover state transitions and validation rules
- [ ] No dependencies on external frameworks in domain layer (Clean Architecture)

**Verification**:
```bash
cd apps/api && uv run pytest tests/unit/domain/test_lead_entity.py -v
cd apps/api && uv run pytest tests/unit/domain/test_appointment_entity.py -v
cd apps/api && uv run alembic upgrade head  # Apply migration
psql -c "\d leads"  # Verify table schema
```

---

### P-02: Lead Repository & Use Cases

**Wave**: 1 (Foundation)
**Depends on**: P-01
**Files Modified**:
- `apps/api/src/prosell/application/leads/__init__.py`
- `apps/api/src/prosell/application/leads/use_cases.py`
- `apps/api/src/prosell/infrastructure/repositories/lead_repository.py`
- `apps/api/tests/integration/test_lead_usecases.py`
- `apps/api/tests/integration/repositories/test_lead_repository.py`

**Objective**:
Implement repository pattern for lead CRUD operations and use cases for lead lifecycle management (create, update status, assign vendedor).

**Description**:
Create SQLAlchemy-based LeadRepository following the repository pattern. Implement CreateLeadUseCase, UpdateLeadStatusUseCase, AssignLeadToVendedorUseCase, and ListLeadsUseCase. Ensure tenant isolation in all queries. Implement lead assignment logic (round-robin or vehicle owner).

**Subtasks**:
1. Create ILeadRepository interface in domain layer
2. Implement LeadRepository with SQLAlchemy (async)
3. Add tenant_id filtering to all queries
4. Implement create() method with duplicate detection
5. Implement update_status() with audit log creation
6. Implement list_by_vendedor() with pagination
7. Implement list_by_manager() (all team leads)
8. Create CreateLeadUseCase with business logic
9. Create UpdateLeadStatusUseCase with state validation
10. Create AssignLeadToVendedorUseCase
11. Create ListLeadsUseCase with role-based filtering
12. Write integration tests for repository
13. Write integration tests for use cases

**Acceptance Criteria**:
- [ ] ILeadRepository interface defined in domain layer
- [ ] LeadRepository implements interface with async SQLAlchemy
- [ ] All queries filter by tenant_id
- [ ] CreateLeadUseCase creates lead and assigns vendedor
- [ ] UpdateLeadStatusUseCase validates state transitions
- [ ] UpdateLeadStatusUseCase creates audit log entry
- [ ] ListLeadsUseCase filters by user role (vendedor sees own, manager sees team)
- [ ] Integration tests cover CRUD operations
- [ ] Integration tests cover tenant isolation

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/test_lead_usecases.py -v
cd apps/api && uv run pytest tests/integration/repositories/test_lead_repository.py -v
```

---

### P-03: Appointment Repository & Use Cases

**Wave**: 1 (Foundation)
**Depends on**: P-01, P-02
**Files Modified**:
- `apps/api/src/prosell/application/appointments/__init__.py`
- `apps/api/src/prosell/application/appointments/use_cases.py`
- `apps/api/src/prosell/infrastructure/repositories/appointment_repository.py`
- `apps/api/tests/integration/test_appointment_usecases.py`
- `apps/api/tests/integration/repositories/test_appointment_repository.py`

**Objective**:
Implement repository and use cases for appointment management. Integrate with SendGrid for dealer email notifications.

**Description**:
Create IAppointmentRepository interface and SQLAlchemy implementation. Implement CreateAppointmentUseCase that validates appointment time, updates lead status to "appointment_set", and sends email notification to dealer. Implement ListAppointmentsUseCase with role-based filtering.

**Subtasks**:
1. Create IAppointmentRepository interface in domain layer
2. Implement AppointmentRepository with SQLAlchemy (async)
3. Add tenant_id filtering to all queries
4. Implement time conflict detection in repository
5. Create CreateAppointmentUseCase with validation
6. CreateAppointmentUseCase updates lead status to "appointment_set"
7. Wire SendGrid email service for dealer notifications
8. Create email template for appointment notifications
9. Implement error handling for SendGrid API failures
10. Create ListAppointmentsUseCase with role-based filtering
11. Write integration tests for repository
12. Write integration tests for use cases (with mocked SendGrid)

**Acceptance Criteria**:
- [ ] IAppointmentRepository interface defined
- [ ] AppointmentRepository implements interface
- [ ] CreateAppointmentUseCase validates appointment time
- [ ] CreateAppointmentUseCase updates lead status
- [ ] SendGrid email sent on appointment creation
- [ ] Email includes buyer name, contact, vehicle, date/time
- [ ] Error handling for SendGrid failures (retry/logging)
- [ ] ListAppointmentsUseCase filters by user role
- [ ] Integration tests cover happy path and error cases

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/test_appointment_usecases.py -v
# Check email logs for SendGrid calls
```

---

### P-04: Facebook Lead Webhook Endpoint

**Wave**: 2 (Integration)
**Depends on**: P-02
**Files Modified**:
- `apps/api/src/prosell/infrastructure/api/routers/lead_router.py`
- `apps/api/src/prosell/infrastructure/external/facebook/webhook_handler.py`
- `apps/api/tests/integration/test_facebook_webhook.py`
- `tests/contract/openapi/test_leads_schema.py`

**Objective**:
Implement Facebook webhook endpoint to receive lead messages from Facebook Marketplace listings.

**Description**:
Create POST /api/v1/webhooks/facebook endpoint that verifies webhook signature (X-Hub-Signature), extracts lead data from Facebook payload, queries vehicle by listing_id, checks for duplicates, and creates lead via CreateLeadUseCase. Implement polling fallback for reliability.

**Subtasks**:
1. Create webhook endpoint in FastAPI router
2. Implement X-Hub-Signature verification
3. Parse Facebook webhook payload (leadgen_id, listing_id, sender_id, message)
4. Query vehicle by facebook_listing_id from publications table
5. Query Facebook Graph API for buyer profile (name, profile_url)
6. Check for duplicate lead (same buyer + vehicle within 24 hours)
7. Call CreateLeadUseCase with extracted data
8. Return 200 OK to Facebook (quick response)
9. Add logging for webhook events
10. Implement polling fallback (every 10 minutes) as backup
11. Write integration test for webhook endpoint
12. Write contract test for OpenAPI schema

**Acceptance Criteria**:
- [ ] Webhook endpoint exists at /api/v1/webhooks/facebook
- [ ] Webhook signature verification implemented
- [ ] Lead created from Facebook payload
- [ ] Duplicate detection prevents duplicate leads
- [ ] Webhook returns 200 OK within 1 second
- [ ] Polling fallback implemented (Taskiq task)
- [ ] Integration tests cover webhook payload
- [ ] Contract test verifies OpenAPI schema
- [ ] Security: webhook signature required (403 if missing/invalid)

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/test_facebook_webhook.py -v
# Test with Facebook webhook payload
curl -X POST http://localhost:8000/api/v1/webhooks/facebook -d @test_payload.json
```

---

### P-05: Lead API Endpoints

**Wave**: 2 (Integration)
**Depends on**: P-02
**Files Modified**:
- `apps/api/src/prosell/infrastructure/api/routers/lead_router.py`
- `apps/api/src/prosell/application/dto/lead.py`
- `apps/api/tests/integration/api/test_lead_api.py`
- `tests/contract/openapi/test_leads_schema.py`

**Objective**:
Implement REST API endpoints for lead CRUD operations: list leads, get lead details, update lead status, create manual lead.

**Description**:
Create FastAPI router with endpoints: GET /api/v1/leads (list), POST /api/v1/leads (manual create), GET /api/v1/leads/{id} (details), PUT /api/v1/leads/{id}/status (update status). Implement role-based access control (vendedor sees own leads, manager sees team leads). Create DTOs for request/response.

**Subtasks**:
1. Create LeadResponse DTO with all lead fields
2. Create CreateLeadRequest DTO for manual entry
3. Create UpdateLeadStatusRequest DTO with reason field
4. Create GET /api/v1/leads endpoint with pagination
5. Add role-based filtering (vendedor vs manager)
6. Create POST /api/v1/leads for manual lead creation
7. Create GET /api/v1/leads/{id} for lead details
8. Create PUT /api/v1/leads/{id}/status for status updates
9. Add authentication/authorization middleware
10. Add tenant_id filtering to all endpoints
11. Write integration tests for all endpoints
12. Write contract tests for DTO schemas

**Acceptance Criteria**:
- [ ] GET /api/v1/leads returns paginated lead list
- [ ] Vendedor sees only own leads, manager sees team leads
- [ ] POST /api/v1/leads creates manual lead
- [ ] PUT /api/v1/leads/{id}/status updates lead status
- [ ] Status update creates audit log entry
- [ ] All endpoints require authentication (JWT)
- [ ] All endpoints filter by tenant_id
- [ ] Integration tests cover all endpoints
- [ ] Contract tests verify schema compliance

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/api/test_lead_api.py -v
cd tests/contract && uv run pytest openapi/test_leads_schema.py -v
```

---

### P-06: Appointment API Endpoints

**Wave**: 2 (Integration)
**Depends on**: P-03
**Files Modified**:
- `apps/api/src/prosell/infrastructure/api/routers/appointment_router.py`
- `apps/api/src/prosell/application/dto/appointment.py`
- `apps/api/tests/integration/api/test_appointment_api.py`
- `tests/contract/openapi/test_appointments_schema.py`

**Objective**:
Implement REST API endpoints for appointment management: create appointment, list appointments, update appointment status.

**Description**:
Create FastAPI router with endpoints: POST /api/v1/appointments (create), GET /api/v1/appointments (list), GET /api/v1/appointments/{id} (details), PUT /api/v1/appointments/{id}/status (update). Implement role-based access control and tenant isolation.

**Subtasks**:
1. Create AppointmentResponse DTO
2. Create CreateAppointmentRequest DTO
3. Create POST /api/v1/appointments endpoint
4. Implement time validation (business hours, conflicts)
5. Create GET /api/v1/appointments with filtering
6. Add role-based filtering (dealer sees own, vendedor sees assigned)
7. Create PUT /api/v1/appointments/{id}/status (cancel, complete)
8. Add authentication/authorization middleware
9. Write integration tests for all endpoints
10. Write contract tests for DTO schemas

**Acceptance Criteria**:
- [ ] POST /api/v1/appointments creates appointment
- [ ] Appointment triggers lead status update to "appointment_set"
- [ ] Appointment triggers SendGrid email to dealer
- [ ] GET /api/v1/appointments returns filtered list
- [ ] Role-based filtering works correctly
- [ ] All endpoints require authentication
- [ ] Integration tests cover all endpoints
- [ ] Contract tests verify schema compliance

**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/api/test_appointment_api.py -v
cd tests/contract && uv run pytest openapi/test_appointments_schema.py -v
```

---

### P-07: Frontend Lead Types & API Clients

**Wave**: 3 (Frontend)
**Depends on**: P-05
**Files Modified**:
- `apps/web/src/types/lead.ts`
- `apps/web/src/types/appointment.ts`
- `apps/web/src/lib/api/leads.ts`
- `apps/web/src/lib/api/appointments.ts`
- `apps/web/tests/unit/api/leads.test.ts`

**Objective**:
Create TypeScript types and TanStack Query hooks for lead and appointment API clients.

**Description**:
Define TypeScript interfaces for Lead, Appointment, and related DTOs. Implement useLeads, useLead, useCreateLead, useUpdateLeadStatus hooks using TanStack Query. Implement useAppointments, useCreateAppointment hooks. Add optimistic updates and toast notifications.

**Subtasks**:
1. Create Lead interface (id, buyer_name, status, vehicle, etc.)
2. Create Appointment interface
3. Create CreateLeadRequest, UpdateLeadStatusRequest interfaces
4. Create useLeads hook with queryKey ['leads']
5. Add role-based query parameters (vendedor vs manager)
6. Create useLead hook for single lead details
7. Create useCreateLead mutation hook
8. Create useUpdateLeadStatus mutation hook
9. Add toast notifications for success/error
10. Implement useAppointments hook
11. Implement useCreateAppointment mutation hook
12. Add query invalidation for related queries
13. Write unit tests for hooks (mocked fetch)

**Acceptance Criteria**:
- [ ] TypeScript types defined for all entities
- [ ] useLeads fetches from /api/v1/leads
- [ ] useLeads filters by user role
- [ ] useCreateLead creates manual lead
- [ ] useUpdateLeadStatus updates status
- [ ] Mutations show toast notifications
- [ ] Mutations invalidate related queries
- [ ] Unit tests cover hooks (with mocked fetch)

**Verification**:
```bash
cd apps/web && pnpm test src/lib/api/leads.test.ts
```

---

### P-08: Frontend Leads List View

**Wave**: 3 (Frontend)
**Depends on**: P-07
**Files Modified**:
- `apps/web/src/app/(role)/vendedor/leads/page.tsx`
- `apps/web/src/components/leads/LeadList.tsx`
- `apps/web/src/components/leads/LeadListItem.tsx`
- `apps/web/src/components/leads/LeadStatusBadge.tsx`
- `tests/e2e/specs/leads.spec.ts`

**Objective**:
Implement leads list page for vendedores with filtering, search, and status updates.

**Description**:
Create leads list page using DataGrid pattern (TanStack Virtual if 100+ leads). Display lead information (buyer name, vehicle, message, status, timestamp). Add status badge component. Implement status update dropdown. Add search/filter functionality.

**Subtasks**:
1. Create leads list page at /vendedor/leads
2. Implement LeadList component with DataGrid
3. Create LeadListItem component (one row per lead)
4. Create LeadStatusBadge component (5 states with colors)
5. Add status dropdown for quick updates
6. Implement search by buyer name, vehicle
7. Add filter by status (new, contacted, qualified, etc.)
8. Add highlight for unread leads
9. Implement pagination or infinite scroll
10. Add real-time updates (polling every 30s)
11. Write E2E tests for leads list

**Acceptance Criteria**:
- [ ] Vendedor can view assigned leads
- [ ] Each lead shows buyer name, vehicle, status, timestamp
- [ ] Unread leads are highlighted
- [ ] Status update dropdown works
- [ ] Search filters by buyer name/vehicle
- [ ] Status filter shows only selected status leads
- [ ] Real-time updates every 30 seconds
- [ ] E2E tests cover leads list view

**Verification**:
```bash
cd tests/e2e && pnpm test specs/leads.spec.ts
```

---

### P-09: Frontend Lead Details & Appointment Form

**Wave**: 3 (Frontend)
**Depends on**: P-07
**Files Modified**:
- `apps/web/src/app/(role)/vendedor/leads/[id]/page.tsx`
- `apps/web/src/components/leads/LeadDetails.tsx`
- `apps/web/src/components/leads/AppointmentForm.tsx`
- `apps/web/src/components/leads/LeadHistory.tsx`
- `tests/e2e/specs/appointments.spec.ts`

**Objective**:
Implement lead details page with appointment creation form and lead history.

**Description**:
Create lead details page showing full lead information, appointment history, and audit log. Implement AppointmentForm modal with date-time picker, dealer selection, and notes. Add "Agendar Cita" button that opens form. Show lead status lifecycle visualization.

**Subtasks**:
1. Create lead details page at /vendedor/leads/{id}
2. Implement LeadDetails component
3. Show buyer contact info, vehicle details, message
4. Add "Agendar Cita" button
5. Create AppointmentForm modal
6. Add date-time picker (shadcn/ui DatePicker)
7. Pre-populate form with lead, vehicle, dealer
8. Implement time validation (business hours)
9. Show appointment conflicts warning
10. Create LeadHistory component (audit log)
11. Implement status update dropdown
12. Write E2E tests for appointment creation

**Acceptance Criteria**:
- [ ] Lead details page shows all lead information
- [ ] "Agendar Cita" button opens form
- [ ] Appointment form pre-populates lead/vehicle/dealer
- [ ] Date-time picker works
- [ ] Form validates required fields
- [ ] Form submission creates appointment
- [ ] Lead status updates to "appointment_set"
- [ ] Lead history shows audit log
- [ ] E2E tests cover appointment creation flow

**Verification**:
```bash
cd tests/e2e && pnpm test specs/appointments.spec.ts
```

---

### P-10: Frontend Manager Team Leads View

**Wave**: 4 (Manager Features)
**Depends on**: P-08
**Files Modified**:
- `apps/web/src/app/(role)/manager/team/leads/page.tsx`
- `apps/web/src/components/leads/TeamLeadList.tsx`
- `apps/web/src/components/leads/LeadReassignModal.tsx`
- `tests/e2e/specs/manager-leads.spec.ts`

**Objective**:
Implement manager view for team leads with vendedor filtering and lead reassignment.

**Description**:
Create manager team leads page showing all leads across team members. Add filter by vendedor dropdown. Implement lead reassignment modal to transfer leads between vendedores. Add export to CSV functionality. Show team performance metrics (leads per vendedor, conversion rates).

**Subtasks**:
1. Create manager team leads page at /manager/team/leads
2. Implement TeamLeadList component
3. Add filter by vendedor dropdown
4. Show all leads across team (not just assigned to manager)
5. Create LeadReassignModal component
6. Implement reassign lead mutation
7. Add export to CSV button
8. Show team metrics card (leads per vendedor)
9. Write E2E tests for manager view

**Acceptance Criteria**:
- [ ] Manager can view all team leads
- [ ] Filter by vendedor works
- [ ] Reassign modal opens from lead actions
- [ ] Reassign mutation transfers lead to new vendedor
- [ ] Export to CSV downloads file
- [ ] Team metrics show leads per vendedor
- [ ] E2E tests cover manager view

**Verification**:
```bash
cd tests/e2e && pnpm test specs/manager-leads.spec.ts
```

---

### P-11: Frontend Dealer Calendar View

**Wave**: 4 (Dealer Features)
**Depends on**: P-09
**Files Modified**:
- `apps/web/src/app/(role)/dealer/appointments/page.tsx`
- `apps/web/src/components/appointments/CalendarView.tsx`
- `apps/web/src/components/appointments/AppointmentCard.tsx`
- `tests/e2e/specs/dealer-calendar.spec.ts`

**Objective**:
Implement dealer calendar view showing upcoming appointments with details.

**Description**:
Create dealer appointments page with calendar view (day/week/month). Show appointment cards with buyer name, vehicle, scheduled time. Implement appointment status update (confirm, cancel). Add appointment details modal. Show today's appointments count.

**Subtasks**:
1. Create dealer appointments page at /dealer/appointments
2. Implement CalendarView component (use calendar library)
3. Show day/week/month toggle
4. Create AppointmentCard component
5. Show buyer name, vehicle, time, status
6. Add confirm/cancel buttons
7. Implement status update mutation
8. Show appointment details modal
9. Add today's appointments badge
10. Write E2E tests for dealer calendar

**Acceptance Criteria**:
- [ ] Dealer can view upcoming appointments
- [ ] Calendar view shows day/week/month
- [ ] Appointment cards show buyer info
- [ ] Confirm/cancel buttons work
- [ ] Status update sends email notification
- [ ] Appointment details modal shows full info
- [ ] E2E tests cover dealer calendar

**Verification**:
```bash
cd tests/e2e && pnpm test specs/dealer-calendar.spec.ts
```

---

### P-12: E2E Verification & Smoke Tests

**Wave**: 5 (Verification)
**Depends on**: P-01 through P-11
**Files Modified**:
- `tests/e2e/smoke.spec.ts` (UPDATE)
- `tests/e2e/specs/leads.spec.ts`
- `tests/e2e/specs/appointments.spec.ts`
- `tests/e2e/specs/facebook-webhook.spec.ts`

**Objective**:
Implement comprehensive E2E test suite for lead and appointment flows. Update smoke tests to include critical lead paths.

**Description**:
Create E2E tests for end-to-end lead lifecycle: Facebook webhook → lead appears in vendedor list → vendedor updates status → vendedor creates appointment → dealer receives email. Test manager view for reassigning leads. Test dealer calendar view. Update smoke test suite to include 3-5 critical lead tests.

**Subtasks**:
1. Create E2E test for Facebook webhook lead capture
2. Create E2E test for vendedor leads list view
3. Create E2E test for lead status update
4. Create E2E test for appointment creation
5. Create E2E test for dealer email verification (mocked)
6. Create E2E test for manager lead reassignment
7. Create E2E test for dealer calendar view
8. Update smoke.spec.ts with 5 critical lead tests
9. Verify all E2E tests pass
10. Measure test execution time (target: < 5 minutes)

**Acceptance Criteria**:
- [ ] Facebook webhook test creates lead
- [ ] Vendedor can view and update lead
- [ ] Appointment creation flow works end-to-end
- [ ] Dealer email notification sent (mocked)
- [ ] Manager can reassign leads
- [ ] Dealer can view appointments
- [ ] Smoke tests pass (20+ tests total)
- [ ] All E2E tests pass
- [ ] Test execution time < 5 minutes

**Verification**:
```bash
cd tests/e2e && pnpm test
# Check smoke test results
cd tests/e2e && pnpm test smoke.spec.ts
```

---

## Dependency Graph

```
P-01 (Domain)
  ↓
P-02 (Lead Repository & Use Cases) ← P-03 (Appointment Repository)
  ↓                              ↓
P-04 (Facebook Webhook) ← P-05 (Lead API) ← P-06 (Appointment API)
                                  ↓
                            P-07 (Frontend Types & Hooks)
                                  ↓
                         P-08 (Leads List) ← P-09 (Lead Details & Appointments)
                                  ↓
                     P-10 (Manager View) ← P-11 (Dealer Calendar)
                                  ↓
                            P-12 (E2E Verification)
```

**Parallel Execution Opportunities**:
- P-02 and P-03 can run in parallel (both depend on P-01)
- P-04, P-05, P-06 can run in parallel (all depend on P-02)
- P-08 and P-09 can run in parallel (both depend on P-07)
- P-10 and P-11 can run in parallel (both depend on P-08/P-09)

---

## Execution Order (Recommended)

**Wave 1 (Foundation)**:
1. P-01: Lead Domain & Database Schema (3-4 hours)
2. P-02: Lead Repository & Use Cases (3-4 hours) — parallel with P-03
3. P-03: Appointment Repository & Use Cases (3-4 hours) — parallel with P-02

**Wave 2 (Integration)**:
4. P-04: Facebook Lead Webhook Endpoint (2-3 hours)
5. P-05: Lead API Endpoints (2-3 hours) — parallel with P-06
6. P-06: Appointment API Endpoints (2-3 hours) — parallel with P-05

**Wave 3 (Frontend Core)**:
7. P-07: Frontend Lead Types & API Clients (2 hours)
8. P-08: Frontend Leads List View (3-4 hours) — parallel with P-09
9. P-09: Frontend Lead Details & Appointment Form (3-4 hours) — parallel with P-08

**Wave 4 (Frontend Extended)**:
10. P-10: Frontend Manager Team Leads View (2-3 hours) — parallel with P-11
11. P-11: Frontend Dealer Calendar View (2-3 hours) — parallel with P-10

**Wave 5 (Verification)**:
12. P-12: E2E Verification & Smoke Tests (3-4 hours)

**Total Estimated Time**: 35-45 hours (5-6 days of focused development)

---

## Checkpoints

### Checkpoint 1: Foundation Complete (After P-01, P-02, P-03)
**Verification**:
```bash
cd apps/api && uv run pytest tests/unit/domain/test_lead_entity.py -v
cd apps/api && uv run pytest tests/unit/domain/test_appointment_entity.py -v
cd apps/api && uv run pytest tests/integration/test_lead_usecases.py -v
cd apps/api && uv run pytest tests/integration/test_appointment_usecases.py -v
psql -c "\d leads appointments lead_audit_log"
```

### Checkpoint 2: API Complete (After P-04, P-05, P-06)
**Verification**:
```bash
cd apps/api && uv run pytest tests/integration/test_facebook_webhook.py -v
cd apps/api && uv run pytest tests/integration/api/test_lead_api.py -v
cd apps/api && uv run pytest tests/integration/api/test_appointment_api.py -v
curl -X POST http://localhost:8000/api/v1/webhooks/facebook -d @test_payload.json
```

### Checkpoint 3: Frontend Complete (After P-07, P-08, P-09)
**Verification**:
```bash
cd apps/web && pnpm test src/lib/api/leads.test.ts
cd tests/e2e && pnpm test specs/leads.spec.ts
cd tests/e2e && pnpm test specs/appointments.spec.ts
```

### Checkpoint 4: Full Integration Complete (After P-10, P-11, P-12)
**Verification**:
```bash
cd tests/e2e && pnpm test  # All E2E tests
cd tests/e2e && pnpm test smoke.spec.ts  # Smoke tests
```

---

## Success Criteria

### Phase 4 Complete
- [ ] All 12 plans (P-01 through P-12) implemented
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Smoke test suite includes lead critical paths
- [ ] Manual testing confirms end-to-end flow works

### MVP Complete
- [ ] Phase 13 complete (6 plans executed)
- [ ] Phase 4 complete (12 plans executed)
- [ ] Vendedor can publish vehicle → capture lead → create appointment
- [ ] Deployed to staging environment
- [ ] Pilot dealer successfully uses system for 1 week

---

## Notes

- **Phase 13 plans are already defined** in `.planning/phases/13-frontend/` — execute those first
- **Phase 4 plans are defined in this document** — execute after Phase 13
- **Parallel execution** is encouraged where dependency graph allows
- **Test-driven development** is required for all backend code
- **E2E tests** are mandatory for all user-facing features
- **SendGrid API key** must be configured before P-03 execution
- **Facebook webhook** must be registered before P-04 testing

---

**Document Status**: Active — Ready for execution
**Next Action**: Execute Phase 13 plans first, then Phase 4 plans P-01 through P-12
**Owner**: Engineering Team
**Stakeholders**: Product, QA, DevOps
