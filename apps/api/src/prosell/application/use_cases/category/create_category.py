"""Create category use case."""

from prosell.application.dto.category import CategoryResponse, CreateCategoryRequest
from prosell.domain.entities.category import Category
from prosell.domain.exceptions.category_exceptions import CategoryAlreadyExistsError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class CreateCategoryUseCase:
    """Create a new category."""

    def __init__(self, category_repository: AbstractCategoryRepository) -> None:
        self.category_repository = category_repository

    async def execute(self, request: CreateCategoryRequest) -> CategoryResponse:
        """
        Execute category creation.

        Args:
            request: CreateCategoryRequest DTO

        Returns:
            CategoryResponse DTO

        Raises:
            CategoryAlreadyExistsError: If category with name/slug already exists
            ValueError: If parent_id creates circular reference
        """
        # The category taxonomy is a GLOBAL, platform-managed template tree
        # (Plan 2): every category is created global (tenant_id IS NULL). Any
        # tenant_id on the request is ignored. The router gates this to the
        # ProSell super_admin.
        global_scope: None = None

        # 1. Check uniqueness by name within parent (global scope)
        exists = await self.category_repository.exists_by_name(
            request.name,
            global_scope,
            request.parent_id,
        )
        if exists:
            raise CategoryAlreadyExistsError(request.name)

        # 2. Check slug uniqueness (global scope)
        slug_exists = await self.category_repository.exists_by_slug(request.slug, global_scope)
        if slug_exists:
            raise ValueError(f"Category with slug '{request.slug}' already exists")

        # 3. Determine level and validate circular reference
        level = 0
        if request.parent_id:
            parent = await self.category_repository.get_by_id_any_tenant(request.parent_id)
            if parent:
                level = parent.level + 1

                # Get the PARENT's ancestors for circular-reference validation.
                # The check flags `parent_id in ancestors`, so we must pass the
                # parent's ancestors WITHOUT the parent itself — otherwise every
                # child would be falsely rejected as circular.
                ancestor_ids = await self.category_repository.get_ancestor_ids(
                    request.parent_id, global_scope
                )

                # Create a temporary category object to validate
                temp_category = Category.create(
                    name=request.name,
                    slug=request.slug,
                    tenant_id=global_scope,
                    parent_id=request.parent_id,
                    level=level,
                )
                temp_category.validate_no_circular_reference(request.parent_id, ancestor_ids)
            else:
                raise ValueError(f"Parent category not found: {request.parent_id}")

        # 4. Create category entity (global)
        category = Category.create(
            name=request.name,
            slug=request.slug,
            tenant_id=global_scope,
            parent_id=request.parent_id,
            level=level,
            description=request.description,
            icon=request.icon,
            image_url=request.image_url,
            sort_order=request.sort_order,
            is_active=request.is_active,
            attribute_schema=request.attribute_schema,
        )

        # Add field config if provided
        if request.field_config:
            for field in request.field_config:
                category.add_field(field)

        # 5. Persist
        category = await self.category_repository.create(category)

        return CategoryResponse.from_entity(category)
