"""Tests for durable internal-code allocation."""

from unittest.mock import AsyncMock

import pytest

from prosell.domain.services.internal_code_allocator import InternalCodeAllocator


@pytest.mark.asyncio
async def test_allocate_next_delegates_to_atomic_repository_allocation() -> None:
    """Allocation must use the repository's atomic database primitive."""
    product_repository = AsyncMock()
    product_repository.get_max_internal_code.side_effect = AssertionError(
        "MAX + 1 is not safe for concurrent allocation"
    )
    product_repository.allocate_next_internal_code.return_value = 42

    result = await InternalCodeAllocator(product_repository).allocate_next()

    assert result == 42
    product_repository.allocate_next_internal_code.assert_awaited_once_with()


@pytest.mark.asyncio
async def test_peek_next_returns_max_plus_one_when_a_row_exists() -> None:
    """A peek reports MAX + 1 using only `get_max_internal_code`."""
    product_repository = AsyncMock()
    product_repository.get_max_internal_code = AsyncMock(return_value=99)
    product_repository.allocate_next_internal_code.side_effect = AssertionError(
        "peek_next must not consume a sequence value"
    )

    result = await InternalCodeAllocator(product_repository).peek_next()

    assert result == 100
    product_repository.get_max_internal_code.assert_awaited_once_with()
    product_repository.allocate_next_internal_code.assert_not_awaited()


@pytest.mark.asyncio
async def test_peek_next_returns_one_when_no_row_exists() -> None:
    """First product on a fresh DB has no MAX yet — peek returns 1."""
    product_repository = AsyncMock()
    product_repository.get_max_internal_code = AsyncMock(return_value=None)
    product_repository.allocate_next_internal_code.side_effect = AssertionError(
        "peek_next must not consume a sequence value"
    )

    result = await InternalCodeAllocator(product_repository).peek_next()

    assert result == 1
    product_repository.allocate_next_internal_code.assert_not_awaited()


@pytest.mark.asyncio
async def test_peek_next_is_idempotent_across_consecutive_calls() -> None:
    """Two peeks in a row return the SAME integer — no sequence value is
    consumed, so the second peek is exactly the first peek."""
    product_repository = AsyncMock()
    product_repository.get_max_internal_code = AsyncMock(return_value=500)
    product_repository.allocate_next_internal_code.side_effect = AssertionError(
        "peek_next must not consume a sequence value"
    )

    allocator = InternalCodeAllocator(product_repository)
    first = await allocator.peek_next()
    second = await allocator.peek_next()

    assert first == second == 501
    # Two get_max calls, no allocate calls.
    assert product_repository.get_max_internal_code.await_count == 2
    product_repository.allocate_next_internal_code.assert_not_awaited()
