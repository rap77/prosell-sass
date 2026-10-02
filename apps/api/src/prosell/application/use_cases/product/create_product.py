"""Create product use case with JSONB attribute validation."""

from uuid import UUID

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.internal_code_allocator import InternalCodeAllocator
from prosell.domain.services.storage_key_sanitizer import sanitize_storage_key
from prosell.domain.services.template_composer import resolve_title


class CreateProductUseCase:
    """Create a new product with category validation.

    ``internal_code`` resolution flow (post-`20260927_0001`,
    renamed from `vehicle_code` in `20261002_0001`):
        The legacy id is no longer a top-level field — it lives inside
        ``attributes["internal_code"]``. The use case has three branches:
          * caller supplied it under `attributes["internal_code"]` —
            validate uniqueness via the allocator's `reserve()` (which
            looks up the JSONB functional unique index) and pass
            through;
          * caller did not supply it AND an allocator is wired — pick
            the next code via `nextval` and stuff it into
            `attributes["internal_code"]` (text);
          * allocator not wired (legacy test fixtures) — leave
            attributes alone, row simply has no code.
    """

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
        internal_code_allocator: InternalCodeAllocator | None = None,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository
        # Optional for backward compatibility with existing unit tests
        # that build `CreateProductUseCase(product_repo, category_repo)`
        # without an allocator. When omitted, callers must always
        # supply an explicit value in
        # `attributes["internal_code"]` — the use case never allocates
        # implicitly (avoids silently picking the wrong code in tests
        # that predate the feature).
        self._internal_code_allocator = internal_code_allocator

    async def execute(self, request: CreateProductRequest) -> ProductResponse:
        """
        Execute product creation.

        Args:
            request: CreateProductRequest DTO

        Returns:
            ProductResponse DTO

        Raises:
            CategoryNotFoundError: If category does not exist
            DuplicateInternalCodeError: If the caller supplied an explicit
                `attributes["internal_code"]` already used by another
                product.
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

        # 1c. Auto-generate stock_number from VIN if not provided
        # Copy, don't alias -- mutating request.attributes in place below
        # would silently mutate the caller's own dict (a shared mutable
        # object), since `x or {}` returns the SAME dict when non-empty.
        attrs: dict[str, object] = dict(request.attributes) if request.attributes else {}
        vin_str = attrs.get("vin")
        if isinstance(vin_str, str) and len(vin_str) >= 6 and "stock_number" not in attrs:
            attrs["stock_number"] = vin_str[-6:].upper()

        # 1d. Resolve `internal_code` ONLY for vehicle categories — the
        # field is a vehicle-only concern (see migration
        # 20260927_0001_move_vehicle_code_to_attributes_jsonb, renamed
        # from `vehicle_code` in 20261002_0001). For non-vehicle
        # categories the category's `attribute_schema` doesn't declare
        # `internal_code`, so this entire block is a no-op (no
        # allocation, no validation, no insert). For vehicle categories
        # the schema declares it as required, so we allocate/reserve
        # before `category.validate_attributes` runs — the validator
        # would otherwise reject a create that hadn't populated
        # `attributes["internal_code"]` yet.
        category_declares_internal_code = (
            isinstance(category.attribute_schema, dict)
            and "internal_code" in category.attribute_schema
        )
        if category_declares_internal_code:
            existing_code_raw = attrs.get("internal_code")
            if existing_code_raw is not None and self._internal_code_allocator is not None:
                try:
                    existing_code_int = int(str(existing_code_raw))
                except (TypeError, ValueError) as exc:
                    # A non-numeric value is a validation failure, not a
                    # collision — raising DuplicateInternalCodeError(0)
                    # here would misreport it as "code 0 already in use"
                    # (GGA finding).
                    raise ValueError(
                        f"attributes['internal_code'] must be a valid integer, "
                        f"got {existing_code_raw!r}"
                    ) from exc
                await self._internal_code_allocator.reserve(existing_code_int)
                # Store as JSONB native int (not text) so the category's
                # `attribute_schema` validator — which checks
                # `isinstance(value, (int, float))` for "number" type —
                # passes. The partial functional unique index on
                # `attributes->>'internal_code'` extracts the int as
                # text for the comparison, so the uniqueness invariant
                # still holds.
                attrs["internal_code"] = existing_code_int
            elif "internal_code" not in attrs and self._internal_code_allocator is not None:
                allocated = await self._internal_code_allocator.allocate_next()
                attrs["internal_code"] = allocated

        # 1b. Validate attributes against category schema — runs AFTER
        # internal_code resolution so the persisted value is the one we
        # validated. (Raises ValueError on type/required mismatch.)
        category.validate_attributes(attrs)

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
        normalized_image_urls = [sanitize_storage_key(k) for k in (request.image_urls or [])]
        normalized_cover = (
            sanitize_storage_key(request.cover_image_key) if request.cover_image_key else None
        )
        normalized_thumb = (
            sanitize_storage_key(request.thumbnail_image_key)
            if request.thumbnail_image_key
            else None
        )

        # 2d. Resolve `internal_code` inside `attributes`:
        #   * caller already put one in attrs — coerce to int (so we can
        #     pass to the allocator's reserve() which expects an int) and
        #     validate uniqueness against `attributes->>'internal_code'`
        #     on any other row, raising `DuplicateInternalCodeError` if a
        #     collision is found;
        #   * caller did not supply one AND an allocator is wired —
        #     allocate via `nextval` (atomic) and stuff the result into
        #     `attributes["internal_code"]` as text, matching the JSONB
        #     storage shape;
        #   * allocator not wired (legacy test fixtures) — leave
        #     `attributes["internal_code"]` unset, row has no code.
        # (Allocation / reservation ran earlier — see the `1d. Resolve
        # internal_code` block before the schema validation pass. The
        # attrs dict already carries the canonical text value at this
        # point.)

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
            attributes=attrs,
            image_urls=normalized_image_urls,
            cover_image_key=normalized_cover,
            thumbnail_image_key=normalized_thumb,
            location_city=request.location_city,
            location_state=request.location_state,
            location_zip=request.location_zip,
        )

        # 4. Persist
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)

    # The legacy `_reserve_internal_code_or_raise` helper that wrapped
    # `reserve()` plus a None check is no longer needed: the resolution
    # happens inline above, and the allocator itself handles the
    # collision check.
