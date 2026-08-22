# Marketplace Publish Fusion — Design

**Status**: APPROVED (pending implementation)
**Date**: 2026-08-21
**Owner**: backend + frontend (ProSell SaaS)
**Prerequisite**: reverse-transitions feature (`2026-08-19-product-state-management-reverse-transitions.md`, merged this session) — this spec relies on `_enqueue_unpublish_requests()` and `reverse_publication()` already existing.

## Problem

`ProductStatus.PUBLISHED` and `published_to_marketplace` are two independent booleans that share the word "published" but mean different things:

- `status = PUBLISHED` — an admin/manager approved the product for ProSell's internal catalog.
- `published_to_marketplace` — a separate, manual flag deciding whether that same product also syncs to Facebook Marketplace via the FB bot (`/fb-sync/pending`).

Nothing in the UI signals the gap between them. The toggle for the second flag lives inside `UnifiedProductForm` (the edit form) — a completely different screen from both the review-queue approval action and the availability actions panel (reserve/pause/mark sold) where the rest of the product lifecycle is managed. Operators approve a product, assume it's live everywhere, and never visit the edit form again — so `published_to_marketplace` silently stays at its default `false`.

Confirmed live on staging: 2016 Kia Optima (`7d97fa0b-9b09-43b1-842f-baf8ee74c523`) — `status=published`, `published_to_marketplace=false` — invisible to every FB account polling `/fb-sync/pending`, with zero error or signal anywhere.

There is no remaining business reason for these to be two separate decisions — confirmed with the user, this split is leftover implementation order (Subsystem D landed the flag before the status-lifecycle work matured), not a deliberate product requirement.

## Goals

- A single approval action (individual or batch) results in a product that is both `status=PUBLISHED` and eligible for FB sync — one gate, one moment of decision.
- Existing FB unpublish mechanics (`pause`, `reserve`, `mark_sold`, `reverse_publication` → `_enqueue_unpublish_requests`) keep working unchanged — this spec does not touch them.
- Remove the now-redundant manual toggle from `UnifiedProductForm`.
- Close the direct-PATCH path to `published_to_marketplace` so there is exactly one way for the flag to become `true` (`Product.approve()`) and exactly one way for it to become `false` again while the approval itself is undone (`Product.reverse_publication()`).
- Backfill existing `PUBLISHED` products currently stuck at `published_to_marketplace=false` so the fix also repairs already-broken inventory (e.g. the Kia Optima).

## Non-Goals

- A standalone "unpublish from FB but stay PUBLISHED in ProSell" action. Confirmed with the user: pausing already achieves this (`pause()` already enqueues the FB unpublish); no new action needed (YAGNI).
- Any change to `fb_account_ids` (which specific FB account(s) a product is assigned to). That remains a manual, independent concern — orthogonal to _whether_ the product is eligible for FB at all.
- Any change to `fb_sync_router.py`'s query logic (`/pending`, `/unpublish-pending`, `/account-config`, etc.) — already correct, not the source of the bug.
- Fixing the pre-existing pause→revert_sale race (an in-flight `FBUnpublishRequestModel` still `queued` when the product is resumed/reverted before the bot processes it). Pre-existing, unrelated to this fusion, out of scope.
- Per-organization opt-out/config (`auto_publish_to_marketplace` toggle). Rejected in favor of the simpler fused model.

## Decisions

| Decision                                              | Choice                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How does a product become eligible for FB?            | **`Product.approve()` sets `published_to_marketplace = True`** — single source of truth, shared by both the single-product and batch approval use cases (`ApproveProductUseCase`, `BatchApproveProductsUseCase`) since both call the same domain method.                                                                                                                                                 |
| How does it become ineligible again?                  | **`Product.reverse_publication()` sets `published_to_marketplace = False`** — symmetric counterpart to `approve()`. `pause()`/`reserve()`/`mark_sold()` are _not_ touched — they are ordinary lifecycle events on a validly-approved product, not an undo of the approval decision, so the flag stays `true` as a durable "this listing is meant for FB" signal while the product is temporarily off FB. |
| Manual PATCH of `published_to_marketplace`?           | **Removed entirely.** Field dropped from `UpdateProductRequest`; the `update_product.py` block that applies it and the `MARKETPLACE_PUBLISH` gate check tied to it in `product_router.py` are deleted. Pydantic v2 default (`extra` not forbidden on this DTO) means a client still sending the field in a PATCH body is silently ignored — no breaking 422 for stale integrations.                      |
| Standalone "take off FB, stay PUBLISHED" action?      | **Not built.** `pause()` already covers this use case (confirmed with user).                                                                                                                                                                                                                                                                                                                             |
| Existing broken data (already `PUBLISHED` + `false`)? | **One-time Alembic migration**, backfilling `published_to_marketplace = true` for every row where `status = 'published' AND published_to_marketplace = false`.                                                                                                                                                                                                                                           |
| FB account assignment (`fb_account_ids`)?             | **Untouched.** Remains a manual, optional field independent of this fix.                                                                                                                                                                                                                                                                                                                                 |
| No active FB account for the tenant?                  | **No handling needed.** `published_to_marketplace=true` with no FB account is inert — `/fb-sync/pending` is only ever queried by an active account, so an absent account simply means nothing polls it yet.                                                                                                                                                                                              |

## Flow — before vs. after

```
BEFORE (two disconnected gates):

  review-queue                     UnifiedProductForm (edit, separate screen)
  [Aprobar] ──► status=PUBLISHED   [ ] Publicar en Facebook Marketplace
                                    └─► published_to_marketplace (defaults false,
                                        nobody remembers to come back and tick it)

AFTER (fused):

  review-queue / batch approve
  [Aprobar] ──► status=PUBLISHED
                published_to_marketplace=true      (Product.approve(), one call)

  Undo (super_admin only)
  [Deshacer aprobación] ──► status=PENDING
                            published_to_marketplace=false  (Product.reverse_publication())

  Normal lifecycle (unchanged, already correct):
  [Pausar/Reservar/Vendido] ──► status changes, published_to_marketplace stays true,
                                 _enqueue_unpublish_requests() pulls it off FB
  [Reanudar/Deshacer venta] ──► status=PUBLISHED again, flag was already true,
                                 becomes eligible for /pending automatically
```

## Surface of change

| Layer                | File                                                                   | Change                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain               | `apps/api/src/prosell/domain/entities/product.py`                      | `approve()` also sets `published_to_marketplace = True`; `reverse_publication()` also sets it to `False`                                                                                       |
| DTO                  | `apps/api/src/prosell/application/dto/product/update.py`               | Remove `published_to_marketplace: bool \| None` field                                                                                                                                          |
| Use case             | `apps/api/src/prosell/application/use_cases/product/update_product.py` | Remove the `if request.published_to_marketplace is not None:` block (~line 128-129)                                                                                                            |
| Router               | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`    | Remove the `published_to_marketplace`-tied `MARKETPLACE_PUBLISH` gate in the update endpoint (~line 1076-1079)                                                                                 |
| Migration            | `apps/api/alembic/versions/`                                           | New one-time backfill migration                                                                                                                                                                |
| Frontend             | `apps/web/src/components/forms/UnifiedProductForm.tsx`                 | Remove the "Publicar en Facebook Marketplace" checkbox and its derived state (`fbOverride`, `publishToFB`, `fbDirty`) and its contribution to the PATCH payload (~lines 280-288, 511, 757-790) |
| Frontend (unchanged) | `ProductCard.tsx`, `CatalogDetailView.tsx`                             | No changes — the existing `isPublished={product.published_to_marketplace ?? false}` read simply reflects `true` far more often now                                                             |

## Testing

Backend:

- `test_product.py` (unit) — `Product.approve()` leaves `published_to_marketplace == True`
- `test_product.py` (unit) — `Product.reverse_publication()` leaves `published_to_marketplace == False`
- `test_product_router` (integration) — `POST /{id}/approve` response includes `published_to_marketplace: true`
- `test_product_router` (integration) — `POST /batch/approve` sets it `true` for every approved product
- Rewrite `test_product_marketplace_publish_gate.py` — replace the "PATCH toggles the flag" cases with a case proving the field is now silently ignored on PATCH (value unchanged, 200 OK)
- Migration test/smoke — backfill touches only `status='published' AND published_to_marketplace=false` rows, leaves everything else untouched

Frontend:

- `UnifiedProductForm.test.tsx` — remove tests asserting the "Publicar en Facebook Marketplace" checkbox exists/behaves
- No new tests needed for `ProductCard`/`CatalogDetailView` — untouched, already covered
