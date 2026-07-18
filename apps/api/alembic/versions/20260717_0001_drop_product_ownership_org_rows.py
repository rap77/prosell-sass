"""Drop product_ownership rows with owner_type='organization'.

Revision ID: 20260717_0001
Revises: 20260714_0001
Create Date: 2026-07-17

Cascade part of PROP-001 (tenant cascade):

products.organization_id becomes the single source of truth for who owns
a product. Until this migration, the same intent was duplicated by rows
in product_ownership with owner_type='organization'. Those rows are no
longer needed and were the source of the "ownership change did not
persist" bug in the product edit form (the card rendered owner_org_code
from this table while the form saved here too, and when it diverged
from products.organization_id, the tag displayed the stale value).

This migration:
  1. Defensive backfill: if any product has products.organization_id NULL,
     copy it from the matching product_ownership org row (it would only be
     NULL if it was added in an exotic way; current schema requires it).
  2. DELETE FROM product_ownership WHERE owner_type = 'organization'.

product_ownership rows with owner_type='user' (broker splits) are preserved.

Downgrade note: data loss is expected on downgrade. Take a backup before
running this in production: pg_dump product_ownership and inspect the
`WHERE owner_type = 'organization'` rows. To rebuild from a backup, restore
that subset manually.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0001"
down_revision: str | Sequence[str] | None = "20260714_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Defensive backfill: ensure every product has organization_id.
    #    If a product slipped through with NULL, fall back to the most recent
    #    org row in product_ownership. If there is none either, leave it
    #    NULL and the database will surface the constraint violation on the
    #    next write so the operator can fix it explicitly.
    bind.execute(
        sa.text(
            """
            UPDATE products p
            SET organization_id = po.owner_id
            FROM (
                SELECT DISTINCT ON (product_id) product_id, owner_id
                FROM product_ownership
                WHERE owner_type = 'organization'
                ORDER BY product_id, created_at DESC
            ) po
            WHERE p.id = po.product_id
              AND p.organization_id IS NULL
            """
        )
    )

    # 2. Drop the org rows. The user (broker) rows are kept intact.
    bind.execute(sa.text("DELETE FROM product_ownership WHERE owner_type = 'organization'"))


def downgrade() -> None:
    # Data migration. Restoring requires a backup; this is documented in the
    # module docstring. We do not recreate the rows automatically because we
    # have no authoritative source for the original owner_id.
    raise NotImplementedError(
        "Downgrade is not supported for the tenant cascade migration. "
        "Restore product_ownership rows of owner_type='organization' from "
        "a backup if needed."
    )
