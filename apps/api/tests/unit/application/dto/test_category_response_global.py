"""Unit — CategoryResponse must serialize GLOBAL categories (tenant_id NULL).

Foundation Plan 2 made categories global templates (Category.tenant_id is
``UUID | None``). The response DTO had ``tenant_id: UUID`` (non-optional), so
serializing a global category raised a pydantic ValidationError → the read
endpoints would 500. This guards the contract.
"""

from uuid import uuid4

from prosell.application.dto.category.response import CategoryResponse
from prosell.domain.entities.category import Category


def test_category_response_serializes_global_category_with_null_tenant():
    """A global (tenant_id=None) category builds a response with tenant_id None."""
    category = Category(
        id=uuid4(),
        tenant_id=None,  # GLOBAL template
        name="Vehicles",
        slug="vehicles",
        level=0,
    )

    response = CategoryResponse.from_entity(category)

    assert response.tenant_id is None
    assert response.name == "Vehicles"


def test_category_response_keeps_tenant_scoped_category():
    """A tenant-scoped category still round-trips its tenant_id."""
    tenant_id = uuid4()
    category = Category(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Own",
        slug="own",
        level=1,
    )

    response = CategoryResponse.from_entity(category)

    assert response.tenant_id == tenant_id
