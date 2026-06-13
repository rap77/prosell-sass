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
