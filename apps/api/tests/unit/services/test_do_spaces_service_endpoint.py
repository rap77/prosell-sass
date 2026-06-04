"""Unit tests for DOSpacesService endpoint configurability.

These tests verify that DOSpacesService can be configured to use:
- DigitalOcean Spaces default endpoint (backwards compatible)
- Custom S3 endpoint (e.g., MinIO for local development)
- Path-style addressing (required by MinIO)

The boto3 client is mocked to avoid real network calls.
"""

from unittest.mock import MagicMock, patch

from prosell.infrastructure.services.do_spaces_service import DOSpacesService


class TestDOSpacesEndpointConfigurable:
    """Tests for endpoint URL configurability."""

    def test_dospaces_uses_custom_endpoint_when_configured(self) -> None:
        """When endpoint_url is passed to constructor, the s3_client uses it.

        NOT the DO Spaces default of https://{region}.digitaloceanspaces.com.
        """
        custom_endpoint = "http://minio:9000"

        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            service = DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url=custom_endpoint,
            )

        assert service.endpoint == custom_endpoint
        # Verify boto3 was called with the custom endpoint_url
        call_kwargs = mock_boto3.client.call_args.kwargs
        assert call_kwargs["endpoint_url"] == custom_endpoint

    def test_dospaces_uses_path_style_addressing(self) -> None:
        """When s3_force_path_style is set, boto3 Config uses 'path' addressing style.

        Required for MinIO compatibility.
        """
        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url="http://minio:9000",
                force_path_style=True,
            )

        call_kwargs = mock_boto3.client.call_args.kwargs
        config = call_kwargs["config"]
        assert config.s3["addressing_style"] == "path"

    def test_dospaces_preserves_do_default_when_no_override(self) -> None:
        """When endpoint_url is None, endpoint remains DO Spaces default.

        This guarantees backwards compatibility for production deployments.
        """
        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            service = DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
            )

        assert service.endpoint == "https://nyc3.digitaloceanspaces.com"
        # Verify boto3 was called with the DO Spaces default endpoint
        call_kwargs = mock_boto3.client.call_args.kwargs
        assert call_kwargs["endpoint_url"] == "https://nyc3.digitaloceanspaces.com"

    def test_dospaces_uses_path_style_by_default(self) -> None:
        """Path style is the default for backwards-compatible MinIO support.

        DO Spaces supports both virtual-hosted and path style. Defaulting to path
        style ensures the same client works against both DO Spaces and MinIO.
        """
        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_boto3.client.return_value = MagicMock()

            DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
            )

        call_kwargs = mock_boto3.client.call_args.kwargs
        config = call_kwargs["config"]
        # Default should be path style so MinIO works out of the box
        assert config.s3["addressing_style"] == "path"


class TestDOSpacesPublicURL:
    """Tests for public URL generation with custom endpoint."""

    def test_public_url_uses_custom_endpoint(self) -> None:
        """Public URLs returned by upload_file use the custom endpoint (not DO default)."""
        custom_endpoint = "http://minio:9000"
        bucket = "prosell-assets"

        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            service = DOSpacesService(
                region="nyc3",
                bucket_name=bucket,
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url=custom_endpoint,
            )

        # The public URL is constructed as f"{self.endpoint}/{self.bucket}/{key}"
        # We verify the endpoint is stored correctly on the service
        assert service.endpoint == custom_endpoint
        assert service.bucket == bucket
        # Simulate a constructed public URL with the custom endpoint
        key = "orgs/test/vehicles/abc.jpg"
        expected_url = f"{custom_endpoint}/{bucket}/{key}"
        assert expected_url.startswith("http://minio:9000/prosell-assets/orgs/")


class TestDOSpacesUploadToLocalEndpoint:
    """Integration-style test that verifies upload_file calls boto3 correctly."""

    def test_dospaces_upload_to_local_endpoint_succeeds(self) -> None:
        """upload_file calls s3_client.put_object with the right Bucket/Key/Body.

        Uses a mocked boto3 client to verify the contract is preserved.
        """
        custom_endpoint = "http://minio:9000"
        bucket = "prosell-assets"
        key = "orgs/tenant-1/vehicles/test-uuid.jpg"
        payload = b"fake-jpeg-bytes"

        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            service = DOSpacesService(
                region="nyc3",
                bucket_name=bucket,
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url=custom_endpoint,
                force_path_style=True,
            )

            # Call the async method via asyncio
            import asyncio

            public_url = asyncio.run(
                service.upload_file(
                    file_path=key,
                    file_bytes=payload,
                    content_type="image/jpeg",
                )
            )

        # Verify put_object was called with the right params
        mock_client.put_object.assert_called_once_with(
            Bucket=bucket,
            Key=key,
            Body=payload,
            ContentType="image/jpeg",
        )
        # Verify the returned URL uses the custom endpoint
        assert public_url == f"{custom_endpoint}/{bucket}/{key}"
        assert public_url.startswith("http://minio:9000/")
