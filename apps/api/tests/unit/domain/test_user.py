"""Tests for User entity."""

from uuid import uuid4

from prosell.domain.entities.user import User, UserStatus


def test_create_default_behavior_unchanged():
    user = User.create(email="a@b.com", password_hash="hash", full_name="A B")
    assert user.tenant_id is None
    assert user.status == UserStatus.PENDING_VERIFICATION
    assert user.email_verified is False


def test_create_pre_verified_with_tenant_id():
    tenant_id = uuid4()
    user = User.create(
        email="owner@dealer.com",
        password_hash="hash",
        full_name="Owner Name",
        tenant_id=tenant_id,
        pre_verified=True,
    )
    assert user.tenant_id == tenant_id
    assert user.status == UserStatus.ACTIVE
    assert user.email_verified is True
    assert user.email_verified_at is not None
