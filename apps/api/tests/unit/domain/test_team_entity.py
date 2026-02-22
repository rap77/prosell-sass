"""Unit tests for Team and TeamMember entities."""

from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.team import Team, TeamMember, TeamMemberRole


class TestTeamFactory:
    """Test Team entity factory method."""

    def test_create_team_factory(self) -> None:
        """Test Team.create() factory method."""
        tenant_id = uuid4()
        org_id = uuid4()

        team = Team.create(
            name="Sales Team A",
            tenant_id=tenant_id,
            org_id=org_id,
        )

        assert isinstance(team.id, UUID)
        assert team.name == "Sales Team A"
        assert team.tenant_id == tenant_id
        assert team.org_id == org_id
        assert team.parent_team_id is None

    def test_create_team_with_parent(self) -> None:
        """Test creating team with parent team."""
        tenant_id = uuid4()
        org_id = uuid4()
        parent_id = uuid4()

        team = Team.create(
            name="Sub Team",
            tenant_id=tenant_id,
            org_id=org_id,
            parent_team_id=parent_id,
        )

        assert team.parent_team_id == parent_id

    def test_create_team_generates_unique_ids(self) -> None:
        """Test that factory creates unique UUIDs."""
        tenant_id = uuid4()
        org_id = uuid4()

        team1 = Team.create(name="Team 1", tenant_id=tenant_id, org_id=org_id)
        team2 = Team.create(name="Team 2", tenant_id=tenant_id, org_id=org_id)

        assert team1.id != team2.id


class TestTeamMemberManagement:
    """Test team member management."""

    def test_add_member_creates_member(self) -> None:
        """Test that add_member() creates a new member."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())
        user_id = uuid4()

        member = team.add_member(user_id, TeamMemberRole.VENDOR)

        assert member.team_id == team.id
        assert member.user_id == user_id
        assert member.role == TeamMemberRole.VENDOR
        assert isinstance(member, TeamMember)

    def test_add_member_with_commission(self) -> None:
        """Test adding member with commission rate."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())
        user_id = uuid4()

        member = team.add_member(user_id, TeamMemberRole.VENDOR, commission_rate=15.5)

        assert member.commission_rate == 15.5

    def test_add_member_invalid_commission_fails(self) -> None:
        """Test that invalid commission rate raises error."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())

        with pytest.raises(ValueError, match="Commission rate must be between 0 and 100"):
            team.add_member(uuid4(), TeamMemberRole.VENDOR, commission_rate=150)

    def test_add_member_negative_commission_fails(self) -> None:
        """Test that negative commission raises error."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())

        with pytest.raises(ValueError, match="Commission rate must be between 0 and 100"):
            team.add_member(uuid4(), TeamMemberRole.VENDOR, commission_rate=-5)


class TestTeamUpdates:
    """Test team update methods."""

    def test_update_name(self) -> None:
        """Test updating team name."""
        team = Team.create(name="Old Name", tenant_id=uuid4(), org_id=uuid4())

        team.update_name("New Name")

        assert team.name == "New Name"

    def test_update_description(self) -> None:
        """Test updating team description."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())

        team.update_description("New description")

        assert team.description == "New description"


class TestTeamProperties:
    """Test team property methods."""

    def test_manager_count_empty(self) -> None:
        """Test manager_count with no members."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())

        assert team.manager_count == 0

    def test_vendor_count_empty(self) -> None:
        """Test vendor_count with no members."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())

        assert team.vendor_count == 0

    def test_manager_count_with_members(self) -> None:
        """Test counting managers."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())
        tenant_id = team.tenant_id

        # Create members directly (add_member returns them but doesn't add to list)
        team.members = [
            TeamMember.create(team.id, uuid4(), TeamMemberRole.MANAGER, tenant_id),
            TeamMember.create(team.id, uuid4(), TeamMemberRole.MANAGER, tenant_id),
            TeamMember.create(team.id, uuid4(), TeamMemberRole.VENDOR, tenant_id),
        ]

        assert team.manager_count == 2

    def test_vendor_count_with_members(self) -> None:
        """Test counting vendors."""
        team = Team.create(name="Test Team", tenant_id=uuid4(), org_id=uuid4())
        team.members = [
            team.add_member(uuid4(), TeamMemberRole.MANAGER),
            team.add_member(uuid4(), TeamMemberRole.VENDOR),
            team.add_member(uuid4(), TeamMemberRole.VENDOR),
        ]

        assert team.vendor_count == 2


class TestTeamMemberFactory:
    """Test TeamMember entity factory method."""

    def test_create_member_factory(self) -> None:
        """Test TeamMember.create() factory method."""
        team_id = uuid4()
        user_id = uuid4()
        tenant_id = uuid4()

        member = TeamMember.create(
            team_id=team_id,
            user_id=user_id,
            role=TeamMemberRole.VENDOR,
            tenant_id=tenant_id,
        )

        assert isinstance(member.id, UUID)
        assert member.team_id == team_id
        assert member.user_id == user_id
        assert member.role == TeamMemberRole.VENDOR

    def test_create_member_with_commission(self) -> None:
        """Test creating member with commission."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
            commission_rate=20.0,
        )

        assert member.commission_rate == 20.0


class TestTeamMemberRoleManagement:
    """Test team member role management."""

    def test_promote_to_manager(self) -> None:
        """Test promoting vendor to manager."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        member.promote_to_manager()

        assert member.is_manager is True
        assert member.role == TeamMemberRole.MANAGER

    def test_demote_to_vendor(self) -> None:
        """Test demoting manager to vendor."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.MANAGER,
            tenant_id=uuid4(),
        )

        member.demote_to_vendor()

        assert member.is_vendor is True
        assert member.role == TeamMemberRole.VENDOR


class TestTeamMemberCommission:
    """Test team member commission management."""

    def test_set_commission_rate(self) -> None:
        """Test setting commission rate."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        member.set_commission_rate(25.0)

        assert member.commission_rate == 25.0

    def test_set_commission_invalid_high(self) -> None:
        """Test that invalid high commission raises error."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        with pytest.raises(ValueError, match="Commission rate must be between 0 and 100"):
            member.set_commission_rate(150)

    def test_set_commission_invalid_low(self) -> None:
        """Test that invalid low commission raises error."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        with pytest.raises(ValueError, match="Commission rate must be between 0 and 100"):
            member.set_commission_rate(-10)


class TestTeamMemberProperties:
    """Test team member property methods."""

    def test_is_manager(self) -> None:
        """Test is_manager property."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.MANAGER,
            tenant_id=uuid4(),
        )

        assert member.is_manager is True
        assert member.is_vendor is False

    def test_is_vendor(self) -> None:
        """Test is_vendor property."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        assert member.is_vendor is True
        assert member.is_manager is False

    def test_earns_commission_manager(self) -> None:
        """Test that managers earn commission."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.MANAGER,
            tenant_id=uuid4(),
        )

        assert member.earns_commission is True

    def test_earns_commission_vendor(self) -> None:
        """Test that vendors don't earn commission."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        assert member.earns_commission is False

    def test_days_since_joined(self) -> None:
        """Test days_since_joined property."""
        member = TeamMember.create(
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )

        days = member.days_since_joined
        assert days == 0
        assert isinstance(days, int)


class TestTeamMemberRoleValueObject:
    """Test TeamMemberRole value object."""

    def test_role_is_manager(self) -> None:
        """Test TeamMemberRole.is_manager()."""
        assert TeamMemberRole.MANAGER.is_manager() is True
        assert TeamMemberRole.VENDOR.is_manager() is False

    def test_role_is_vendor(self) -> None:
        """Test TeamMemberRole.is_vendor()."""
        assert TeamMemberRole.VENDOR.is_vendor() is True
        assert TeamMemberRole.MANAGER.is_vendor() is False
