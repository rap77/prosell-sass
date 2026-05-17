"""OpenAPI schema validation for /api/v1/org endpoint."""

from prosell.application.dto.org.response import OrganizationListResponse
from prosell.infrastructure.api.main import app


class TestOrganizationsOpenAPIContract:
    """OpenAPI schema validation for /api/v1/org."""

    def test_organizations_openapi_schema_exists(self):
        """
        Validate that /api/v1/org has OpenAPI schema defined.

        This test ensures:
        - Endpoint is registered in OpenAPI schema
        - Response schema is defined
        - Required fields are documented
        """
        # Get OpenAPI schema
        openapi_schema = app.openapi()

        # Verify endpoint exists in OpenAPI schema
        assert "/api/v1/org" in openapi_schema["paths"]
        assert "get" in openapi_schema["paths"]["/api/v1/org"]

        # Verify response schema is defined
        get_schema = openapi_schema["paths"]["/api/v1/org"]["get"]
        assert "responses" in get_schema
        assert "200" in get_schema["responses"]

        # Verify response model references OrganizationListResponse
        response_content = get_schema["responses"]["200"]["content"]["application/json"]
        assert "schema" in response_content

        # Verify response model has required fields
        response_model = OrganizationListResponse.model_json_schema()
        assert "properties" in response_model
        assert "organizations" in response_model["properties"]
        assert "total" in response_model["properties"]
        assert "skip" in response_model["properties"]
        assert "limit" in response_model["properties"]
