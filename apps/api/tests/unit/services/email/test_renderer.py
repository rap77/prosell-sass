from datetime import datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.ports.i_email_service import AppointmentReminderDetails
from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer


@pytest.fixture
def renderer() -> EmailTemplateRenderer:
    return EmailTemplateRenderer()


def test_render_verification_contains_token_link(renderer: EmailTemplateRenderer) -> None:
    msg = renderer.render_verification(email="user@example.com", user_id=uuid4(), token="tok123")
    assert msg.to == "user@example.com"
    assert "Verify" in msg.subject
    assert "token=tok123" in msg.html_body


def test_render_password_reset_contains_reset_link(renderer: EmailTemplateRenderer) -> None:
    msg = renderer.render_password_reset(email="user@example.com", token="r1")
    assert "Reset" in msg.subject
    assert "reset-password?token=r1" in msg.html_body


def test_render_2fa_enabled(renderer: EmailTemplateRenderer) -> None:
    msg = renderer.render_2fa_enabled(email="user@example.com")
    assert msg.to == "user@example.com"
    assert "2FA" in msg.html_body or "two-factor" in msg.html_body.lower()


def test_render_autoescapes_html_in_values(renderer: EmailTemplateRenderer) -> None:
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


def test_render_team_invitation_has_accept_link(renderer: EmailTemplateRenderer) -> None:
    msg = renderer.render_team_invitation(
        email="user@example.com",
        team_name="Sales",
        inviter_name="Ana",
        invitation_token="inv9",
        role="member",
    )
    assert "Sales" in msg.html_body
    assert "invite/accept?token=inv9" in msg.html_body


def test_render_appointment_confirmation(renderer: EmailTemplateRenderer) -> None:
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


def test_render_appointment_status_update_cancelled(renderer: EmailTemplateRenderer) -> None:
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


def test_render_appointment_reminder_buyer(renderer: EmailTemplateRenderer) -> None:
    details: AppointmentReminderDetails = {
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
