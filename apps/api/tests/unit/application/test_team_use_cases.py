"""Unit tests for Team use cases."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.team import (
    CreateTeamRequest,
    UpdateTeamRequest,
)
from prosell.application.use_cases.team import (
    AddTeamMemberUseCase,
    CreateTeamUseCase,
    GetTeamsByOrganizationUseCase,
    GetTeamUseCase,
    UpdateTeamUseCase,
)
from prosell.domain.entities.team import Team, TeamMemberRole
from prosell.domain.exceptions.org_exceptions import (
    TeamAlreadyExistsException,
    TeamNotFoundException,
)

# =============================================================================
# HELPERS
# =============================================================================


def make_team(name: str = "Sales Team") -> Team:
    org_id = uuid4()
    tenant_id = uuid4()
    return Team.create(name=name, tenant_id=tenant_id, org_id=org_id)


def make_team_repo() -> AsyncMock:
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.create = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_by_org = AsyncMock(return_value=[])
    repo.update = AsyncMock()
    repo.exists_by_name = AsyncMock(return_value=False)
    repo.count = AsyncMock(return_value=0)
    repo.count_by_org = AsyncMock(return_value=0)
    return repo


def make_team_member_repo() -> AsyncMock:
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.create = AsyncMock()
    return repo


# =============================================================================
# CreateTeamUseCase
# =============================================================================


class TestCreateTeamUseCase:
    async def test_create_success(self) -> None:
        team = make_team()
        team_repo = make_team_repo()
        team_repo.exists_by_name.return_value = False
        team_repo.create.return_value = team

        request = CreateTeamRequest(
            name=team.name,
            org_id=team.org_id,
            tenant_id=team.tenant_id,
            description="A sales team",
        )
        use_case = CreateTeamUseCase(team_repository=team_repo)

        result = await use_case.execute(request)

        assert result.name == team.name
        assert result.org_id == team.org_id
        team_repo.create.assert_awaited_once()

    async def test_create_raises_when_name_exists(self) -> None:
        team_repo = make_team_repo()
        team_repo.exists_by_name.return_value = True

        request = CreateTeamRequest(
            name="Existing Team",
            org_id=uuid4(),
            tenant_id=uuid4(),
        )
        use_case = CreateTeamUseCase(team_repository=team_repo)

        with pytest.raises(TeamAlreadyExistsException):
            await use_case.execute(request)


# =============================================================================
# GetTeamUseCase
# =============================================================================


class TestGetTeamUseCase:
    async def test_get_success(self) -> None:
        team = make_team()
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = team

        use_case = GetTeamUseCase(team_repository=team_repo)
        result = await use_case.execute(team_id=team.id, tenant_id=team.tenant_id)

        assert result.id == team.id
        assert result.name == team.name

    async def test_get_raises_when_not_found(self) -> None:
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = None

        use_case = GetTeamUseCase(team_repository=team_repo)

        with pytest.raises(TeamNotFoundException):
            await use_case.execute(team_id=uuid4(), tenant_id=uuid4())


# =============================================================================
# GetTeamsByOrganizationUseCase
# =============================================================================


class TestGetTeamsByOrganizationUseCase:
    async def test_get_by_org_success(self) -> None:
        teams = [make_team("Team A"), make_team("Team B")]
        team_repo = make_team_repo()
        team_repo.get_by_org.return_value = teams
        team_repo.count_by_org.return_value = 2

        use_case = GetTeamsByOrganizationUseCase(team_repository=team_repo)
        result = await use_case.execute(org_id=uuid4(), tenant_id=uuid4())

        assert result.total == 2
        assert len(result.teams) == 2


# =============================================================================
# UpdateTeamUseCase
# =============================================================================


class TestUpdateTeamUseCase:
    async def test_update_success(self) -> None:
        team = make_team()
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = team

        updated_team = Team.model_validate(team.model_dump())
        updated_team.update_name("Updated Name")
        team_repo.update.return_value = updated_team

        request = UpdateTeamRequest(name="Updated Name")
        use_case = UpdateTeamUseCase(team_repository=team_repo)
        result = await use_case.execute(
            team_id=team.id,
            tenant_id=team.tenant_id,
            request=request,
        )

        assert result.name == "Updated Name"

    async def test_update_raises_when_not_found(self) -> None:
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = None

        request = UpdateTeamRequest(name="New Name")
        use_case = UpdateTeamUseCase(team_repository=team_repo)

        with pytest.raises(TeamNotFoundException):
            await use_case.execute(
                team_id=uuid4(),
                tenant_id=uuid4(),
                request=request,
            )


# =============================================================================
# AddTeamMemberUseCase
# =============================================================================


class TestAddTeamMemberUseCase:
    async def test_add_vendor_success(self) -> None:
        team = make_team()
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = team

        member_repo = make_team_member_repo()
        member = team.add_member(user_id=uuid4(), role=TeamMemberRole.VENDOR)
        member_repo.create.return_value = member

        use_case = AddTeamMemberUseCase(
            team_repository=team_repo,
            team_member_repository=member_repo,
        )

        result = await use_case.execute(
            team_id=team.id,
            user_id=uuid4(),
            tenant_id=team.tenant_id,
            role="vendor",
        )

        assert result.role == "vendor"
        member_repo.create.assert_awaited_once()

    async def test_add_manager_with_commission_success(self) -> None:
        team = make_team()
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = team

        member_repo = make_team_member_repo()
        member = team.add_member(
            user_id=uuid4(),
            role=TeamMemberRole.MANAGER,
            commission_rate=15.0,
        )
        member_repo.create.return_value = member

        use_case = AddTeamMemberUseCase(
            team_repository=team_repo,
            team_member_repository=member_repo,
        )

        result = await use_case.execute(
            team_id=team.id,
            user_id=uuid4(),
            tenant_id=team.tenant_id,
            role="manager",
            commission_rate=15.0,
        )

        assert result.role == "manager"
        assert result.commission_rate == 15.0

    async def test_add_raises_when_team_not_found(self) -> None:
        team_repo = make_team_repo()
        team_repo.get_by_id.return_value = None

        member_repo = make_team_member_repo()

        use_case = AddTeamMemberUseCase(
            team_repository=team_repo,
            team_member_repository=member_repo,
        )

        with pytest.raises(TeamNotFoundException):
            await use_case.execute(
                team_id=uuid4(),
                user_id=uuid4(),
                tenant_id=uuid4(),
            )
