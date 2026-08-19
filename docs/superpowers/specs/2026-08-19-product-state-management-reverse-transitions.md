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

| Decision                               | Choice                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| Who can reverse?                       | **super_admin only**                                             |
| FB Marketplace on PUBLISHED → PENDING? | **Auto-unpublish**                                               |
| If FB unpublish fails?                 | **Rollback completely** — do not change internal status          |
| REJECTED → PENDING direct?             | **Yes, shortcut** (skip DRAFT)                                   |
| ARCHIVED restore target?               | **Preserve previous status** (`archived_from_status` field)      |
| Other reverse transitions?             | **No** — only the 3 above in this scope                          |
| Concurrency?                           | **Optimistic locking with `version` column**                     |
| Domain events?                         | **Only new reverse transitions**                                 |
| API for available transitions?         | **Yes — `GET /available-transitions`**                           |
| UI for Deshacer?                       | **Both**: confirm dialog + product detail page                   |
| Audit log visible in UI?               | **Yes — timeline in product detail page**                        |
| Who can ARCHIVE?                       | **super_admin only** (was tenant_admin; tightens to super_admin) |

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
    1. Validate state machine + version
    2. IPublisherService.unpublish(product_id)  ← network call
    3. If unpublish returns success → entity.reverse_publication() → repo.update()
    4. If unpublish raises → return 502 Bad Gateway, status unchanged
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
    fb_unpublished: bool

class ProductResubmittedEvent(DomainEvent): ...
class ProductRestoredEvent(DomainEvent): ...
```

No listeners in this scope (events are emitted, persisted for future use; consumers like notifications/webhooks add later).

## FB Unpublish Error Handling

`IPublisherService.unpublish(product_id: UUID) -> None` must:

- Raise `PublicationUnpublishError` on any failure (network, FB API error, timeout)
- Caller (`reverse_publication` use case) catches, returns 502 with structured error
- DB status is NOT changed if unpublish fails

## UI Changes

### Confirm dialogs (post-action undo)

`ApproveConfirmDialog` and `RejectConfirmDialog` get a 5-second "Deshacer" toast after success:

> "Producto aprobado. [Deshacer]" (5s window, super_admin only)

Clicking Deshacer calls `POST /reverse` or `POST /resubmit` with the captured `version`.

### Product detail page

New section: **Transiciones disponibles** — list of buttons populated from `GET /available-transitions`. Hidden if empty (current user can't reverse, or product in terminal state).

New section: **Historial** — vertical timeline:

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

5. **`feat(products): implement reverse/resubmit/restore endpoints + use cases`**
   Three POST endpoints. TDD: tests mock `IPublisherService.unpublish` to simulate success/failure. 502 path verified.

6. **`feat(products): add IPublisherService.unpublish + transactional reverse`**
   Domain port method, infrastructure implementation against FB Graph API. Use case wraps in try/except, rolls back status on failure.

7. **`feat(products): add ProductReversedEvent + ProductResubmittedEvent + ProductRestoredEvent`**
   New `domain/events/product_events.py`. Emitted from use cases. No listeners yet.

8. **`feat(api): add GET /products/{id}/available-transitions endpoint`**
   Reads `ProductStatus.reverse_transitions()` + current product state, returns JSON list with auth check per transition.

9. **`feat(security): restrict archive() to super_admin`**
   Update `archive` use case + tests. Tenant_admins lose archive permission (breaking change).

10. **`feat(web): add Deshacer button in confirm dialogs + Transiciones menu + Historial timeline`**
    Frontend slice. Uses the new endpoints. Timeline component reads `GET /products/{id}/audit-logs` (need to add this endpoint if not present — verify during slice).

## Open Questions for Implementation Phase

- **FB unpublish timeout**: 5s default? Configurable per tenant?
- **Audit log endpoint**: `GET /products/{id}/audit-logs` doesn't exist yet — add during slice 10.
- **Bulk reverse**: not in this spec; revisit if operator demand emerges.
- **Notifications**: should `ProductReversedEvent` trigger an email/notification to the original reviewer? Out of scope, deferred.

## Risk Assessment

- **Race conditions**: Optimistic locking covers concurrent edits. Network-level races (two admins reverse same product simultaneously) → second loses with 412, retries.
- **FB API reliability**: unpublish failures cause reverse to abort with 502. Admin must retry after FB recovers. No silent half-state.
- **Data migration**: existing archived products without `archived_from_status` → 409 on restore until manual fixup. Acceptable since archived products are rarely restored.
- **Permission regression**: tenant_admins lose `archive` permission. Document in release notes, communicate to existing tenants before deploy.

## Acceptance Criteria

- All 3 reverse endpoints work end-to-end with TDD coverage
- Optimistic locking enforced (412 on stale version)
- FB unpublish failure → 502, status unchanged, audit log not written
- Domain events emitted on success
- UI shows Deshacer in confirm dialogs (5s window) and Transiciones menu in detail page
- Historial timeline visible to super_admin and tenant_admin in detail page
- Archive permission restricted to super_admin
- All hooks green (ruff, pyright, GGA, pytest)
