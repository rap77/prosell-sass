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

- [x] 5.1 RED: test `useAuth().isAdmin` true for ADMIN role, false for SALES_USER
- [x] 5.2 GREEN: add `permissions: Permission[]`, `isAdmin`, `isSuperAdmin`, `hasPermission()` to `useAuth.ts`
- [x] 5.3 RED: test `Sidebar` excludes `concesionarios` group when user lacks `DEALER_ADMIN_VIEW_ALL`
- [x] 5.4 GREEN: filter `groups` by `hasPermission` in `Sidebar.tsx`
- [x] 5.5 RED: test `organizationStore.viewingOrgId` setter is no-op for non-admin
- [x] 5.6 GREEN: add `viewingOrgId` + guarded setter to `organizationStore.ts`

## Phase 6: Frontend admin components

- [x] 6.1 Create `lib/api/dealers.ts` + Zod schemas in `lib/api/schemas/dealers.ts`
- [x] 6.2 RED: test `<DealerPicker>` renders for admin only; onChange updates store
- [x] 6.3 GREEN: create `components/admin/DealerPicker.tsx` consuming store
- [x] 6.4 Wire `<DealerPicker>` into `Header.tsx` (conditional on `isAdmin`)
- [x] 6.5 RED: test `app/(admin)/admin/dealers/page.tsx` renders list + redirects non-admin
- [x] 6.6 GREEN: create list page; uses `GET /admin/dealers`
- [x] 6.7 RED: test detail page `[id]/page.tsx` shows dealer + link to products
- [x] 6.8 GREEN: create detail page
- [x] 6.9 RED: test products page renders dealer's products
- [x] 6.10 GREEN: create products page using `GET /admin/dealers/{id}/products`

Deviations from the original plan:
- Pages live under the literal `/admin/dealers` URL (`app/(admin)/admin/dealers/...`),
  not `app/(admin)/dealers/...` — activates the (previously dead/untested)
  `/admin` prefix branch in `proxy.ts`. That branch had a real bug fixed as
  part of this phase: it excluded `super_admin`, only allowing the exact
  `"admin"` role, even though both roles carry `DEALER_ADMIN_VIEW_ALL` on
  the backend. Added regression tests in `tests/proxy.test.ts`.
- `[id]` pages use `useParams()` instead of `params: Promise<...>` + `use()`
  — these pages are 100% client-rendered via React Query, so there's no
  server-streaming benefit, and `use()` on a pending promise needs a
  Suspense boundary to resolve in jsdom tests (none of this repo's other
  `[id]/page.tsx` files have test coverage to validate that pattern works).
- No dedicated `GET /admin/dealers/{id}` endpoint exists (Phase 4 only
  built list + list-products) — `useDealer(id)` finds the dealer
  client-side from the already-fetched `useDealers()` list instead.

## Phase 7: Verify

- [x] 7.1 `apps/api`: ruff + pyright + pytest 1532+ all green
- [x] 7.2 `apps/web`: typecheck + lint + vitest 1015+ all green
- [x] 7.3 Manual smoke: admin sees all dealers; seller cannot reach `/admin/dealers/*`
- [x] 7.4 Manual smoke: admin can toggle `MARKETPLACE_PUBLISH` on own-org product; seller cannot

Deviations from the original plan:
- 7.4 originally read "admin can edit any product; seller cannot edit
  others'" — implying cross-tenant write access. `update_product` in
  `product_router.py` is hard-scoped to `current_user.tenant_id` with no
  `DEALER_ADMIN_VIEW_ALL` bypass for writes; Subsystem D's cross-tenant
  capability is read-only (dealer list + dealer products). Re-scoped 7.4
  to what the feature actually gates: admin (who carries
  `MARKETPLACE_PUBLISH`) can PATCH `published_to_marketplace` on a product
  in their own org (200); a seller in the same org without that
  permission gets 403. Verified end-to-end with real login + cookies
  against a seeded `prosell_test` DB on `localhost:8001`, not mocked.
- 7.3's real-browser smoke test (Playwright MCP, both roles) surfaced a
  pre-existing bug unrelated to this phase's own code: `proxy.ts` read
  `userData.role` (singular) but the `user_data` cookie carries
  `roles: string[]` — `role` never existed on the wire, so every
  role-based redirect (`/admin`, `/branch`, `/manager`) compared against
  `undefined` for every authenticated user. Fixed with `deriveRole()`
  mirroring `authStore.ts`'s existing `roles[0] ?? role` adapter, plus a
  regression test for the legacy `role` fallback. Automated
  `proxy.test.ts` fixtures had baked in the same wrong cookie shape, so
  the suite could never have caught this — only the real-cookie smoke
  test did.

## Implementation Order

Phase 1 → 2 → 3 → 4 (backend foundation + tests can be reviewed before frontend).
Then Phase 5 → 6 (frontend).
Finally Phase 7 (verify all together).

Total: **26 tasks**, comparable to Subsystem B's 12 but split into RED/GREEN pairs (per TDD discipline).
