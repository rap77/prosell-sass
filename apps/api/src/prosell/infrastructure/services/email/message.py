"""Provider-agnostic email message value object."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EmailMessage:
    """A fully rendered email, ready for any transport adapter."""

    to: str
    subject: str
    html_body: str
