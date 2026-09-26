"""Unit tests for `ListProductsUseCase` — published/has_images plumbing.

The use case must forward both new filter params to BOTH `get_all` and
`count` so the catalog's `total` count stays consistent with the filtered
list — same invariant the rest of the use-case filters honor.

Covers: presence/absence of `published_to_marketplace` and `has_images`
arguments on the two repository calls.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.list_products import ListProductsUseCase


@pytest.mark.asyncio
async def test_execute_passes_published_to_marketplace_to_get_all_and_count() -> None:
    repository = AsyncMock()
    repository.get_all.return_value = []
    repository.count.return_value = 0
    use_case = ListProductsUseCase(repository)
    tenant_id = uuid4()

    await use_case.execute(
        tenant_id=tenant_id,
        published_to_marketplace=True,
    )

    get_all_kwargs = repository.get_all.await_args.kwargs
    count_kwargs = repository.count.await_args.kwargs
    assert get_all_kwargs["published_to_marketplace"] is True
    assert count_kwargs["published_to_marketplace"] is True


@pytest.mark.asyncio
async def test_execute_passes_has_images_to_get_all_and_count() -> None:
    repository = AsyncMock()
    repository.get_all.return_value = []
    repository.count.return_value = 0
    use_case = ListProductsUseCase(repository)
    tenant_id = uuid4()

    await use_case.execute(tenant_id=tenant_id, has_images=True)

    get_all_kwargs = repository.get_all.await_args.kwargs
    count_kwargs = repository.count.await_args.kwargs
    assert get_all_kwargs["has_images"] is True
    assert count_kwargs["has_images"] is True


@pytest.mark.asyncio
async def test_execute_defaults_new_filters_to_none() -> None:
    """When the caller omits the new params, both reach the repo as None."""
    repository = AsyncMock()
    repository.get_all.return_value = []
    repository.count.return_value = 0
    use_case = ListProductsUseCase(repository)
    tenant_id = uuid4()

    await use_case.execute(tenant_id=tenant_id)

    get_all_kwargs = repository.get_all.await_args.kwargs
    count_kwargs = repository.count.await_args.kwargs
    assert get_all_kwargs["published_to_marketplace"] is None
    assert get_all_kwargs["has_images"] is None
    assert count_kwargs["published_to_marketplace"] is None
    assert count_kwargs["has_images"] is None
