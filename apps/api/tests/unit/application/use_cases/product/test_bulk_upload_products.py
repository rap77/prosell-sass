"""Test BulkUploadProductsUseCase."""

import pytest
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from prosell.application.use_cases.product.bulk_upload_products import (
    BulkUploadProductsUseCase,
    BulkUploadResult,
)
from prosell.domain.services.csv_product_parser import CSVProductParser, ParsedProductRow
from prosell.domain.entities.product import Product
from prosell.domain.entities.category import Category
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError


class TestBulkUploadProductsUseCase:
    """Test bulk product upload use case."""

    @pytest.mark.asyncio
    async def test_bulk_upload_creates_multiple_products(self):
        """Test that bulk upload creates multiple products successfully."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        # Mock repositories
        product_repository = AsyncMock()
        category_repository = AsyncMock()

        # Mock category exists
        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        # Mock product creation
        created_products = []
        async def mock_create(product):
            created_products.append(product)
            return product
        product_repository.create.side_effect = mock_create

        # Create use case
        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=CSVProductParser(),
        )

        # Create parsed products
        parsed_products = [
            ParsedProductRow(
                row_number=2,
                vin="1HGCM82633A123456",
                title="2020 Honda Accord",
                price_cents=25000_00,
                category_id=category_id,
            ),
            ParsedProductRow(
                row_number=3,
                vin="1HGCM82633A123457",
                title="2021 Honda Civic",
                price_cents=22000_00,
                category_id=category_id,
            ),
        ]

        # Act
        result = await use_case.execute(
            parsed_products=parsed_products,
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert result.total_count == 2
        assert result.created_count == 2
        assert result.failed_count == 0
        assert len(result.errors) == 0
        assert len(created_products) == 2

    @pytest.mark.asyncio
    async def test_bulk_upload_handles_partial_failures(self):
        """Test that bulk upload continues even when some products fail."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        invalid_category_id = uuid4()

        # Mock repositories
        product_repository = AsyncMock()
        category_repository = AsyncMock()

        # Mock one category exists, one doesn't
        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id

        async def get_by_id(cat_id, tenant_id_param):
            if cat_id == category_id:
                return mock_category
            return None

        category_repository.get_by_id.side_effect = get_by_id

        # Mock product creation
        created_products = []
        async def mock_create(product):
            created_products.append(product)
            return product
        product_repository.create.side_effect = mock_create

        # Create use case
        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=CSVProductParser(),
        )

        # Create parsed products (second one has invalid category)
        parsed_products = [
            ParsedProductRow(
                row_number=2,
                vin="1HGCM82633A123456",
                title="2020 Honda Accord",
                price_cents=25000_00,
                category_id=category_id,
            ),
            ParsedProductRow(
                row_number=3,
                vin="1HGCM82633A123457",
                title="2021 Honda Civic",
                price_cents=22000_00,
                category_id=invalid_category_id,  # Invalid
            ),
        ]

        # Act
        result = await use_case.execute(
            parsed_products=parsed_products,
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert result.total_count == 2
        assert result.created_count == 1
        assert result.failed_count == 1
        assert len(result.errors) == 1
        assert "Category not found" in result.errors[0]["error"]
        assert len(created_products) == 1

    @pytest.mark.asyncio
    async def test_bulk_upload_returns_empty_result_for_empty_list(self):
        """Test that bulk upload handles empty list gracefully."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()

        # Mock repositories
        product_repository = AsyncMock()
        category_repository = AsyncMock()

        # Create use case
        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=CSVProductParser(),
        )

        # Act
        result = await use_case.execute(
            parsed_products=[],
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert result.total_count == 0
        assert result.created_count == 0
        assert result.failed_count == 0
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_bulk_upload_creates_products_with_correct_attributes(self):
        """Test that bulk upload creates products with VIN in attributes."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        # Mock repositories
        product_repository = AsyncMock()
        category_repository = AsyncMock()

        # Mock category exists
        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        # Mock product creation
        created_products = []
        async def mock_create(product):
            created_products.append(product)
            return product
        product_repository.create.side_effect = mock_create

        # Create use case
        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=CSVProductParser(),
        )

        # Create parsed product
        parsed_product = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2020 Honda Accord",
            price_cents=25000_00,
            category_id=category_id,
            attributes={"make": "Honda", "model": "Accord"},
        )

        # Act
        result = await use_case.execute(
            parsed_products=[parsed_product],
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert result.created_count == 1
        created_product = created_products[0]
        assert created_product.attributes["vin"] == "1HGCM82633A123456"
        assert created_product.attributes["make"] == "Honda"
        assert created_product.attributes["model"] == "Accord"
