"""Test BulkUploadVehiclesUseCase."""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_vehicles import (
    BulkUploadVehiclesResult,
    BulkUploadVehiclesUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product


class TestBulkUploadVehiclesUseCase:
    """Test bulk vehicle upload use case with VIN-based upsert."""

    @pytest.fixture
    def sample_csv(self) -> str:
        """Sample client-format CSV."""
        return (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
            "2;RM;1800000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
            "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;2T1BURHE0LC123456\n"
        )

    @pytest.mark.asyncio
    async def test_use_case_rejects_unknown_csv_organization_codes_without_fallback(
        self, sample_csv: str
    ):
        """Unknown organization codes stop the import only when there is no
        organization_id fallback — when the caller supplies one, unresolved
        per-row codes fall back to it instead (see the per-row loop)."""
        product_repository = AsyncMock()
        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = []
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=AsyncMock(),
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=AsyncMock(),
        )

        with pytest.raises(ValueError, match="Unknown organization codes: DJ, RM"):
            await use_case.execute(
                csv_content=sample_csv,
                tenant_id=uuid4(),
                organization_id=None,
                category_id=uuid4(),
            )

        product_repository.create.assert_not_awaited()
        product_repository.update.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_use_case_parses_csv_and_upserts_products(self, sample_csv: str):
        """Test that use case parses CSV and upserts products by VIN."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        # Mock product repository
        product_repository = AsyncMock()
        # First call returns None (create), second call returns existing (update)
        product_repository.get_by_vin.side_effect = [
            None,  # First VIN doesn't exist
            # Second VIN exists — pre-load an empty `attributes` dict so
            # the use case's merge-into-attributes path works against a
            # real dict, not a Mock attribute lookup. Post the JSONB
            # move (20260927_0001), the use case mutates
            # `existing.attributes` directly instead of a top-level
            # `internal_code` field.
            Mock(spec=Product, id=uuid4(), attributes={}),
        ]

        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        async def mock_update(product):
            return product

        product_repository.create.side_effect = mock_create
        product_repository.update.side_effect = mock_update

        # Mock category repository
        category_repository = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        # Create use case
        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ"),
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="RM"),
        ]
        internal_code_allocator = AsyncMock()
        internal_code_allocator.allocate_next.return_value = 101
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=internal_code_allocator,
        )

        # Act
        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert isinstance(result, BulkUploadVehiclesResult)
        assert result.total_rows == 2
        assert result.imported_count == 1
        assert result.updated_count == 1
        assert result.failed_count == 0
        assert len(result.results) == 2

        # Verify first product was created
        assert result.results[0].status == "imported"
        assert result.results[0].vin == "1FMSK7DH7LGA77418"

        # Verify second product was updated
        assert result.results[1].status == "updated"
        assert result.results[1].vin == "2T1BURHE0LC123456"

        # The created product's `internal_code` comes from the allocator —
        # NEVER from the CSV's `id` column (which is "1" for this row).
        assert created_products[0].attributes["internal_code"] == "101"
        # The updated (existing-VIN) row never touches the allocator at all.
        internal_code_allocator.allocate_next.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_use_case_handles_missing_vin(self):
        """Test that rows without VIN are marked as failed."""
        # Arrange
        csv_with_missing_vin = (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;\n"
        )

        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        category_repository = AsyncMock()

        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
        ]
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=AsyncMock(),
        )

        # Act
        result = await use_case.execute(
            csv_content=csv_with_missing_vin,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert result.total_rows == 1
        assert result.failed_count == 1
        assert result.results[0].status == "failed"
        assert "VIN is required" in result.results[0].errors[0]

    @pytest.mark.asyncio
    async def test_use_case_ignores_csv_id_duplicates_and_allocates_internal_codes(self):
        """The CSV's `id` column no longer determines `internal_code` — two
        rows sharing the same `id` both import successfully, each getting
        its own internally-allocated `internal_code` from the sequence."""
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        csv_content = (
            "id;title;price;VIN\n42;DJ;25000;1FMSK7DH7LGA77418\n42;DJ;25000;2T1BURHE0LC123456\n"
        )

        product_repository = AsyncMock()
        product_repository.get_by_vin.side_effect = [None, None]
        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create
        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
        ]
        internal_code_allocator = AsyncMock()
        internal_code_allocator.allocate_next.side_effect = [201, 202]
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=AsyncMock(),
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=internal_code_allocator,
        )

        result = await use_case.execute(
            csv_content=csv_content,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        assert result.imported_count == 2
        assert result.failed_count == 0
        assert created_products[0].attributes["internal_code"] == "201"
        assert created_products[1].attributes["internal_code"] == "202"
        assert internal_code_allocator.allocate_next.await_count == 2

    @pytest.mark.asyncio
    async def test_use_case_does_not_reallocate_internal_code_on_update(self):
        """Updating an existing VIN match must never call the allocator or
        touch its persisted `internal_code` — the merge into `attributes`
        preserves whatever code the product already has, regardless of
        what the CSV's `id` column says for that row."""
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        csv_content = "id;title;price;VIN\n999;DJ;25000;1FMSK7DH7LGA77418\n"

        existing = Mock(spec=Product, id=uuid4(), attributes={"internal_code": "7"})
        product_repository = AsyncMock()
        product_repository.get_by_vin.return_value = existing

        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
        ]
        internal_code_allocator = AsyncMock()
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=AsyncMock(),
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=internal_code_allocator,
        )

        result = await use_case.execute(
            csv_content=csv_content,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        assert result.updated_count == 1
        internal_code_allocator.allocate_next.assert_not_awaited()
        assert existing.attributes["internal_code"] == "7"

    @pytest.mark.asyncio
    async def test_use_case_preserves_existing_images_when_import_has_no_zip(self):
        """A CSV-only upsert must not clear images already stored on the product."""
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        csv_content = "id;title;price;VIN\n42;DJ;25000;1FMSK7DH7LGA77418\n"
        existing_images = ["https://spaces.example.com/vehicles/existing.jpg"]
        existing = Product.create(
            title="Existing vehicle",
            price_cents=1,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            image_urls=existing_images,
        )

        product_repository = AsyncMock()
        product_repository.get_by_vin.return_value = existing
        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
        ]
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=AsyncMock(),
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=AsyncMock(),
        )

        result = await use_case.execute(
            csv_content=csv_content,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        assert result.updated_count == 1
        assert existing.image_urls == existing_images
        product_repository.update.assert_awaited_once_with(existing)

    @pytest.mark.asyncio
    async def test_use_case_builds_attributes_correctly(self, sample_csv: str):
        """Test that attributes are correctly built from CSV fields."""
        # Arrange
        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        product_repository.get_by_vin.return_value = None
        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create
        category_repository = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repository.get_by_id.return_value = mock_category

        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ"),
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="RM"),
        ]
        internal_code_allocator = AsyncMock()
        internal_code_allocator.allocate_next.side_effect = [301, 302]
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=internal_code_allocator,
        )

        # Act
        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
        )

        # Assert
        assert result.imported_count == 2
        assert len(created_products) == 2

        # Check first product attributes
        first_product = created_products[0]
        attrs = first_product.attributes
        assert attrs["vin"] == "1FMSK7DH7LGA77418"
        assert attrs["year"] == 2020
        assert attrs["make"] == "Ford"
        assert attrs["model"] == "Explorer"
        assert attrs["mileage"] == 70000
        assert attrs["mileage_unit"] == "miles"
        assert attrs["exterior_color"] == "Gris"
        assert attrs["clean_title"] is True
        assert attrs["facebook_groups"] == ["1", "2"]
        assert attrs["publicado"] is True
        # location_city and location_state are product fields, not attributes
        assert first_product.location_city == "Orlando"
        assert first_product.location_state == "FL"

        # Check second product attributes
        second_product = created_products[1]
        attrs2 = second_product.attributes
        assert attrs2["vin"] == "2T1BURHE0LC123456"
        assert attrs2["year"] == 2019
        assert attrs2["make"] == "Toyota"
        assert attrs2["model"] == "Camry"
        assert attrs2["clean_title"] is False
        assert attrs2["publicado"] is False
        assert second_product.location_city == "Miami"
        assert second_product.location_state == "FL"

    @pytest.mark.asyncio
    async def test_can_view_all_orgs_resolves_code_from_another_tenant(self, sample_csv: str):
        """ORG_ADMIN_VIEW_ALL callers can import to an organization outside
        their own tenant, and the created product's tenant_id must be the
        DESTINATION organization's (Organization.id == Organization.tenant_id
        by domain invariant), never the super-admin caller's."""
        caller_tenant_id = uuid4()
        other_org_id = uuid4()  # also the other org's tenant_id (invariant)
        category_id = uuid4()

        product_repository = AsyncMock()
        product_repository.get_by_vin.return_value = None
        created_products = []

        async def mock_create(product):
            created_products.append(product)
            return product

        product_repository.create.side_effect = mock_create

        category_repository = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        category_repository.get_by_id.return_value = mock_category

        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(
                id=other_org_id, tenant_id=other_org_id, name="Other Tenant Dealer", code="DJ"
            ),
            Organization(
                id=other_org_id, tenant_id=other_org_id, name="Other Tenant Dealer", code="RM"
            ),
        ]
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=AsyncMock(),
        )

        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=caller_tenant_id,
            organization_id=None,
            category_id=category_id,
            can_view_all_orgs=True,
        )

        assert result.imported_count == 2
        assert result.failed_count == 0
        for product in created_products:
            assert product.tenant_id == other_org_id
            assert product.tenant_id != caller_tenant_id
            assert product.organization_id == other_org_id

        # tenant_id=None means "any tenant" -- the repo does the actual scoping.
        call_args = organization_repository.get_by_codes.call_args
        assert set(call_args.args[0]) == {"DJ", "RM"}
        assert call_args.kwargs == {"tenant_id": None}

    @pytest.mark.asyncio
    async def test_without_can_view_all_orgs_a_different_tenant_code_stays_unknown(
        self, sample_csv: str
    ):
        """Reconfirms the existing tenant-isolation default: a code that
        resolves to a DIFFERENT tenant is dropped by the repository's own
        tenant_id filter, so it is treated as unknown -- same as before
        can_view_all_orgs existed."""
        caller_tenant_id = uuid4()
        category_id = uuid4()

        product_repository = AsyncMock()
        organization_repository = AsyncMock()
        # A real (tenant-scoped) repo would filter these out server-side;
        # simulate that by returning nothing for the caller's own tenant.
        organization_repository.get_by_codes.return_value = []
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=AsyncMock(),
            organization_repository=organization_repository,
            do_spaces_service=AsyncMock(),
            internal_code_allocator=AsyncMock(),
        )

        with pytest.raises(ValueError, match="Unknown organization codes: DJ, RM"):
            await use_case.execute(
                csv_content=sample_csv,
                tenant_id=caller_tenant_id,
                organization_id=None,
                category_id=category_id,
                can_view_all_orgs=False,
            )

        call_args = organization_repository.get_by_codes.call_args
        assert set(call_args.args[0]) == {"DJ", "RM"}
        assert call_args.kwargs == {"tenant_id": caller_tenant_id}
        product_repository.create.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_runtime_fails_row_when_csv_path_missing_from_zip(self):
        """Defense in depth (matches the preview's image-filename check):
        when the CSV `path` column references an image but the ZIP didn't
        actually contain a matching file, the runtime path must surface
        it as a per-row failure BEFORE writing to the DB — otherwise the
        row would persist with zero images and the user has no way to
        know why their images are gone."""
        import io as _io
        import zipfile as _zipfile

        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()

        # CSV whose `path` column is "IMG/Vehiculos/MF/2020-EXPLORER" —
        # a folder prefix, NOT a filename. The CSVImageMapper will NOT
        # find anything under that exact prefix in our test ZIP (which
        # only contains "Ford/Explorer/2020/img1.jpg"), so the row
        # triggers the missing-image branch.
        csv_content = (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;Ford/Explorer/2020/img1.jpg;1,2;01/01/25;1;"
            "1FMSK7DH7LGA77418\n"
        )

        # Build a real ZIP that contains a different VIN's folder so the
        # mapper returns an empty `mapped` for our row.
        zip_buf = _io.BytesIO()
        with _zipfile.ZipFile(zip_buf, "w", _zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("SomeOtherVin/img1.jpg", b"junk-bytes")
        zip_bytes = zip_buf.getvalue()

        product_repository = AsyncMock()
        # No existing product → create branch (also exercises the
        # pre-write guard so we don't persist an orphan row).
        product_repository.get_by_vin.return_value = None

        category_repository = AsyncMock()
        category_repository.get_by_id.return_value = Mock(id=category_id, tenant_id=tenant_id)

        organization_repository = AsyncMock()
        organization_repository.get_by_codes.return_value = [
            Organization(id=organization_id, tenant_id=tenant_id, name="Dealer", code="DJ")
        ]

        do_spaces_service = AsyncMock()

        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repository,
            category_repository=category_repository,
            organization_repository=organization_repository,
            do_spaces_service=do_spaces_service,
            internal_code_allocator=AsyncMock(),
        )

        result = await use_case.execute(
            csv_content=csv_content,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            zip_bytes=zip_bytes,
        )

        assert result.total_rows == 1
        assert result.failed_count == 1
        assert result.imported_count == 0
        assert result.results[0].status == "failed"
        assert result.results[0].product_id is None
        assert result.results[0].images_uploaded == 0
        assert result.results[0].errors == [
            "image 'Ford/Explorer/2020/img1.jpg' not found in upload"
        ]
        # Critical: the row must NOT have been persisted.
        product_repository.create.assert_not_awaited()
        product_repository.update.assert_not_awaited()
        # And no upload calls fired either (zero images to upload).
        do_spaces_service.upload_file.assert_not_awaited()
