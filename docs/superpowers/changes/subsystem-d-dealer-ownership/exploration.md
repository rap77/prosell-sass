# Subsystem D — Dealer/Seller Ownership: Exploration

> Generated 2026-06-19 from `sdd-explore` agent dispatch.

## Current State

**Data model: org == tenant today (conceptual collapse)**

- `Product.tenant_id` and `Product.organization_id` are both on the entity (`apps/api/src/prosell/domain/entities/product.py:24-25`), but they are **self-referential**: `Organization.create()` sets `id=tenant_id` (`apps/api/src/prosell/domain/entities/organization.py:73`) and OAuth `User.create_oauth()` sets `tenant_id=user_id` (`apps/api/src/prosell/domain/entities/user.py:131`). No separate "dealer" entity exists.
- `product_router.py:186-192` overwrites both fields server-side from the cookie-authenticated user — never trusted from body. Bulk upload (`product_router.py:902`) accepts `organization_id` from form but re-validates against user's tenant.

**Admin bypass pattern exists in 2 routers, NOT in products**

- `org_router.py:129-130` and `category_router.py:90` use `effective_tenant = None if is_admin else current_user.tenant_id`. `None` tenant_id = no filter, sees all.
- `product_router.py` ignores role entirely — admins only see their own tenant's products. **No "admin sees all products across dealers" path.**

**Frontend: no dealer UI surface**

- `apps/web/src/app/(admin)/` contains only `dashboard/page.tsx` (25KB, single endpoint `/api/v1/admin/stats`).
- No dealers/users/settings pages, no org switcher, no dealer picker, no "view as dealer" toggle anywhere.
- `Sidebar.tsx:46-99` has a static nav array; both `(seller)/layout.tsx` and `(admin)/layout.tsx:27` pass the same four groups. **Same nav for both roles.**
- `useAuth` (`apps/web/src/hooks/useAuth.ts:60-78`) exposes only `userRole: string | null` — no `isAdmin`, `isSuperAdmin`, or `hasPermission` helpers.

**RBAC**

- `Permission` enum at `apps/api/src/prosell/domain/entities/role.py:23-56`: `USER_*`, `ROLE_*`, `ORG_*`, `VEHICLE_*`, `ANALYTICS_*`, `SETTINGS_*`. **No `DEALER_*` or `ADMIN_*` permissions.**
- Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `SALES_AGENT`, `SALES_USER`, `VIEWER` (`role.py:12-20`).
- Enforcement: `require_permission`/`require_role` factories at `apps/api/src/prosell/infrastructure/api/dependencies.py:332-407`. Used inconsistently: `org_router` uses both, `product_router` uses NEITHER (relies on tenant_id only).
- **`VEHICLE_*` permissions defined but UNUSED** (Subsystem E debt) — zero references in routers/middleware/tests.

**Multi-tenant propagation**

- `get_current_auth_user_from_cookie` (`dependencies.py:252-329`) loads user + roles per request.
- Repository-layer filter: `product_repository_impl.py:76` skips filter when `tenant_id == UUID(int=0)` sentinel. `get_all(tenant_id, organization_id=...)` already supports optional org filter (`product_repository_impl.py:109-129`).

## Affected Areas

**Backend domain**

- `apps/api/src/prosell/domain/entities/organization.py` — re-model if 1 tenant → N dealers or platform-admin lives outside any tenant.
- `apps/api/src/prosell/domain/entities/product.py:24-25` — differentiate `dealer_id` from `organization_id`.
- `apps/api/src/prosell/domain/entities/role.py` — add `DEALER_*`/`ADMIN_VIEW_ALL`; possibly new `PLATFORM_ADMIN` role.

**Backend infra**

- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — replicate admin-bypass from `org_router.py:129`. ~17 endpoints to audit for IDOR.
- `apps/api/src/prosell/infrastructure/api/routers/admin_router.py` — currently 64 lines, 1 endpoint; expand for dealer-scoped views.
- `apps/api/src/prosell/infrastructure/api/dependencies.py:332` — factories ready, just need new permission values.
- `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py:109` — `organization_id` filter already optional, extend for cross-tenant queries.

**Backend tests**

- New: `apps/api/tests/integration/api/test_dealer_scoping.py`, `apps/api/tests/unit/test_dealer_permissions.py`.

**Frontend app**

- `apps/web/src/app/(admin)/` — add `dealers/`, `users/`, `settings/`, scoped product browser.
- `apps/web/src/app/(seller)/layout.tsx` + `(admin)/layout.tsx:27` — Sidebar `groups` prop needs role-aware filtering.
- `apps/web/src/app/(admin)/dashboard/page.tsx` — dealer picker + per-dealer stats.

**Frontend lib/components**

- `apps/web/src/components/layout/Sidebar.tsx:46-99` — role-aware nav.
- `apps/web/src/components/layout/Header.tsx` — add org/dealer switcher dropdown.
- `apps/web/src/hooks/useAuth.ts:60-78` — add `isAdmin`/`isSuperAdmin`/`hasPermission` selectors.
- `apps/web/src/stores/organizationStore.ts` — single-org today; needs "viewing org" mode for admin.
- `apps/web/src/lib/api/orgApi.ts` + new `dealers.ts`.

**Frontend tests**

- New: `apps/web/tests/components/admin/DealerPicker.test.tsx`, `apps/web/tests/unit/lib/api/dealers.test.tsx`. Update admin/seller layout tests.

## Existing Coverage

**Implemented**

- Multi-tenant data model with repo-level enforcement + sentinel bypass
- Org/category admin-bypass pattern (2 routers, ready to copy)
- `/admin/stats` endpoint (SUPER_ADMIN-gated foundation)
- `require_permission`/`require_role` dependencies (generic, ready for new perms)
- `has_role(["super_admin","admin"])` shortcut on User entity
- Cookie auth + role loading per request
- Cross-tenant test infrastructure: `test_sign_image_urls_tenant_scope.py`, `test_validate_image_urls_for_tenant.py`, `test_role_based_permissions.py`

**Missing**

- No "dealer" concept in domain — `organization_id == tenant_id` collapses two ideas
- No platform-admin UI surface beyond dashboard; no list/create/edit screens for dealers, no impersonation
- No org/dealer switcher in Header or anywhere
- No `DEALER_*`/`ADMIN_*` permissions
- No admin bypass on `product_router` — admins see only own-tenant products
- No tests for admin product scope (cross-tenant reads, dealer-level filtering)
- No `isAdmin`/`isSuperAdmin`/`hasPermission` helpers in `useAuth`
- No "active viewing org" state for super-admin
- Sidebar not role-aware

## Blockers / Risks

- **Conceptual ambiguity**: decide whether "dealer" is a new entity (1 tenant → N dealers) or rebadging of `Organization`. This drives the entire backend schema change.
- **No super-admin UI to test against**: backend work has no frontend driver; ship both layers together or backend goes unexercised.
- **`product_router.py` ignores role entirely** (~980 lines, ~17 endpoints). Adding admin bypass means touching every endpoint; missing any one = IDOR.
- **Inconsistent permission enforcement** across routers (org uses `require_permission`, product uses nothing). New project-wide convention will conflict with existing patterns unless normalized.
- **`VEHICLE_*` permissions defined but unused** (Subsystem E debt). Risk of name overlap with upcoming vehicle rename — coordinate scope.
- **Frontend `useAuth` role shape is `string | null`** — no typed enum, no array. Multi-role consumers need typed refactor touching every component using `userRole`.
- **No backend test fixture for "two orgs in same tenant"** — current `Organization` model assumes one org per tenant. New dealer-scoping tests must seed N orgs per tenant.

## Scope Estimate

**M (Medium)** — comparable to Subsystem B's 12-task slice.

- Backend: 1 model/migration decision + permission enum + product_router bypass + 1-2 new admin endpoints + tests ≈ 4-6 TDD tasks
- Frontend: sidebar role filter + Header picker + admin dealer pages + useAuth helpers + tests ≈ 4-5 TDD tasks
- Docs/spec: 1 propose + 1 spec + 1 design ≈ 3 tasks
- **Total: ~12-14 tasks**

Hard part is the **dealer-vs-tenant design decision** (entity shape, migration story, OAuth flow impact), not code volume.

## Key file paths for proposal phase

- `apps/api/src/prosell/domain/entities/organization.py:72-82` — org == tenant today
- `apps/api/src/prosell/domain/entities/product.py:24-25` — both fields on entity
- `apps/api/src/prosell/domain/entities/role.py:23-56, 60-123` — permissions + role→permission map
- `apps/api/src/prosell/infrastructure/api/routers/org_router.py:129-130` — bypass pattern to replicate
- `apps/api/src/prosell/infrastructure/api/routers/admin_router.py` — only admin endpoint
- `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py:109-129` — optional org filter already supported
- `apps/web/src/app/(admin)/` — route group, 1 file currently
- `apps/web/src/components/layout/Sidebar.tsx:46-99` — static nav
- `apps/web/src/hooks/useAuth.ts:60-78` — auth shape, no role helpers

## Ready for Proposal

**Partially** — needs orchestrator clarification on:

1. **"Dealer" entity shape**: new entity (1 tenant → N dealers) vs rebadging of `Organization` (1 tenant → 1 dealer = org today)
2. **Scope boundary with Subsystem E**: does Subsystem D include the `Permission.VEHICLE_*` cleanup, or is that strictly E?
3. **Multi-org-per-tenant**: is this a single-instance SaaS where every dealer is its own tenant, or do we need true dealer-hierarchy?

Once these are decided, proposal phase can proceed.
