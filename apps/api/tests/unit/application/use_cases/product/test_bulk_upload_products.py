"""Test BulkUploadProductsUseCase."""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_products import (
    BulkUploadProductsUseCase,
)
from prosell.domain.entities.category import Category
from prosell.domain.services.csv_product_parser import ParsedProductRow


class TestBulkUploadProductsUseCase:
    """Test bulk product upload use case."""

    @pytest.mark.asyncio
    async def test_bulk_upload_creates_multiple_products(self):
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        category_repository = AsyncMock()

        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create

        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=Mock(),
        )

        parsed_products = [
            ParsedProductRow(
                row_number=2,
                title="2020 Honda Accord",
                price_cents=25000_00,
                category_id=category_id,
                attributes={"vin": "1HGCM82633A123456"},
            ),
            ParsedProductRow(
                row_number=3,
                title="2021 Honda Civic",
                price_cents=22000_00,
                category_id=category_id,
                attributes={"vin": "1HGCM82633A123457"},
            ),
        ]

        result = await use_case.execute(
            parsed_products=parsed_products,
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        assert result.total_count == 2
        assert result.created_count == 2
        assert result.failed_count == 0
        assert len(result.errors) == 0
        assert len(created_products) == 2

    @pytest.mark.asyncio
    async def test_bulk_upload_handles_partial_failures(self):
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        invalid_category_id = uuid4()

        product_repository = AsyncMock()
        category_repository = AsyncMock()

        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id

        async def get_by_id(cat_id, *_):
            if cat_id == category_id:
                return mock_category
            return None

        category_repository.get_by_id.side_effect = get_by_id

        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create

        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=Mock(),
        )

        parsed_products = [
            ParsedProductRow(
                row_number=2,
                title="2020 Honda Accord",
                price_cents=25000_00,
                category_id=category_id,
                attributes={"vin": "1HGCM82633A123456"},
            ),
            ParsedProductRow(
                row_number=3,
                title="2021 Honda Civic",
                price_cents=22000_00,
                category_id=invalid_category_id,  # Invalid → CategoryNotFoundError
                attributes={"vin": "1HGCM82633A123457"},
            ),
        ]

        result = await use_case.execute(
            parsed_products=parsed_products,
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        assert result.total_count == 2
        assert result.created_count == 1
        assert result.failed_count == 1
        assert len(result.errors) == 1
        assert "Category not found" in str(result.errors[0]["message"])
        assert len(created_products) == 1

    @pytest.mark.asyncio
    async def test_bulk_upload_returns_empty_result_for_empty_list(self):
        product_repository = AsyncMock()
        category_repository = AsyncMock()

        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=Mock(),
        )

        result = await use_case.execute(
            parsed_products=[],
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.total_count == 0
        assert result.created_count == 0
        assert result.failed_count == 0
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_bulk_upload_creates_products_with_correct_attributes(self):
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        category_repository = AsyncMock()

        mock_category = Mock(spec=Category)
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create

        use_case = BulkUploadProductsUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            csv_parser=Mock(),
        )

        parsed_product = ParsedProductRow(
            row_number=2,
            title="2020 Honda Accord",
            price_cents=25000_00,
            category_id=category_id,
            attributes={"vin": "1HGCM82633A123456", "make": "Honda", "model": "Accord"},
        )

        result = await use_case.execute(
            parsed_products=[parsed_product],
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        assert result.created_count == 1
        created_product = created_products[0]
        assert created_product.attributes["vin"] == "1HGCM82633A123456"
        assert created_product.attributes["make"] == "Honda"
        assert created_product.attributes["model"] == "Accord"
