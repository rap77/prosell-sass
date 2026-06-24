"""Unit tests for the new get_active_roots port method on AbstractCategoryRepository.

Locks the port signature for T2. Full behavior tests for the SQLAlchemy
implementation live in the integration suite (they require a database).
The mocked test here just confirms:
- the abstract repo declares the method,
- it accepts tenant_id as UUID | None,
- it returns a list of Category entities (callers see exactly what the
  repository returns — no filtering, no cap).
"""

from unittest.mock import AsyncMock
from uuid import uuid4

from prosell.domain.entities.category import Category
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


def _cat(name: str) -> Category:
    return Category(
        id=uuid4(),
        tenant_id=None,
        name=name,
        slug=name.lower().replace(" ", "-"),
        parent_id=None,
        level=0,
        is_active=True,
    )


def test_port_declares_get_active_roots() -> None:
    """The abstract repository must declare get_active_roots (T2 port)."""
    assert hasattr(AbstractCategoryRepository, "get_active_roots")
    assert "get_active_roots" in AbstractCategoryRepository.__abstractmethods__


async def test_mocked_repo_returns_its_own_list() -> None:
    """A mocked AbstractCategoryRepository returns exactly what was configured.

    No filtering, no cap, no transformation — the port is a pass-through.
    The use case (T3) is responsible for scoring and capping.
    """
    tenant_id = uuid4()
    expected = [_cat("Vehicles"), _cat("Real Estate")]

    mock_repo = AsyncMock(spec=AbstractCategoryRepository)
    mock_repo.get_active_roots.return_value = expected

    result = await mock_repo.get_active_roots(tenant_id)

    assert result is expected  # exact same list
    mock_repo.get_active_roots.assert_awaited_once_with(tenant_id)


async def test_mocked_repo_accepts_none_tenant_id() -> None:
    """SUPER_ADMIN scenario: tenant_id=None fetches GLOBAL templates only."""
    expected = [_cat("Vehicles")]
    mock_repo = AsyncMock(spec=AbstractCategoryRepository)
    mock_repo.get_active_roots.return_value = expected

    result = await mock_repo.get_active_roots(None)

    assert result is expected
    mock_repo.get_active_roots.assert_awaited_once_with(None)


async def test_mocked_repo_empty_when_no_active_roots() -> None:
    """Empty result is a valid response (no active root categories exist)."""
    mock_repo = AsyncMock(spec=AbstractCategoryRepository)
    mock_repo.get_active_roots.return_value = []

    result = await mock_repo.get_active_roots(uuid4())

    assert result == []
