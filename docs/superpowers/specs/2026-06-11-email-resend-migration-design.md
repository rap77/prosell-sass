# Email Provider Migration: SendGrid → Resend

**Date:** 2026-06-11
**Branch:** `feat/email-resend-migration`
**Status:** IMPLEMENTED (PR #18, merged 2026-06-13)

## Context

The transactional email layer is built on SendGrid. SendGrid is being retired and
must be replaced by [Resend](https://resend.com). The codebase already follows
Clean Architecture / Ports & Adapters: a secondary port `AbstractEmailService`
lives in `domain/ports/i_email_service.py`, and `SendGridEmailService` is its
concrete adapter in `infrastructure/services/email_service.py`.

The port abstraction already exists — so the migration is, in principle, a new
adapter plus one DI wiring change. **However**, the current adapter mixes two
concerns: _transport_ (how we talk to the provider) and _content_ (the HTML body,
subjects, date formatting, escaping). As evidence: `MockEmailService` already
duplicates every HTML template a second time. A naive 1:1 copy to Resend would
create a third copy. This design fixes the root cause.

## Goals

- Replace SendGrid with Resend as the **single** email provider (no multi-provider config).
- Separate email **content** from email **transport** so templates live exactly once.
- Eliminate the manual, error-prone per-field HTML escaping (latent XSS risk) via
  Jinja2 autoescaping.
- Keep the domain port and all 5 use-case callers **unchanged**.

## Non-Goals (YAGNI)

- Multi-provider selection by env var. Resend becomes the only real provider.
- Plain-text (multipart) email bodies. Out of scope unless a concrete need appears.
- Migrating `send_appointment_notification` — it is orphaned (see below).

## Key Decisions

| #   | Decision                                                                 | Rationale                                                                                                                                                 |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Full replacement, Resend only                                            | Less surface, fewer deps. Split makes re-adding multi-provider cheap if ever needed.                                                                      |
| 2   | Split content/transport **inside infrastructure**; domain port unchanged | HTML is a presentation detail and must not leak into the domain. Keeping the semantic 7-method port intact means use cases are untouched.                 |
| 3   | Jinja2 with `autoescape=True`, templates in `.html` files                | Removes manual `_escape_html` calls and the XSS-by-omission risk. Jinja2 is already a transitive dep; we declare it explicitly.                           |
| 4   | Delete orphan `send_appointment_notification`                            | Not in the port, no use case calls it; only its own tests keep it alive. Dead code.                                                                       |
| 5   | `httpx` async directly against Resend REST API (no `resend` SDK)         | Project is async-first; httpx is already present. Avoids a sync SDK wrapped in `to_thread` and an extra dependency. Full control of retry/error handling. |

## Architecture

New subpackage `infrastructure/services/email/`:

```
infrastructure/services/email/
├── __init__.py
├── message.py          # EmailMessage (frozen VO)
├── renderer.py         # EmailTemplateRenderer (Jinja2)
├── sender.py           # EmailSender (Protocol) + ResendSender + LoggingSender
├── retry.py            # retry_on_transient_error (generalized)
├── service.py          # EmailService (implements AbstractEmailService)
└── templates/
    ├── verification.html
    ├── password_reset.html
    ├── 2fa_enabled.html
    ├── appointment_confirmation.html
    ├── appointment_status_update.html
    ├── appointment_reminder.html
    └── team_invitation.html
```

### Components

1. **`EmailMessage`** — `@dataclass(frozen=True)` value object: `to: str`,
   `subject: str`, `html_body: str`. No behavior.

2. **`EmailTemplateRenderer`** — holds a Jinja2 `Environment(autoescape=True)` with
   a `FileSystemLoader` pointed at `templates/`. One `render_*` method per email
   type. Each receives the semantic arguments (email, token, appointment details…),
   builds any URLs (e.g. `verification_url` from `settings.oauth_frontend_success_url`),
   renders the template, and returns an `EmailMessage`. **All HTML lives here, once.**

3. **`EmailSender`** (Protocol): `async def send(self, message: EmailMessage) -> None`.
   - **`ResendSender`** — `httpx.AsyncClient` POST to `https://api.resend.com/emails`
     with `Authorization: Bearer <resend_api_key>`. Payload: `from`, `to`, `subject`,
     `html`. Wrapped in `retry_on_transient_error` for 429 / 5xx. Raises on
     non-2xx after retries.
   - **`LoggingSender`** — logs the rendered `EmailMessage`. **Replaces
     `MockEmailService` entirely** — it no longer duplicates content because the
     content already came from the shared renderer.

4. **`retry_on_transient_error`** — generalized from the old
   `retry_on_sendgrid_error`. Lives with transport (`retry.py`), not content.

5. **`EmailService`** — implements `AbstractEmailService`. Composes a renderer and a
   sender. Each of the 7 port methods: gather args → `renderer.render_x(...)` →
   `sender.send(message)`. One class, zero template duplication.

### Data Flow

```
use_case
  → email_service.send_verification_email(email, user_id, token)
      → renderer.render_verification(email, token) → EmailMessage
      → sender.send(EmailMessage)
          → ResendSender: POST api.resend.com/emails   (prod)
          → LoggingSender: logger.info(...)            (dev)
```

The domain port `AbstractEmailService` and the 5 callers
(`register_user`, `enable_2fa`, `reset_password`, `confirm_appointment`,
`cancel_appointment`, `invite_team_member`) are untouched.

### Wiring (only change in the call graph)

`infrastructure/api/dependencies.py::get_email_service()`:

```python
def get_email_service() -> AbstractEmailService:
    renderer = EmailTemplateRenderer()
    if settings.environment == "development" or not settings.resend_api_key:
        return EmailService(renderer, LoggingSender())
    return EmailService(
        renderer,
        ResendSender(
            api_key=settings.resend_api_key,
            from_email=settings.resend_from_email,
            from_name=settings.resend_from_name,
        ),
    )
```

(Exact dev/prod predicate to match the current `MockEmailService` selection logic.)

## Configuration

- **Add** settings: `resend_api_key`, `resend_from_email`, `resend_from_name`.
- **Remove** settings: `sendgrid_api_key`, `sendgrid_from_email`, `sendgrid_from_name`.
- Update `.env.example` / staging env templates accordingly. The Resend `from`
  address must be a verified domain in the Resend account.

## Dependencies

- **Add** `jinja2` to `apps/api/pyproject.toml` (currently transitive).
- **Remove** `sendgrid>=6.11.0`.
- Transport uses `httpx` (already present). No `resend` SDK.

## Error Handling

- Resend returns `200` with a JSON `{ "id": ... }` on success.
- `4xx` (except 429) → non-retryable, raise immediately with status + body logged.
- `429` and `5xx` → retried with exponential backoff (`retry_on_transient_error`),
  raise after max attempts.
- Delivery success/failure logged with `type`, `to`, `status` (parity with current logs).

## Testing Strategy (TDD — tests first)

- **Renderer** (`test_renderer.py`): each `render_*` produces the expected subject
  and an HTML body containing the expected data. **Explicit autoescaping test**: a
  field value like `<script>alert(1)</script>` is rendered neutralized. No network.
- **Sender** (`test_sender.py`): `ResendSender` with mocked `httpx` — asserts URL,
  Bearer header, payload shape, and retry behavior on 429/5xx; asserts raise on 4xx.
  `LoggingSender` asserts the message is logged.
- **Service** (`test_service.py`): asserts composition — renderer called with the
  right args, sender receives the produced `EmailMessage`.
- The existing `tests/unit/services/test_email_service.py` is rewritten against the
  new structure; orphan-method tests are deleted.

## Removal Checklist (end state)

- [ ] `SendGridEmailService`, `MockEmailService` deleted.
- [ ] `retry_on_sendgrid_error` + the 3 SendGrid Protocols deleted.
- [ ] `send_appointment_notification` (both impls + its tests) deleted.
- [ ] `sendgrid` dependency and `sendgrid_*` settings removed.
- [ ] `apps/api/src/prosell/infrastructure/services/email_service.py` removed once
      the new subpackage replaces it (keep `application/ports/email_service.py`
      re-export shim — it points at the unchanged domain port).

```

```
