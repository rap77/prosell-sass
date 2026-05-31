"""Test BulkUploadVehiclesUseCase."""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_vehicles import (
    BulkUploadVehiclesResult,
    BulkUploadVehiclesUseCase,
)
from prosell.domain.entities.product import Product


class TestBulkUploadVehiclesUseCase:
    """Test bulk vehicle upload use case with VIN-based upsert."""

    @pytest.fixture
    def sample_csv(self) -> str:
        """Sample client-format CSV."""
        return (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
            "2;RM;1800000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
            "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;2T1BURHE0LC123456\n"
        )

    @pytest.mark.asyncio
    async def test_use_case_parses_csv_and_upserts_products(self, sample_csv: str):
        """Test that use case parses CSV and upserts products by VIN."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        # Mock product repository
        product_repository = AsyncMock()
        # First call returns None (create), second call returns existing (update)
        product_repository.get_by_vin.side_effect = [
            None,  # First VIN doesn't exist
            Mock(spec=Product, id=uuid4()),  # Second VIN exists
        ]

        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        async def mock_update(product):
            return product

        product_repository.create.side_effect = mock_create
        product_repository.update.side_effect = mock_update

        # Mock category repository
        category_repository = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        # Create use case
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
        )

        # Act
        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert isinstance(result, BulkUploadVehiclesResult)
        assert result.total_rows == 2
        assert result.imported_count == 1
        assert result.updated_count == 1
        assert result.failed_count == 0
        assert len(result.results) == 2

        # Verify first product was created
        assert result.results[0].status == "imported"
        assert result.results[0].vin == "1FMSK7DH7LGA77418"

        # Verify second product was updated
        assert result.results[1].status == "updated"
        assert result.results[1].vin == "2T1BURHE0LC123456"

    @pytest.mark.asyncio
    async def test_use_case_handles_missing_vin(self):
        """Test that rows without VIN are marked as failed."""
        # Arrange
        csv_with_missing_vin = (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;\n"
        )

        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        category_repository = AsyncMock()

        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
        )

        # Act
        result = await use_case.execute(
            csv_content=csv_with_missing_vin,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert result.total_rows == 1
        assert result.failed_count == 1
        assert result.results[0].status == "failed"
        assert "VIN is required" in result.results[0].errors[0]

    @pytest.mark.asyncio
    async def test_use_case_builds_attributes_correctly(self, sample_csv: str):
        """Test that attributes are correctly built from CSV fields."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        product_repository.get_by_vin.return_value = None
        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create
        category_repository = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
        )

        # Act
        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert result.imported_count == 2
        assert len(created_products) == 2

        # Check first product attributes
        first_product = created_products[0]
        attrs = first_product.attributes
        assert attrs["vin"] == "1FMSK7DH7LGA77418"
        assert attrs["year"] == 2020
        assert attrs["make"] == "Ford"
        assert attrs["model"] == "Explorer"
        assert attrs["mileage"] == 70000
        assert attrs["mileage_unit"] == "miles"
        assert attrs["exterior_color"] == "Gris"
        assert attrs["title_status"] == "clean"
        assert attrs["facebook_groups"] == ["1", "2"]
        assert attrs["publicado"] is True
        # location_city and location_state are product fields, not attributes
        assert first_product.location_city == "Orlando"
        assert first_product.location_state == "FL"

        # Check second product attributes
        second_product = created_products[1]
        attrs2 = second_product.attributes
        assert attrs2["vin"] == "2T1BURHE0LC123456"
        assert attrs2["year"] == 2019
        assert attrs2["make"] == "Toyota"
        assert attrs2["model"] == "Camry"
        assert attrs2["title_status"] == "rebuilt"
        assert attrs2["publicado"] is False
        assert second_product.location_city == "Miami"
        assert second_product.location_state == "FL"
