"""OrganizationVertical entity — M2M bridge linking an organization to a
global root vertical (a level-0 category with tenant_id=NULL).

Pure domain — no external dependencies. Each instance represents the
fact that the given organization has opted into operating within the
given vertical (e.g., Vehicles, Real Estate). The composite primary key
in the DB is (organization_id, root_category_id); `enabled_at` is
captured at the moment the link is first created and is never updated
(idempotent enable).
"""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import Field

from prosell.domain.base import DomainModel


class OrganizationVertical(DomainModel):
    """An organization's opt-in to a global root vertical category."""

    organization_id: UUID
    root_category_id: UUID
    enabled_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
