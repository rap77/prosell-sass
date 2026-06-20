# Design: Subsystem D — ProSell Super-Admin + Dealer Marketplace

## Technical Approach

Replicate the admin-bypass pattern from `org_router.py:129` into `product_router.py`. Add 2 new permissions (`DEALER_ADMIN_VIEW_ALL`, `MARKETPLACE_PUBLISH`) following the existing `resource:action` naming. Add a `published_to_marketplace` boolean to `Product` via Alembic. Frontend: typed `useAuth` helpers + dealer picker in `Header` + 3 new admin pages.

## Architecture Decisions

### Decision: Granular permission check vs role-based for bypass

**Choice**: Check `Permission.DEALER_ADMIN_VIEW_ALL` per-user, not `has_role(["super_admin","admin"])`.
**Alternatives considered**: role check (mirrors `org_router.py:129`); both fallbacks.
**Rationale**: vendor roles (ProSell seller) MAY also need dealer-view-all without being full admin. Permission-granular matches the proposal's "ProSell vendor" vision.

### Decision: New router file for admin endpoints vs expanding product_router

**Choice**: Create `apps/api/src/prosell/infrastructure/api/routers/admin_dealers_router.py`.
**Alternatives**: append to `product_router.py`; expand existing `admin_router.py`.
**Rationale**: `product_router.py` already ~980 lines; admin dealers is a distinct domain. `admin_router.py` has 1 endpoint + different role semantics (it currently is SUPER_ADMIN-only).

### Decision: Marketplace flag as Product column vs separate table

**Choice**: Add `published_to_marketplace: bool = False` column on `Product`.
**Alternatives**: separate `marketplace_listings` table (M2M product ↔ marketplace).
**Rationale**: a product is either published or not — 1 boolean suffices. Future marketplace features can build on this column without premature M2M.

### Decision: organizationStore.viewingOrgId scope

**Choice**: Zustand store with `viewingOrgId: string | null`. Only settable when `isAdmin || isSuperAdmin`. Non-admin users see it as always `null` (no UI affordance).
**Rationale**: Zustand already used for `organizationStore`. Zustand selectors give us fine-grained re-render control.

### Decision: Sidebar nav groups filtering

**Choice**: Compute filtered groups at render time based on `permissions` from `useAuth`. No new prop API.
**Rationale**: Existing `Sidebar` already takes `groups: NavGroup[]`. We just compute the right array per render.

## Data Flow

```
Admin requests products across dealers:
  Browser → useAuth().isAdmin → admin query
    → /api/v1/admin/dealers/{org}/products?viewing_org_id={id}
      → admin_dealers_router.list_dealer_products
        → require_permission(DEALER_ADMIN_VIEW_ALL)
        → effective_tenant = None
        → product_repo.get_all(tenant_id=None, organization_id={id})
          → Postgres: SELECT ... WHERE organization_id = :id  -- no tenant filter

Non-admin product request (unchanged):
  Browser → /api/v1/products
    → product_router.list_products
      → tenant_id = current_user.tenant_id
      → product_repo.get_all(tenant_id=tenant_id)  -- forced scoping
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/prosell/domain/entities/role.py` | Modify | Add `DEALER_ADMIN_VIEW_ALL`, `MARKETPLACE_PUBLISH` permissions; extend `ROLE_PERMISSIONS` map |
| `apps/api/alembic/versions/XXXX_add_marketplace_flag.py` | Create | Alembic migration: add `products.published_to_marketplace BOOL NOT NULL DEFAULT FALSE` |
| `apps/api/src/prosell/domain/entities/product.py` | Modify | Add `published_to_marketplace: bool = False` field |
| `apps/api/src/prosell/infrastructure/models/product_model.py` | Modify | Mirror column on SQLAlchemy model |
| `apps/api/src/prosell/infrastructure/api/routers/product_router.py` | Modify | Compute `effective_tenant` per request (admin bypass); accept `organization_id` query param; gate `published_to_marketplace` write on `MARKETPLACE_PUBLISH` |
| `apps/api/src/prosell/infrastructure/api/routers/admin_dealers_router.py` | Create | `GET /admin/dealers`, `GET /admin/dealers/{id}/products` |
| `apps/api/tests/integration/api/test_dealer_scoping.py` | Create | IDOR scenarios, admin allow/deny, marketplace toggle |
| `apps/api/tests/unit/test_dealer_permissions.py` | Create | Permission enum + ROLE_PERMISSIONS map correctness |
| `apps/web/src/hooks/useAuth.ts` | Modify | Add `isAdmin`, `isSuperAdmin`, `hasPermission(perm)` typed helpers |
| `apps/web/src/components/layout/Header.tsx` | Modify | Add `<DealerPicker />` (admin-only) |
| `apps/web/src/components/layout/Sidebar.tsx` | Modify | Filter `groups` by `permissions` |
| `apps/web/src/stores/organizationStore.ts` | Modify | Add `viewingOrgId` + setter; gate setter on admin check |
| `apps/web/src/app/(admin)/dealers/page.tsx` | Create | Dealer list |
| `apps/web/src/app/(admin)/dealers/[id]/page.tsx` | Create | Dealer detail |
| `apps/web/src/app/(admin)/dealers/[id]/products/page.tsx` | Create | Dealer products |
| `apps/web/src/components/admin/DealerPicker.tsx` | Create | Header dropdown (admin-only) |
| `apps/web/src/lib/api/dealers.ts` | Create | API client for `/admin/dealers` and `/admin/dealers/{id}/products` |
| `apps/web/src/lib/api/schemas/dealers.ts` | Create | Zod schemas + safeParse for response shapes |
| `apps/web/tests/components/admin/DealerPicker.test.tsx` | Create | Dropdown renders only for admin; picks set viewingOrgId |
| `apps/web/tests/components/admin/DealersListPage.test.tsx` | Create | Renders dealer list with mock API |
| `apps/web/tests/unit/hooks/useAuth.test.ts` | Modify | Test new helpers |

## Interfaces / Contracts

```python
# apps/api/src/prosell/domain/entities/role.py
class Permission(StrEnum):
    DEALER_ADMIN_VIEW_ALL = "dealer:admin_view_all"
    MARKETPLACE_PUBLISH = "marketplace:publish"
```

```typescript
// apps/web/src/hooks/useAuth.ts
interface UseAuthReturn {
  user: User | null;
  userRole: string | null;
  permissions: Permission[];  // NEW
  isAdmin: boolean;            // NEW: SUPER_ADMIN || ADMIN
  isSuperAdmin: boolean;       // NEW
  hasPermission: (p: Permission) => boolean;  // NEW
}

// apps/web/src/stores/organizationStore.ts
interface OrganizationStore {
  currentOrgId: string | null;
  viewingOrgId: string | null;       // NEW (admin only)
  setViewingOrgId: (id: string | null) => void;  // NEW
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend unit | Permission enum + ROLE_PERMISSIONS map (each role has expected perms, no leaks) | `tests/unit/test_dealer_permissions.py` — table-driven test |
| Backend integration | Admin can list products across dealers (200), seller cannot (403), cross-tenant IDOR rejected (403), marketplace toggle allowed/denied | `tests/integration/api/test_dealer_scoping.py` — use existing async client fixture |
| Backend integration | New `/admin/dealers` and `/admin/dealers/{id}/products` endpoints | Same file |
| Frontend unit | `useAuth` helpers: `isAdmin`, `isSuperAdmin`, `hasPermission` per role | `tests/unit/hooks/useAuth.test.ts` |
| Frontend component | `<DealerPicker>` renders only for admin, picks update `viewingOrgId` | `tests/components/admin/DealerPicker.test.tsx` |
| Frontend component | Sidebar hides admin items for seller; shows for admin | `tests/components/layout/Sidebar.test.tsx` (extend existing) |
| Frontend integration | Dealer list page renders, dealer detail page renders, products page renders | 3 separate tests with MSW mock |

## Migration / Rollout

- **Alembic migration**: forward-compatible. New column has default `FALSE`, so existing rows unaffected. No backfill needed.
- **Feature flag**: not needed; permissions gate new behavior. New permissions default to no role having them (except explicit additions in `ROLE_PERMISSIONS`).
- **Rollout**: single PR. Perms added but only granted to specific roles (SUPER_ADMIN, ADMIN). Sellers see no change.

## Open Questions

- None. The 3 clarifications (dealer=org rebading, D-only scope, true multi-org) resolved the only ambiguity.

## Ready for Tasks

Proceed to `sdd-tasks` (task breakdown with TDD enforcement per task).
