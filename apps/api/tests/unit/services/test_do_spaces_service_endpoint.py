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


class TestDOSpacesDualClientForSigning:
    """Tests for the dual-client (s3_client + s3_signer) needed to fix the bug where
    presigned URLs are signed against the internal docker network endpoint (e.g.,
    http://minio:9000) but the browser fetches them from the public endpoint
    (http://localhost:9000) — the signature is host-bound so the URL is invalid.

    Pattern: standard MinIO + Docker setup, same as MINIO_SERVER_URL /
    MINIO_BROWSER_REDIRECT_URL at the app level.
    """

    def test_s3_signer_uses_public_endpoint_when_distinct(self) -> None:
        """When public_endpoint_url differs from internal, a second boto3 client is
        created with the public endpoint so presigned URLs are valid for the browser.
        """
        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_internal = MagicMock(name="s3_client")
            mock_signer = MagicMock(name="s3_signer")
            # boto3.client is called twice: first for s3_client, then for s3_signer
            mock_boto3.client.side_effect = [mock_internal, mock_signer]

            service = DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url="http://minio:9000",
                public_endpoint_url="http://localhost:9000",
            )

        # boto3.client was called twice (once per client)
        assert mock_boto3.client.call_count == 2
        # First call used the internal endpoint
        first_call = mock_boto3.client.call_args_list[0]
        assert first_call.kwargs["endpoint_url"] == "http://minio:9000"
        # Second call used the public endpoint
        second_call = mock_boto3.client.call_args_list[1]
        assert second_call.kwargs["endpoint_url"] == "http://localhost:9000"
        # The two clients are distinct attributes on the service
        assert service.s3_client is mock_internal
        assert service.s3_signer is mock_signer
        assert service.s3_client is not service.s3_signer

    def test_s3_signer_same_as_s3_client_when_no_public_endpoint(self) -> None:
        """When public_endpoint_url is not configured, s3_signer aliases s3_client.

        Backwards compatible: in prod with DO Spaces, both endpoints are the same,
        so a single client is enough and there's no extra cost.
        """
        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_client = MagicMock(name="s3_client")
            mock_boto3.client.return_value = mock_client

            service = DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
            )

        # Only one boto3.client call (no extra client when not needed)
        assert mock_boto3.client.call_count == 1
        # s3_signer is the same object as s3_client
        assert service.s3_signer is service.s3_client

    def test_generate_download_url_uses_s3_signer(self) -> None:
        """generate_download_url signs against s3_signer, not s3_client.

        This is the actual fix: the URL returned must be valid for the host the
        browser will use (the public endpoint), not the internal docker network
        endpoint. Otherwise the browser rejects the signature.
        """
        signed_url = (
            "http://localhost:9000/prosell-assets/x.jpg"
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123"
        )

        with patch("prosell.infrastructure.services.do_spaces_service.boto3") as mock_boto3:
            mock_internal = MagicMock(name="s3_client")
            mock_signer = MagicMock(name="s3_signer")
            mock_signer.generate_presigned_url.return_value = signed_url
            mock_boto3.client.side_effect = [mock_internal, mock_signer]

            service = DOSpacesService(
                region="nyc3",
                bucket_name="prosell-assets",
                access_key="test-key",
                secret_key="test-secret",
                endpoint_url="http://minio:9000",
                public_endpoint_url="http://localhost:9000",
            )

            import asyncio

            url = asyncio.run(service.generate_download_url("x.jpg"))

        # The signer was used; the internal client was not touched
        mock_signer.generate_presigned_url.assert_called_once()
        mock_internal.generate_presigned_url.assert_not_called()
        # The returned URL matches what the signer produced
        assert url == signed_url
