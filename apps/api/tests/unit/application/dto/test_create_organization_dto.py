"""Unit tests for `CreateOrganizationRequest` DTO — name normalization.

Why this test file exists: `owner_email` is normalized (`.lower().strip()`)
inside the use case, but `name` had no equivalent guard anywhere — the DTO
typed it as a bare `str`, so whitespace-only input (which satisfies HTML's
`required`) passed straight through to `Organization.create`.
"""

from uuid import UUID

import pytest
from pydantic import ValidationError

from prosell.application.dto.organization.create_organization import CreateOrganizationRequest

VERTICAL_ID = UUID("00000000-0000-0000-0000-000000000001")


def _make_request(name: str) -> CreateOrganizationRequest:
    return CreateOrganizationRequest(
        name=name,
        vertical_ids=[VERTICAL_ID],
        owner_email="owner@x.com",
    )


def test_rejects_whitespace_only_name() -> None:
    with pytest.raises(ValidationError):
        _make_request(name="   ")


def test_strips_surrounding_whitespace_from_name() -> None:
    request = _make_request(name="  Acme Motors  ")
    assert request.name == "Acme Motors"
