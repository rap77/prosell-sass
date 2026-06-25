"""Test conversion from ParsedProductRow to CreateProductRequest (application layer)."""

from uuid import uuid4

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.use_cases.product.bulk_upload_products import parsed_row_to_create_request
from prosell.domain.services.csv_product_parser import ParsedProductRow
from prosell.domain.value_objects.product_condition import ProductCondition


class TestParsedRowToCreateRequest:
    """Test parsed_row_to_create_request converter (application layer)."""

    def test_convert_basic_row_to_request(self):
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        row = ParsedProductRow(
            row_number=2,
            title="2020 Honda Accord",
            price_cents=25000_00,
            category_id=category_id,
            description="Well-maintained sedan",
            condition="used",
            currency="USD",
            location_city="Miami",
            location_state="FL",
            location_zip="33101",
            attributes={
                "vin": "1HGCM82633A123456",
                "make": "Honda",
                "model": "Accord",
                "year": 2020,
            },
        )

        request = parsed_row_to_create_request(row, tenant_id, organization_id)

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
        assert request.attributes["vin"] == "1HGCM82633A123456"
        assert request.attributes["make"] == "Honda"
        assert request.attributes["model"] == "Accord"
        assert request.attributes["year"] == 2020

    def test_convert_minimal_row(self):
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        row = ParsedProductRow(
            row_number=2,
            title="2020 Honda Accord",
            price_cents=25000_00,
            category_id=category_id,
            attributes={"vin": "1HGCM82633A123456"},
        )

        request = parsed_row_to_create_request(row, tenant_id, organization_id)

        assert isinstance(request, CreateProductRequest)
        assert request.title == "2020 Honda Accord"
        assert request.price_cents == 25000_00
        assert request.description is None
        assert request.condition == ProductCondition.USED
        assert request.currency == "USD"
        assert request.location_city is None
        assert request.location_state is None
        assert request.location_zip is None
        assert request.attributes["vin"] == "1HGCM82633A123456"

    def test_convert_new_condition(self):
        tenant_id, organization_id, category_id = uuid4(), uuid4(), uuid4()
        row = ParsedProductRow(
            row_number=2,
            title="2024 Accord",
            price_cents=35000_00,
            category_id=category_id,
            condition="new",
        )
        assert (
            parsed_row_to_create_request(row, tenant_id, organization_id).condition
            == ProductCondition.NEW
        )

    def test_convert_refurbished_condition(self):
        tenant_id, organization_id, category_id = uuid4(), uuid4(), uuid4()
        row = ParsedProductRow(
            row_number=2,
            title="2020 Accord",
            price_cents=20000_00,
            category_id=category_id,
            condition="refurbished",
        )
        assert (
            parsed_row_to_create_request(row, tenant_id, organization_id).condition
            == ProductCondition.REFURBISHED
        )

    def test_convert_for_parts_condition(self):
        tenant_id, organization_id, category_id = uuid4(), uuid4(), uuid4()
        row = ParsedProductRow(
            row_number=2,
            title="2005 Accord",
            price_cents=500_00,
            category_id=category_id,
            condition="for_parts",
        )
        assert (
            parsed_row_to_create_request(row, tenant_id, organization_id).condition
            == ProductCondition.FOR_PARTS
        )
