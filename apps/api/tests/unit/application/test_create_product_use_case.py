"""Test CreateProductUseCase."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.product import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.entities.category import Category
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


@pytest.mark.asyncio
async def test_create_product_success():
    """Test successful product creation."""
    tenant_id = uuid4()
    category = Category(
        id=uuid4(),
        name="Test Category",
        slug="test-category",
        tenant_id=tenant_id,
        attribute_schema={},
        is_active=True,
    )
    product_id = uuid4()
    mock_product = Product(
        id=product_id,
        title="Test Product",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        status=ProductStatus.DRAFT,
    )

    product_repo = AsyncMock()
    product_repo.create = AsyncMock(return_value=mock_product)
    category_repo = AsyncMock()
    category_repo.get_by_id = AsyncMock(return_value=category)

    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        condition=ProductCondition.NEW,
    )
    use_case = CreateProductUseCase(product_repo, category_repo)
    result = await use_case.execute(request)

    assert result.id is not None
    assert result.title == "Test Product"
    assert result.price_cents == 10000
    assert result.status == "draft"


@pytest.mark.asyncio
async def test_create_product_category_not_found():
    """Test product creation with non-existent category."""
    product_repo = AsyncMock()
    category_repo = AsyncMock()
    category_repo.get_by_id = AsyncMock(return_value=None)

    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
    )
    use_case = CreateProductUseCase(product_repo, category_repo)

    with pytest.raises(CategoryNotFoundError):
        await use_case.execute(request)
