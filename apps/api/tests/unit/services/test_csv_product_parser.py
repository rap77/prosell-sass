"""Unit tests for the schema-aware CSVProductParser."""

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.services.csv_product_parser import (
    CSVParseError,
    CSVProductParser,
)


@pytest.fixture
def tenant_id() -> UUID:
    return uuid4()


@pytest.fixture
def org_id() -> UUID:
    return uuid4()


@pytest.fixture
def category_id() -> UUID:
    return uuid4()


@pytest.fixture
def vehicle_schema() -> dict[str, dict[str, object]]:
    return {
        "vin": {"type": "string", "required": True},
        "year": {"type": "number", "required": False},
        "mileage": {"type": "number", "required": False},
        "is_certified": {"type": "boolean", "required": False},
    }


def _make_category_repo(schema: dict[str, dict[str, object]]) -> AbstractCategoryRepository:
    mock = AsyncMock(spec=AbstractCategoryRepository)
    cat = MagicMock()
    cat.attribute_schema = schema
    mock.get_by_id_or_global.return_value = cat
    return mock


# ── Missing universal column ──────────────────────────────────────────────────


async def test_missing_title_column_raises(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = f"price,category_id\n18500,{category_id}\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


async def test_missing_price_column_raises(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = f"title,category_id\nHonda Civic,{category_id}\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


async def test_missing_category_id_column_raises(
    tenant_id: UUID, org_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = "title,price\nHonda Civic,18500\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Multi-category rejection ──────────────────────────────────────────────────


async def test_multiple_categories_raises(
    tenant_id: UUID, org_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    cat_a, cat_b = uuid4(), uuid4()
    repo = AsyncMock(spec=AbstractCategoryRepository)
    cat = MagicMock()
    cat.attribute_schema = vehicle_schema
    repo.get_by_id_or_global.return_value = cat

    csv = f"title,price,category_id\nCar A,1000,{cat_a}\nCar B,2000,{cat_b}\n"
    with pytest.raises(CSVParseError, match="multiple categories"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Unknown category ──────────────────────────────────────────────────────────


async def test_unknown_category_raises(tenant_id: UUID, org_id: UUID, category_id: UUID) -> None:
    repo = AsyncMock(spec=AbstractCategoryRepository)
    repo.get_by_id_or_global.return_value = None
    csv = f"title,price,category_id\nFoo,100,{category_id}\n"
    with pytest.raises(CSVParseError, match=r"[Uu]nknown category"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Max rows ──────────────────────────────────────────────────────────────────


async def test_max_rows_exceeded_raises(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    rows = "\n".join(f"Row {i},100,{category_id}" for i in range(6))
    csv = f"title,price,category_id\n{rows}\n"
    with pytest.raises(CSVParseError, match="Too many rows"):
        await CSVProductParser(category_repository=repo, max_rows=5).parse_csv(
            csv, tenant_id, org_id
        )


# ── Required schema field missing → per-row error ────────────────────────────


async def test_required_schema_field_missing_is_row_error(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    # vin is required but not in this CSV
    csv = f"title,price,category_id\n2020 Civic,18500,{category_id}\n"
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    assert result.products == []
    err = result.errors[0]
    assert err.row_number == 2
    assert err.column == "attributes.vin"
    assert "vin" in err.message


# ── Type mismatch → per-row error ─────────────────────────────────────────────


async def test_number_type_mismatch_is_row_error(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin,year\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,not_a_number\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    err = result.errors[0]
    assert err.column == "attributes.year"
    assert "number" in err.message.lower()


async def test_boolean_type_mismatch_is_row_error(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin,is_certified\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,maybe\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    err = result.errors[0]
    assert err.column == "attributes.is_certified"


# ── Legacy vehicle CSV still works ────────────────────────────────────────────


async def test_legacy_vehicle_csv_backward_compat(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    """vin as a top-level CSV column goes into attributes['vin']."""
    repo = _make_category_repo(vehicle_schema)
    csv = f"vin,title,price,category_id\n1HGCM82633A123456,2020 Honda Civic,18500,{category_id}\n"
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert len(result.products) == 1
    product = result.products[0]
    assert product.attributes["vin"] == "1HGCM82633A123456"
    assert product.price_cents == 1_850_000


# ── Type coercion ─────────────────────────────────────────────────────────────


async def test_number_column_coerced_to_float(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin,mileage\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,50000\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["mileage"] == 50000.0


async def test_boolean_true_coerced(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin,is_certified\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,true\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["is_certified"] is True


# ── Unknown columns accepted as string ────────────────────────────────────────


async def test_unknown_column_accepted_as_string(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin,unknown_field\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,some_value\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["unknown_field"] == "some_value"


# ── Partial success ──────────────────────────────────────────────────────────


async def test_partial_success_accumulates_both(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    repo = _make_category_repo(vehicle_schema)
    csv = (
        f"title,price,category_id,vin\n"
        f"Good row,18500,{category_id},1HGCM82633A123456\n"
        f"Bad row,18500,{category_id},\n"  # vin is empty → required missing
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.total_rows == 2
    assert len(result.products) == 1
    assert result.failed_count == 1


# ── vin ends up in attributes, not duplicated ─────────────────────────────────


async def test_vin_column_stored_in_attributes_once(
    tenant_id: UUID, org_id: UUID, category_id: UUID, vehicle_schema: dict[str, dict[str, object]]
) -> None:
    """vin CSV column must land in attributes — not injected as a separate field."""
    repo = _make_category_repo(vehicle_schema)
    csv = f"title,price,category_id,vin\n2020 Civic,18500,{category_id},1HGCM82633A123456\n"
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    row = result.products[0]
    assert row.attributes.get("vin") == "1HGCM82633A123456"
    assert list(row.attributes.keys()).count("vin") == 1
