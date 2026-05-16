"""Test CreateProductUseCase."""

from uuid import uuid4

import pytest

from prosell.application.dto.product import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.entities.category import Category
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.value_objects.product_condition import ProductCondition


@pytest.mark.asyncio
async def test_create_product_success(product_repository, category_repository):
    """Test successful product creation."""
    # Setup: Create a test category
    category = Category.create(
        name="Test Category",
        slug="test-category",
        tenant_id=uuid4(),
    )
    category = await category_repository.create(category)

    # Execute
    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=category.tenant_id,
        organization_id=category.tenant_id,
        category_id=category.id,
        condition=ProductCondition.NEW,
    )
    use_case = CreateProductUseCase(product_repository, category_repository)
    result = await use_case.execute(request)

    # Assert
    assert result.id is not None
    assert result.title == "Test Product"
    assert result.price_cents == 10000
    assert result.status == "draft"


@pytest.mark.asyncio
async def test_create_product_category_not_found(product_repository, category_repository):
    """Test product creation with non-existent category."""
    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
    )
    use_case = CreateProductUseCase(product_repository, category_repository)

    with pytest.raises(CategoryNotFoundError):
        await use_case.execute(request)
