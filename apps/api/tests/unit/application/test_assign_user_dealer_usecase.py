"""Unit tests for AssignUserDealerUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.user_dealer import AssignDealerRequest
from prosell.application.use_cases.user_dealer.assign_user_dealer import (
    AssignUserDealerUseCase,
)
from prosell.domain.entities.dealer import Dealer
from prosell.domain.entities.user_dealer import UserDealer
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError
from prosell.domain.exceptions.user_dealer_exceptions import (
    UserDealerAlreadyAssignedError,
)


class TestAssignUserDealerUseCase:
    """Test suite for AssignUserDealerUseCase."""

    @pytest.mark.asyncio
    async def test_assign_dealer_to_user_success(self):
        """Successfully assign dealer to user with audit trail."""
        # Arrange
        user_id = uuid4()
        dealer_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignDealerRequest(dealer_id=dealer_id)

        mock_dealer = Dealer(
            id=dealer_id,
            tenant_id=tenant_id,
            name="Test Dealer",
            slug="test-dealer",
        )

        mock_user_dealer_repo = AsyncMock()
        mock_user_dealer_repo.exists = AsyncMock(return_value=False)
        mock_user_dealer_repo.assign = AsyncMock(
            return_value=UserDealer.assign(
                user_id=user_id,
                dealer_id=dealer_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )
        )

        mock_dealer_repo = AsyncMock()
        mock_dealer_repo.get_by_id = AsyncMock(return_value=mock_dealer)

        use_case = AssignUserDealerUseCase(
            user_dealer_repository=mock_user_dealer_repo,
            dealer_repository=mock_dealer_repo,
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
        assert response.dealer_id == dealer_id
        assert response.tenant_id == tenant_id
        assert response.assigned_by == assigned_by
        assert isinstance(response.assigned_at, datetime)
        mock_user_dealer_repo.assign.assert_called_once()

    @pytest.mark.asyncio
    async def test_assign_dealer_not_found(self):
        """Raise DealerNotFoundError when dealer does not exist."""
        # Arrange
        user_id = uuid4()
        dealer_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignDealerRequest(dealer_id=dealer_id)

        mock_user_dealer_repo = AsyncMock()
        mock_dealer_repo = AsyncMock()
        mock_dealer_repo.get_by_id = AsyncMock(return_value=None)

        use_case = AssignUserDealerUseCase(
            user_dealer_repository=mock_user_dealer_repo,
            dealer_repository=mock_dealer_repo,
        )

        # Act & Assert
        with pytest.raises(DealerNotFoundError):
            await use_case.execute(
                user_id=user_id,
                request=request,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

    @pytest.mark.asyncio
    async def test_assign_dealer_already_assigned(self):
        """Raise UserDealerAlreadyAssignedError when assignment already exists."""
        # Arrange
        user_id = uuid4()
        dealer_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignDealerRequest(dealer_id=dealer_id)

        mock_dealer = Dealer(
            id=dealer_id,
            tenant_id=tenant_id,
            name="Test Dealer",
            slug="test-dealer",
        )

        mock_user_dealer_repo = AsyncMock()
        mock_user_dealer_repo.exists = AsyncMock(return_value=True)

        mock_dealer_repo = AsyncMock()
        mock_dealer_repo.get_by_id = AsyncMock(return_value=mock_dealer)

        use_case = AssignUserDealerUseCase(
            user_dealer_repository=mock_user_dealer_repo,
            dealer_repository=mock_dealer_repo,
        )

        # Act & Assert
        with pytest.raises(UserDealerAlreadyAssignedError):
            await use_case.execute(
                user_id=user_id,
                request=request,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

    @pytest.mark.asyncio
    async def test_assign_dealer_populates_audit_fields(self):
        """Populate assigned_at and assigned_by audit fields."""
        # Arrange
        user_id = uuid4()
        dealer_id = uuid4()
        tenant_id = uuid4()
        assigned_by = uuid4()
        request = AssignDealerRequest(dealer_id=dealer_id)

        mock_dealer = Dealer(
            id=dealer_id,
            tenant_id=tenant_id,
            name="Test Dealer",
            slug="test-dealer",
        )

        mock_user_dealer_repo = AsyncMock()
        mock_user_dealer_repo.exists = AsyncMock(return_value=False)
        mock_user_dealer_repo.assign = AsyncMock(
            return_value=UserDealer.assign(
                user_id=user_id,
                dealer_id=dealer_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )
        )

        mock_dealer_repo = AsyncMock()
        mock_dealer_repo.get_by_id = AsyncMock(return_value=mock_dealer)

        use_case = AssignUserDealerUseCase(
            user_dealer_repository=mock_user_dealer_repo,
            dealer_repository=mock_dealer_repo,
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
