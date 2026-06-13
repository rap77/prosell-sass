"""Provider-agnostic email subsystem.

The split between content (renderer), transport (sender), retry, and
composition (EmailService) keeps each concern testable in isolation and
lets the DI layer pick the right sender for the environment without the
domain port being aware of it.
"""

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
