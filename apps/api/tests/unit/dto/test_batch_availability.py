"""Unit tests for batch availability DTOs."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.product.batch_availability import (
    BatchAvailabilityItemResult,
    BatchAvailabilityResponse,
)


def test_batch_availability_item_result_success():
    """Successful item should have status and no error."""
    item = BatchAvailabilityItemResult(
        product_id=uuid4(),
        status="reserved",
    )
    assert item.status == "reserved"
    assert item.error_code is None
    assert item.message is None


def test_batch_availability_item_result_failure():
    """Failed item should include error_code and message."""
    product_id = uuid4()
    item = BatchAvailabilityItemResult(
        product_id=product_id,
        status="failed",
        error_code="invalid_transition",
        message="Cannot reserve draft product",
    )
    assert item.product_id == product_id
    assert item.status == "failed"
    assert item.error_code == "invalid_transition"
    assert item.message == "Cannot reserve draft product"


def test_batch_availability_item_result_invalid_error_code():
    """Invalid error_code should raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        BatchAvailabilityItemResult(
            product_id=uuid4(),
            status="failed",
            error_code="invalid_code",  # type: ignore[arg-type]  # Testing invalid value
        )
    assert "error_code" in str(exc_info.value)


def test_batch_availability_response_all_success():
    """Response with all successes should have correct counts."""
    items = [BatchAvailabilityItemResult(product_id=uuid4(), status="reserved") for _ in range(3)]
    response = BatchAvailabilityResponse(
        results=items,
        success_count=3,
        failed_count=0,
    )
    assert response.success_count == 3
    assert response.failed_count == 0
    assert len(response.results) == 3


def test_batch_availability_response_partial_success():
    """Response with mixed results should have correct counts."""
    items = [
        BatchAvailabilityItemResult(product_id=uuid4(), status="reserved"),
        BatchAvailabilityItemResult(product_id=uuid4(), status="reserved"),
        BatchAvailabilityItemResult(
            product_id=uuid4(),
            status="failed",
            error_code="not_found",
        ),
    ]
    response = BatchAvailabilityResponse(
        results=items,
        success_count=2,
        failed_count=1,
    )
    assert response.success_count == 2
    assert response.failed_count == 1
    assert len(response.results) == 3


def test_batch_availability_response_all_failed():
    """Response with all failures should have correct counts."""
    items = [
        BatchAvailabilityItemResult(
            product_id=uuid4(),
            status="failed",
            error_code="invalid_transition",
        )
        for _ in range(2)
    ]
    response = BatchAvailabilityResponse(
        results=items,
        success_count=0,
        failed_count=2,
    )
    assert response.success_count == 0
    assert response.failed_count == 2
    assert len(response.results) == 2
