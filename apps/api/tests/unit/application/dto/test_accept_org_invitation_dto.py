"""Code review CR-3: harden the AcceptOrgInvitationRequest DTO.

The frontend Zod schema (passwordFieldSchema, T14) catches min(1) on
first_name/last_name, but a direct POST to /api/v1/auth/accept-org-invitation
bypasses the frontend entirely. Without min_length + strip_whitespace on the
DTO, a request with first_name="" or first_name="   " slips through Pydantic
and produces a User whose full_name is " " (or empty after the use case's
.strip()). The boundary should reject the request with 422, not let it
silently create a user with a bogus name.
"""

import pytest
from pydantic import ValidationError

from prosell.application.dto.auth.accept_org_invitation import (
    AcceptOrgInvitationRequest,
)


def test_first_name_empty_string_rejected() -> None:
    with pytest.raises(ValidationError):
        AcceptOrgInvitationRequest(
            token="some-token", password="Aa1!aaaa", first_name="", last_name="Name"
        )


def test_last_name_empty_string_rejected() -> None:
    with pytest.raises(ValidationError):
        AcceptOrgInvitationRequest(
            token="some-token", password="Aa1!aaaa", first_name="Owner", last_name=""
        )


def test_first_name_whitespace_only_stripped_to_empty_then_rejected() -> None:
    """strip_whitespace=True must run BEFORE min_length=1 — a whitespace-only
    name is just as bad as an empty one."""
    with pytest.raises(ValidationError):
        AcceptOrgInvitationRequest(
            token="some-token", password="Aa1!aaaa", first_name="   ", last_name="Name"
        )


def test_valid_names_succeed() -> None:
    request = AcceptOrgInvitationRequest(
        token="some-token", password="Aa1!aaaa", first_name="Owner", last_name="Name"
    )
    assert request.first_name == "Owner"
    assert request.last_name == "Name"
