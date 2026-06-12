# Email Resend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SendGrid with Resend as the single email provider, splitting email content (Jinja2 templates) from transport (httpx → Resend REST) inside the infrastructure layer.

**Architecture:** New subpackage `infrastructure/services/email/` with a value object (`EmailMessage`), a Jinja2 renderer (content), an `EmailSender` protocol with `ResendSender`/`LoggingSender` (transport), and an `EmailService` that composes them to implement the unchanged domain port `AbstractEmailService`. The 5 use-case callers and the domain port are untouched; only `dependencies.py::get_email_service()` wiring changes.

**Tech Stack:** Python 3.13, FastAPI, Jinja2 (autoescape), httpx (async), pytest / pytest-asyncio.

**Reference spec:** `docs/superpowers/specs/2026-06-11-email-resend-migration-design.md`

**Source to port FROM:** `apps/api/src/prosell/infrastructure/services/email_service.py` (old SendGrid adapter — read it for exact HTML/subject/copy of each template). The domain port contract is `apps/api/src/prosell/domain/ports/i_email_service.py`.

**Working dir for commands:** `apps/api` (run `uv run pytest ...` from there).

---

## File Structure

```
apps/api/src/prosell/infrastructure/services/email/
├── __init__.py          # public exports
├── message.py           # EmailMessage (frozen VO)
├── renderer.py          # EmailTemplateRenderer (Jinja2 autoescape)
├── retry.py             # retry_on_transient_error decorator
├── sender.py            # EmailSender (Protocol) + ResendSender + LoggingSender
├── service.py           # EmailService implements AbstractEmailService
└── templates/
    ├── verification.html
    ├── password_reset.html
    ├── 2fa_enabled.html
    ├── team_invitation.html
    ├── appointment_confirmation.html
    ├── appointment_status_update.html
    └── appointment_reminder.html

apps/api/tests/unit/services/email/
├── test_message.py
├── test_renderer.py
├── test_retry.py
├── test_sender.py
└── test_service.py
```

Build the new subpackage alongside the old `email_service.py` (which keeps the app running). The DI swap (Task 12) and deletion of the old module (Task 13) happen last, so every intermediate task leaves the suite green.

---

### Task 1: EmailMessage value object

**Files:**
- Create: `apps/api/src/prosell/infrastructure/services/email/__init__.py` (empty for now)
- Create: `apps/api/src/prosell/infrastructure/services/email/message.py`
- Test: `apps/api/tests/unit/services/email/test_message.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/unit/services/email/__init__.py` (empty), then `test_message.py`:

```python
import dataclasses

import pytest

from prosell.infrastructure.services.email.message import EmailMessage


def test_email_message_holds_fields():
    msg = EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>")
    assert msg.to == "a@b.com"
    assert msg.subject == "Hi"
    assert msg.html_body == "<p>x</p>"


def test_email_message_is_frozen():
    msg = EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>")
    with pytest.raises(dataclasses.FrozenInstanceError):
        msg.to = "c@d.com"  # type: ignore[misc]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_message.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'prosell.infrastructure.services.email.message'`

- [ ] **Step 3: Write minimal implementation**

`message.py`:

```python
"""Provider-agnostic email message value object."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EmailMessage:
    """A fully rendered email, ready for any transport adapter."""

    to: str
    subject: str
    html_body: str
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/services/email/test_message.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/
git commit -m "feat(api): add EmailMessage value object for email subsystem"
```

---

### Task 2: Add Resend settings

**Files:**
- Modify: `apps/api/src/prosell/core/config.py` (after line 339, alongside existing email settings)
- Test: `apps/api/tests/unit/test_config_resend.py`

- [ ] **Step 1: Write the failing test**

`tests/unit/test_config_resend.py`:

```python
from prosell.core.config import Settings


def test_resend_settings_have_defaults():
    s = Settings()
    assert s.resend_api_key is None
    assert s.resend_from_email == "noreply@prosell.saas"
    assert s.resend_from_name == "ProSell SaaS"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/test_config_resend.py -v`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'resend_api_key'`

- [ ] **Step 3: Write minimal implementation**

In `config.py`, immediately after `sendgrid_from_name` (line 336-339 block) and before `email_templates_dir`, add:

```python
    resend_api_key: str | None = Field(
        default=None,
        description="Resend API key",
    )
    resend_from_email: str = Field(
        default="noreply@prosell.saas",
        description="From email address for Resend",
    )
    resend_from_name: str = Field(
        default="ProSell SaaS",
        description="From name for Resend",
    )
```

(Leave the `sendgrid_*` settings in place for now; they are removed in Task 13.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/test_config_resend.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/core/config.py apps/api/tests/unit/test_config_resend.py
git commit -m "feat(api): add Resend email settings"
```

---

### Task 3: Renderer scaffold + verification template

**Files:**
- Create: `apps/api/src/prosell/infrastructure/services/email/renderer.py`
- Create: `apps/api/src/prosell/infrastructure/services/email/templates/verification.html`
- Test: `apps/api/tests/unit/services/email/test_renderer.py`

- [ ] **Step 1: Write the failing test**

`test_renderer.py`:

```python
from uuid import uuid4

import pytest

from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer


@pytest.fixture
def renderer() -> EmailTemplateRenderer:
    return EmailTemplateRenderer()


def test_render_verification_contains_token_link(renderer):
    msg = renderer.render_verification(
        email="user@example.com", user_id=uuid4(), token="tok123"
    )
    assert msg.to == "user@example.com"
    assert "Verify" in msg.subject
    assert "token=tok123" in msg.html_body


def test_render_autoescapes_html_in_values(renderer):
    # Autoescaping is the whole point — a hostile value must be neutralized.
    msg = renderer.render_team_invitation(
        email="user@example.com",
        team_name="<script>alert(1)</script>",
        inviter_name="Eve",
        invitation_token="t",
        role="member",
    )
    assert "<script>alert(1)</script>" not in msg.html_body
    assert "&lt;script&gt;" in msg.html_body
```

(The second test also exercises Task 5; it is placed here so the autoescaping guarantee is asserted as soon as the Environment exists. It will fail until Task 5 adds `render_team_invitation` — that is expected; keep it and it goes green in Task 5. To keep this task self-contained green, you MAY mark it `@pytest.mark.skip(reason="render_team_invitation lands in Task 5")` now and remove the skip in Task 5. Recommended: add the skip here, remove in Task 5.)

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_renderer.py::test_render_verification_contains_token_link -v`
Expected: FAIL — `ModuleNotFoundError` for `renderer`.

- [ ] **Step 3: Write minimal implementation**

`templates/verification.html` (port the HTML from `email_service.py` `send_verification_email`, lines ~173-187; the Jinja variable is `verification_url`):

```html
<html>
<body>
    <h2>Welcome to ProSell!</h2>
    <p>Please verify your email address by clicking the button below:</p>
    <p><a href="{{ verification_url }}" style="background-color:#4CAF50;
    color:white;padding:10px 20px;text-decoration:none;
    display:inline-block;">Verify Email</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p>{{ verification_url }}</p>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't create an account, please ignore this email.</p>
</body>
</html>
```

`renderer.py`:

```python
"""Jinja2-based email content renderer (provider-agnostic)."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape

from prosell.core.config import settings
from prosell.infrastructure.services.email.message import EmailMessage

if TYPE_CHECKING:
    from datetime import datetime

    from prosell.domain.entities.appointment import AppointmentStatus
    from prosell.domain.ports.i_email_service import AppointmentReminderDetails

_TEMPLATES_DIR = Path(__file__).parent / "templates"


class EmailTemplateRenderer:
    """Renders semantic email requests into EmailMessage value objects."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def _base_url(self) -> str:
        return settings.oauth_frontend_success_url.split("/auth")[0]

    def _render(self, template: str, subject: str, to: str, /, **ctx: object) -> EmailMessage:
        body = self._env.get_template(template).render(**ctx)
        return EmailMessage(to=to, subject=subject, html_body=body)

    def render_verification(self, email: str, user_id: UUID, token: str) -> EmailMessage:
        _ = user_id
        verification_url = f"{self._base_url()}/auth/verify?token={token}"
        return self._render(
            "verification.html",
            "Verify your ProSell account",
            email,
            verification_url=verification_url,
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -v`
Expected: `test_render_verification_contains_token_link` PASS; autoescape test SKIPPED (until Task 5).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/renderer.py \
        apps/api/src/prosell/infrastructure/services/email/templates/verification.html \
        apps/api/tests/unit/services/email/test_renderer.py
git commit -m "feat(api): add Jinja2 email renderer with verification template"
```

---

### Task 4: password_reset + 2fa_enabled templates

**Files:**
- Create: `templates/password_reset.html`, `templates/2fa_enabled.html`
- Modify: `renderer.py` (add two methods)
- Test: `tests/unit/services/email/test_renderer.py` (add two tests)

- [ ] **Step 1: Write the failing tests**

Append to `test_renderer.py`:

```python
def test_render_password_reset_contains_reset_link(renderer):
    msg = renderer.render_password_reset(email="user@example.com", token="r1")
    assert "Reset" in msg.subject
    assert "reset-password?token=r1" in msg.html_body


def test_render_2fa_enabled(renderer):
    msg = renderer.render_2fa_enabled(email="user@example.com")
    assert msg.to == "user@example.com"
    assert "2FA" in msg.html_body or "two-factor" in msg.html_body.lower()
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k "password_reset or 2fa_enabled" -v`
Expected: FAIL — `AttributeError: 'EmailTemplateRenderer' object has no attribute 'render_password_reset'`

- [ ] **Step 3: Implement**

`templates/password_reset.html` (port from `send_password_reset`, lines ~224-239; var `reset_url`):

```html
<html>
<body>
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password. Click the button below:</p>
    <p><a href="{{ reset_url }}" style="background-color:#4CAF50;
    color:white;padding:10px 20px;text-decoration:none;
    display:inline-block;">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p>{{ reset_url }}</p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request a password reset, please ignore this email.</p>
</body>
</html>
```

`templates/2fa_enabled.html` (port from `send_2fa_enabled`, lines ~271-282; no vars):

```html
<html>
<body>
    <h2>2FA Enabled Successfully</h2>
    <p>Two-factor authentication has been enabled on your ProSell account.</p>
    <p>Your account is now more secure.</p>
    <p>If you didn't make this change, please contact support immediately.</p>
</body>
</html>
```

Add to `renderer.py`:

```python
    def render_password_reset(self, email: str, token: str) -> EmailMessage:
        reset_url = f"{self._base_url()}/auth/reset-password?token={token}"
        return self._render(
            "password_reset.html",
            "Reset your ProSell password",
            email,
            reset_url=reset_url,
        )

    def render_2fa_enabled(self, email: str) -> EmailMessage:
        return self._render(
            "2fa_enabled.html",
            "Two-factor authentication enabled",
            email,
        )
```

- [ ] **Step 4: Run to verify they pass**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k "password_reset or 2fa_enabled" -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/test_renderer.py
git commit -m "feat(api): add password-reset and 2fa-enabled email templates"
```

---

### Task 5: team_invitation template (un-skip autoescape test)

**Files:**
- Create: `templates/team_invitation.html`
- Modify: `renderer.py` (add method)
- Modify: `test_renderer.py` (remove the skip on the autoescape test, add a content test)

- [ ] **Step 1: Update tests**

Remove the `@pytest.mark.skip` from `test_render_autoescapes_html_in_values` (added in Task 3). Append:

```python
def test_render_team_invitation_has_accept_link(renderer):
    msg = renderer.render_team_invitation(
        email="user@example.com",
        team_name="Sales",
        inviter_name="Ana",
        invitation_token="inv9",
        role="member",
    )
    assert "Sales" in msg.html_body
    assert "invite/accept?token=inv9" in msg.html_body
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k "team_invitation or autoescapes" -v`
Expected: FAIL — no `render_team_invitation`.

- [ ] **Step 3: Implement**

`templates/team_invitation.html` (port from `send_team_invitation`, lines ~694-699; vars `inviter_name`, `team_name`, `role`, `invitation_url`):

```html
<p>{{ inviter_name }} has invited you to join
<strong>{{ team_name }}</strong> as {{ role }}.</p>
<p><a href="{{ invitation_url }}">Accept invitation</a></p>
<p>This invitation expires in 7 days.</p>
```

Add to `renderer.py`:

```python
    def render_team_invitation(
        self,
        email: str,
        team_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
    ) -> EmailMessage:
        invitation_url = f"{self._base_url()}/invite/accept?token={invitation_token}"
        return self._render(
            "team_invitation.html",
            f"[ProSell] You've been invited to join {team_name}",
            email,
            inviter_name=inviter_name,
            team_name=team_name,
            role=role,
            invitation_url=invitation_url,
        )
```

- [ ] **Step 4: Run to verify they pass**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -v`
Expected: PASS (all, including the previously-skipped autoescape test)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/test_renderer.py
git commit -m "feat(api): add team-invitation template and verify autoescaping"
```

---

### Task 6: appointment_confirmation + appointment_status_update templates

**Files:**
- Create: `templates/appointment_confirmation.html`, `templates/appointment_status_update.html`
- Modify: `renderer.py` (add two methods)
- Test: `test_renderer.py` (add two tests)

- [ ] **Step 1: Write failing tests**

Append to `test_renderer.py`:

```python
from datetime import datetime

from prosell.domain.entities.appointment import AppointmentStatus


def test_render_appointment_confirmation(renderer):
    msg = renderer.render_appointment_confirmation(
        buyer_email="b@x.com",
        buyer_name="Bob",
        branch_name="Centro",
        vehicle_info="Toyota Corolla 2020",
        scheduled_at=datetime(2026, 6, 15, 10, 0),
        notes=None,
    )
    assert msg.to == "b@x.com"
    assert "Bob" in msg.html_body
    assert "Toyota Corolla 2020" in msg.html_body


def test_render_appointment_status_update_cancelled(renderer):
    msg = renderer.render_appointment_status_update(
        buyer_email="b@x.com",
        buyer_name="Bob",
        branch_name="Centro",
        vehicle_info="Toyota Corolla 2020",
        scheduled_at=datetime(2026, 6, 15, 10, 0),
        new_status=AppointmentStatus.CANCELLED,
        notes=None,
    )
    assert "Cancelled" in msg.subject or "cancelled" in msg.html_body.lower()
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k "appointment_confirmation or status_update" -v`
Expected: FAIL — methods missing.

- [ ] **Step 3: Implement**

Create `templates/appointment_confirmation.html` by porting the `html_content` of `send_appointment_confirmation` (lines ~422-452). Mechanical transform: replace every `{safe_<x>}` and `{<x>}` interpolation with the Jinja form `{{ <x> }}` (drop the `safe_` prefix — Jinja autoescapes). Variables: `buyer_name`, `branch_name`, `vehicle_info`, `scheduled_str`, and optional `notes`. Replace the Python-side `notes_row`/inline conditional with Jinja:

```html
{% if notes %}
<tr style="background-color: #f2f2f2;">
    <td style="border: 1px solid #ddd;"><strong>Notas:</strong></td>
    <td style="border: 1px solid #ddd;">{{ notes }}</td>
</tr>
{% endif %}
```

Create `templates/appointment_status_update.html` similarly from `send_appointment_status_update` (lines ~617-651), variables `buyer_name`, `branch_name`, `vehicle_info`, `scheduled_str`, `status_text`, optional `notes`.

Add to `renderer.py` (subject/status logic ported from lines ~588-601):

```python
    def render_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> EmailMessage:
        return self._render(
            "appointment_confirmation.html",
            "Confirmación de Cita - ProSell",
            buyer_email,
            buyer_name=buyer_name,
            branch_name=branch_name,
            vehicle_info=vehicle_info,
            scheduled_str=scheduled_at.strftime("%A, %d %B %Y at %I:%M %p"),
            notes=notes,
        )

    def render_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> EmailMessage:
        from prosell.domain.entities.appointment import AppointmentStatus as _Status

        if new_status == _Status.COMPLETED:
            subject, status_text = "[ProSell] Appointment Confirmed", "Confirmed"
        elif new_status == _Status.CANCELLED:
            subject, status_text = "[ProSell] Appointment Cancelled", "Cancelled"
        else:
            subject, status_text = "[ProSell] Appointment Status Update", new_status.value.title()
        return self._render(
            "appointment_status_update.html",
            subject,
            buyer_email,
            buyer_name=buyer_name,
            branch_name=branch_name,
            vehicle_info=vehicle_info,
            scheduled_str=scheduled_at.strftime("%A, %d %B %Y at %I:%M %p"),
            status_text=status_text,
            notes=notes,
        )
```

- [ ] **Step 4: Run to verify they pass**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k "appointment_confirmation or status_update" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/test_renderer.py
git commit -m "feat(api): add appointment confirmation and status-update templates"
```

---

### Task 7: appointment_reminder template

**Files:**
- Create: `templates/appointment_reminder.html`
- Modify: `renderer.py` (add method)
- Test: `test_renderer.py` (add test)

- [ ] **Step 1: Write failing test**

Append to `test_renderer.py`:

```python
def test_render_appointment_reminder_buyer(renderer):
    details = {
        "buyer_name": "Bob",
        "branch_name": "Centro",
        "vehicle_info": "Toyota Corolla 2020",
        "scheduled_at": datetime(2026, 6, 15, 10, 0),
        "notes": None,
    }
    msg = renderer.render_appointment_reminder(
        email="b@x.com", person_type="buyer", appointment_details=details
    )
    assert "Toyota Corolla 2020" in msg.html_body
    assert "10 minutos" in msg.html_body
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -k reminder -v`
Expected: FAIL — no `render_appointment_reminder`.

- [ ] **Step 3: Implement**

Create `templates/appointment_reminder.html` from `send_appointment_reminder` (lines ~519-543). Variables: `greeting_name`, `vehicle_info`, `scheduled_str`, `instructions`, optional `notes`. Use `{{ greeting_name }}` where the old code injected a person-specific name and `{{ instructions }}` for the person-specific instruction line.

Add to `renderer.py` (person-type branching ported from lines ~507-512):

```python
    def render_appointment_reminder(
        self,
        email: str,
        person_type: str,
        appointment_details: AppointmentReminderDetails,
    ) -> EmailMessage:
        from datetime import datetime as _dt

        buyer_name = appointment_details.get("buyer_name", "Cliente")
        branch_name = appointment_details.get("branch_name", "Asesor")
        vehicle_info = appointment_details.get("vehicle_info", "Vehículo")
        scheduled_at = appointment_details.get("scheduled_at", _dt.now())
        notes = appointment_details.get("notes")
        if person_type == "branch":
            greeting_name = branch_name
            instructions = "Por favor asegúrate de estar disponible para esta cita."
        else:
            greeting_name = buyer_name
            instructions = "Por favor llega 10 minutos antes de tu cita."
        return self._render(
            "appointment_reminder.html",
            "Recordatorio de Cita - ProSell",
            email,
            greeting_name=greeting_name,
            vehicle_info=vehicle_info,
            scheduled_str=scheduled_at.strftime("%A, %d %B %Y at %I:%M %p"),
            instructions=instructions,
            notes=notes,
        )
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/unit/services/email/test_renderer.py -v`
Expected: PASS (whole renderer suite green)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/test_renderer.py
git commit -m "feat(api): add appointment-reminder template; renderer complete"
```

---

### Task 8: retry_on_transient_error decorator

**Files:**
- Create: `apps/api/src/prosell/infrastructure/services/email/retry.py`
- Test: `apps/api/tests/unit/services/email/test_retry.py`

- [ ] **Step 1: Write failing test**

`test_retry.py`:

```python
import pytest

from prosell.infrastructure.services.email.retry import (
    TransientEmailError,
    retry_on_transient_error,
)


@pytest.mark.asyncio
async def test_retries_then_succeeds():
    calls = {"n": 0}

    @retry_on_transient_error(max_retries=2, initial_delay=0)
    async def flaky():
        calls["n"] += 1
        if calls["n"] < 2:
            raise TransientEmailError("503 boom")
        return "ok"

    assert await flaky() == "ok"
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_non_transient_raises_immediately():
    calls = {"n": 0}

    @retry_on_transient_error(max_retries=3, initial_delay=0)
    async def boom():
        calls["n"] += 1
        raise ValueError("nope")

    with pytest.raises(ValueError):
        await boom()
    assert calls["n"] == 1
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_retry.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`retry.py`:

```python
"""Transient-error retry decorator for email transport adapters."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import ParamSpec, TypeVar

logger = logging.getLogger(__name__)
P = ParamSpec("P")
R = TypeVar("R")


class TransientEmailError(Exception):
    """Raised by a sender when the provider returned a retryable status (429/5xx)."""


def retry_on_transient_error(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    def decorator(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            delay = initial_delay
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except TransientEmailError as e:
                    if attempt == max_retries:
                        raise
                    logger.warning(
                        "Transient email error (attempt %d/%d): %s. Retrying in %.1fs",
                        attempt + 1,
                        max_retries + 1,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    delay *= backoff_multiplier
            raise RuntimeError("retry_on_transient_error exhausted")

        return wrapper

    return decorator
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/unit/services/email/test_retry.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/retry.py apps/api/tests/unit/services/email/test_retry.py
git commit -m "feat(api): add transient-error retry decorator for email transport"
```

---

### Task 9: EmailSender protocol + LoggingSender

**Files:**
- Create: `apps/api/src/prosell/infrastructure/services/email/sender.py`
- Test: `apps/api/tests/unit/services/email/test_sender.py`

- [ ] **Step 1: Write failing test**

`test_sender.py`:

```python
import logging

import pytest

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.sender import LoggingSender


@pytest.mark.asyncio
async def test_logging_sender_logs_message(caplog):
    sender = LoggingSender()
    msg = EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>")
    with caplog.at_level(logging.INFO):
        await sender.send(msg)
    assert "a@b.com" in caplog.text
    assert "Hi" in caplog.text
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_sender.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`sender.py`:

```python
"""Email transport adapters (provider-specific)."""

from __future__ import annotations

import logging
from typing import Protocol

from prosell.infrastructure.services.email.message import EmailMessage

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    """Transport port: send a fully rendered EmailMessage."""

    async def send(self, message: EmailMessage) -> None: ...


class LoggingSender:
    """Dev sender — logs the message instead of delivering it."""

    async def send(self, message: EmailMessage) -> None:
        logger.info(
            "MOCK EMAIL: to=%s subject=%r body_len=%d",
            message.to,
            message.subject,
            len(message.html_body),
        )
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/unit/services/email/test_sender.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/sender.py apps/api/tests/unit/services/email/test_sender.py
git commit -m "feat(api): add EmailSender protocol and LoggingSender"
```

---

### Task 10: ResendSender (httpx)

**Files:**
- Modify: `apps/api/src/prosell/infrastructure/services/email/sender.py`
- Test: `apps/api/tests/unit/services/email/test_sender.py`

- [ ] **Step 1: Write failing tests**

Append to `test_sender.py`:

```python
import httpx

from prosell.infrastructure.services.email.retry import TransientEmailError
from prosell.infrastructure.services.email.sender import ResendSender


def _resend(transport: httpx.MockTransport) -> ResendSender:
    return ResendSender(
        api_key="re_test",
        from_email="noreply@prosell.saas",
        from_name="ProSell",
        client=httpx.AsyncClient(transport=transport),
    )


@pytest.mark.asyncio
async def test_resend_sender_posts_expected_payload():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        captured["json"] = request.read().decode()
        return httpx.Response(200, json={"id": "e1"})

    sender = _resend(httpx.MockTransport(handler))
    await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["auth"] == "Bearer re_test"
    assert "a@b.com" in captured["json"]


@pytest.mark.asyncio
async def test_resend_sender_raises_transient_on_5xx():
    sender = _resend(httpx.MockTransport(lambda r: httpx.Response(503)))
    with pytest.raises(TransientEmailError):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))


@pytest.mark.asyncio
async def test_resend_sender_raises_value_on_4xx():
    sender = _resend(httpx.MockTransport(lambda r: httpx.Response(422, text="bad")))
    with pytest.raises(ValueError):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/unit/services/email/test_sender.py -k resend -v`
Expected: FAIL — no `ResendSender`.

- [ ] **Step 3: Implement**

Add to `sender.py` (new imports at top: `import httpx`, and `from .retry import TransientEmailError`):

```python
_RESEND_URL = "https://api.resend.com/emails"


class ResendSender:
    """Production sender — delivers via the Resend REST API over httpx."""

    def __init__(
        self,
        api_key: str,
        from_email: str,
        from_name: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key
        self._from = f"{from_name} <{from_email}>"
        self._client = client

    async def send(self, message: EmailMessage) -> None:
        payload = {
            "from": self._from,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html_body,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        client = self._client or httpx.AsyncClient()
        try:
            resp = await client.post(_RESEND_URL, json=payload, headers=headers)
        finally:
            if self._client is None:
                await client.aclose()
        if resp.status_code in (200, 201):
            logger.info("Email sent via Resend: to=%s status=%d", message.to, resp.status_code)
            return
        if resp.status_code == 429 or resp.status_code >= 500:
            raise TransientEmailError(f"Resend {resp.status_code}: {resp.text}")
        logger.error("Resend delivery failed: to=%s status=%d", message.to, resp.status_code)
        raise ValueError(f"Resend error {resp.status_code}: {resp.text}")
```

Wrap `send` retry at the composition layer (Task 11 applies `retry_on_transient_error` around the sender call), OR decorate `ResendSender.send` directly. For this plan, decorate at composition (Task 11) to keep the sender a thin transport. (Do not decorate here.)

- [ ] **Step 4: Run to verify they pass**

Run: `uv run pytest tests/unit/services/email/test_sender.py -v`
Expected: PASS (all sender tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/sender.py apps/api/tests/unit/services/email/test_sender.py
git commit -m "feat(api): add ResendSender httpx transport adapter"
```

---

### Task 11: EmailService composition (implements the domain port)

**Files:**
- Create: `apps/api/src/prosell/infrastructure/services/email/service.py`
- Modify: `apps/api/src/prosell/infrastructure/services/email/__init__.py` (exports)
- Test: `apps/api/tests/unit/services/email/test_service.py`

- [ ] **Step 1: Write failing test**

`test_service.py`:

```python
from uuid import uuid4

import pytest

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer
from prosell.infrastructure.services.email.service import EmailService


class _SpySender:
    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:
        self.sent.append(message)


@pytest.mark.asyncio
async def test_service_renders_and_sends_verification():
    spy = _SpySender()
    svc = EmailService(EmailTemplateRenderer(), spy)
    await svc.send_verification_email(email="u@x.com", user_id=uuid4(), token="tok")
    assert len(spy.sent) == 1
    assert spy.sent[0].to == "u@x.com"
    assert "token=tok" in spy.sent[0].html_body


@pytest.mark.asyncio
async def test_service_satisfies_port():
    from prosell.domain.ports.i_email_service import AbstractEmailService

    svc: AbstractEmailService = EmailService(EmailTemplateRenderer(), _SpySender())
    assert svc is not None
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/unit/services/email/test_service.py -v`
Expected: FAIL — no `service` module.

- [ ] **Step 3: Implement**

`service.py` — one method per port method; each renders then sends, wrapping the send in the retry decorator:

```python
"""EmailService — composes a renderer and a sender to implement the port."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from prosell.infrastructure.services.email.retry import retry_on_transient_error

if TYPE_CHECKING:
    from datetime import datetime

    from prosell.domain.entities.appointment import AppointmentStatus
    from prosell.domain.ports.i_email_service import AppointmentReminderDetails
    from prosell.infrastructure.services.email.message import EmailMessage
    from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer
    from prosell.infrastructure.services.email.sender import EmailSender


class EmailService:
    """Implements AbstractEmailService by rendering content then sending it."""

    def __init__(self, renderer: EmailTemplateRenderer, sender: EmailSender) -> None:
        self._renderer = renderer
        self._sender = sender

    @retry_on_transient_error()
    async def _deliver(self, message: EmailMessage) -> None:
        await self._sender.send(message)

    async def send_verification_email(self, email: str, user_id: UUID, token: str) -> None:
        await self._deliver(self._renderer.render_verification(email, user_id, token))

    async def send_password_reset(self, email: str, token: str) -> None:
        await self._deliver(self._renderer.render_password_reset(email, token))

    async def send_2fa_enabled(self, email: str) -> None:
        await self._deliver(self._renderer.render_2fa_enabled(email))

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        await self._deliver(
            self._renderer.render_appointment_confirmation(
                buyer_email, buyer_name, branch_name, vehicle_info, scheduled_at, notes
            )
        )

    async def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> None:
        await self._deliver(
            self._renderer.render_appointment_status_update(
                buyer_email, buyer_name, branch_name, vehicle_info, scheduled_at, new_status, notes
            )
        )

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,
        appointment_details: AppointmentReminderDetails,
    ) -> None:
        await self._deliver(
            self._renderer.render_appointment_reminder(email, person_type, appointment_details)
        )

    async def send_team_invitation(
        self,
        email: str,
        team_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
    ) -> None:
        await self._deliver(
            self._renderer.render_team_invitation(
                email, team_name, inviter_name, invitation_token, role
            )
        )
```

`__init__.py`:

```python
"""Provider-agnostic email subsystem."""

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer
from prosell.infrastructure.services.email.sender import (
    EmailSender,
    LoggingSender,
    ResendSender,
)
from prosell.infrastructure.services.email.service import EmailService

__all__ = [
    "EmailMessage",
    "EmailSender",
    "EmailService",
    "EmailTemplateRenderer",
    "LoggingSender",
    "ResendSender",
]
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/unit/services/email/ -v`
Expected: PASS (entire new subsystem green)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/test_service.py
git commit -m "feat(api): add EmailService composing renderer and sender"
```

---

### Task 12: Wire DI to Resend + declare jinja2

**Files:**
- Modify: `apps/api/src/prosell/infrastructure/api/dependencies.py:94-97,161-165`
- Modify: `apps/api/pyproject.toml` (add jinja2 to main deps)

- [ ] **Step 1: Swap the import and factory**

Replace the import block at `dependencies.py:94-97`:

```python
from prosell.infrastructure.services.email import (
    EmailService,
    EmailTemplateRenderer,
    LoggingSender,
    ResendSender,
)
```

Replace `get_email_service` at `dependencies.py:161-165`:

```python
def get_email_service() -> AbstractEmailService:
    """Get email service instance (singleton)."""
    renderer = EmailTemplateRenderer()
    if settings.use_mock_email or not settings.resend_api_key:
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

- [ ] **Step 2: Declare jinja2 explicitly**

In `apps/api/pyproject.toml`, add to the main dependencies array (next to `httpx>=0.28.0` at line 16):

```toml
    "jinja2>=3.1.0",
```

- [ ] **Step 3: Run the relevant suites + lint**

Run:
```bash
uv run pytest tests/unit/services/email/ tests/unit/services/test_email_service.py -v
uv run ruff check src/prosell/infrastructure/services/email src/prosell/infrastructure/api/dependencies.py
uv run pyright
```
Expected: new subsystem PASS; the OLD `test_email_service.py` may still pass (it imports the old module, still present). ruff/pyright clean.

- [ ] **Step 4: Smoke-check the wiring**

Run:
```bash
uv run python -c "from prosell.infrastructure.api.dependencies import get_email_service; print(type(get_email_service()).__name__)"
```
Expected: `EmailService`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/dependencies.py apps/api/pyproject.toml apps/api/uv.lock
git commit -m "feat(api): wire email DI to Resend-backed EmailService"
```

---

### Task 13: Remove SendGrid, orphan method, old module, old tests; update env

**Files:**
- Delete: `apps/api/src/prosell/infrastructure/services/email_service.py`
- Delete: `apps/api/tests/unit/services/test_email_service.py`, `apps/api/tests/unit/services/test_appointment_status_email.py` (audit first — see step)
- Modify: `apps/api/src/prosell/core/config.py` (remove `sendgrid_*` settings)
- Modify: `apps/api/pyproject.toml` (remove `sendgrid>=6.11.0`)
- Modify: `.env.example` and staging env templates (sendgrid → resend keys)

- [ ] **Step 1: Find every remaining SendGrid reference**

Run:
```bash
rg -n -i "sendgrid|MockEmailService|send_appointment_notification" apps/api/src apps/api/tests
rg -n -i "sendgrid|resend" .env.example docker/.env.example 2>/dev/null
```
This is the deletion worklist. `send_appointment_notification` (orphan) must disappear with the old module — confirm no `src` caller exists (only its own tests).

- [ ] **Step 2: Delete old module and obsolete tests**

```bash
git rm apps/api/src/prosell/infrastructure/services/email_service.py
git rm apps/api/tests/unit/services/test_email_service.py
```
For `test_appointment_status_email.py`: open it; if it tests the old `SendGridEmailService`/`MockEmailService`, `git rm` it (the new `test_service.py` + `test_renderer.py` cover status-update rendering). If it tests a use case via the port, keep it and update imports.

- [ ] **Step 3: Remove sendgrid settings and dependency**

In `config.py`, delete the three `sendgrid_api_key` / `sendgrid_from_email` / `sendgrid_from_name` Field blocks (lines ~328-339). Keep `email_templates_dir` and `use_mock_email`.

In `pyproject.toml`, remove the `"sendgrid>=6.11.0",` line. Then:
```bash
cd apps/api && uv lock
```

- [ ] **Step 4: Update env templates**

In `.env.example` (and `docker/.env.example` if present), replace `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` / `SENDGRID_FROM_NAME` with:
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@prosell.saas
RESEND_FROM_NAME=ProSell SaaS
```

- [ ] **Step 5: Full verification + commit**

Run from `apps/api`:
```bash
uv run pytest
uv run ruff check . && uv run ruff format --check .
uv run pyright
rg -n -i "sendgrid" apps/api/src apps/api/tests   # expect: no matches
```
Expected: full suite green, lint clean, zero sendgrid references in code.

```bash
git add -A
git commit -m "refactor(api): remove SendGrid adapter, settings, dep, and orphan method"
```

---

## Self-Review

**Spec coverage:**
- Full replacement (single provider) → Tasks 12-13. ✓
- Split content/transport in infra; port unchanged → Tasks 1,3-11 (port never edited). ✓
- Jinja2 autoescape, removes manual escaping → Tasks 3-7; autoescape asserted Task 5. ✓
- Delete orphan `send_appointment_notification` → Task 13. ✓
- httpx async, no SDK, generalized retry → Tasks 8,10. ✓
- Config add/remove resend/sendgrid, .env → Tasks 2,13. ✓
- jinja2 explicit dep, sendgrid removed → Tasks 12,13. ✓
- Testing strategy (renderer/sender/service + autoescape) → Tasks 3-11. ✓

**Type consistency:** `EmailMessage(to, subject, html_body)` consistent across Tasks 1/9/10/11. `EmailSender.send(message)` consistent Tasks 9/10/11. Renderer method names (`render_verification`, `render_password_reset`, `render_2fa_enabled`, `render_team_invitation`, `render_appointment_confirmation`, `render_appointment_status_update`, `render_appointment_reminder`) match their `EmailService` call sites in Task 11. `TransientEmailError`/`retry_on_transient_error` consistent Tasks 8/10/11.

**Placeholder scan:** Template HTML for Tasks 6-7 references exact source line ranges in `email_service.py` with an explicit mechanical transform rule (`{safe_x}`→`{{ x }}`), not a vague "port the template" — the worker has the source file. No TBD/TODO remain.
