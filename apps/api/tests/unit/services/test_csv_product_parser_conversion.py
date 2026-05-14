"""Test conversion from ParsedProductRow to CreateProductRequest."""

import pytest
from uuid import uuid4

from prosell.domain.services.csv_product_parser import ParsedProductRow
from prosell.application.dto.product.create import CreateProductRequest
from prosell.domain.value_objects.product_condition import ProductCondition


class TestParsedProductRowToCreateProductRequest:
    """Test conversion of ParsedProductRow to CreateProductRequest."""

    def test_convert_basic_row_to_request(self):
        """Test converting a basic CSV row to CreateProductRequest."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        parsed_row = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2020 Honda Accord",
            price_cents=25000_00,  # $25,000.00
            category_id=category_id,
            description="Well-maintained sedan",
            condition="used",
            currency="USD",
            location_city="Miami",
            location_state="FL",
            location_zip="33101",
            attributes={"make": "Honda", "model": "Accord", "year": 2020},
        )

        # Act
        request = parsed_row.to_create_product_request(
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert isinstance(request, CreateProductRequest)
        assert request.title == "2020 Honda Accord"
        assert request.price_cents == 25000_00
        assert request.category_id == category_id
        assert request.tenant_id == tenant_id
        assert request.organization_id == organization_id
        assert request.description == "Well-maintained sedan"
        assert request.condition == ProductCondition.USED
        assert request.currency == "USD"
        assert request.location_city == "Miami"
        assert request.location_state == "FL"
        assert request.location_zip == "33101"
        # VIN should be in attributes
        assert request.attributes["vin"] == "1HGCM82633A123456"
        assert request.attributes["make"] == "Honda"
        assert request.attributes["model"] == "Accord"
        assert request.attributes["year"] == 2020

    def test_convert_minimal_row_to_request(self):
        """Test converting a minimal CSV row (only required fields) to CreateProductRequest."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        parsed_row = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2020 Honda Accord",
            price_cents=25000_00,
            category_id=category_id,
            # Optional fields omitted
        )

        # Act
        request = parsed_row.to_create_product_request(
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert isinstance(request, CreateProductRequest)
        assert request.title == "2020 Honda Accord"
        assert request.price_cents == 25000_00
        assert request.category_id == category_id
        assert request.tenant_id == tenant_id
        assert request.organization_id == organization_id
        assert request.description is None
        assert request.condition == ProductCondition.USED  # Default
        assert request.currency == "USD"  # Default
        assert request.location_city is None
        assert request.location_state is None
        assert request.location_zip is None
        # VIN should be in attributes
        assert request.attributes["vin"] == "1HGCM82633A123456"

    def test_convert_with_new_condition(self):
        """Test converting a row with 'new' condition."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        parsed_row = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2024 Honda Accord",
            price_cents=35000_00,
            category_id=category_id,
            condition="new",
        )

        # Act
        request = parsed_row.to_create_product_request(
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert request.condition == ProductCondition.NEW

    def test_convert_with_refurbished_condition(self):
        """Test converting a row with 'refurbished' condition."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        parsed_row = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2020 Honda Accord",
            price_cents=20000_00,
            category_id=category_id,
            condition="refurbished",
        )

        # Act
        request = parsed_row.to_create_product_request(
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert request.condition == ProductCondition.REFURBISHED

    def test_convert_with_for_parts_condition(self):
        """Test converting a row with 'for_parts' condition."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        parsed_row = ParsedProductRow(
            row_number=2,
            vin="1HGCM82633A123456",
            title="2005 Honda Accord",
            price_cents=500_00,
            category_id=category_id,
            condition="for_parts",
        )

        # Act
        request = parsed_row.to_create_product_request(
            tenant_id=tenant_id,
            organization_id=organization_id,
        )

        # Assert
        assert request.condition == ProductCondition.FOR_PARTS
