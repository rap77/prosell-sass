"""global categories: tenant_id nullable + organization_vertical

Revision ID: ac4b1ad9593e
Revises: a4d7a394211c
Create Date: 2026-06-06 21:30:59.017518

Why
---
This is the schema half of Foundation Plan 2 §3.1 and §3.4: turn root
`categories` rows into global templates shared across organizations, and
introduce the M2M join table that lets an org operate in N verticals.

Concretely:

1. `categories.tenant_id` becomes NULLABLE. Up to Plan 1 every category
   belonged to exactly one tenant; a multi-tenant system had no way to
   share a "Vehicles" template across dealerships. With this migration a
   root category (level 0) can be a global template (tenant_id = NULL)
   that any org can opt into via `organization_vertical`. Tenant-scoped
   categories keep their tenant_id — only level-0 templates are expected
   to be global. The index stays: every per-tenant query still filters on
   it, and the few global rows sit in the same B-tree.

2. The new `organization_vertical` table is the M2M bridge:
   `(organization_id, root_category_id)` -> `enabled_at`. We use the
   `categories` row with `level = 0` and `tenant_id IS NULL` as the
   canonical "vertical" — the FK targets `categories.id` (not a separate
   `verticals` table) so the existing category tree, presentation
   contract, and presentation-resolver service can all reuse one source of
   truth. `enabled_at` is set by the application when an org toggles a
   vertical on; ON DELETE CASCADE on both sides means removing an org or
   a global template automatically cleans up the linkage.

Both changes ship together because the read-API
(`GET /organizations/{id}/verticals`, Task 4) and the
`OrganizationVerticalRepository` (Task 2) only make sense once both are
present. Splitting them would leave the model layer in a half-state where
the repository has nowhere to write.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "ac4b1ad9593e"
down_revision: str | Sequence[str] | None = "a4d7a394211c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Make `categories.tenant_id` nullable and create `organization_vertical`."""
    # 1. Categories: tenant_id -> NULL allowed (global templates)
    op.alter_column(
        "categories",
        "tenant_id",
        existing_type=postgresql.UUID(),
        nullable=True,
    )

    # 2. organization_vertical: M2M bridge (org <-> root category)
    op.create_table(
        "organization_vertical",
        sa.Column(
            "organization_id",
            postgresql.UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "root_category_id",
            postgresql.UUID(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "enabled_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Drop `organization_vertical` and revert `categories.tenant_id` to NOT NULL."""
    op.drop_table("organization_vertical")
    op.alter_column(
        "categories",
        "tenant_id",
        existing_type=postgresql.UUID(),
        nullable=False,
    )
