"""OpenAPI schema validation for /api/v1/webhooks/facebook endpoint."""

from prosell.infrastructure.api.main import app
from prosell.infrastructure.api.routers.webhook_router import WebhookResponse


class TestWebhooksOpenAPIContract:
    """OpenAPI schema validation for /api/v1/webhooks/facebook."""

    def test_webhooks_facebook_openapi_schema_exists(self):
        """
        Validate that /api/v1/webhooks/facebook has OpenAPI schema defined.

        This test ensures:
        - Endpoint is registered in OpenAPI schema
        - Response schema is defined
        - Required fields are documented
        - Security (X-Hub-Signature) is documented
        """
        # Get OpenAPI schema
        openapi_schema = app.openapi()

        # Verify endpoint exists in OpenAPI schema
        assert "/api/v1/webhooks/facebook" in openapi_schema["paths"]
        assert "post" in openapi_schema["paths"]["/api/v1/webhooks/facebook"]

        # Verify response schema is defined
        post_schema = openapi_schema["paths"]["/api/v1/webhooks/facebook"]["post"]
        assert "responses" in post_schema
        assert "200" in post_schema["responses"]

        # Verify 403 response is defined (security violation)
        assert "403" in post_schema["responses"]

        # Verify response model references WebhookResponse
        response_content = post_schema["responses"]["200"]["content"]["application/json"]
        assert "schema" in response_content

        # Verify response model has required fields
        response_model = WebhookResponse.model_json_schema()
        assert "properties" in response_model
        assert "status" in response_model["properties"]

        # Verify security is documented (X-Hub-Signature header)
        # Note: FastAPI puts header parameters in a different location
        # We check the 403 response description instead
        response_403 = post_schema["responses"]["403"]
        assert "description" in response_403
        desc_lower = response_403["description"].lower()
        assert "signature" in desc_lower or "x-hub-signature" in desc_lower

    def test_webhooks_facebook_response_schema_valid(self):
        """
        Validate that WebhookResponse schema is valid.

        This test ensures:
        - Response model can be instantiated
        - Required fields are present
        - JSON serialization works correctly
        """
        # Test minimal response (only required field)
        response = WebhookResponse(status="received")
        assert response.status == "received"
        assert response.model_dump(exclude_none=True) == {"status": "received"}

        # Test different status values
        response_success = WebhookResponse(status="processed")
        assert response_success.status == "processed"

        # Verify JSON schema is valid
        response_model = WebhookResponse.model_json_schema()
        assert "properties" in response_model
        assert "status" in response_model["properties"]
        assert response_model["properties"]["status"]["type"] == "string"

    def test_webhooks_facebook_summary_documented(self):
        """
        Validate that webhook endpoint has proper documentation.

        This test ensures:
        - Summary is documented
        - Description explains the purpose
        - Tags are present for grouping
        """
        # Get OpenAPI schema
        openapi_schema = app.openapi()

        # Get endpoint schema
        post_schema = openapi_schema["paths"]["/api/v1/webhooks/facebook"]["post"]

        # Verify summary
        assert "summary" in post_schema
        assert len(post_schema["summary"]) > 0

        # Verify description
        assert "description" in post_schema
        assert len(post_schema["description"]) > 0
        # Check that description mentions key concepts
        desc = post_schema["description"].lower()
        assert "facebook" in desc or "lead" in desc

        # Verify tags for grouping in docs
        assert "tags" in post_schema
        assert len(post_schema["tags"]) > 0
