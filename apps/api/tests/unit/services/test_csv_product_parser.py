"""Unit tests for CSVProductParser service."""

from io import StringIO
from uuid import uuid4

import pytest

from prosell.domain.services.csv_product_parser import (
    CSVParseError,
    CSVProductParser,
    ParsedProductRow,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def tenant_id():
    """Tenant ID for testing."""
    return uuid4()


@pytest.fixture
def organization_id():
    """Organization ID for testing."""
    return uuid4()


@pytest.fixture
def category_id():
    """Category ID for testing."""
    return uuid4()


@pytest.fixture
def valid_csv_content(category_id):
    """Valid CSV content with all required columns."""
    return f"""vin,title,price,category_id,description,condition,currency,location_city,location_state,location_zip
1HGCM82633A123456,2020 Honda Civic,18500.00,{category_id},Well maintained,used,USD,Miami,FL,33101
JH4KA8260MC000000,2021 Acura Integra,21000.50,{category_id},Excellent condition,new,USD,Fort Lauderdale,FL,33301
"""


@pytest.fixture
def minimal_csv_content(category_id):
    """Minimal CSV content with only required columns."""
    return f"""vin,title,price,category_id
1HGCM82633A123456,2020 Honda Civic,18500.00,{category_id}
"""


@pytest.fixture
def invalid_vin_csv_content(category_id):
    """CSV with invalid VIN."""
    return f"""vin,title,price,category_id
INVALIDVIN,2020 Honda Civic,18500.00,{category_id}
"""


@pytest.fixture
def missing_required_column_csv_content(category_id):
    """CSV missing required column 'title'."""
    return f"""vin,price,category_id
1HGCM82633A123456,18500.00,{category_id}
"""


@pytest.fixture
def duplicate_vin_csv_content(category_id):
    """CSV with duplicate VINs."""
    return f"""vin,title,price,category_id
1HGCM82633A123456,2020 Honda Civic,18500.00,{category_id}
1HGCM82633A123456,2021 Acura Integra,21000.00,{category_id}
"""


# =============================================================================
# TESTS
# =============================================================================


class TestCSVProductParserInitialization:
    """Tests for CSVProductParser initialization."""

    def test_initializes_with_default_settings(self):
        """Parser initializes with default settings."""
        parser = CSVProductParser()

        assert parser.required_columns == {"vin", "title", "price", "category_id"}
        assert parser.max_rows == 1000

    def test_initializes_with_custom_settings(self):
        """Parser initializes with custom settings."""
        parser = CSVProductParser(
            required_columns={"vin", "title"},
            max_rows=500,
        )

        assert parser.required_columns == {"vin", "title"}
        assert parser.max_rows == 500


class TestCSVValidation:
    """Tests for CSV validation."""

    def test_validates_required_columns_present(self):
        """Validate CSV with all required columns."""
        parser = CSVProductParser()
        csv_file = StringIO("vin,title,price,category_id\n")

        errors = parser._validate_columns(csv_file)

        assert errors == []

    def test_detects_missing_required_columns(self):
        """Detect missing required columns."""
        parser = CSVProductParser()
        csv_file = StringIO("vin,price,category_id\n")  # Missing 'title'

        errors = parser._validate_columns(csv_file)

        assert len(errors) == 1
        assert "Missing required columns" in errors[0]
        assert "title" in errors[0]

    def test_allows_extra_columns_beyond_required(self):
        """Allow extra columns beyond required ones."""
        parser = CSVProductParser()
        csv_file = StringIO("vin,title,price,category_id,description,extra_column\n")

        errors = parser._validate_columns(csv_file)

        assert errors == []


class TestVINValidation:
    """Tests for VIN validation."""

    def test_accepts_valid_vin(self):
        """Accept valid VIN format."""
        parser = CSVProductParser()

        is_valid = parser._is_valid_vin_format("1HGCM82633A123456")

        assert is_valid is True

    def test_rejects_invalid_vin_length(self):
        """Reject VIN with invalid length."""
        parser = CSVProductParser()

        is_valid = parser._is_valid_vin_format("1HGCM82633A12345")  # 16 chars

        assert is_valid is False

    def test_rejects_invalid_vin_characters(self):
        """Reject VIN with invalid characters."""
        parser = CSVProductParser()

        is_valid = parser._is_valid_vin_format("1HGCM82633A12345O")  # Contains O, I, Q

        assert is_valid is False

    def test_rejects_empty_vin(self):
        """Reject empty VIN."""
        parser = CSVProductParser()

        is_valid = parser._is_valid_vin_format("")

        assert is_valid is False


class TestCSVParsing:
    """Tests for CSV parsing."""

    async def test_parses_valid_csv_with_all_columns(
        self,
        valid_csv_content,
        category_id,
    ):
        """Parse valid CSV with all columns."""
        parser = CSVProductParser()

        result = await parser.parse_csv(
            csv_content=valid_csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.total_rows == 2
        assert len(result.products) == 2
        assert result.failed_count == 0
        assert len(result.errors) == 0

    async def test_parses_minimal_csv_with_required_columns_only(
        self,
        minimal_csv_content,
        category_id,
    ):
        """Parse minimal CSV with only required columns."""
        parser = CSVProductParser()

        result = await parser.parse_csv(
            csv_content=minimal_csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.total_rows == 1
        assert len(result.products) == 1
        assert result.failed_count == 0

        product = result.products[0]
        assert product.vin == "1HGCM82633A123456"
        assert product.title == "2020 Honda Civic"
        assert product.price_cents == 1850000
        assert product.category_id == category_id
        assert product.description is None
        assert product.condition == "used"  # Default
        assert product.currency == "USD"  # Default

    async def test_parses_csv_with_optional_fields(
        self,
        valid_csv_content,
        category_id,
    ):
        """Parse CSV with optional fields populated."""
        parser = CSVProductParser()

        result = await parser.parse_csv(
            csv_content=valid_csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert len(result.products) == 2

        product = result.products[0]
        assert product.description == "Well maintained"
        assert product.condition == "used"
        assert product.currency == "USD"
        assert product.location_city == "Miami"
        assert product.location_state == "FL"
        assert product.location_zip == "33101"

    async def test_converts_price_dollars_to_cents(
        self,
        category_id,
    ):
        """Convert price from dollars to cents."""
        parser = CSVProductParser()
        csv_content = f"""vin,title,price,category_id
1HGCM82633A123456,Test Car,19.99,{category_id}
"""

        result = await parser.parse_csv(
            csv_content=csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        # 19.99 * 100 = 1999 (with proper rounding)
        assert result.products[0].price_cents == 1999

    async def test_rejects_invalid_price_format(
        self,
        category_id,
    ):
        """Reject invalid price format."""
        parser = CSVProductParser()
        csv_content = f"""vin,title,price,category_id
1HGCM82633A123456,Test Car,invalid,{category_id}
"""

        result = await parser.parse_csv(
            csv_content=csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.failed_count == 1
        assert result.total_rows == 1
        assert len(result.products) == 0


class TestErrorHandling:
    """Tests for error handling."""

    async def test_handles_invalid_vin(
        self,
        invalid_vin_csv_content,
    ):
        """Handle CSV with invalid VIN."""
        parser = CSVProductParser()

        result = await parser.parse_csv(
            csv_content=invalid_vin_csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.failed_count == 1
        assert result.total_rows == 1
        assert len(result.products) == 0
        assert len(result.errors) == 1
        assert "Invalid VIN" in str(result.errors[0]["error"])

    async def test_handles_missing_required_columns(
        self,
        missing_required_column_csv_content,
    ):
        """Handle CSV missing required columns."""
        parser = CSVProductParser()

        with pytest.raises(CSVParseError) as exc_info:
            await parser.parse_csv(
                csv_content=missing_required_column_csv_content,
                tenant_id=uuid4(),
                organization_id=uuid4(),
            )

        assert "Missing required columns" in str(exc_info.value)

    async def test_detects_duplicate_vins_in_csv(
        self,
        duplicate_vin_csv_content,
    ):
        """Detect duplicate VINs within CSV."""
        parser = CSVProductParser()

        result = await parser.parse_csv(
            csv_content=duplicate_vin_csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.failed_count == 1
        assert result.total_rows == 2
        assert len(result.products) == 1
        assert any("Duplicate VIN" in str(error["error"]) for error in result.errors)

    async def test_continues_parsing_after_row_error(
        self,
        category_id,
    ):
        """Continue parsing after encountering row error."""
        parser = CSVProductParser()
        csv_content = f"""vin,title,price,category_id
1HGCM82633A123456,Valid Car,18500.00,{category_id}
INVALID,Invalid Car,20000.00,{category_id}
JH4KA8260MC000000,Another Valid Car,21000.00,{category_id}
"""

        result = await parser.parse_csv(
            csv_content=csv_content,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )

        assert result.total_rows == 3
        assert len(result.products) == 2
        assert result.failed_count == 1
        assert result.products[0].vin == "1HGCM82633A123456"
        assert result.products[1].vin == "JH4KA8260MC000000"


class TestRowLimits:
    """Tests for row limits."""

    async def test_enforces_max_rows_limit(
        self,
        category_id,
    ):
        """Enforce maximum rows limit."""
        parser = CSVProductParser(max_rows=2)
        rows = [f"1HGCM82633A12345{i},Car {i},1000.00,{category_id}" for i in range(3)]
        csv_content = "vin,title,price,category_id\n" + "\n".join(rows)

        with pytest.raises(CSVParseError) as exc_info:
            await parser.parse_csv(
                csv_content=csv_content,
                tenant_id=uuid4(),
                organization_id=uuid4(),
            )

        assert "Too many rows" in str(exc_info.value)


class TestParsedProductRow:
    """Tests for ParsedProductRow dataclass."""

    def test_creates_parsed_product_row(self):
        """Create ParsedProductRow instance."""
        row = ParsedProductRow(
            row_number=1,
            vin="1HGCM82633A123456",
            title="Test Car",
            price_cents=1850000,
            category_id=uuid4(),
            description="Test",
            condition="used",
            currency="USD",
            location_city="Miami",
            location_state="FL",
            location_zip="33101",
            attributes={},
        )

        assert row.row_number == 1
        assert row.vin == "1HGCM82633A123456"
        assert row.price_cents == 1850000
