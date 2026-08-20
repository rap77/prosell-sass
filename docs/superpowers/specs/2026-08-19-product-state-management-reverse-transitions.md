# Product State Management — Reverse Transitions Spec

**Status**: APPROVED (pending implementation)
**Date**: 2026-08-19
**Owner**: backend (ProSell SaaS)
**Prerequisite**: audit log (commit `ff3ebb61`)

## Problem

`ProductStatus` is a one-way state machine: PUBLISHED, REJECTED, ARCHIVED have no escape route back to PENDING. Operators cannot correct wrong approvals, rejections, or accidental archives — every decision is permanent. The audit log (`ff3ebb61`) gives us the observability to safely add reversibility; we need the transition endpoints themselves.

## Goals

- Operators can correct wrong approvals (PUBLISHED → PENDING)
- Operators can re-submit a corrected product without DRAFT round-trip (REJECTED → PENDING)
- Operators can restore archived products to the state they had before archiving
- All transitions are auditable, concurrent-safe, and gated by role
- FB Marketplace side effects on reverse transitions are transactional (no inconsistent half-state)

## Non-Goals

- Bulk reverse operations (single product only)
- Undoing SOLD transitions (commercial event, irreversible)
- New forward transitions (state machine stays as-is)
- Refactoring existing forward transitions to emit domain events (out of scope)

## Decisions

| Decision                               | Choice                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Who can reverse?                       | **super_admin only**                                                                   |
| FB Marketplace on PUBLISHED → PENDING? | **Auto-unpublish, async** (reuses the existing durable queue)                          |
| If FB unpublish fails?                 | **No rollback** — status already changed; queue retries up to 3x (see amendment below) |
| REJECTED → PENDING direct?             | **Yes, shortcut** (skip DRAFT)                                                         |
| ARCHIVED restore target?               | **Preserve previous status** (`archived_from_status` field)                            |
| Other reverse transitions?             | **No** — only the 3 above in this scope                                                |
| Concurrency?                           | **Optimistic locking with `version` column**                                           |
| Domain events?                         | **Only new reverse transitions**                                                       |
| API for available transitions?         | **Yes — `GET /available-transitions`**                                                 |
| UI for Deshacer?                       | **Both**: confirm dialog + product detail page                                         |
| Audit log visible in UI?               | **Yes — timeline in product detail page**                                              |
| Who can ARCHIVE?                       | **super_admin only** (was tenant_admin; tightens to super_admin)                       |

> **Amendment (slice 5, 2026-08-20)**: the original FB Unpublish Error
> Handling design below (synchronous `IPublisherService.unpublish()` call,
> 502 on failure, full rollback) was written without checking how this
> codebase actually removes FB listings. It doesn't — every other status
> transition that needs to pull a listing (`reserve`, `mark_sold`, `pause`)
> enqueues a row in the existing durable `fb_unpublish_requests` queue via
> `_enqueue_unpublish_requests()` and returns immediately; a separate bot
> polls `GET /unpublish-pending` and reports back via
> `POST /unpublish-callback`, retrying up to `MAX_UNPUBLISH_ATTEMPTS = 3`
> with no effect on the product's status either way. `reverse_publication`
> reuses that exact mechanism instead of introducing a second, parallel FB
> integration pattern. See the corrected "FB Unpublish Handling" section
> (replacing "FB Unpublish Error Handling") below for the concrete
> behavior — the `IPublisherService.unpublish()` port method described
> further down is **not implemented**; slice 6 is dropped.

## State Machine — Updated

```
                          super_admin
                 ┌──────────────────────────┐
                 │                          │
                 ▼                          │
              PENDING ──────► PUBLISHED ────┤  reverse_publication()
                 │               │          │  (also unpublishes FB)
                 │               │          │
              REJECTED �───── PUBLISHED    │
                 │     (resubmit,           │
                 │      super_admin)        │
                 ▼                          │
              DRAFT                         │
                 │                          │
              ARCHIVED ─────────────────────┘  restore()
              (stores archived_from_status)    (back to previous status)

Forward-only transitions (existing, unchanged):
  DRAFT     → PENDING, ARCHIVED
  PAUSED    → PUBLISHED, ARCHIVED
  RESERVED  → PUBLISHED, SOLD, ARCHIVED
  SOLD      → ARCHIVED
```

Terminal state: **SOLD** (irreversible, commercial event).
ARCHIVED is reversible only by `restore()` returning to `archived_from_status`.

## Data Model Changes

Two new columns on `products` (migration `20260818_0002` and `_0003`):

```sql
-- 0002 — optimistic locking
ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 0003 — restore target
ALTER TABLE products ADD COLUMN archived_from_status VARCHAR(20);
```

Backwards-compat: existing archived rows have `archived_from_status = NULL`. On first restore attempt, return **409 Conflict** with code `archived_before_reverse_transitions_feature` so admin must explicitly choose a target status (via admin tool / SQL) — no silent fallback to DRAFT.

## API Changes

### New endpoints

```
POST /api/v1/products/{id}/reverse
  Auth: super_admin
  Headers: If-Match: <version>
  Effect: PUBLISHED → PENDING
  Steps:
    1. Fetch product, compare If-Match header to product.version → 412 on mismatch
    2. entity.reverse_publication() → repo.update() (also enforces version, belt-and-suspenders)
    3. _enqueue_unpublish_requests() — same durable queue reserve/mark_sold/pause use.
       Fire-and-forget: the bot removes the listing later, retrying up to 3x. No
       synchronous FB call, no 502 path, no rollback of the status change.
  Audit: ProductAuditLog row (auto via repo.update())
  Event:  ProductReversedEvent

POST /api/v1/products/{id}/resubmit
  Auth: super_admin
  Headers: If-Match: <version>
  Effect: REJECTED → PENDING
  Audit + event: ProductResubmittedEvent

POST /api/v1/products/{id}/restore
  Auth: super_admin
  Headers: If-Match: <version>
  Effect: ARCHIVED → products.archived_from_status (or 409 if NULL)
  Audit + event: ProductRestoredEvent

GET /api/v1/products/{id}/available-transitions
  Auth: any authenticated user (returns empty if no transitions valid)
  Returns: [{
    "to_status": "pending",
    "endpoint": "POST /products/{id}/reverse",
    "requires_role": "super_admin",
    "side_effects": ["fb_unpublish"],
    "method": "reverse_publication"
  }, ...]
```

### Header requirement

All reverse endpoints require `If-Match: <version>` header. Server compares to current `products.version`. Mismatch returns **412 Precondition Failed** (HTTP standard for version conflict on update).

## Concurrency Model

- `products.version` starts at 1
- `SqlAlchemyProductRepository.update()` increments version automatically (same flush as audit log)
- Client must read current version (e.g., from `GET /products/{id}`) before calling reverse endpoint
- Server returns 412 if client-provided version ≠ DB version
- Client retries by re-fetching and re-issuing (UI shows "Product was modified by someone else, try again")

## Domain Events (new)

Three new events in `domain/events/product_events.py`:

```python
class ProductReversedEvent(DomainEvent):
    product_id: UUID
    tenant_id: UUID
    reversed_by_user_id: UUID
    old_status: ProductStatus  # always PUBLISHED
    new_status: ProductStatus  # always PENDING
    fb_unpublish_queued: bool  # True if >=1 active publication got a queue row

class ProductResubmittedEvent(DomainEvent): ...
class ProductRestoredEvent(DomainEvent): ...
```

> **Amendment (slice 7, 2026-08-20)**: these three classes are declared but
> **not instantiated anywhere** — there is no `IDomainEventBus` in this
> codebase at all (despite being named in CLAUDE.md's architecture
> patterns), and the pre-existing `UserRegisteredEvent`/etc. in
> `user_events.py` are never emitted either. Wiring an event through with
> nothing to consume it (no bus, no log, no persistence) is pure noise, so
> the endpoints from slice 5 do not construct these. They exist as
> scaffolding for a future bus/listener. "No listeners in this scope" below
> undersells it — there is no _emission_ in this scope either.

No listeners in this scope (events are declared, persisted for future use; consumers like notifications/webhooks add later, at which point emission from the endpoints should be added too).

## FB Unpublish Handling

Corrected per the amendment above. `reverse_publication` does **not** call FB
synchronously — it reuses the existing durable-queue mechanism:

- After `entity.reverse_publication()` + `repo.update()` succeed, the endpoint
  calls the same `_enqueue_unpublish_requests(db, product)` helper that
  `reserve`, `mark_sold`, and `pause` already call — one idempotent
  `FBUnpublishRequestModel` row per active `FBPublicationStatusModel`
  (`ON CONFLICT DO NOTHING` on `(publication_status_id)`, so re-calling is safe)
- A separate bot polls `GET /unpublish-pending` and reports outcomes via
  `POST /unpublish-callback`; failures increment `attempt_count` and retry up
  to `MAX_UNPUBLISH_ATTEMPTS = 3`, logging `last_error`
- The product's status is **never rolled back** because of an FB failure —
  it already changed to PENDING synchronously in the same request. This
  matches how `reserve`/`mark_sold`/`pause` already behave: the internal
  status and the FB listing state are allowed to be briefly inconsistent,
  reconciled asynchronously by the bot
- If the product had no active FB publications, no queue row is created and
  `ProductReversedEvent.fb_unpublish_queued` is `False` — this is a normal
  case (e.g. it was published but never actually pushed to any FB account)

## UI Changes

> **Amendment (slice 10, 2026-08-20)**: the "Confirm dialogs" design below
> assumed `ApproveConfirmDialog`/`RejectConfirmDialog` are per-product
> dialogs the admin sees right after approving/rejecting ONE product. They
> aren't — `apps/web/src/app/(admin)/admin/review-queue/page.tsx` only
> exposes BATCH approve/reject (`ApproveConfirmDialog`/`RejectConfirmDialog`
> confirm a multi-product batch, not one product), and there is no
> single-product approve/reject/archive UI anywhere in the frontend to hang
> a per-product 5s toast off of — building one would be new scope well
> beyond this feature. It also wouldn't make sense for a batch action
> anyway: `POST /reverse` operates on exactly one product with one
> `If-Match` version, so a "Deshacer" after approving 40 products at once
> has no single target. Dropped in favor of a persistent, discoverable
> "Transiciones disponibles" section on the product detail page (see
> below) — an always-available action beats a disappearing 5s window for
> an admin who might not even be looking at the screen when the toast
> fires.

### Product detail page

The detail page is `apps/web/src/app/(seller)/catalog/[id]/page.tsx` →
`CatalogDetailView.tsx` (not a page named "products" — the route is
`/catalog/[id]`). Two new sections added to its right column, alongside
the existing title/price/status and vehicle-attributes `SectionCard`s:

New section: **Transiciones disponibles** — list of buttons populated from `GET /available-transitions`. Hidden if empty (current user can't reverse, or product in terminal state). Each button is disabled (with a tooltip) for a non-super_admin viewer instead of hidden, per the endpoint's `requires_role` field — matches the endpoint being readable by any authenticated user.

New section: **Historial** — vertical timeline, visible only to super_admin/admin (hidden entirely for other roles, on top of the backend's own 403). Mirrors the existing `LeadAuditTrail.tsx` pattern: the "who" column shows the raw `changed_by_user_id`, not a resolved name — `LeadAuditTrail` does the same (no name-resolution mechanism exists in this codebase for audit "who" fields), so the spec's mockup below (`Juan Pérez (admin@prosell)`) is illustrative, not literal:

```
[PUBLISHED → PENDING]    Juan Pérez (admin@prosell)
                         hace 2 horas
                         "Revertido por error"

[PUBLISHED]              María López
                         ayer 14:32

[APPROVED]               María López
                         ayer 14:30
```

Each entry shows: transition, who, when, optional reason. Backed by `GET /products/{id}/audit-logs`.

## Permissions Change

`archive()` currently allows any user with `products:update`. After this spec, **archive requires super_admin role**. This is a breaking change for tenant_admins — call out in release notes.

## Implementation Slices

Each slice = TDD (red → green), 1 commit, hooks green:

1. **`feat(state-machine): add reverse transition map to ProductStatus`**
   `ProductStatus.transitions()` + new `reverse_transitions()` map; pure value-object change; covered by unit tests.

2. **`feat(products): add reverse_publication, resubmit, restore entity methods`**
   `Product.reverse_publication(user_id, reason)`, `Product.resubmit(user_id)`, `Product.restore(user_id)`. Validates state, mutates fields, raises `InvalidStateTransitionError` on bad source.

3. **`feat(products): add archived_from_status field with migration`**
   Alembic migration `20260818_0003`. Nullable. Existing rows have NULL → 409 on restore until manual fixup.

4. **`feat(products): add optimistic locking with version column`**
   Migration `20260818_0002`. `Product.version: int`. `repo.update()` increments + rejects stale (412). All `If-Match: <version>` headers validated.

5. **`feat(api): implement reverse/resubmit/restore endpoints`** (revised 2026-08-20, see amendment)
   Three POST endpoints, inline in `product_router.py` — matching the existing
   `pause`/`reserve`/`mark_sold`/`reject` pattern in this router (fetch →
   entity method → `repo.update()` → optional side effect), not standalone
   use case classes; that pattern here is reserved for logic reused across
   batch endpoints, which these three aren't. `/reverse` additionally calls
   `_enqueue_unpublish_requests()` on success. Gated via
   `current_user.has_role("super_admin")`, matching the in-memory role check
   already used elsewhere in this router (not the DB-backed `require_role()`
   dependency used in `org_router.py`, which needs no test-fixture changes
   here). TDD: integration tests cover the happy path, 403 (non-super-admin),
   404, 409 (invalid source status / missing `archived_from_status`), and 412
   (If-Match mismatch). No 502 path — see FB Unpublish Handling above.

6. ~~`feat(products): add IPublisherService.unpublish + transactional reverse`~~ — **dropped** (see amendment above; folded into slice 5 as an `_enqueue_unpublish_requests()` call)

7. **`feat(products): add ProductReversedEvent + ProductResubmittedEvent + ProductRestoredEvent`**
   New `domain/events/product_events.py`. Emitted from use cases. No listeners yet.

8. **`feat(api): add GET /products/{id}/available-transitions endpoint`**
   Reads `ProductStatus.reverse_transitions()` + current product state, returns JSON list with auth check per transition.

9. **`feat(security): restrict archive() to super_admin`**
   Update `archive` use case + tests. Tenant_admins lose archive permission (breaking change).

10. **`feat(web): add Transiciones disponibles + Historial to the catalog detail page`** (revised 2026-08-20, see amendment)
    Frontend slice, `apps/web/src/components/catalog/CatalogDetailView.tsx`. `GET /products/{id}/audit-logs` added as a prerequisite (commit before this slice). No Deshacer confirm-dialog toast — dropped per amendment, replaced by the persistent Transiciones disponibles section.

## Open Questions for Implementation Phase

- ~~**FB unpublish timeout**: 5s default? Configurable per tenant?~~ — moot after the amendment; the bot's polling/retry cadence is a pre-existing, out-of-scope concern, not something this endpoint controls.
- **Audit log endpoint**: `GET /products/{id}/audit-logs` doesn't exist yet — add during slice 10.
- **Bulk reverse**: not in this spec; revisit if operator demand emerges.
- **Notifications**: should `ProductReversedEvent` trigger an email/notification to the original reviewer? Out of scope, deferred.

## Risk Assessment

- **Race conditions**: Optimistic locking covers concurrent edits. Network-level races (two admins reverse same product simultaneously) → second loses with 412, retries.
- **FB API reliability**: unpublish failures do NOT abort `reverse` — the status change already landed, and the queue retries removal up to 3x independently. This is a deliberate consistency trade-off shared with `reserve`/`mark_sold`/`pause`, not new risk introduced by this spec.
- **Data migration**: existing archived products without `archived_from_status` → 409 on restore until manual fixup. Acceptable since archived products are rarely restored.
- **Permission regression**: tenant_admins lose `archive` permission. Document in release notes, communicate to existing tenants before deploy.

## Acceptance Criteria

- All 3 reverse endpoints work end-to-end with TDD coverage
- Optimistic locking enforced (412 on stale version)
- `reverse` enqueues durable FB removal work via the existing queue (no synchronous FB call, no 502 path)
- ~~Domain events emitted on success~~ — revised: declared, not emitted (no event bus exists to emit through; see amendment in Domain Events section)
- ~~UI shows Deshacer in confirm dialogs (5s window)~~ — revised: persistent Transiciones disponibles section on the product detail page instead (no per-product confirm dialog exists to attach a toast to; see amendment in UI Changes)
- Historial timeline visible to super_admin and tenant_admin in detail page
- Archive permission restricted to super_admin
- All hooks green (ruff, pyright, GGA, pytest)
