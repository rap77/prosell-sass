"""Unit tests for AssignUserBranchUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.user_branch import AssignBranchRequest
from prosell.application.use_cases.user_branch.assign_user_branch import (
    AssignUserBranchUseCase,
)
from prosell.domain.entities.branch import Branch
from prosell.domain.entities.user_branch import UserBranch
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError
from prosell.domain.exceptions.user_branch_exceptions import (
    UserBranchAlreadyAssignedError,
)


class TestAssignUserBranchUseCase:
    """Test suite for AssignUserBranchUseCase."""

    @pytest.mark.asyncio
    async def test_assign_branch_to_user_success(self):
        """Successfully assign branch to user with audit trail."""
        # Arrange
        user_id = uuid4()
        branch_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignBranchRequest(branch_id=branch_id)

        mock_branch = Branch(
            id=branch_id,
            tenant_id=tenant_id,
            name="Test Branch",
            slug="test-branch",
        )

        mock_user_branch_repo = AsyncMock()
        mock_user_branch_repo.exists = AsyncMock(return_value=False)
        mock_user_branch_repo.assign = AsyncMock(
            return_value=UserBranch.assign(
                user_id=user_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )
        )

        mock_branch_repo = AsyncMock()
        mock_branch_repo.get_by_id = AsyncMock(return_value=mock_branch)

        use_case = AssignUserBranchUseCase(
            user_branch_repository=mock_user_branch_repo,
            branch_repository=mock_branch_repo,
        )

        # Act
        response = await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )

        # Assert
        assert response.user_id == user_id
        assert response.branch_id == branch_id
        assert response.tenant_id == tenant_id
        assert response.assigned_by == assigned_by
        assert isinstance(response.assigned_at, datetime)
        mock_user_branch_repo.assign.assert_called_once()

    @pytest.mark.asyncio
    async def test_assign_branch_not_found(self):
        """Raise BranchNotFoundError when branch does not exist."""
        # Arrange
        user_id = uuid4()
        branch_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignBranchRequest(branch_id=branch_id)

        mock_user_branch_repo = AsyncMock()
        mock_branch_repo = AsyncMock()
        mock_branch_repo.get_by_id = AsyncMock(return_value=None)

        use_case = AssignUserBranchUseCase(
            user_branch_repository=mock_user_branch_repo,
            branch_repository=mock_branch_repo,
        )

        # Act & Assert
        with pytest.raises(BranchNotFoundError):
            await use_case.execute(
                user_id=user_id,
                request=request,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

    @pytest.mark.asyncio
    async def test_assign_branch_already_assigned(self):
        """Raise UserBranchAlreadyAssignedError when assignment already exists."""
        # Arrange
        user_id = uuid4()
        branch_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignBranchRequest(branch_id=branch_id)

        mock_branch = Branch(
            id=branch_id,
            tenant_id=tenant_id,
            name="Test Branch",
            slug="test-branch",
        )

        mock_user_branch_repo = AsyncMock()
        mock_user_branch_repo.exists = AsyncMock(return_value=True)

        mock_branch_repo = AsyncMock()
        mock_branch_repo.get_by_id = AsyncMock(return_value=mock_branch)

        use_case = AssignUserBranchUseCase(
            user_branch_repository=mock_user_branch_repo,
            branch_repository=mock_branch_repo,
        )

        # Act & Assert
        with pytest.raises(UserBranchAlreadyAssignedError):
            await use_case.execute(
                user_id=user_id,
                request=request,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

    @pytest.mark.asyncio
    async def test_assign_branch_populates_audit_fields(self):
        """Populate assigned_at and assigned_by audit fields."""
        # Arrange
        user_id = uuid4()
        branch_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignBranchRequest(branch_id=branch_id)

        mock_branch = Branch(
            id=branch_id,
            tenant_id=tenant_id,
            name="Test Branch",
            slug="test-branch",
        )

        mock_user_branch_repo = AsyncMock()
        mock_user_branch_repo.exists = AsyncMock(return_value=False)
        mock_user_branch_repo.assign = AsyncMock(
            return_value=UserBranch.assign(
                user_id=user_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )
        )

        mock_branch_repo = AsyncMock()
        mock_branch_repo.get_by_id = AsyncMock(return_value=mock_branch)

        use_case = AssignUserBranchUseCase(
            user_branch_repository=mock_user_branch_repo,
            branch_repository=mock_branch_repo,
        )

        # Act
        response = await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )

        # Assert
        assert response.assigned_by == assigned_by
        # Just verify it's a recent datetime (within last minute)
        now = datetime.now(UTC)
        assert (now - response.assigned_at).total_seconds() < 60
