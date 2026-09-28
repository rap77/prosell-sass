"""Create product use case with JSONB attribute validation."""

from uuid import UUID

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.storage_key_sanitizer import sanitize_storage_key
from prosell.domain.services.template_composer import resolve_title
from prosell.domain.services.vehicle_code_allocator import VehicleCodeAllocator


class CreateProductUseCase:
    """Create a new product with category validation."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
        vehicle_code_allocator: VehicleCodeAllocator | None = None,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository
        # Optional for backward compatibility with existing unit tests that
        # build `CreateProductUseCase(product_repo, category_repo)` without
        # an allocator. When omitted, callers must always supply an
        # explicit `vehicle_code` in the request — the use case never
        # allocates implicitly (avoids silently picking the wrong code in
        # tests that predate the feature).
        self._vehicle_code_allocator = vehicle_code_allocator

    async def execute(self, request: CreateProductRequest) -> ProductResponse:
        """
        Execute product creation.

        Args:
            request: CreateProductRequest DTO

        Returns:
            ProductResponse DTO

        Raises:
            CategoryNotFoundError: If category does not exist
            DuplicateVehicleCodeError: If the caller supplied an explicit
                `vehicle_code` already used by another product.
            ValueError: If validation fails
        """
        # 1. Validate category exists. A product may reference the tenant's
        # OWN category OR a GLOBAL template (Plan 2) — get_by_id_or_global
        # returns both while still denying other tenants' private categories.
        category = await self.category_repository.get_by_id_or_global(
            request.category_id,
            request.tenant_id or UUID(int=0),
        )
        if not category:
            raise CategoryNotFoundError(f"Category not found: {request.category_id}")

        # 1b. Validate attributes against category schema
        # (raises ValueError on type/required mismatch)
        category.validate_attributes(request.attributes or {})

        # 1c. Auto-generate stock_number from VIN if not provided
        # Copy, don't alias -- mutating request.attributes in place below
        # would silently mutate the caller's own dict (a shared mutable
        # object), since `x or {}` returns the SAME dict when non-empty.
        attrs: dict[str, object] = dict(request.attributes) if request.attributes else {}
        vin_str = attrs.get("vin")
        if isinstance(vin_str, str) and len(vin_str) >= 6 and "stock_number" not in attrs:
            attrs["stock_number"] = vin_str[-6:].upper()
            request = request.model_copy(update={"attributes": attrs})

        # 2. Resolve the owning tenant. A global category (tenant_id=NULL)
        # carries no tenant, so the request MUST supply one — a product always
        # belongs to a tenant. (Via the router this is the auth context.)
        tenant_id = request.tenant_id or category.tenant_id
        if tenant_id is None:
            raise ValueError("Cannot create a product without a tenant: tenant_id is required")
        organization_id = request.organization_id or tenant_id

        # 2b. Compose the title from the category's presentation template
        # when it declares one; otherwise keep the request-provided title
        # (backward-compatible fallback). Shared with the PATCH handler.
        title = resolve_title(category.presentation, attrs, fallback=request.title) or request.title

        # 2c. Defense in depth: re-apply the storage-key alphabet
        # normalization to image-bearing fields, the same way
        # UpdateProductUseCase does on PATCH. Prevents legacy
        # phone-cam-style keys from entering the DB through a client
        # POST that bypasses the CSV bulk-upload sanitizer.
        request = request.model_copy(
            update={
                "image_urls": [sanitize_storage_key(k) for k in (request.image_urls or [])],
                "cover_image_key": (
                    sanitize_storage_key(request.cover_image_key)
                    if request.cover_image_key
                    else None
                ),
                "thumbnail_image_key": (
                    sanitize_storage_key(request.thumbnail_image_key)
                    if request.thumbnail_image_key
                    else None
                ),
            }
        )

        # 2d. Resolve `vehicle_code`:
        #   * caller supplied an explicit code — validate uniqueness
        #     against the partial unique index (fail fast with
        #     DuplicateVehicleCodeError instead of letting the INSERT
        #     blow up with a generic IntegrityError);
        #   * caller did not supply one — ask the allocator to pick
        #     MAX(vehicle_code) + 1 (or 1 if none yet exist);
        #   * allocator not wired (legacy test fixtures) — leave the
        #     entity's `vehicle_code` as `None`, matching the pre-feature
        #     behavior. The DB column is nullable so the INSERT succeeds
        #     and the row simply has no code.
        vehicle_code: int | None = request.vehicle_code
        if vehicle_code is not None:
            await self._reserve_vehicle_code_or_raise(vehicle_code)
        elif self._vehicle_code_allocator is not None:
            vehicle_code = await self._vehicle_code_allocator.allocate_next()

        # 3. Create product entity
        product = Product.create(
            title=title,
            price_cents=request.price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=request.category_id,
            condition=request.condition,
            slug=request.slug,
            description=request.description,
            currency=request.currency,
            attributes=request.attributes,
            image_urls=request.image_urls,
            cover_image_key=request.cover_image_key,
            thumbnail_image_key=request.thumbnail_image_key,
            location_city=request.location_city,
            location_state=request.location_state,
            location_zip=request.location_zip,
            vehicle_code=vehicle_code,
        )

        # 4. Persist
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)

    async def _reserve_vehicle_code_or_raise(self, vehicle_code: int) -> None:
        """Validate that `vehicle_code` is free before the INSERT commits.

        Without an allocator wired (legacy test fixtures), skip the
        check — the partial unique index still rejects a duplicate at
        INSERT time as a final safety net.
        """
        if self._vehicle_code_allocator is None:
            return
        await self._vehicle_code_allocator.reserve(vehicle_code)
