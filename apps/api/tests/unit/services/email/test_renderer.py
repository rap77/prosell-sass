from uuid import uuid4

import pytest

from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer


@pytest.fixture
def renderer() -> EmailTemplateRenderer:
    return EmailTemplateRenderer()


def test_render_verification_contains_token_link(renderer: EmailTemplateRenderer) -> None:
    msg = renderer.render_verification(email="user@example.com", user_id=uuid4(), token="tok123")
    assert msg.to == "user@example.com"
    assert "Verify" in msg.subject
    assert "token=tok123" in msg.html_body


@pytest.mark.skip(reason="render_team_invitation lands in Task 5")
def test_render_autoescapes_html_in_values(renderer: EmailTemplateRenderer) -> None:
    # Autoescaping is the whole point — a hostile value must be neutralized.
    msg = renderer.render_team_invitation(  # pyright: ignore[reportAttributeAccessIssue]
        email="user@example.com",
        team_name="<script>alert(1)</script>",
        inviter_name="Eve",
        invitation_token="t",
        role="member",
    )
    assert "<script>alert(1)</script>" not in msg.html_body
    assert "&lt;script&gt;" in msg.html_body
