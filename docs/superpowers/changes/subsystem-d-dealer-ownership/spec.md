# Subsystem D Spec — ProSell Super-Admin + Dealer Marketplace

## ADDED Requirements

### Requirement: Admin Bypass on Product Endpoints

The product router SHALL compute `effective_tenant_id` per request, applying no tenant filter when the authenticated user has the `DEALER_ADMIN_VIEW_ALL` permission. All ~17 product endpoints SHALL honor this bypass.

#### Scenario: Super-admin lists all products

- GIVEN a SUPER_ADMIN user with `DEALER_ADMIN_VIEW_ALL` permission
- WHEN `GET /api/v1/products` is called with no filters
- THEN response includes products from every dealer's organization

#### Scenario: Regular seller is unaffected

- GIVEN a SALES_USER without `DEALER_ADMIN_VIEW_ALL`
- WHEN `GET /api/v1/products` is called
- THEN response includes only products where `tenant_id == current_user.tenant_id`

### Requirement: Optional organization_id Filter

`GET /api/v1/products` SHALL accept an optional `organization_id` query parameter to scope results to one dealer. The repo already supports this filter.

#### Scenario: Admin scopes to specific dealer

- GIVEN admin user
- WHEN `GET /api/v1/products?organization_id={dealerA}` is called
- THEN response contains only Dealer A's products

#### Scenario: Cross-tenant access attempt rejected

- GIVEN a regular seller of dealer B
- WHEN `GET /api/v1/products?organization_id={dealerA}` is called
- THEN response is 403 (cannot query other tenants)

### Requirement: Marketplace Publish Permission

The system SHALL add a `MARKETPLACE_PUBLISH` permission. Users with this permission (SUPER_ADMIN, ADMIN, designated vendor roles) MAY toggle `Product.published_to_marketplace` on any product.

#### Scenario: ProSell vendor publishes dealer product

- GIVEN a ProSell vendor with `MARKETPLACE_PUBLISH`
- WHEN `PATCH /api/v1/products/{id}` sets `published_to_marketplace=true`
- THEN product becomes visible to marketplace consumers (future endpoint)

#### Scenario: Regular seller cannot toggle marketplace flag

- GIVEN a SALES_USER without `MARKETPLACE_PUBLISH`
- WHEN attempting the same PATCH
- THEN response is 403

### Requirement: Admin Dealers Endpoints

Two new endpoints SHALL exist under `/api/v1/admin`:

- `GET /admin/dealers` — list all dealers (orgs), SUPER_ADMIN+ADMIN only
- `GET /admin/dealers/{id}/products` — list one dealer's products, admin scope

#### Scenario: Admin lists dealers

- GIVEN admin user
- WHEN `GET /api/v1/admin/dealers` is called
- THEN response is a paginated list of all organizations

#### Scenario: Non-admin rejected

- GIVEN SALES_USER
- WHEN same call
- THEN response is 403

### Requirement: Frontend useAuth Helpers

`useAuth` SHALL expose typed helpers: `isAdmin`, `isSuperAdmin`, `hasPermission(perm: Permission): boolean`. The current `userRole: string | null` SHALL remain for backward compat but new code MUST use the helpers.

#### Scenario: Helper reflects backend role

- GIVEN backend session for ADMIN user
- WHEN `useAuth().isAdmin` is read in any component
- THEN it returns `true`

### Requirement: Sidebar Role-Aware Navigation

`<Sidebar>` SHALL filter its `groups` prop based on the user's permissions. Admin-only groups SHALL NOT appear for sellers; seller groups SHALL appear for all logged-in users.

#### Scenario: Admin sees dealer management

- GIVEN admin user
- WHEN sidebar renders
- THEN "Dealers" group is visible

#### Scenario: Seller does not see admin items

- GIVEN seller user
- WHEN sidebar renders
- THEN "Dealers" group is absent

### Requirement: Header Dealer Picker (Admin Only)

`<Header>` SHALL show a dealer picker dropdown when `isSuperAdmin || isAdmin`. Selecting a dealer sets `viewingOrgId` in `organizationStore`; non-admin users SHALL NOT see the picker.

#### Scenario: Admin picks dealer

- GIVEN admin user on `(admin)/dealers`
- WHEN a dealer is selected from the picker
- THEN `viewingOrgId` updates and subsequent admin queries scope to that dealer

#### Scenario: Seller does not see picker

- GIVEN seller user
- WHEN header renders
- THEN the dealer picker is not rendered

### Requirement: Admin Dealer Pages

Three new pages under `(admin)/`:

- `(admin)/dealers/page.tsx` — list of all dealers
- `(admin)/dealers/[id]/page.tsx` — dealer detail
- `(admin)/dealers/[id]/products/page.tsx` — dealer's product list

All SHALL be admin-gated (redirect non-admin to dashboard).

#### Scenario: Admin browses dealer products

- GIVEN admin user at `/admin/dealers/{dealerA}/products`
- WHEN the page loads
- THEN it fetches `GET /admin/dealers/{dealerA}/products` and renders the list

## Test Discipline (TDD Strict — applies to all scenarios above)

Every implementation task MUST:

1. Write the failing test for at least one scenario in this spec (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

No task is "done" without:

- All new behavior covered by failing-first tests
- Permission boundaries tested BOTH directions (admin allow, non-admin deny)
- Cross-tenant IDOR scenarios explicitly tested (negative case)
- Full test suites green: backend 1532+ tests, frontend 1015+ tests

## Coverage

- **Happy paths**: covered (every requirement has at least one happy scenario)
- **Edge cases**: covered (negative scenarios per requirement)
- **Error states**: covered (403, 404, and silent denial cases)
- **Cross-tenant IDOR**: explicitly required in scenario language

## Ready for Design

Proceed to `sdd-design` (technical design doc with data model + API contracts + frontend component tree).
