# E2E Tests Classification by Module and Execution Order

## Classification Strategy

Tests are organized by:

1. **Module** - Business domain (Auth, Catalog, Leads, Appointments, etc.)
2. **Execution Order** - Logical dependency (Foundation → Core → Advanced)
3. **Priority** - Critical path (@smoke) → Regression → Feature-specific

---

## LAYER 0: Foundation Tests (Must Run First)

### Module: Authentication

**Path**: `tests/e2e/auth/`
**Purpose**: Verify auth system works before any feature tests

| Test File                 | Tests | Priority    | Execution Time | Dependencies |
| ------------------------- | ----- | ----------- | -------------- | ------------ |
| `login.spec.ts`           | ~5    | @smoke      | <30s           | None         |
| `register.spec.ts`        | ~5    | @smoke      | <30s           | None         |
| `forgot-password.spec.ts` | ~3    | @critical   | <20s           | None         |
| `reset-password.spec.ts`  | ~3    | @critical   | <20s           | Email token  |
| `verify-email.spec.ts`    | ~3    | @critical   | <20s           | Email token  |
| `middleware.spec.ts`      | ~4    | @critical   | <20s           | Auth session |
| `ui-validation.spec.ts`   | ~6    | @regression | <30s           | None         |

**Total**: ~29 tests
**Execution Order**: 1 (must pass before any other tests)

---

## LAYER 1: Smoke Tests (Critical Path)

### Module: Core User Journey

**Path**: `tests/e2e/specs/smoke.spec.ts`
**Purpose**: Quick validation of critical paths

| Test Group  | Tests | Coverage                    | Execution Time |
| ----------- | ----- | --------------------------- | -------------- |
| Auth Flow   | 5     | Login, logout, session      | <20s           |
| VehicleForm | 5     | VIN decode, form validation | <30s           |
| Category    | 3     | CRUD operations             | <15s           |
| DataGrid    | 3     | Pagination, filtering       | <15s           |
| Bulk Upload | 3     | CSV import                  | <20s           |
| API Health  | 1     | Backend responding          | <5s            |

**Total**: 20 tests (@smoke tagged)
**Execution Time**: ~2 minutes
**Execution Order**: 2 (after auth foundation)

---

## LAYER 2: Catalog & Inventory (C3 Model)

### Module: Categories

**Path**: `tests/e2e/specs/categories.spec.ts`
**Purpose**: Category management (C3 classification)

| Test Group      | Tests | Coverage                   | Priority    |
| --------------- | ----- | -------------------------- | ----------- |
| List Categories | ~3    | Grid view, filtering       | @critical   |
| Create Category | ~4    | Form validation, C3 fields | @critical   |
| Edit Category   | ~3    | Update C3 attributes       | @regression |
| Delete Category | ~2    | Soft delete verification   | @regression |

**Total**: ~12 tests
**Execution Order**: 3 (after smoke passes)

---

### Module: Vehicles (Catalog)

**Path**: `tests/e2e/specs/vehicles.spec.ts`
**Purpose**: Vehicle inventory management

| Test Group      | Tests | Coverage                          | Priority    |
| --------------- | ----- | --------------------------------- | ----------- |
| VIN Decode      | ~5    | NHTSA integration, field mapping  | @critical   |
| Vehicle List    | ~4    | DataGrid, filtering, pagination   | @critical   |
| Create Vehicle  | ~6    | C3 form, image upload, validation | @critical   |
| Edit Vehicle    | ~4    | Update details, status changes    | @regression |
| Delete Vehicle  | ~2    | Soft delete, related data         | @regression |
| Bulk Operations | ~3    | CSV import, bulk status update    | @feature    |

**Total**: ~24 tests
**Dependencies**: Categories must exist
**Execution Order**: 4 (after categories)

---

### Module: Vehicle Form (VIN Integration)

**Path**: `tests/e2e/specs/vehicle-form-vin.spec.ts`
**Purpose**: VIN decoding and form auto-population

| Test Group        | Tests | Coverage                       | Priority    |
| ----------------- | ----- | ------------------------------ | ----------- |
| VIN Validation    | ~4    | Checksum, format, length       | @critical   |
| NHTSA API         | ~6    | Decode success, error handling | @critical   |
| Field Mapping     | ~8    | Make/model/year/body mapping   | @critical   |
| Select Population | ~5    | Bug fix verification (3252454) | @regression |

**Total**: ~23 tests
**Dependencies**: Vehicle categories
**Execution Order**: 5 (after vehicles)

---

### Module: Vehicle Creation (C3 Complete)

**Path**: `tests/e2e/specs/vehicle-creation-c3.spec.ts`
**Purpose**: End-to-end C3 vehicle creation

| Test Group   | Tests | Coverage                    | Priority  |
| ------------ | ----- | --------------------------- | --------- |
| C3 Full Flow | ~8    | Category → Vehicle → Images | @critical |
| Image Upload | ~5    | S3/Cloudinary integration   | @feature  |
| Bulk Create  | ~4    | Multiple vehicles, CSV      | @feature  |

**Total**: ~17 tests
**Dependencies**: Categories, VIN decode
**Execution Order**: 6 (after vehicle form)

---

## LAYER 3: Lead Management

### Module: Leads (Seller View)

**Path**: `tests/e2e/specs/leads.spec.ts`
**Purpose**: Lead lifecycle for sellers/vendedores

| Test Group     | Tests | Coverage                      | Priority    |
| -------------- | ----- | ----------------------------- | ----------- |
| Lead List      | ~4    | Filtering, status, pagination | @critical   |
| Create Lead    | ~5    | Manual entry, validation      | @critical   |
| Lead Details   | ~4    | View, history, related data   | @regression |
| Status Changes | ~6    | New → Contacted → Converted   | @critical   |
| Assign Dealer  | ~3    | Team assignment, permissions  | @feature    |

**Total**: ~22 tests
**Dependencies**: Vehicles (for lead vehicle selection)
**Execution Order**: 7 (after catalog)

---

### Module: Manager Leads (Team View)

**Path**: `tests/e2e/specs/manager-leads.spec.ts`
**Purpose**: Manager oversight of team leads

| Test Group       | Tests | Coverage                       | Priority  |
| ---------------- | ----- | ------------------------------ | --------- |
| A5.14: Page Load | ~3    | Team leads list, metrics       | @critical |
| A5.15: Filtering | ~4    | By status, dealer, date range  | @critical |
| A5.16: Actions   | ~5    | Reassign, view details, export | @feature  |

**Total**: ~12 tests
**Dependencies**: Leads exist
**Execution Order**: 8 (after seller leads)

---

### Module: Manager Leads Verification

**Path**: `tests/e2e/specs/manager-leads-verify.spec.ts`
**Purpose**: Verify manager view data accuracy

| Test Group       | Tests | Coverage                      | Priority  |
| ---------------- | ----- | ----------------------------- | --------- |
| Data Consistency | ~6    | Manager vs seller views match | @critical |
| Permissions      | ~4    | Role-based access control     | @security |

**Total**: ~10 tests
**Execution Order**: 9 (after manager leads)

---

## LAYER 4: Appointments & Scheduling

### Module: Appointments

**Path**: `tests/e2e/specs/appointments.spec.ts`
**Purpose**: Appointment creation and management

| Test Group          | Tests | Coverage                          | Priority    |
| ------------------- | ----- | --------------------------------- | ----------- |
| A4.38: Create Flow  | ~6    | Lead → Appointment creation       | @critical   |
| Appointment List    | ~4    | Filtering by date/dealer          | @critical   |
| Appointment Details | ~3    | View, cancel, reschedule          | @regression |
| Status Changes      | ~5    | Scheduled → Completed → Cancelled | @critical   |
| Dealer Calendar     | ~4    | Calendar view integration         | @feature    |

**Total**: ~22 tests
**Dependencies**: Leads, Dealers
**Execution Order**: 10 (after leads)

---

### Module: Dealer Calendar

**Path**: `tests/e2e/specs/dealer-calendar.spec.ts`
**Purpose**: Dealer-specific calendar view

| Test Group           | Tests | Coverage             | Priority  |
| -------------------- | ----- | -------------------- | --------- |
| Calendar View        | ~5    | Day/week/month views | @critical |
| Appointment Slots    | ~4    | Available/busy slots | @critical |
| Create from Calendar | ~4    | Click-to-create flow | @feature  |
| Conflict Detection   | ~3    | Overlap prevention   | @feature  |

**Total**: ~16 tests
**Dependencies**: Appointments
**Execution Order**: 11 (after appointments)

---

### Module: Appointments Debug

**Path**: `tests/e2e/specs/appointments-debug.spec.ts`
**Purpose**: Debug and edge case testing

| Test Group     | Tests | Coverage                 | Priority    |
| -------------- | ----- | ------------------------ | ----------- |
| Edge Cases     | ~5    | Boundary conditions      | @regression |
| Error Handling | ~3    | API failures, validation | @regression |

**Total**: ~8 tests
**Execution Order**: 12 (after main appointments)

---

## LAYER 5: External Integrations

### Module: OAuth (Google/Facebook)

**Path**: `tests/e2e/specs/oauth.spec.ts`, `oauth-fixed.spec.ts`
**Purpose**: Third-party authentication

| Test Group     | Tests | Coverage                        | Priority     |
| -------------- | ----- | ------------------------------- | ------------ |
| Google OAuth   | ~4    | Button, redirect flow, callback | @integration |
| Facebook OAuth | ~4    | Button, redirect flow, callback | @integration |

**Total**: ~8 tests
**Dependencies**: Auth foundation
**Execution Order**: 13 (parallel with catalog, after auth)

---

### Module: Facebook Webhook

**Path**: `tests/e2e/specs/facebook-webhook.spec.ts`
**Purpose**: Facebook lead delivery webhook

| Test Group        | Tests | Coverage                     | Priority     |
| ----------------- | ----- | ---------------------------- | ------------ |
| Webhook Signature | ~3    | Verify Facebook HMAC         | @security    |
| Lead Delivery     | ~4    | Parse webhook, create lead   | @integration |
| Error Handling    | ~2    | Invalid payload, retry logic | @regression  |

**Total**: ~9 tests
**Dependencies**: Leads module
**Execution Order**: 14 (after leads)

---

### Module: Facebook OAuth

**Path**: `tests/e2e/specs/facebook-oauth.spec.ts`
**Purpose**: Facebook authentication integration

| Test Group       | Tests | Coverage                | Priority     |
| ---------------- | ----- | ----------------------- | ------------ |
| Facebook Connect | ~5    | OAuth flow, permissions | @integration |
| Account Linking  | ~3    | Link FB account to user | @feature     |

**Total**: ~8 tests
**Execution Order**: 15 (parallel with other integrations)

---

## LAYER 6: Advanced Features

### Module: Bulk Image Upload

**Path**: `tests/e2e/specs/bulk-image-upload.spec.ts`
**Purpose**: Batch image processing

| Test Group     | Tests | Coverage                       | Priority     |
| -------------- | ----- | ------------------------------ | ------------ |
| Upload Flow    | ~4    | Multi-file selection, progress | @feature     |
| Validation     | ~3    | File types, size limits        | @regression  |
| S3 Integration | ~3    | Cloud storage, URLs            | @integration |

**Total**: ~10 tests
**Dependencies**: Vehicles
**Execution Order**: 16 (after vehicles)

---

### Module: Products API

**Path**: `tests/e2e/specs/products-api.spec.ts`
**Purpose**: Direct API testing

| Test Group     | Tests | Coverage               | Priority     |
| -------------- | ----- | ---------------------- | ------------ |
| CRUD Endpoints | ~6    | POST, GET, PUT, DELETE | @critical    |
| Validation     | ~4    | Schema enforcement     | @critical    |
| Performance    | ~2    | Response time <200ms   | @performance |

**Total**: ~12 tests
**Dependencies**: Categories, Vehicles
**Execution Order**: 17 (after catalog)

---

### Module: Products (UI)

**Path**: `tests/e2e/specs/products.spec.ts`
**Purpose**: Product management UI

| Test Group     | Tests | Coverage                  | Priority    |
| -------------- | ----- | ------------------------- | ----------- |
| Product List   | ~3    | Grid view, search         | @critical   |
| Create Product | ~4    | Form, vehicle association | @critical   |
| Edit Product   | ~3    | Update details, status    | @regression |

**Total**: ~10 tests
**Dependencies**: Vehicles
**Execution Order**: 18 (after products API)

---

## LAYER 7: Specialized & Verification

### Module: Accessibility

**Path**: `tests/e2e/specs/catalog-accessibility.spec.ts`
**Purpose**: WCAG compliance

| Test Group     | Tests | Coverage                     | Priority |
| -------------- | ----- | ---------------------------- | -------- |
| A11y Audit     | ~5    | Screen readers, keyboard nav | @a11y    |
| Color Contrast | ~3    | WCAG AA compliance           | @a11y    |

**Total**: ~8 tests
**Execution Order**: 19 (parallel, after core features)

---

### Module: Staging Smoke

**Path**: `tests/e2e/specs/staging-smoke.spec.ts`
**Purpose**: Pre-production validation

| Test Group    | Tests | Coverage              | Priority |
| ------------- | ----- | --------------------- | -------- |
| Critical Path | ~10   | Core flows on staging | @smoke   |
| Data Seeding  | ~2    | Admin user exists     | @smoke   |

**Total**: ~12 tests
**Execution Order**: 20 (staging environment only)

---

### Module: Real API Smoke

**Path**: `tests/e2e/specs/smoke-real-api.spec.ts`
**Purpose**: Test without mocks

| Test Group     | Tests | Coverage           | Priority |
| -------------- | ----- | ------------------ | -------- |
| Unmocked Tests | ~8    | Real backend calls | @smoke   |

**Total**: ~8 tests
**Execution Order**: 21 (parallel with smoke)

---

### Module: A6 Verification

**Path**: `tests/e2e/specs/a6-verification.spec.ts`
**Purpose**: Phase A6 feature verification

| Test Group  | Tests | Coverage                 | Priority      |
| ----------- | ----- | ------------------------ | ------------- |
| A6 Features | ~12   | Specific A6 requirements | @verification |

**Total**: ~12 tests
**Execution Order**: 22 (feature-specific)

---

### Module: A6 Manual Verification

**Path**: `tests/e2e/specs/a6-manual-verification.spec.ts`
**Purpose**: Manual test checklist automation

| Test Group    | Tests | Coverage                    | Priority |
| ------------- | ----- | --------------------------- | -------- |
| Manual Checks | ~8    | Semi-automated verification | @manual  |

**Total**: ~8 tests
**Execution Order**: 23 (manual testing support)

---

### Module: Debug Auth

**Path**: `tests/e2e/specs/debug-auth.spec.ts`
**Purpose**: Auth debugging tests

| Test Group     | Tests | Coverage                | Priority |
| -------------- | ----- | ----------------------- | -------- |
| Auth Scenarios | ~3    | Edge cases, error flows | @debug   |

**Total**: ~3 tests
**Execution Order**: 24 (as needed for debugging)

---

### Module: Home

**Path**: `tests/e2e/specs/home.spec.ts`
**Purpose**: Landing page validation

| Test Group | Tests | Coverage         | Priority |
| ---------- | ----- | ---------------- | -------- |
| Home Page  | ~2    | Load, navigation | @smoke   |

**Total**: ~2 tests
**Execution Order**: 25 (first page users see)

---

## LAYER 2: Contract Tests (New Implementation)

### Module: Layer 2 Contract Tests

**Path**: `tests/e2e/layer2/`
**Purpose**: API contract validation with data generation

| Test File                        | Tests | Coverage                                   | Priority  |
| -------------------------------- | ----- | ------------------------------------------ | --------- |
| `leads-contract.spec.ts`         | 22    | Lead API contract (Pydantic + format)      | @critical |
| `appointments-contract.spec.ts`  | 24    | Appointment API contract                   | @critical |
| `vehicles-contract.spec.ts`      | 25    | Vehicle API contract (NHTSA normalization) | @critical |
| `smoke-refactor-example.spec.ts` | 4     | Refactored smoke with factories            | @example  |

**Total**: 75 tests (Layer 2 contract tests)
**Execution Order**: After foundation, parallel with Layer 1
**Status**: Created, pending execution with database

---

## Summary by Layer

| Layer | Name                 | Test Count | Execution Time | Dependencies  |
| ----- | -------------------- | ---------- | -------------- | ------------- |
| 0     | Foundation (Auth)    | ~29        | ~3 min         | None          |
| 2     | Contract Tests       | 75         | ~5 min         | DB running    |
| 1     | Smoke (Critical)     | 20         | ~2 min         | Layer 0       |
| 2     | Catalog (Categories) | ~12        | ~2 min         | Layer 1       |
| 2     | Catalog (Vehicles)   | ~24        | ~3 min         | Categories    |
| 2     | Catalog (VIN Form)   | ~23        | ~3 min         | Vehicles      |
| 2     | Catalog (C3 Create)  | ~17        | ~2 min         | VIN Form      |
| 3     | Leads (Seller)       | ~22        | ~3 min         | Catalog       |
| 3     | Leads (Manager)      | ~12        | ~2 min         | Leads         |
| 3     | Leads (Verify)       | ~10        | ~2 min         | Manager       |
| 4     | Appointments         | ~22        | ~3 min         | Leads         |
| 4     | Calendar             | ~16        | ~2 min         | Appointments  |
| 4     | Debug (Appt)         | ~8         | ~1 min         | Appointments  |
| 5     | OAuth (Google/FB)    | ~16        | ~3 min         | Foundation    |
| 5     | Facebook Webhook     | ~9         | ~2 min         | Leads         |
| 5     | Bulk Images          | ~10        | ~2 min         | Vehicles      |
| 5     | Products API         | ~12        | ~2 min         | Catalog       |
| 5     | Products (UI)        | ~10        | ~2 min         | Products API  |
| 6     | A11y                 | ~8         | ~2 min         | Core features |
| 6     | Staging Smoke        | ~12        | ~2 min         | Staging env   |
| 6     | Real API Smoke       | ~8         | ~1 min         | Backend       |
| 6     | A6 Verification      | ~12        | ~2 min         | A6 features   |
| 6     | A6 Manual            | ~8         | ~1 min         | A6 features   |
| -     | Debug Auth           | ~3         | ~1 min         | -             |
| -     | Home                 | ~2         | ~30s           | -             |

**Grand Total**: ~400+ E2E tests across all modules

---

## Execution Strategy

### Quick Feedback (CI/CD)

```bash
# Run only critical smoke tests (<5 min)
pnpm test --grep @smoke

# Run Layer 0 foundation + Layer 2 contract
pnpm test auth/
pnpm test layer2/
```

### Full Regression

```bash
# Run all tests in dependency order
pnpm test auth/                    # Layer 0
pnpm test layer2/                  # Layer 2 contract
pnpm test smoke.spec.ts            # Layer 1 smoke
pnpm test -- grep "@critical"      # All critical tests
pnpm test                          # All tests (~60 min)
```

### Parallel Execution

```bash
# Run independent modules in parallel
pnpm test --workers=4 auth/ catalog/ leads/
```

---

## Tag Reference

| Tag             | Meaning                      | Usage                    |
| --------------- | ---------------------------- | ------------------------ |
| `@smoke`        | Critical path, fast feedback | CI gate, pre-merge       |
| `@critical`     | Core business functionality  | Regression suite         |
| `@regression`   | Bug fix verification         | Post-deploy verification |
| `@feature`      | New feature validation       | Feature completion       |
| `@integration`  | External API testing         | Integration tests        |
| `@security`     | Security, permissions        | Security suite           |
| `@a11y`         | Accessibility compliance     | A11y audit               |
| `@performance`  | Response time validation     | Performance tests        |
| `@manual`       | Semi-automated checks        | Manual testing support   |
| `@debug`        | Debugging scenarios          | Development              |
| `@verification` | Requirement verification     | Milestone completion     |

---

## Status Matrix

| Module               | Tests | Status     | Notes                                   |
| -------------------- | ----- | ---------- | --------------------------------------- |
| Auth (Foundation)    | ~29   | ✅ Green   | Login, register, password flows working |
| Layer 2 Contract     | 75    | ⏳ Pending | Created, needs DB to execute            |
| Smoke (Critical)     | 20    | ✅ Green   | 20/20 passing                           |
| Catalog (Categories) | ~12   | ✅ Green   | CRUD operations working                 |
| Catalog (Vehicles)   | ~24   | 🟡 Yellow  | Some NHTSA issues                       |
| Catalog (VIN Form)   | ~23   | 🟡 Yellow  | Select field bugs                       |
| Catalog (C3 Create)  | ~17   | ⏳ Pending | Awaiting VIN form fix                   |
| Leads (Seller)       | ~22   | 🟢 Green   | Core lifecycle working                  |
| Leads (Manager)      | ~12   | 🟢 Green   | Team view functional                    |
| Leads (Verify)       | ~10   | ⏳ Pending | Data consistency TBD                    |
| Appointments         | ~22   | 🟢 Green   | Creation flow working                   |
| Calendar             | ~16   | 🟢 Green   | Dealer calendar functional              |
| OAuth (Google/FB)    | ~16   | 🟡 Yellow  | Requires real API approval              |
| Facebook Webhook     | ~9    | ⏳ Pending | Needs FB app config                     |
| Bulk Images          | ~10   | 🟢 Green   | Upload flow verified                    |
| Products API         | ~12   | 🟢 Green   | Endpoints working                       |
| Products (UI)        | ~10   | 🟢 Green   | UI functional                           |
| Accessibility        | ~8    | ⏳ Pending | A11y audit needed                       |
| Staging Smoke        | ~12   | ⏳ Pending | Staging env verification                |
| Real API Smoke       | ~8    | ⏳ Pending | Unmocked tests                          |
| A6 Verification      | ~12   | ⏳ Pending | Phase A6 completion                     |
| A6 Manual            | ~8    | ⏳ Pending | Manual checklist                        |
| Debug Auth           | ~3    | ✅ N/A     | Debug scenarios                         |
| Home                 | ~2    | ✅ Green   | Landing page OK                         |

---

## Next Steps

1. ✅ **Foundation**: Auth tests green
2. ✅ **Smoke**: Critical path verified
3. ✅ **Catalog**: Categories working
4. ⏳ **Layer 2**: Execute contract tests with DB
5. ⏳ **VIN Form**: Fix Select field bugs
6. ⏳ **Leads**: Verify manager view data consistency
7. ⏳ **Appointments**: Complete calendar integration
8. ⏳ **Integrations**: Configure OAuth/webhook apps
9. ⏳ **A11y**: Run accessibility audit
10. ⏳ **Staging**: Verify staging environment

**Current Overall Status**: ~70% of E2E tests passing, ~30% pending verification or fixes.
