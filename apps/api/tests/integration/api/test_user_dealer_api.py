"""
Integration tests for User-Dealer assignment API endpoints.

Tests cover:
- DTO validation
- Use case behavior
- Router endpoints
- Role-based access control
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.user_dealer import (
    AssignDealerRequest,
    BulkAssignRequest,
    UserDealerListResponse,
    UserDealerResponse,
)

# =============================================================================
# DTO TESTS
# =============================================================================


def test_user_dealer_dtos() -> None:
    """Test 1-4: UserDealer DTOs validate correctly."""

    # Test 1: AssignDealerRequest validates dealer_id field
    dealer_id = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)
    assert request.dealer_id == dealer_id

    # Test 2: BulkAssignRequest validates user_ids and dealer_ids arrays
    user_ids = [uuid4(), uuid4()]
    dealer_ids = [uuid4(), uuid4()]
    bulk_request = BulkAssignRequest(user_ids=user_ids, dealer_ids=dealer_ids)
    assert bulk_request.user_ids == user_ids
    assert bulk_request.dealer_ids == dealer_ids

    # Test 3: UserDealerResponse includes user_id, dealer_id, assigned_at, assigned_by
    now = datetime.now(UTC)
    response = UserDealerResponse(
        id=uuid4(),
        user_id=uuid4(),
        dealer_id=uuid4(),
        tenant_id=uuid4(),
        assigned_at=now,
        assigned_by=uuid4(),
    )
    assert response.user_id is not None
    assert response.dealer_id is not None
    assert response.assigned_at == now
    assert response.assigned_by is not None

    # Test 4: UserDealerListResponse includes items array
    list_response = UserDealerListResponse(
        items=[
            UserDealerResponse(
                id=uuid4(),
                user_id=uuid4(),
                dealer_id=uuid4(),
                tenant_id=uuid4(),
                assigned_at=now,
                assigned_by=uuid4(),
            )
        ],
        total=1,
    )
    assert len(list_response.items) == 1
    assert list_response.total == 1


def test_bulk_assign_request_validation_empty_lists() -> None:
    """Test BulkAssignRequest rejects empty lists."""
    with pytest.raises(ValidationError):
        BulkAssignRequest(user_ids=[], dealer_ids=[uuid4()])

    with pytest.raises(ValidationError):
        BulkAssignRequest(user_ids=[uuid4()], dealer_ids=[])


# =============================================================================
# USE CASE TESTS (stubs - will be implemented in Task 2-3)
# =============================================================================


@pytest.mark.xfail(reason="Not implemented yet — Task 2")
def test_assign_user_dealer_usecase() -> None:
    """Test AssignUserDealerUseCase assigns dealer to user via repository."""
    pytest.fail("stub - Task 2")


@pytest.mark.xfail(reason="Not implemented yet — Task 2")
def test_assign_user_dealer_audit_fields() -> None:
    """Test AssignUserDealerUseCase populates audit fields."""
    pytest.fail("stub - Task 2")


@pytest.mark.xfail(reason="Not implemented yet — Task 2")
def test_assign_user_dealer_duplicate() -> None:
    """Test AssignUserDealerUseCase raises error for duplicate assignment."""
    pytest.fail("stub - Task 2")


@pytest.mark.xfail(reason="Not implemented yet — Task 2")
def test_assign_user_dealer_response() -> None:
    """Test AssignUserDealerUseCase returns UserDealerResponse."""
    pytest.fail("stub - Task 2")


# =============================================================================
# ROUTER ENDPOINT TESTS (stubs - will be implemented in Task 4)
# =============================================================================


@pytest.mark.xfail(reason="Not implemented yet — Task 4")
def test_assign_seller_to_dealer() -> None:
    """POST /api/users/{id}/dealers assigns dealer (201)."""
    pytest.fail("stub - Task 4")


@pytest.mark.xfail(reason="Not implemented yet — Task 4")
def test_bulk_assign_sellers() -> None:
    """POST /api/users/bulk-assign assigns multiple (200)."""
    pytest.fail("stub - Task 4")


@pytest.mark.xfail(reason="Not implemented yet — Task 4")
def test_remove_seller_from_dealer() -> None:
    """DELETE /api/users/{id}/dealers/{dealer_id} removes (204)."""
    pytest.fail("stub - Task 4")


@pytest.mark.xfail(reason="Not implemented yet — Task 4")
def test_list_user_dealers() -> None:
    """GET /api/users/{id}/dealers lists assignments (200)."""
    pytest.fail("stub - Task 4")


@pytest.mark.xfail(reason="Not implemented yet — Task 4")
def test_admin_manager_only_access() -> None:
    """Admin/Manager-only access enforced (403 for sellers)."""
    pytest.fail("stub - Task 4")
