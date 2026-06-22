"""Tests for Organization entity."""

from uuid import uuid4

from prosell.domain.entities.organization import Organization


def test_create_stores_creator_id():
    creator_id = uuid4()
    tenant_id = uuid4()

    org = Organization.create(name="Acme Motors", tenant_id=tenant_id, creator_id=creator_id)

    assert org.created_by_user_id == creator_id


def test_create_allows_no_creator_id():
    org = Organization.create(name="Acme Motors", tenant_id=uuid4())
    assert org.created_by_user_id is None
