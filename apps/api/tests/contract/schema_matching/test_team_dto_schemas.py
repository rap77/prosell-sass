"""Contract tests for Team DTO schemas.

These tests verify that:
1. Request DTOs validate inputs correctly (required fields, types, constraints)
2. Response DTOs serialize correctly from domain entities
3. Schema fields match OpenAPI spec expectations
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.team.create import AddTeamMemberRequest, CreateTeamRequest
from prosell.application.dto.team.response import TeamListResponse, TeamMemberResponse, TeamResponse
from prosell.application.dto.team.update import UpdateTeamMemberRequest, UpdateTeamRequest
from prosell.domain.entities.team import Team, TeamMember, TeamMemberRole


# =============================================================================
# HELPERS
# =============================================================================


def make_team_entity(**kwargs: Any) -> Team:
    """Create Team entity for DTO tests."""
    return Team(
        id=kwargs.get("id", uuid4()),  # type: ignore[arg-type]
        tenant_id=kwargs.get("tenant_id", uuid4()),  # type: ignore[arg-type]
        org_id=kwargs.get("org_id", uuid4()),  # type: ignore[arg-type]
        name=kwargs.get("name", "Test Team"),  # type: ignore[arg-type]
        description=kwargs.get("description"),  # type: ignore[arg-type]
        parent_team_id=kwargs.get("parent_team_id"),  # type: ignore[arg-type]
        created_at=kwargs.get("created_at", datetime.now(UTC)),  # type: ignore[arg-type]
        updated_at=kwargs.get("updated_at", datetime.now(UTC)),  # type: ignore[arg-type]
        members=kwargs.get("members", []),  # type: ignore[arg-type]
    )


def make_team_member_entity(**kwargs: Any) -> TeamMember:
    """Create TeamMember entity for DTO tests."""
    return TeamMember(
        id=kwargs.get("id", uuid4()),  # type: ignore[arg-type]
        team_id=kwargs.get("team_id", uuid4()),  # type: ignore[arg-type]
        user_id=kwargs.get("user_id", uuid4()),  # type: ignore[arg-type]
        tenant_id=kwargs.get("tenant_id", uuid4()),  # type: ignore[arg-type]
        role=kwargs.get("role", TeamMemberRole.VENDOR),  # type: ignore[arg-type]
        commission_rate=kwargs.get("commission_rate"),  # type: ignore[arg-type]
        joined_at=kwargs.get("joined_at", datetime.now(UTC)),  # type: ignore[arg-type]
        updated_at=kwargs.get("updated_at", datetime.now(UTC)),  # type: ignore[arg-type]
    )


# =============================================================================
# CreateTeamRequest contract tests
# =============================================================================


class TestCreateTeamRequestSchema:
    """Contract tests for CreateTeamRequest."""

    def test_valid_minimal_request(self):
        """Should accept valid minimal request with required fields."""
        req = CreateTeamRequest(
            name="Sales Team",
            org_id=uuid4(),
            tenant_id=uuid4(),
        )
        assert req.name == "Sales Team"
        assert req.description is None
        assert req.parent_team_id is None

    def test_valid_full_request(self):
        """Should accept valid request with optional fields."""
        req = CreateTeamRequest(
            name="Sales Team",
            org_id=uuid4(),
            tenant_id=uuid4(),
            description="Main sales team",
            parent_team_id=uuid4(),
        )
        assert req.description == "Main sales team"
        assert req.parent_team_id is not None

    def test_name_required(self):
        """name is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateTeamRequest(  # type: ignore[call-arg]
                org_id=uuid4(),
                tenant_id=uuid4(),
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "name" in field_names

    def test_name_min_length(self):
        """name min_length=1 should be enforced."""
        with pytest.raises(ValidationError):
            CreateTeamRequest(
                name="",
                org_id=uuid4(),
                tenant_id=uuid4(),
            )

    def test_name_max_length(self):
        """name max_length=255 should be enforced."""
        with pytest.raises(ValidationError):
            CreateTeamRequest(
                name="x" * 256,
                org_id=uuid4(),
                tenant_id=uuid4(),
            )

    def test_org_id_required(self):
        """org_id is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateTeamRequest(  # type: ignore[call-arg]
                name="Test Team",
                tenant_id=uuid4(),
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "org_id" in field_names

    def test_tenant_id_required(self):
        """tenant_id is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateTeamRequest(  # type: ignore[call-arg]
                name="Test Team",
                org_id=uuid4(),
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "tenant_id" in field_names


# =============================================================================
# AddTeamMemberRequest contract tests
# =============================================================================


class TestAddTeamMemberRequestSchema:
    """Contract tests for AddTeamMemberRequest."""

    def test_valid_request_manager_role(self):
        """Should accept valid request with manager role."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
            role="manager",
        )
        assert req.role == "manager"

    def test_valid_request_vendor_role(self):
        """Should accept valid request with vendor role."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
            role="vendor",
        )
        assert req.role == "vendor"

    def test_default_role_is_vendor(self):
        """Default role should be 'vendor'."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
        )
        assert req.role == "vendor"

    def test_invalid_role_raises(self):
        """Invalid role should raise ValidationError."""
        with pytest.raises(ValidationError):
            AddTeamMemberRequest(
                team_id=uuid4(),
                user_id=uuid4(),
                tenant_id=uuid4(),
                role="admin",
            )

    def test_commission_rate_within_range(self):
        """commission_rate must be between 0 and 100."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
            commission_rate=15.5,
        )
        assert req.commission_rate == 15.5

    def test_commission_rate_zero_allowed(self):
        """commission_rate=0 should be allowed."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
            commission_rate=0,
        )
        assert req.commission_rate == 0

    def test_commission_rate_hundred_allowed(self):
        """commission_rate=100 should be allowed."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
            commission_rate=100,
        )
        assert req.commission_rate == 100

    def test_commission_rate_negative_raises(self):
        """commission_rate < 0 should raise ValidationError."""
        with pytest.raises(ValidationError):
            AddTeamMemberRequest(
                team_id=uuid4(),
                user_id=uuid4(),
                tenant_id=uuid4(),
                commission_rate=-1,
            )

    def test_commission_rate_over_hundred_raises(self):
        """commission_rate > 100 should raise ValidationError."""
        with pytest.raises(ValidationError):
            AddTeamMemberRequest(
                team_id=uuid4(),
                user_id=uuid4(),
                tenant_id=uuid4(),
                commission_rate=100.1,
            )

    def test_commission_rate_optional(self):
        """commission_rate should be optional."""
        req = AddTeamMemberRequest(
            team_id=uuid4(),
            user_id=uuid4(),
            tenant_id=uuid4(),
        )
        assert req.commission_rate is None


# =============================================================================
# UpdateTeamRequest contract tests
# =============================================================================


class TestUpdateTeamRequestSchema:
    """Contract tests for UpdateTeamRequest."""

    def test_valid_name_update(self):
        """Should accept valid name update."""
        req = UpdateTeamRequest(name="Updated Team Name")
        assert req.name == "Updated Team Name"
        assert req.description is None

    def test_valid_description_update(self):
        """Should accept valid description update."""
        req = UpdateTeamRequest(name=None, description="Updated description")
        assert req.description == "Updated description"
        assert req.name is None

    def test_all_fields_none(self):
        """Should accept all fields None (no-op update)."""
        req = UpdateTeamRequest(name=None, description=None)
        assert req.name is None
        assert req.description is None

    def test_name_min_length(self):
        """name min_length=1 should be enforced when provided."""
        with pytest.raises(ValidationError):
            UpdateTeamRequest(name="", description=None)  # type: ignore[call-arg]

    def test_name_max_length(self):
        """name max_length=255 should be enforced."""
        with pytest.raises(ValidationError):
            UpdateTeamRequest(name="x" * 256, description=None)


# =============================================================================
# UpdateTeamMemberRequest contract tests
# =============================================================================


class TestUpdateTeamMemberRequestSchema:
    """Contract tests for UpdateTeamMemberRequest."""

    def test_valid_role_update_manager(self):
        """Should accept valid role update to manager."""
        req = UpdateTeamMemberRequest(role="manager", commission_rate=None)
        assert req.role == "manager"
        assert req.commission_rate is None

    def test_valid_role_update_vendor(self):
        """Should accept valid role update to vendor."""
        req = UpdateTeamMemberRequest(role="vendor", commission_rate=None)
        assert req.role == "vendor"

    def test_valid_commission_rate_update(self):
        """Should accept valid commission_rate update."""
        req = UpdateTeamMemberRequest(role=None, commission_rate=20.0)
        assert req.commission_rate == 20.0
        assert req.role is None

    def test_invalid_role_raises(self):
        """Invalid role should raise ValidationError."""
        with pytest.raises(ValidationError):
            UpdateTeamMemberRequest(role="admin", commission_rate=None)

    def test_commission_rate_within_range(self):
        """commission_rate must be between 0 and 100."""
        req = UpdateTeamMemberRequest(role=None, commission_rate=50)
        assert req.commission_rate == 50

    def test_commission_rate_negative_raises(self):
        """commission_rate < 0 should raise ValidationError."""
        with pytest.raises(ValidationError):
            UpdateTeamMemberRequest(role=None, commission_rate=-0.1)

    def test_commission_rate_over_hundred_raises(self):
        """commission_rate > 100 should raise ValidationError."""
        with pytest.raises(ValidationError):
            UpdateTeamMemberRequest(role=None, commission_rate=100.1)


# =============================================================================
# TeamResponse contract tests
# =============================================================================


class TestTeamResponseSchema:
    """Contract tests for TeamResponse."""

    def test_from_entity_all_fields_mapped(self):
        """All entity fields should be present in response."""
        team = make_team_entity()
        resp = TeamResponse.from_entity(team)

        assert resp.id == team.id
        assert resp.tenant_id == team.tenant_id
        assert resp.org_id == team.org_id
        assert resp.name == team.name
        assert resp.description == team.description
        assert resp.parent_team_id == team.parent_team_id
        assert resp.created_at == team.created_at
        assert resp.updated_at == team.updated_at
        assert resp.manager_count == team.manager_count
        assert resp.vendor_count == team.vendor_count

    def test_from_entity_with_members(self):
        """Team response should include members list."""
        member = make_team_member_entity()
        team = make_team_entity(members=[member])
        resp = TeamResponse.from_entity(team)

        assert len(resp.members) == 1
        assert resp.members[0].user_id == member.user_id
        assert resp.members[0].role == member.role.value

    def test_null_optional_fields(self):
        """Optional fields should serialize as None."""
        team = make_team_entity(description=None, parent_team_id=None)
        resp = TeamResponse.from_entity(team)
        data = resp.model_dump()
        assert data["description"] is None
        assert data["parent_team_id"] is None


# =============================================================================
# TeamMemberResponse contract tests
# =============================================================================


class TestTeamMemberResponseSchema:
    """Contract tests for TeamMemberResponse."""

    def test_from_entity_all_fields_mapped(self):
        """All entity fields should be present in response."""
        member = make_team_member_entity()
        resp = TeamMemberResponse.from_entity(member)

        assert resp.id == member.id
        assert resp.team_id == member.team_id
        assert resp.user_id == member.user_id
        assert resp.tenant_id == member.tenant_id
        assert resp.role == member.role.value
        assert resp.commission_rate == member.commission_rate
        assert resp.joined_at == member.joined_at
        assert resp.updated_at == member.updated_at

    def test_role_serializes_as_string(self):
        """role should serialize to string value."""
        member = make_team_member_entity(role=TeamMemberRole.MANAGER)
        resp = TeamMemberResponse.from_entity(member)
        data = resp.model_dump()
        assert data["role"] == "manager"

    def test_all_role_values_accepted(self):
        """All 2 role values should be valid."""
        for role in TeamMemberRole:
            member = make_team_member_entity(role=role)
            resp = TeamMemberResponse.from_entity(member)
            assert resp.role == role.value

    def test_null_commission_rate(self):
        """Optional commission_rate should serialize as None."""
        member = make_team_member_entity(commission_rate=None)
        resp = TeamMemberResponse.from_entity(member)
        data = resp.model_dump()
        assert data["commission_rate"] is None


# =============================================================================
# TeamListResponse contract tests
# =============================================================================


class TestTeamListResponseSchema:
    """Contract tests for TeamListResponse."""

    def test_pagination_fields_present(self):
        """Should contain teams, total, skip, limit."""
        team = make_team_entity()
        resp = TeamListResponse(
            teams=[TeamResponse.from_entity(team)],
            total=1,
            skip=0,
            limit=50,
        )
        data = resp.model_dump()

        assert "teams" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert data["total"] == 1
        assert len(data["teams"]) == 1

    def test_empty_list(self):
        """Should handle empty teams list."""
        resp = TeamListResponse(teams=[], total=0, skip=0, limit=50)
        assert resp.total == 0
        assert resp.teams == []
