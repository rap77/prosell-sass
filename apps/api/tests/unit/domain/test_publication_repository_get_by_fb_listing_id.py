"""Unit tests for PublicationRepository.get_by_fb_listing_id method.

Tests the method signature and basic behavior without database dependencies.
"""

from unittest.mock import AsyncMock

import pytest

from prosell.infrastructure.repositories.publication_repository_impl import (
    SqlAlchemyPublicationRepository,
)


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_with_none_raises():
    """Test that get_by_fb_listing_id raises ValueError for None."""
    # Arrange
    mock_session = AsyncMock()
    repo = SqlAlchemyPublicationRepository(mock_session)

    # Act & Assert
    with pytest.raises(ValueError, match="fb_listing_id cannot be None or empty"):
        await repo.get_by_fb_listing_id(None)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_with_empty_string_raises():
    """Test that get_by_fb_listing_id raises ValueError for empty string."""
    # Arrange
    mock_session = AsyncMock()
    repo = SqlAlchemyPublicationRepository(mock_session)

    # Act & Assert
    with pytest.raises(ValueError, match="fb_listing_id cannot be None or empty"):
        await repo.get_by_fb_listing_id("")
