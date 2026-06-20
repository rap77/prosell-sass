# Tasks: Subsystem D — ProSell Super-Admin + Dealer Marketplace

> TDD enforced: RED task (failing test) → GREEN task (minimal impl). No shortcuts.

## Phase 1: Foundation (permissions + DB)

- [x] 1.1 RED: test `Permission` enum contains `DEALER_ADMIN_VIEW_ALL`, `MARKETPLACE_PUBLISH`
- [x] 1.2 GREEN: add 2 permissions to `apps/api/src/prosell/domain/entities/role.py`
- [x] 1.3 RED: test each role's permissions (SUPER_ADMIN/ADMIN/MANAGER/SALES_AGENT/SALES_USER/VIEWER) grants correct subset
- [x] 1.4 GREEN: extend `ROLE_PERMISSIONS` map; SUPER_ADMIN+ADMIN get `DEALER_ADMIN_VIEW_ALL`; same + MANAGER get `MARKETPLACE_PUBLISH`
- [x] 1.5 Create Alembic migration adding `products.published_to_marketplace BOOL NOT NULL DEFAULT FALSE`
- [x] 1.6 Add `published_to_marketplace: bool = False` to `Product` entity + `ProductModel`

## Phase 2: Backend admin bypass (product_router)

- [x] 2.1 RED: test admin lists products → sees all dealers' (200, no tenant filter)
- [x] 2.2 GREEN: compute `effective_tenant = None if has_permission(DEALER_ADMIN_VIEW_ALL) else user.tenant_id`; pass to repo
- [x] 2.3 RED: test seller lists products → only own tenant (regression preserved)
- [x] 2.4 RED: test cross-tenant IDOR `?organization_id=other` → 403 for seller
- [x] 2.5 GREEN: accept optional `organization_id` query param; reject if user lacks `DEALER_ADMIN_VIEW_ALL` and id != user.tenant_id's org

## Phase 3: Backend marketplace flag

- [x] 3.1 RED: test vendor with `MARKETPLACE_PUBLISH` can PATCH `published_to_marketplace=true` on any product
- [x] 3.2 GREEN: gate the field on the permission (403 if user lacks it)
- [x] 3.3 RED: test seller WITHOUT `MARKETPLACE_PUBLISH` cannot toggle (403)

## Phase 4: Backend admin endpoints

- [x] 4.1 Create `apps/api/src/prosell/infrastructure/api/routers/admin_dealers_router.py` skeleton
- [x] 4.2 RED: test `GET /admin/dealers` returns orgs list (200) for admin, 403 for seller
- [x] 4.3 GREEN: implement `list_dealers` reusing `OrganizationRepository`
- [x] 4.4 RED: test `GET /admin/dealers/{id}/products` returns dealer's products (200), 404 for unknown id
- [x] 4.5 GREEN: implement `list_dealer_products` reusing `product_repo.get_all(organization_id={id})`
- [x] 4.6 Register new router in `apps/api/src/prosell/infrastructure/api/main.py`

## Phase 5: Frontend foundation (useAuth + Sidebar + store)

- [ ] 5.1 RED: test `useAuth().isAdmin` true for ADMIN role, false for SALES_USER
- [ ] 5.2 GREEN: add `permissions: Permission[]`, `isAdmin`, `isSuperAdmin`, `hasPermission()` to `useAuth.ts`
- [ ] 5.3 RED: test `Sidebar` excludes `dealers` group when user lacks `DEALER_ADMIN_VIEW_ALL`
- [ ] 5.4 GREEN: filter `groups` by `hasPermission` in `Sidebar.tsx`
- [ ] 5.5 RED: test `organizationStore.viewingOrgId` setter is no-op for non-admin
- [ ] 5.6 GREEN: add `viewingOrgId` + guarded setter to `organizationStore.ts`

## Phase 6: Frontend admin components

- [ ] 6.1 Create `lib/api/dealers.ts` + Zod schemas in `lib/api/schemas/dealers.ts`
- [ ] 6.2 RED: test `<DealerPicker>` renders for admin only; onChange updates store
- [ ] 6.3 GREEN: create `components/admin/DealerPicker.tsx` consuming store
- [ ] 6.4 Wire `<DealerPicker>` into `Header.tsx` (conditional on `isAdmin`)
- [ ] 6.5 RED: test `app/(admin)/dealers/page.tsx` renders list + redirects non-admin
- [ ] 6.6 GREEN: create list page; uses `GET /admin/dealers`
- [ ] 6.7 RED: test detail page `[id]/page.tsx` shows dealer + link to products
- [ ] 6.8 GREEN: create detail page
- [ ] 6.9 RED: test products page renders dealer's products
- [ ] 6.10 GREEN: create products page using `GET /admin/dealers/{id}/products`

## Phase 7: Verify

- [ ] 7.1 `apps/api`: ruff + pyright + pytest 1532+ all green
- [ ] 7.2 `apps/web`: typecheck + lint + vitest 1015+ all green
- [ ] 7.3 Manual smoke: admin sees all dealers; seller cannot reach `/admin/dealers/*`
- [ ] 7.4 Manual smoke: admin can edit any product; seller cannot edit others'

## Implementation Order

Phase 1 → 2 → 3 → 4 (backend foundation + tests can be reviewed before frontend).
Then Phase 5 → 6 (frontend).
Finally Phase 7 (verify all together).

Total: **26 tasks**, comparable to Subsystem B's 12 but split into RED/GREEN pairs (per TDD discipline).
