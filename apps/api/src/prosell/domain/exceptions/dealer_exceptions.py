"""Dealer domain exceptions."""

from uuid import UUID


class DealerNotFoundError(Exception):
    """Raised when a dealer is not found."""

    def __init__(self, dealer_id: UUID):
        self.dealer_id = dealer_id
        super().__init__(f"Dealer not found: {dealer_id}")


class SlugNotUniqueError(Exception):
    """Raised when a slug already exists for a tenant."""

    def __init__(self, slug: str, tenant_id: UUID):
        self.slug = slug
        self.tenant_id = tenant_id
        super().__init__(f"Slug already exists: {slug} for tenant {tenant_id}")
