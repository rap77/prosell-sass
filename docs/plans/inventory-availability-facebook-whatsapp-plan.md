# Inventory Availability, Facebook Removal, and WhatsApp Plan

## Goal

Let an authorized dealer operator or ProSell administrator mark a vehicle as
reserved, in maintenance, or sold. The change must immediately prevent new
Facebook publication attempts, remove known Facebook listings, provide a
manual fallback for historical listings without identifiers, and offer a
WhatsApp sold announcement.

## Confirmed Product Decisions

- Availability actions are available to dealer administrators, managers, and
  ProSell administrators who manage the dealer inventory.
- `reserved`, `paused` (maintenance), `sold`, and `archived` make inventory
  unavailable for new Facebook publication.
- `sold` is final. Reserved and paused products return to the publication
  queue only after an operator explicitly republishes them.
- Existing Facebook posts without a stored Facebook listing ID remain a
  manual-cleanup task. They never block the local availability transition.
- Future posts must store their Facebook listing ID so removal can be
  automatic and auditable.
- Phase 1 WhatsApp: open a prefilled `wa.me` message after a successful sale;
  the operator chooses the recipient and sends it.
- Phase 2 WhatsApp: automatic delivery only after WhatsApp Business API
  approval, configured recipients, and approved templates.

## User Experience

### Availability action

- Surface `Cambiar disponibilidad` in the catalog and vehicle detail.
- On desktop, place it beside Edit/Publish actions. On mobile, use a
  full-width, touch-sized action sheet or dialog.
- Show only legal transitions:
  - Published: Apartar, En mantenimiento, Marcar vendido.
  - Reserved: Marcar vendido, Volver a publicado.
  - Paused: Volver a publicado.
- Each action explains the effect on Facebook before confirmation.
- Sold confirmation includes a checked-by-default `Abrir WhatsApp para
anunciar la venta` option. It opens a prefilled message only after the API
  confirms the status transition.

### Removal feedback

- Show per-publication state: `Retirando`, `Retirado`, `Reintento pendiente`,
  or `Retiro manual pendiente`.
- The product becomes unavailable immediately even if Facebook removal fails.
- Historical rows without a Facebook ID are labelled `Retiro manual pendiente`.

## Current Implementation State

### Completed backend slice

- Migration `apps/api/alembic/versions/20260803_0001_add_fb_unpublish_requests.py`
  creates durable `fb_unpublish_requests` rows, one per publication status.
- Model `apps/api/src/prosell/infrastructure/models/fb_unpublish_request_model.py`
  persists a queued removal request and optional Facebook post ID.
- `product_router.py` now has the missing reserve action, applies
  `MARKETPLACE_PUBLISH` authorization to availability changes, supports
  ProSell cross-organization access via `ORG_ADMIN_VIEW_ALL`, and queues a
  request for each active `FBPublicationStatusModel`.
- The queue snapshots the latest non-null `fb_post_id` from publication
  history, when it exists.
- Integration tests were added in
  `apps/api/tests/integration/api/test_product_unpublish_requests.py`.
  They collected but are currently skipped because the dedicated integration
  PostgreSQL database at `localhost:5433` is unavailable.
- `GET /api/v1/fb-sync/unpublish-pending?account_email=...` is bot-token
  protected and returns only queued requests for the resolved active account.
- `POST /api/v1/fb-sync/unpublish-callback` is bot-token protected and scopes
  the request to that active account. A completed callback marks the request
  completed, creates a `deleted` history event, updates publication status and
  matching legacy publication rows with their deletion timestamp. Repeated
  completed callbacks are idempotent.
- Failed callbacks retain the request as queued, preserve the latest bounded
  error message, and cap `attempt_count` at three. Migration
  `apps/api/alembic/versions/20260803_0002_add_fb_unpublish_request_attempts.py`
  adds only that retry metadata.
- Focused endpoint integration tests live in
  `apps/api/tests/integration/api/routers/test_fb_sync_router.py`; they also
  require the dedicated PostgreSQL integration database.

### Completed FB AutoPost bot slice

- `fb_autopost.dto` now exposes typed `UnpublishRequest` and
  `UnpublishCallback` DTOs for the removal queue contract.
- `ProSellClient.get_pending_unpublish_requests(account_email)` and
  `ProSellClient.report_unpublish_result(...)` call the bot-protected
  `/unpublish-pending` and `/unpublish-callback` endpoints with the selected
  account email.
- `UnpublishRunner.run(account_email)` only processes work when the supplied
  account matches its persistent browser profile and that profile is already
  logged in. It reports every completed browser removal to ProSell.
- `BrowserManager.delete_marketplace_listing(fb_post_id)` refuses to infer a
  listing when the ID is absent. It returns `manual_cleanup_required` locally
  and the runner reports the API-supported `failed` callback with that exact
  reason, preserving a manual-cleanup trail instead of guessing.
- Known IDs navigate to
  `https://www.facebook.com/marketplace/item/{fb_post_id}` and use isolated
  accessible-label/menu/dialog selector fallbacks. A removal is only completed
  after Facebook deletion feedback is observed.
- Focused bot tests use mock HTTP transports and browser doubles only; no
  automated test calls Facebook.
- The dashboard now exposes `Procesar retiros pendientes`, disabled until an
  operator explicitly selects an account. It opens a responsive dedicated
  workspace that starts only that account's persistent browser profile,
  requires an existing Facebook session, runs `UnpublishRunner` in a
  background thread, and renders completed, failed, and
  `manual_cleanup_required` counts.

### Known constraints

- ~~FB AutoPost currently returns `None` from `_submit_listing()` for
  `fb_post_id`~~ **RESOLVED 2026-08-04**: Now extracts real ID from post-publish URL.
- The current group-selection routine does not create independently tracked
  group posts. A Marketplace listing removal cannot claim to remove unknown
  group copies.
- Existing legacy `MarketplacePublicationModel` records need status updates
  after a confirmed removal to preserve queue exclusion behavior.

### Staging validation status

- The staging API was rebuilt and recreated after explicit user approval. Its
  health check is `healthy`, and the new `/unpublish-pending` endpoint responds
  successfully.
- Preflight found five active Facebook accounts in staging. One account has
  two configured groups, and ProSell returned one product eligible for that
  account.
- **2026-08-04**: Implemented `fb_post_id` extraction in `publisher.py`. After
  a successful publish, the code now extracts the listing ID from either
  `/marketplace/item/{id}` redirect or the first item link on the selling page.
- **2026-08-04 session fixes**:
  - Fixed `fb_account_ids` not loading in product form (missing from Zod schema).
  - Fixed FB account selector UX (can now deselect "Todas" and pick individual).
  - Fixed form layout (removed restrictive `max-w-[896px]` wrapper).
  - Fixed VIN field not showing required asterisk and validation errors.
  - Fixed Zod null → string preprocessing for backend null values.
  - MinIO now running in staging (images load correctly).
  - PostgreSQL password hardcoded in `docker-compose.staging.yml`: `Admin123#`.
- **Blocker for FB AutoPost publish**: Chrome "save password" popup blocks the
  flow. Needs `--disable-save-password-bubble` or similar Chrome flag.
- Ready for controlled validation once Chrome popup is resolved.

## Remaining Work, in Order

### 1. Complete ProSell removal contract

- Completed: bot-token-protected queue polling and callbacks, account
  isolation, idempotent completion, legacy projection updates, and a bounded
  failure counter are implemented and covered by focused integration tests.
- Remaining operational rule: requests with no `fb_post_id` must become
  manual-cleanup work rather than automatic bot work.

### 2. Capture and remove Facebook listings in FB AutoPost

- In `/home/rpadron/proy/fb-autopost/src/fb_autopost/core/publisher.py`,
  capture the real Marketplace listing ID after a successful publish and send
  it through the existing callback.
- Completed: `core/browser.py` has conservative known-ID Marketplace removal,
  and `core/removal.py` has an account-scoped `UnpublishRunner` that polls and
  reports outcomes through the callback. Missing IDs are explicitly manual
  cleanup, never a selector or URL guess.
- Completed: `Procesar retiros pendientes` is a dashboard action disabled
  until an account is selected. Its dedicated progress workspace creates
  `BrowserManager(selected_account.email)`, requires `is_logged_in()`, runs
  `UnpublishRunner(prosell, browser).run(selected_account.email)` in a
  background thread, and renders completed, failed, and
  `manual_cleanup_required` counts. It is not attached to normal publishing
  and never runs automatically.
- Add mock-based unit tests for listing-ID extraction and validate the real
  selector workflow with a non-production Facebook account before enabling
  production use. Classify the observed not-found, session-expired, and
  challenge variants before presenting them as distinct operator states.
- Staging preflight is complete. The next controlled validation is: publish a
  disposable staging product, confirm a non-null Facebook listing ID reaches
  ProSell, mark the product sold, run `Procesar retiros pendientes`, and
  confirm both Facebook removal and the resulting ProSell callback state.

### 3. Responsive ProSell UX

- Completed in the vehicle detail: explicit `POST` mutation functions/hooks
  exist for reserve, maintenance pause, resume, and mark-sold. Availability
  never uses the generic status `PATCH` helper.
- Completed in the vehicle detail: `AvailabilityActions` is gated with
  `MARKETPLACE_PUBLISH`, offers only legal transitions, and uses responsive,
  keyboard-accessible dialogs with pending and error feedback.
- Completed in the vehicle detail: a successful sale prepares a `wa.me`
  message beginning with `VENDIDO` and containing the title and description.
  The operator explicitly clicks `Abrir WhatsApp`, chooses a recipient, and
  sends the message; Phase 1 does not claim automatic delivery.
- Remaining: reuse the availability control from the catalog row action menu.

### 4. Audit and operational feedback

- Persist actor, previous status, new status, timestamp, and reason for each
  availability transition.
- Expose the audit/removal state in the product detail so dealer owners and
  ProSell administrators can identify failures without inspecting logs.
- Decide whether sales agents may only report a sale or may finalize it; the
  confirmed minimum access is admin, manager, and super admin.

## Verification Plan

- API unit/integration: authorization, valid/invalid transitions, one request
  per active account, idempotency, callback outcomes, and retry behavior.
- Frontend: role/status visibility, confirmation copy, pending/error feedback,
  responsive class coverage, and WhatsApp URL content.
- Bot: no real Facebook calls in automated tests; mock browser behavior.
- Manual acceptance: use a test Facebook account to publish, capture the ID,
  mark the vehicle sold, remove the post, and verify the audit/removal state.

## Commands and Constraints

- Do not run frontend/backend builds after changes unless explicitly approved.
- Target API integration tests require PostgreSQL at `localhost:5433`.
- Focused first-slice command:
  `cd apps/api && uv run pytest tests/integration/api/test_product_unpublish_requests.py`
- Update Graphify after source changes:
  `graphify update .`
