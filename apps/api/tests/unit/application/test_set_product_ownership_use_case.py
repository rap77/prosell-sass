"""Unit tests for SetProductOwnershipUseCase.

Validates that ownership percentages sum to 100% and handles
edge cases like empty ownership, single owner, multiple owners.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.set_product_ownership import (
    OwnerShare,
    SetProductOwnershipUseCase,
)


@pytest.fixture
def mock_ownership_repo():
    repo = MagicMock()
    repo.clear_ownership = AsyncMock()
    repo.add_owner = AsyncMock()
    repo.get_total_percentage = AsyncMock(return_value=Decimal("100.00"))
    return repo


@pytest.fixture
def mock_product_repo():
    repo = MagicMock()
    repo.get_by_id = AsyncMock()
    return repo


@pytest.fixture
def use_case(mock_ownership_repo, mock_product_repo):
    return SetProductOwnershipUseCase(
        ownership_repository=mock_ownership_repo,
        product_repository=mock_product_repo,
    )


@pytest.mark.asyncio
async def test_single_owner_100_percent(use_case, mock_ownership_repo, mock_product_repo):
    """Single owner with 100% should succeed."""
    product_id = uuid4()
    owner_id = uuid4()
    mock_product_repo.get_by_id.return_value = MagicMock(id=product_id)

    await use_case.execute(
        product_id=product_id,
        tenant_id=uuid4(),
        owners=[OwnerShare(owner_id=owner_id, percentage=Decimal("100.00"))],
    )

    mock_ownership_repo.clear_ownership.assert_called_once_with(product_id)
    mock_ownership_repo.add_owner.assert_called_once_with(
        product_id, owner_id, Decimal("100.00"), "organization"
    )


@pytest.mark.asyncio
async def test_multiple_owners_sum_100(use_case, mock_ownership_repo, mock_product_repo):
    """Multiple owners summing to 100% should succeed."""
    product_id = uuid4()
    owner1, owner2 = uuid4(), uuid4()
    mock_product_repo.get_by_id.return_value = MagicMock(id=product_id)

    await use_case.execute(
        product_id=product_id,
        tenant_id=uuid4(),
        owners=[
            OwnerShare(owner_id=owner1, percentage=Decimal("60.00")),
            OwnerShare(owner_id=owner2, percentage=Decimal("40.00")),
        ],
    )

    assert mock_ownership_repo.add_owner.call_count == 2


@pytest.mark.asyncio
async def test_percentages_not_sum_100_raises(use_case, mock_product_repo):
    """Percentages not summing to 100% should raise ValueError."""
    product_id = uuid4()
    mock_product_repo.get_by_id.return_value = MagicMock(id=product_id)

    with pytest.raises(ValueError, match="must sum to 100"):
        await use_case.execute(
            product_id=product_id,
            tenant_id=uuid4(),
            owners=[
                OwnerShare(owner_id=uuid4(), percentage=Decimal("60.00")),
                OwnerShare(owner_id=uuid4(), percentage=Decimal("30.00")),  # 90% total
            ],
        )


@pytest.mark.asyncio
async def test_empty_owners_raises(use_case, mock_product_repo):
    """Empty owners list should raise ValueError."""
    product_id = uuid4()
    mock_product_repo.get_by_id.return_value = MagicMock(id=product_id)

    with pytest.raises(ValueError, match="at least one owner"):
        await use_case.execute(
            product_id=product_id,
            tenant_id=uuid4(),
            owners=[],
        )


@pytest.mark.asyncio
async def test_product_not_found_raises(use_case, mock_product_repo):
    """Non-existent product should raise ValueError."""
    mock_product_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Product not found"):
        await use_case.execute(
            product_id=uuid4(),
            tenant_id=uuid4(),
            owners=[OwnerShare(owner_id=uuid4(), percentage=Decimal("100.00"))],
        )


@pytest.mark.asyncio
async def test_percentage_over_100_raises(use_case, mock_product_repo):
    """Single owner with over 100% should raise ValueError."""
    product_id = uuid4()
    mock_product_repo.get_by_id.return_value = MagicMock(id=product_id)

    with pytest.raises(ValueError, match="must sum to 100"):
        await use_case.execute(
            product_id=product_id,
            tenant_id=uuid4(),
            owners=[OwnerShare(owner_id=uuid4(), percentage=Decimal("150.00"))],
        )
