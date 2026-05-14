"""Unit tests for TeamInvitation entity - TDD RED phase."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from prosell.domain.entities.team_invitation import TeamInvitation, TeamInvitationStatus
from prosell.domain.entities.team import TeamMemberRole


class TestTeamInvitationStatus:
    """Test TeamInvitationStatus enum."""

    def test_status_values(self):
        """Test that all status values exist."""
        assert TeamInvitationStatus.PENDING.value == "pending"
        assert TeamInvitationStatus.ACCEPTED.value == "accepted"
        assert TeamInvitationStatus.EXPIRED.value == "expired"
        assert TeamInvitationStatus.CANCELLED.value == "cancelled"

    def test_is_pending(self):
        """Test is_pending() method."""
        assert TeamInvitationStatus.PENDING.is_pending()
        assert not TeamInvitationStatus.ACCEPTED.is_pending()
        assert not TeamInvitationStatus.EXPIRED.is_pending()
        assert not TeamInvitationStatus.CANCELLED.is_pending()

    def test_is_accepted(self):
        """Test is_accepted() method."""
        assert TeamInvitationStatus.ACCEPTED.is_accepted()
        assert not TeamInvitationStatus.PENDING.is_accepted()
        assert not TeamInvitationStatus.EXPIRED.is_accepted()
        assert not TeamInvitationStatus.CANCELLED.is_accepted()

    def test_is_expired(self):
        """Test is_expired() method."""
        assert TeamInvitationStatus.EXPIRED.is_expired()
        assert not TeamInvitationStatus.PENDING.is_expired()
        assert not TeamInvitationStatus.ACCEPTED.is_expired()
        assert not TeamInvitationStatus.CANCELLED.is_expired()


class TestTeamInvitationEntity:
    """Test TeamInvitation entity."""

    def test_invitation_creation(self):
        """Test creating a new team invitation."""
        # Generate a 64-char token for testing (SHA256 hash format)
        test_token = "a" * 64

        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="invited@example.com",
            role=TeamMemberRole.VENDOR,
            token=test_token,
            expires_at=datetime.now(UTC) + timedelta(days=7),
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        assert invitation.id is not None
        assert invitation.email == "invited@example.com"
        assert invitation.role == TeamMemberRole.VENDOR
        assert invitation.token == test_token
        assert invitation.status == TeamInvitationStatus.PENDING

    def test_invitation_factory_method(self):
        """Test TeamInvitation.create() factory method."""
        team_id = uuid4()
        tenant_id = uuid4()
        email = "newmember@example.com"
        role = TeamMemberRole.MANAGER

        invitation = TeamInvitation.create(
            team_id=team_id,
            email=email,
            role=role,
            tenant_id=tenant_id,
        )

        assert invitation.id is not None
        assert invitation.team_id == team_id
        assert invitation.email == email
        assert invitation.role == role
        assert invitation.tenant_id == tenant_id
        assert invitation.token is not None
        assert len(invitation.token) == 64  # SHA256 hash length
        assert invitation.status == TeamInvitationStatus.PENDING
        assert invitation.expires_at is not None
        assert invitation.expires_at > datetime.now(UTC)
        assert invitation.expires_at <= datetime.now(UTC) + timedelta(days=7)

    def test_is_expired_with_expired_invitation(self):
        """Test is_expired() returns True for expired invitations."""
        test_token = "a" * 64

        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="expired@example.com",
            role=TeamMemberRole.VENDOR,
            token=test_token,
            expires_at=datetime.now(UTC) - timedelta(days=1),  # Yesterday
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC) - timedelta(days=8),
            updated_at=datetime.now(UTC) - timedelta(days=8),
        )

        assert invitation.is_expired()

    def test_is_expired_with_valid_invitation(self):
        """Test is_expired() returns False for valid invitations."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="valid@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) + timedelta(days=7),  # Future
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        assert not invitation.is_expired()

    def test_accept_invitation(self):
        """Test accepting an invitation."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) + timedelta(days=7),
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        invitation.accept()

        assert invitation.status == TeamInvitationStatus.ACCEPTED
        assert invitation.updated_at > invitation.created_at

    def test_cancel_invitation(self):
        """Test cancelling an invitation."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) + timedelta(days=7),
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        invitation.cancel()

        assert invitation.status == TeamInvitationStatus.CANCELLED
        assert invitation.updated_at > invitation.created_at

    def test_mark_as_expired(self):
        """Test marking an invitation as expired."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) - timedelta(days=1),
            status=TeamInvitationStatus.PENDING,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC) - timedelta(days=8),
            updated_at=datetime.now(UTC) - timedelta(days=8),
        )

        invitation.mark_expired()

        assert invitation.status == TeamInvitationStatus.EXPIRED
        assert invitation.updated_at > invitation.created_at

    def test_cannot_accept_expired_invitation(self):
        """Test that accepting an expired invitation raises an error."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) - timedelta(days=1),
            status=TeamInvitationStatus.EXPIRED,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC) - timedelta(days=8),
            updated_at=datetime.now(UTC) - timedelta(days=8),
        )

        with pytest.raises(ValueError, match="Cannot accept expired invitation"):
            invitation.accept()

    def test_cannot_accept_already_accepted_invitation(self):
        """Test that accepting an already accepted invitation raises an error."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) + timedelta(days=7),
            status=TeamInvitationStatus.ACCEPTED,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        with pytest.raises(ValueError, match="Invitation already accepted"):
            invitation.accept()

    def test_cannot_cancel_accepted_invitation(self):
        """Test that cancelling an accepted invitation raises an error."""
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=uuid4(),
            email="member@example.com",
            role=TeamMemberRole.VENDOR,
            token="a" * 64,  # 64-char token for testing
            expires_at=datetime.now(UTC) + timedelta(days=7),
            status=TeamInvitationStatus.ACCEPTED,
            tenant_id=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        with pytest.raises(ValueError, match="Cannot cancel accepted invitation"):
            invitation.cancel()
