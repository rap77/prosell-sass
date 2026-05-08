"""Branch domain exceptions."""

from uuid import UUID


class BranchNotFoundError(Exception):
    """Raised when a branch is not found."""

    def __init__(self, branch_id: UUID):
        self.branch_id = branch_id
        super().__init__(f"Branch not found: {branch_id}")


class SlugNotUniqueError(Exception):
    """Raised when a slug already exists for a tenant."""

    def __init__(self, slug: str, tenant_id: UUID):
        self.slug = slug
        self.tenant_id = tenant_id
        super().__init__(f"Slug already exists: {slug} for tenant {tenant_id}")
