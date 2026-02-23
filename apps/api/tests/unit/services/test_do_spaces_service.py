"""Unit tests for DOSpacesService."""

from unittest.mock import MagicMock, patch

from prosell.infrastructure.services.do_spaces_service import (
    DOSpacesService,
    generate_banner_path,
    generate_logo_path,
    generate_product_image_path,
)

# =============================================================================
# DOSpacesService Tests
# =============================================================================


class TestDOSpacesService:
    @patch("prosell.infrastructure.services.do_spaces_service.boto3.client")
    async def test_generate_presigned_url(self, mock_boto3_client):
        """Generate presigned URL for upload."""
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        mock_s3.generate_presigned_url.return_value = "https://presigned-url"

        service = DOSpacesService(
            region="nyc3",
            bucket_name="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
        )

        result = await service.generate_presigned_url(
            file_path="orgs/123/logo.jpg",
            content_type="image/jpeg",
        )

        assert "upload_url" in result
        assert "public_url" in result
        assert "key" in result
        assert result["key"] == "orgs/123/logo.jpg"

        mock_s3.generate_presigned_url.assert_called_once()

    @patch("prosell.infrastructure.services.do_spaces_service.boto3.client")
    async def test_delete_file(self, mock_boto3_client):
        """Delete file from Spaces."""
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3

        service = DOSpacesService(
            region="nyc3",
            bucket_name="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
        )
        result = await service.delete_file("orgs/123/logo.jpg")

        assert result is True
        mock_s3.delete_object.assert_called_once_with(
            Bucket=service.bucket,
            Key="orgs/123/logo.jpg",
        )

    @patch("prosell.infrastructure.services.do_spaces_service.boto3.client")
    async def test_delete_file_handles_error(self, mock_boto3_client):
        """Return False when delete fails."""
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        mock_s3.delete_object.side_effect = Exception("S3 error")

        service = DOSpacesService(
            region="nyc3",
            bucket_name="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
        )
        result = await service.delete_file("orgs/123/logo.jpg")

        assert result is False

    @patch("prosell.infrastructure.services.do_spaces_service.boto3.client")
    async def test_check_file_exists_true(self, mock_boto3_client):
        """Return True when file exists."""
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        mock_s3.head_object.return_value = {}

        service = DOSpacesService(
            region="nyc3",
            bucket_name="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
        )
        result = await service.check_file_exists("orgs/123/logo.jpg")

        assert result is True
        mock_s3.head_object.assert_called_once_with(
            Bucket=service.bucket,
            Key="orgs/123/logo.jpg",
        )

    @patch("prosell.infrastructure.services.do_spaces_service.boto3.client")
    async def test_check_file_exists_false(self, mock_boto3_client):
        """Return False when file doesn't exist."""
        from botocore.exceptions import ClientError

        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        # Make exceptions attribute available
        mock_s3.exceptions = type("obj", (object,), {"ClientError": ClientError})

        error = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadObject",
        )
        mock_s3.head_object.side_effect = error

        service = DOSpacesService(
            region="nyc3",
            bucket_name="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
        )
        result = await service.check_file_exists("orgs/123/logo.jpg")

        assert result is False


# =============================================================================
# Helper Functions Tests
# =============================================================================


class TestPathGeneration:
    def test_generate_logo_path(self):
        """Generate logo path with auto-generated filename."""
        org_id = "abc-123"
        result = generate_logo_path(org_id)

        assert result.startswith(f"orgs/{org_id}/logo/")
        assert result.endswith(".jpg")

    def test_generate_logo_path_custom_filename(self):
        """Generate logo path with custom filename."""
        org_id = "abc-123"
        result = generate_logo_path(org_id, filename="my-logo.png")

        assert result == f"orgs/{org_id}/logo/my-logo.png"

    def test_generate_banner_path(self):
        """Generate banner path with auto-generated filename."""
        org_id = "abc-123"
        result = generate_banner_path(org_id)

        assert result.startswith(f"orgs/{org_id}/banner/")
        assert result.endswith(".jpg")

    def test_generate_product_image_path(self):
        """Generate product image path."""
        org_id = "abc-123"
        product_id = "prod-456"
        filename = "My Image.JPG"
        result = generate_product_image_path(org_id, product_id, filename)

        assert result == f"orgs/{org_id}/products/{product_id}/my_image.jpg"
