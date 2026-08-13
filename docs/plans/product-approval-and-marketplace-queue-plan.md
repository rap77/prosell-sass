# Product Approval and Marketplace Queue Plan

## Goal

Turn draft inventory into reviewed, publishable ProSell products through a
mobile-first batch approval workflow. A product becomes eligible for FB AutoPost
only after its commercial status is `published`, Marketplace is explicitly
enabled, and one or more Facebook accounts are assigned.

The workflow must keep ProSell inventory availability separate from each
Facebook listing's publication state.

## Confirmed Decisions

- `Product.status` is the source of truth for commercial inventory availability.
- `published` means approved and available in ProSell. It does not mean that an
  advertisement already exists on Facebook.
- `paused` is the existing state for maintenance. Do not add a separate
  `maintenance` status.
- `published_to_marketplace` is a separate opt-in; it may only be enabled for a
  product whose status is `published`.
- A product must be assigned to one or more Facebook accounts, or use the
  organization default account policy, before the bot can retrieve it.
- Approval and rejection must support selecting multiple pending products.
- Batch operations return a result for every selected product. One invalid or
  concurrently changed product must not prevent valid products in the batch
  from being processed.
- A shared rejection reason is required for a batch rejection. Reject products
  individually when their reasons differ.
- Existing `reserved`, `paused`, and `sold` transitions enqueue removal work for
  active Facebook listings. Maintain that behavior.

## State Model

### Commercial product lifecycle

```text
draft -> pending -> published -> paused -> published
                         |
                         +-> reserved -> published
                         +-> sold -> archived
                         +-> archived

pending -> rejected -> draft
```

| State       | Meaning                                         | Eligible for new Facebook publication                   |
| ----------- | ----------------------------------------------- | ------------------------------------------------------- |
| `draft`     | Being created or edited                         | No                                                      |
| `pending`   | Submitted for review                            | No                                                      |
| `published` | Approved and commercially available             | Yes, if Marketplace opt-in and account assignment exist |
| `paused`    | Temporarily unavailable, including maintenance  | No                                                      |
| `reserved`  | Held for a buyer                                | No                                                      |
| `sold`      | Sale completed                                  | No                                                      |
| `rejected`  | Review failed; may be corrected and resubmitted | No                                                      |
| `archived`  | Removed from active inventory                   | No                                                      |

### Facebook publication lifecycle

This is a separate per-product, per-Facebook-account projection.

```text
eligible -> queued -> publishing -> active
                         |             |
                         +-> failed    +-> deleted
```

`active` is written only after Facebook confirms the listing. A later
commercial availability change to `paused`, `reserved`, `sold`, or `archived`
must enqueue deletion requests for every active listing.

## User Flows

### Seller submits a product

1. Seller completes the product form while it is `draft`.
2. Seller chooses `Enviar a revisión`.
3. The client calls `POST /api/v1/products/{product_id}/submit`.
4. ProSell transitions `draft` or `rejected` to `pending`.
5. The item enters the reviewer queue. It cannot be sent to Facebook yet.

### Reviewer approves products in bulk

1. A `MASTER` or `VERIFIER` opens `Revisión de inventario`.
2. The default filter is `pending`; filters include organization, category,
   assigned account, completeness, and submitted date.
3. The reviewer selects one or more rows using native checkboxes.
4. A persistent batch action bar shows the selected count plus `Aprobar`,
   `Rechazar`, and `Limpiar selección`.
5. `Aprobar` opens a confirmation dialog summarizing selection count and data
   warnings. It must clearly distinguish blocking validation failures from
   warnings.
6. The server processes every selected product independently and returns an
   itemized result.
7. Successful items transition `pending -> published`; unsuccessful items stay
   `pending` and show a reason.
8. The UI shows a result summary and keeps failed IDs selected so the reviewer
   can resolve them.

### Reviewer rejects products in bulk

1. The reviewer selects pending rows and chooses `Rechazar`.
2. The confirmation dialog requires one shared reason with an explicit note
   that it will be recorded on every selected item.
3. The server processes rows independently.
4. Successful items transition `pending -> rejected` and retain the reason.
5. The UI reports successes and failures per item.

### Enable Facebook publication

1. After approval, an authorized operator opens the product detail or edit
   form.
2. They enable `Publicar en Facebook Marketplace` and select the target
   Facebook accounts, unless an organization default applies.
3. The product becomes eligible for the bot only when all are true:
   - `status == published`
   - `published_to_marketplace == true`
   - the account is authorized and assigned or inherited from organization policy
4. The bot claims the item before it opens Facebook. A claim prevents duplicate
   work by other bot instances.

### Change availability after publication

| Operator action    | Product transition             | Facebook effect                              |
| ------------------ | ------------------------------ | -------------------------------------------- |
| En mantenimiento   | `published -> paused`          | Queue removal of active listings             |
| Apartar            | `published -> reserved`        | Queue removal of active listings             |
| Marcar vendido     | `published/reserved -> sold`   | Queue removal of active listings             |
| Volver a publicado | `paused/reserved -> published` | Eligible again; no automatic Facebook repost |

## API Plan

### Reuse and correct existing single-product endpoints

- `POST /api/v1/products/{product_id}/submit`
- `POST /api/v1/products/{product_id}/approve`
- `POST /api/v1/products/{product_id}/reject`
- `POST /api/v1/products/{product_id}/pause`
- `POST /api/v1/products/{product_id}/resume`
- `POST /api/v1/products/{product_id}/reserve`
- `POST /api/v1/products/{product_id}/mark-sold`

Remove the current frontend behavior that sends `PATCH { status: "published" }`.
The update DTO intentionally does not accept a status field; lifecycle changes
must use explicit transition endpoints.

### Add batch review endpoints

Define request and response DTOs in the application boundary. Do not accept a
tenant identifier from the client.

```text
POST /api/v1/products/batch/approve
{
  "product_ids": ["uuid", "uuid"]
}

POST /api/v1/products/batch/reject
{
  "product_ids": ["uuid", "uuid"],
  "reason": "Missing required vehicle documentation"
}

200
{
  "results": [
    { "product_id": "uuid", "status": "approved" },
    { "product_id": "uuid", "status": "failed", "error_code": "invalid_transition", "message": "Product is no longer pending" }
  ]
}
```

Requirements:

- Require `MARKETPLACE_PUBLISH` and preserve the existing `MASTER`/`VERIFIER`
  authorization rule for approval/rejection.
- Scope every loaded product to the authenticated user's tenant unless the
  existing cross-organization administrator rule explicitly applies.
- Deduplicate IDs, reject an empty selection, and cap the batch size. Start
  with 100 products.
- Use one transaction per product or savepoints so partial success is possible
  without corrupting the batch.
- Never turn a non-pending product into `published` or `rejected`.
- Return stable machine-readable error codes for the UI.

### Future bot claim

Before enabling unattended Facebook publication, add a claim/lease endpoint:

```text
POST /api/v1/fb-sync/claims
```

It must atomically validate eligibility, create or update the per-account
publication state to `publishing`, issue a short-lived run ID, and require that
run ID on the completion callback. The callback must re-check that the product
is still `published` and Marketplace-enabled before it records an active
listing.

## UI and Interaction Requirements

### Review queue

- Add a dedicated `Revisión de inventario` route rather than overloading the
  seller's simple product list.
- Use a dense but scannable table on desktop: selection, vehicle, organization,
  price, completeness, Facebook readiness, submitted date, and row actions.
- On narrow viewports, render selectable cards or a horizontally scrollable
  table with the same semantics; never compress columns until labels become
  unreadable.
- Use native checkbox controls. Support keyboard selection and visible focus.
- Preserve selected items while client-side filters change. Clear selection only
  when the reviewer chooses `Limpiar selección` or after successful items leave
  the pending queue.
- Show loading skeletons, no-results states, and recoverable mutation errors.
- The batch bar must expose a textual selected count; color alone cannot convey
  state.

### Dialogs and result feedback

- Approval requires confirmation but no text input.
- Batch rejection requires a reason and disables confirmation until it is
  present.
- Show an itemized result panel after each batch operation, including product
  title, outcome, and error detail where relevant.
- Use optimistic UI only if rollback preserves selection and accurately restores
  the server state. A safer first implementation is to invalidate and refetch
  product/review queries after the batch response.

### Existing design system

- Reuse the current ProSell semantic classes and `ps-*` tokens; do not introduce
  a standalone visual theme, raw hex colors, or `var()` inside `className`.
- Reuse established `Button`, `Dialog`, Lucide icon, React Query, toast, and
  catalog action patterns.
- Support the existing light and dark themes. Validate foreground, muted text,
  borders, selected rows, warning, error, and focus states in both themes.
- Build mobile-first, with touch targets at least 44px and action bars that do
  not obscure selected rows or dialog controls.

## Delivery Sequence

1. Add backend tests for individual transitions that protect current behavior.
2. Add batch approval/rejection request/response DTOs, use case, endpoints, and
   integration tests for authorization, tenant scoping, duplicates, concurrent
   transitions, and partial results.
3. Correct the draft `Enviar a revisión` frontend action to call `/submit`.
4. Add typed frontend API functions and React Query mutations for submit and
   batch review.
5. Implement the review queue, selection model, dialogs, and result feedback.
6. Add component tests using `userEvent` for selection, bulk confirm, required
   rejection reason, partial failure, keyboard access, and both responsive
   layouts where feasible.
7. Verify dark and light themes at 320px, 768px, 1024px, and 1440px.
8. Add the bot claim/lease only after the commercial review workflow is stable.
9. Resume supervised Facebook form calibration only with a valid approved,
   Marketplace-enabled, account-assigned vehicle.

## Acceptance Criteria

- A seller can move a draft product to pending from the UI.
- A reviewer can approve or reject one or many pending products.
- A batch returns per-product results without losing valid successes because one
  item failed.
- A rejection cannot be submitted without a reason.
- Only a published product with Marketplace opt-in and valid account assignment
  reaches the bot's pending endpoint.
- Paused, reserved, sold, and archived inventory never reaches new bot work and
  queues removal for active Facebook listings.
- The review queue is keyboard-operable, mobile-first, and legible in light and
  dark themes.

## Design Prompt

Use this prompt when commissioning a design pass or frontend implementation:

```text
You are designing and implementing the ProSell B2B dealership inventory review
workflow. Work inside this repository. First inspect the existing ProSell
design system, UI tokens, shared Button/Dialog components, catalog pages,
AvailabilityActions, and theme behavior. Preserve the established visual
language; do not introduce a new brand, raw color values, generic dashboard
cards, gradients, or a dark-only design.

Build mobile-first and support the existing light and dark themes. Use semantic
`ps-*` Tailwind classes only; never use `var()` inside className. Reuse Lucide
icons and current React Query mutation/toast patterns. Design and implement a
dedicated `Revisión de inventario` queue for MASTER and VERIFIER users.

The queue lists pending products and supports multi-select approval and
rejection. Desktop may use a dense, scannable table. On mobile use selectable
cards or accessible horizontal table scrolling; do not crush important columns.
Use native checkboxes, visible keyboard focus, touch targets of at least 44px,
and a persistent batch action bar with selected count, Approve, Reject, and
Clear selection.

Approval opens a confirmation dialog with selection count and validation
warnings. Rejection opens a dialog requiring one shared reason. Batch responses
are per-product: show successes and failures together, retain failed selections,
and do not hide partial failures. Include loading skeletons, empty states, and
recoverable error states. Do not rely only on color to convey status.

Respect this commercial state machine:
draft -> pending -> published; published -> paused (maintenance), reserved, or
sold; paused/reserved -> published; sold -> archived. `published` means
commercially available in ProSell, not published on Facebook. Facebook becomes
eligible only when published_to_marketplace is enabled and an account assignment
exists. Preserve current pause/reserve/sold behavior that queues Facebook
listing removals.

Before coding, report the existing design primitives you will reuse, the
responsive behavior at 320px/768px/1024px/1440px, and the light/dark token
strategy. Then implement the smallest coherent change with tests using
userEvent and role-based queries. Do not use useMemo or useCallback unless the
existing code requires it.
```

## Relevant Existing Files

- `apps/api/src/prosell/domain/value_objects/product_status.py`
- `apps/api/src/prosell/domain/entities/product.py`
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py`
- `apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py`
- `apps/web/src/app/(seller)/products/page.tsx`
- `apps/web/src/components/catalog/AvailabilityActions.tsx`
- `apps/web/src/components/catalog/CatalogDetailView.tsx`
- `apps/web/src/lib/api/products.ts`
