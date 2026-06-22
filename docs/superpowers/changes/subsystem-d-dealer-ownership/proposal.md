# Subsystem D — ProSell Super-Admin + Dealer Marketplace Visibility

## Intent

ProSell es la **plataforma** que opera el marketplace. Hoy:

- Cada dealer (Organization) es su propio tenant (self-referential `organization_id == tenant_id`)
- ProSell opera solo como super-admin con bypass limitado en 2 routers
- El marketplace NO existe — cada dealer solo ve sus propios productos

**Goal de Subsystem D**: dar a ProSell super-admin + ProSell-vendor roles el poder de:

1. **Browse** productos de cualquier dealer (cross-dealer read)
2. **Administrar** productos de cualquier dealer (cross-dealer write)
3. **Publicar en marketplace** — algunos productos son cross-dealer visibles

**NO** incluye (va a Subsystem E):

- Permission.VEHICLE\_\* cleanup
- Onboarding flow (invite dealers, create dealer accounts)
- True multi-tenant migration (cada dealer sigue siendo su propio tenant)

## Scope

### In scope (Subsystem D)

**Backend — `apps/api`:**

- Replicate admin-bypass pattern from `org_router.py:129` to `product_router.py` (~17 endpoints)
- New permission `MARKETPLACE_PUBLISH` (admin/super_admin/vendor-prosell can publish)
- New permission `DEALER_ADMIN_VIEW_ALL` (admin/super_admin can browse all dealers)
- Extend `product_router.list_products` to accept `organization_id` query param (already supported by repo)
- New endpoint `GET /admin/dealers` (list all orgs/dealers, admin-gated)
- New endpoint `GET /admin/dealers/{org_id}/products` (browse specific dealer's products as admin)
- Tests for all new scoping

**Frontend — `apps/web`:**

- `useAuth` enhancements: `isAdmin`, `isSuperAdmin`, `hasPermission(perm)` typed helpers
- `Sidebar.tsx` role-aware nav filtering
- `Header.tsx` dealer picker dropdown (admin only)
- New page `(admin)/dealers/page.tsx` — list all dealers
- New page `(admin)/dealers/[id]/page.tsx` — dealer detail + product list
- New page `(admin)/dealers/[id]/products/page.tsx` — product browser scoped to dealer
- `lib/api/dealers.ts` — API client
- Tests for all new components

### Out of scope (deferred)

| Item                                                                       | Goes to                        |
| -------------------------------------------------------------------------- | ------------------------------ |
| Permission.VEHICLE\_\* cleanup / rename                                    | Subsystem E                    |
| Onboarding flow (invite dealers, create dealer accounts)                   | Subsystem E                    |
| Self-service RBAC UI for dealers                                           | Subsystem E                    |
| True multi-tenant migration (single ProSell tenant with N dealer children) | Deferred — current model works |
| Subsystem C (category auto-inference on create)                            | Last per roadmap               |

## Approach (chosen)

**Opción A from clarification**: maintain current `tenant_id == organization_id` (self-referential), add admin bypass + dealer picker UI. Zero data migration.

**Key architectural decisions:**

1. **No new entity**: "Dealer" is UI/rebranding term for Organization. The data model stays as-is.
2. **Effective tenant pattern**: backend routers compute `effective_tenant = None if is_admin else user.tenant_id` like `org_router.py:129`. `None` means "see all orgs across all tenants" for super-admin, OR "see all dealers under my org" for org-admins.
3. **Marketplace flag**: `Product` gets a new `published_to_marketplace: bool` field. ProSell-vendor with `MARKETPLACE_PUBLISH` can toggle this on any dealer's product. Marketplace consumers (future) read products with `published_to_marketplace = true` across all tenants.
4. **Dealer picker state**: `organizationStore` extends with `viewingOrgId: string | null`. Admin sets it; all admin-scoped queries pass it. Non-admin users ignore it.

## Trade-offs considered

| Approach                             | Pros                                              | Cons                                                            | Decision |
| ------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------- | -------- |
| A. Status quo + bypass (chosen)      | Zero migration, ships fast, closes 80% of the gap | Doesn't support true hierarchical dealers (dealer → sub-dealer) | ✅       |
| B. New tenant root + migration       | True hierarchical model                           | Alembic migration + data backfill + 2-3 days of test rewriting  | ❌       |
| C. New "Dealer" entity, 1-1 with Org | Same as A but with extra indirection              | YAGNI — same data, more joins                                   | ❌       |

## TDD commitment

**Every task in this subsystem follows strict TDD:**

1. **RED**: failing test first. The test must demonstrate the new behavior is missing or wrong.
2. **GREEN**: minimal code to make test pass. No over-engineering.
3. **REFACTOR**: clean up with tests still green.

**No shortcuts allowed:**

- ❌ No `--no-verify` on any commit
- ❌ No "I'll write tests later" — test IS the spec
- ❌ No production code without a corresponding test file

**Test coverage gates per task:**

- New behavior: covered by at least one failing-first test
- Bug fix: covered by reproduction test
- Permission/scoping change: covered by both positive AND negative tests (admin can, non-admin can't, IDOR scenarios)

## Success criteria

A reviewer can verify Subsystem D is DONE when:

1. **Backend tests**: all new endpoints have ≥1 test, all permission boundaries covered (admin allow, non-admin deny, cross-tenant IDOR scenarios)
2. **Frontend tests**: all new components have component tests, `useAuth` helpers tested
3. **Manual smoke**: ProSell super-admin logs in, sees list of all dealers, picks one, browses their products, can edit any
4. **Manual smoke**: Regular dealer (non-admin) cannot see any admin pages; cannot see other dealers' products
5. **CI**: all 1532+ backend tests green, 1015+ frontend tests green
6. **No regressions**: existing seller flow works identically for non-admin users

## Dependencies

- Subsystem 0 (Foundation) ✅ MERGED
- Subsystem A (ProductCard) ✅ MERGED
- Subsystem B (Dynamic Filters) ✅ MERGED
- (none other)

## Sequence within Subsystem D (proposed)

1. **T1: Backend permission enum** — add `MARKETPLACE_PUBLISH`, `DEALER_ADMIN_VIEW_ALL`; map to roles
2. **T2: Backend admin bypass** — replicate `org_router.py:129` pattern in `product_router.py`
3. **T3: Backend new endpoints** — `GET /admin/dealers`, `GET /admin/dealers/{id}/products`
4. **T4: Backend marketplace flag** — `Product.published_to_marketplace` field + admin/vendor toggle
5. **T5: Frontend useAuth helpers** — `isAdmin`, `isSuperAdmin`, `hasPermission`
6. **T6: Frontend Sidebar role-aware** — filter nav by role
7. **T7: Frontend Header dealer picker** — admin-only dropdown
8. **T8: Frontend admin dealer list page** — `(admin)/dealers/page.tsx`
9. **T9: Frontend admin dealer detail page** — `(admin)/dealers/[id]/page.tsx`
10. **T10: Frontend admin dealer products page** — `(admin)/dealers/[id]/products/page.tsx`
11. **T11: Frontend marketplace flag UI** — toggle button on product card for vendor role
12. **T12: Verify** — full test suites, smoke tests, security audit

**All 12 tasks include TDD enforcement: failing test → minimal impl → refactor.**

## Out of scope acknowledgment

- The "True multi-tenant migration" (Option B) is deferred until there's evidence (multiple dealers per ProSell, hierarchical needs, etc.) that it's worth the migration cost.
- Subsystem E (business-owner onboarding + RBAC cleanup) is unblocked by D but not in this PR.
- Subsystem C (category auto-inference) is the last per roadmap and not in this PR.

## Ready for Spec

✅ Proceed to write `spec.md` (delta spec with requirements + scenarios).
