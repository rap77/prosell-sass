# Design: Subsystem E — Dealer Onboarding (Org + Owner Invite + Verticals)

## Scope

Covers only the onboarding flow from the roadmap's Subsystem E line: an internal
staff member creates a new dealer organization, picks its enabled verticals, and
invites the dealer's owner — who has no account yet — to claim it.

**Explicitly out of scope** (tracked separately, not part of this design):
- `Permission.VEHICLE_*` → `PRODUCT_*`/`LISTING_*` rename. Pure mechanical
  refactor with zero dependency on the onboarding flow below — does not need a
  design doc, just a TDD task.
- Editing an existing org's enabled verticals after creation. Nobody has asked
  for it yet; the write path this design adds is creation-time only.

## Audit findings that shaped this design

Verified against the actual code (not assumed) before designing:

- `Permission.ORG_CREATE` is SUPER_ADMIN-only; `ADMIN` does not have it.
  `Permission.DEALER_ADMIN_VIEW_ALL` is granted to both SUPER_ADMIN and ADMIN
  and already gates every endpoint in `admin_dealers_router.py`. Since staff
  for this flow is "SUPER_ADMIN/ADMIN", the new endpoints gate on
  `DEALER_ADMIN_VIEW_ALL`, not `ORG_CREATE`. `org_router.py`'s existing
  `POST /org/` (SUPER_ADMIN-only, generic) is untouched.
- `TeamInvitation`/`accept_team_invitation.py` assumes the invitee already has
  an account and is logged in when accepting. The dealer-owner invite cannot
  assume that — the invite must create the account.
- `User.create()` (public register) leaves `tenant_id=None`;
  `User.create_oauth()` self-assigns `tenant_id=user.id`. Neither fits
  "tenant_id = an existing org's tenant, pre-verified". `User.create()` gets
  two new optional kwargs (`tenant_id`, `pre_verified`), default-preserving
  existing callers.
- Role assignment already has the infra it needs:
  `AbstractRoleRepository.get_by_type(RoleType.ADMIN)` +
  `assign_role_to_user(user_id, role_id)`. No new domain code for this part.
- `Organization.verify(verifier_id)` already transitions
  `PENDING_VERIFICATION → ACTIVE`. Reused as-is for the accept flow.
- `team_invitations` has only `UniqueConstraint("token")` — duplicate-invite
  prevention is app-level check-then-insert only (a real, if narrow, race).
  `organization_invitations` adds a partial unique index instead:
  `UNIQUE (organization_id, email) WHERE status = 'pending'`.
- Password hashing happens inside the use case
  (`password_service.hash_password(...)` in `register_user.py`), not at the
  router. `AcceptOrganizationInvitationUseCase` takes a raw `password: str`,
  not a pre-hashed one.
- Cookie-setting (`access_token`/`refresh_token`/`user_data`) is ~30 lines
  inline in `auth_router.py`'s `login()`, not a shared helper. The new accept
  endpoint needs the identical behavior, so this design extracts
  `set_auth_cookies(response, result)` used by both.
- Router-level error mapping is a flat `except ValueError as e: raise
  HTTPException(400, str(e))` everywhere (`team_router.py`). Mirrored as-is —
  no new exception types invented.
- `GET /categories` (no `parent_id`) already returns root categories
  including global templates (`tenant_id IS NULL`) — reused unchanged for the
  vertical picker. It 403s callers with `tenant_id is None`; confirmed staff
  accounts already have a tenant_id in practice, so this is a verified
  precondition, not a gap to fix.
- `OrganizationRepository.get_all()` has no status filter — a freshly created
  `PENDING_VERIFICATION` dealer shows up in `GET /admin/dealers` immediately,
  and the existing detail page already renders `Estado: {dealer.status}`.
- `useAuth().isAdmin` is role-identity (`isSuperAdmin || userRole === "admin"`),
  not permission-based — the same anti-pattern already fixed once this
  subsystem in `org_router.py` (commit `d86e93fd`). The new staff page gates
  on `hasPermission(Permission.DEALER_ADMIN_VIEW_ALL)` directly instead of
  reusing `useRequireAdmin()`'s `isAdmin` check.
- The password-strength regex lives inline in `RegisterForm.tsx`, not in a
  shared schema. Extracted to `lib/schemas/password.ts` since the new accept
  form is a second real consumer.
- No endpoint exists to resend a dealer-owner invite for an org that already
  exists — `POST /admin/dealers` always creates a brand new org. With a
  7-day expiry and unreliable email delivery, this was a genuine operational
  hole, not a speculative one. Closed by extracting `InviteDealerOwnerUseCase`
  out of `CreateDealerOrganizationUseCase` so a resend endpoint can call it
  independently.
- No existing code maps `TransientEmailError` to a specific HTTP status
  anywhere, including `invite_team_member.py`. Deliberately *not* inventing a
  nicer mapping just for this endpoint — stays consistent with the sibling
  flow (propagates, generic 500, transaction already rolled back so no
  orphaned org).

## Architecture Decisions

### Decision: Separate `OrganizationInvitation` entity, not shared with `TeamInvitation`

**Choice**: New entity/table, same shape (token/email/expires_at/status) as
`TeamInvitation` but no shared table or polymorphic base.
**Alternatives considered**: (1) generalize into a polymorphic `Invitation`
entity accepting `team_id` or `organization_id`; (2) give every org an
implicit default `Team` and reuse `TeamInvitation`/`accept_team_invitation`
unchanged.
**Rationale**: (1) generalizes for exactly two use cases — premature, and
touches the `team_invitations` table that Subsystem D just hardened. (2)
would require patching `accept_team_invitation`'s "user already exists"
assumption, which is shared by every existing team invite and just got
reviewed for RBAC correctness — high blast radius for a flow that already
works. A separate, simple entity costs ~4 duplicated fields and isolates all
risk to new code.

### Decision: Owner gets the existing `ADMIN` role, tenant-scoped — no new role

**Choice**: `AcceptOrganizationInvitationUseCase` assigns `RoleType.ADMIN` via
the existing role repository.
**Alternatives considered**: new `OWNER`/`DEALER_OWNER` role with its own
`ROLE_PERMISSIONS` entry.
**Rationale**: all RBAC in this codebase is tenant-scoped (confirmed in
Subsystem D: `ADMIN` never crosses tenants). Within their own org's tenant,
`ADMIN` already grants exactly what an owner needs. A new role adds a
migration and a permission-matrix decision with no behavioral gain over
`ADMIN` scoped to a fresh tenant.

### Decision: Org + verticals + invitation created atomically in one transaction

**Choice**: `CreateDealerOrganizationUseCase` does all three inserts (org,
`organization_vertical` rows, `OrganizationInvitation`) in one DB transaction;
email send is **not** wrapped in try/except, so a delivery failure rolls back
the whole thing.
**Alternatives considered**: org creation and vertical/invite as separate
steps/endpoints.
**Rationale**: avoids an intermediate "org exists, no verticals, no invite"
state with no recovery path. Email failure must roll back — an org silently
created with no way to ever invite its owner is worse than the staff member
retrying the whole form.

### Decision: `InviteDealerOwnerUseCase` extracted as its own use case

**Choice**: The "create-or-reuse pending `OrganizationInvitation` + send
email" step is its own use case, called by `CreateDealerOrganizationUseCase`
at creation time and by a new `POST /admin/dealers/{id}/resend-invitation`
endpoint.
**Alternatives considered**: inline the invite step only in
`CreateDealerOrganizationUseCase`, no resend path.
**Rationale**: discovered while designing the frontend that there was no
recovery path if the owner's invite email is lost or expires — staff would
have to create a duplicate org to retry. Extracting this one step costs
nothing and closes a real operational hole. The email-send propagation
behavior (not caught) is identical for both callers; only the transaction
each caller wraps it in differs — creation rolls back the whole org, resend
only rolls back the invitation row, since the org already exists either way.

### Decision: New staff page gates on `hasPermission(DEALER_ADMIN_VIEW_ALL)`, not `useRequireAdmin()`

**Choice**: `/admin/dealers/new/page.tsx` calls
`useAuth().hasPermission(Permission.DEALER_ADMIN_VIEW_ALL)` directly.
**Alternatives considered**: reuse `useRequireAdmin()` (built earlier this
session, checks `isAdmin`).
**Rationale**: `isAdmin` is role-identity-based and only coincides with
`DEALER_ADMIN_VIEW_ALL` today because the two role sets happen to match. This
subsystem already fixed the identical role-vs-permission divergence risk in
`org_router.py`. For brand-new code, doing it permission-based from the start
costs nothing. The three existing admin/dealers pages built earlier this
session keep `useRequireAdmin()` as-is — they work correctly today and
migrating them is unrelated cleanup, not part of this design.

## Domain Model

```python
class OrganizationInvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class OrganizationInvitation(BaseModel):
    id: UUID
    organization_id: UUID
    email: str                       # stored lowercased
    token: str                       # SHA256 hash, like TeamInvitation
    expires_at: datetime             # default 7 days, like TeamInvitation
    status: OrganizationInvitationStatus
    tenant_id: UUID                  # = organization.tenant_id
    created_by_user_id: UUID         # staff who invited
    accepted_by_user_id: UUID | None # set on accept

    def is_expired(self) -> bool: ...
    def mark_expired(self) -> None: ...
    def mark_accepted(self, accepted_by_user_id: UUID) -> None: ...
    def cancel(self) -> None: ...    # parity with TeamInvitation.cancel()
```

`Organization` gains one nullable field: `created_by_user_id: UUID | None`
(NULL for pre-existing orgs via migration default).

`User.create()` gains two optional kwargs, default-preserving current
behavior: `tenant_id: UUID | None = None`, `pre_verified: bool = False`. When
`pre_verified=True`, `status=ACTIVE` and `email_verified=True` instead of
`PENDING_VERIFICATION`/`False`.

DB: `organization_invitations` table with a partial unique index
`UNIQUE (organization_id, email) WHERE status = 'pending'` — stricter than
`team_invitations`' app-level-only duplicate check.

No changes to `Role`, `Permission`, or `ROLE_PERMISSIONS`.

## Use Cases

```python
class CreateDealerOrganizationUseCase:
    async def execute(
        self, name: str, vertical_ids: list[UUID], owner_email: str,
        created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        # 1 transaction:
        # - validate vertical_ids non-empty
        # - validate owner_email (lowercased) has no existing, non-deleted
        #   User (deleted_at IS NULL — a soft-deleted user's email is free)
        # - Organization.create(created_by_user_id=...)
        # - bulk insert organization_vertical rows
        # - delegate to InviteDealerOwnerUseCase
        ...

class InviteDealerOwnerUseCase:
    async def execute(
        self, organization_id: UUID, email: str, created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        # reuse existing PENDING+unexpired invite for (org, email) if any;
        # else mark any expired one EXPIRED and create a new one
        # send_org_invitation email (not caught — propagates to roll back
        # the caller's transaction when called from creation)
        ...

class AcceptOrganizationInvitationUseCase:
    async def execute(
        self, token: str, password: str, first_name: str, last_name: str,
    ) -> User:
        # 1. hash token, look up invitation
        # 2. if expired: mark_expired, persist, raise ValueError
        # 3. if already accepted: raise ValueError
        # 4. password_service.hash_password(password)
        # 5. User.create(email=invitation.email, password_hash=..., tenant_id=org.tenant_id, pre_verified=True)
        # 6. role = role_repo.get_by_type(ADMIN); assign_role_to_user(user.id, role.id)
        # 7. organization.verify(verifier_id=user.id)
        # 8. invitation.mark_accepted(accepted_by_user_id=user.id)
        ...
```

## Endpoints

| Method/Path | Router | Gate |
|---|---|---|
| `POST /admin/dealers` | `admin_dealers_router.py` (existing file) | `DEALER_ADMIN_VIEW_ALL` via existing `_require_dealer_admin_view_all()` |
| `POST /admin/dealers/{id}/resend-invitation` | `admin_dealers_router.py` | same |
| `POST /auth/accept-org-invitation` | `auth_router.py` (existing file) | public, `@smart_rate_limit("auth")` |

`set_auth_cookies(response, result)` extracted from `login()`'s inline
cookie-setting block, used by both `login()` and the new accept endpoint.

## Error Handling

| Case | Status | Mechanism |
|---|---|---|
| `vertical_ids` empty | 400 | use-case validation |
| `owner_email` already registered (case-insensitive) | 400 | explicit pre-check |
| Invitation token invalid/not found | 400 | mirrors `accept_team_invitation.py` |
| Invitation expired at accept | 400 | mark `EXPIRED`, persist, raise — same order as team flow |
| Invitation already accepted | 400 | same as team flow |
| Concurrent duplicate-email race | 409 | thin `except IntegrityError` in router (DB unique constraint as backstop) |
| Email delivery failure | 500, no special handling | consistent with `invite_team_member.py`; transaction rollback already prevents an orphaned org |

## Frontend

```
apps/web/src/app/(admin)/admin/dealers/new/page.tsx   — staff form: name, vertical multi-select, owner_email
apps/web/src/app/invite/org/[token]/page.tsx          — public: loading/expired/error states + accept form (name, password via existing PasswordInput) on success
apps/web/src/lib/schemas/password.ts                  — passwordFieldSchema extracted from RegisterForm.tsx (2nd consumer)
apps/web/src/lib/api/dealers.ts                       — + useCreateDealer(), useResendDealerInvitation() mutations (mirrors existing useMutation usage in products.ts)
```

- Vertical picker calls existing `GET /categories` (no `parent_id`) — no new backend endpoint.
- Form errors surfaced via the already-shared `lib/api/extractErrorMessage.ts`.
- `/admin/dealers/[id]/page.tsx` gets a "Reenviar invitación" button, shown only when `status === "pending_verification"`.

## Testing

TDD, mirroring the existing `test_invite_team_member.py` /
`test_accept_team_invitation.py` structure: one unit test per use case per row
of the error table above, plus the happy path. Integration tests per endpoint
cover the permission gate and (for the accept endpoint) the rate limit.
Frontend: Vitest for the new form and the accept page's state machine,
following the same convention as `/invite/[token]/page.test.tsx`.
