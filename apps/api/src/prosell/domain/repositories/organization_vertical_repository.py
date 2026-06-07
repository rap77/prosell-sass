"""Port for the organization_vertical M2M bridge (Plan 2 §3.4).

The repository is intentionally minimal: enable is idempotent (calling
it twice for the same (org, root) must not error) and list returns
the set of root category IDs an organization has opted into.
"""

from typing import Protocol
from uuid import UUID


class AbstractOrganizationVerticalRepository(Protocol):
    async def enable(self, organization_id: UUID, root_category_id: UUID) -> None:
        """Idempotently enable a vertical for an organization."""
        ...

    async def list_root_category_ids(self, organization_id: UUID) -> list[UUID]:
        """List root category IDs the given organization has enabled."""
        ...
