"""Backfill published_to_marketplace for already-approved products

Marketplace-publish fusion (2026-08-21): approve() now sets
published_to_marketplace=True automatically, but products approved before
this change are stuck at the old default (False) with no way to fix them
from the UI anymore (the manual PATCH path was removed in the same change).
This is a one-time repair so existing inventory isn't orphaned.

See docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md.

Revision ID: 20260821_0001
Revises: 20260818_0002
Create Date: 2026-08-21 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260821_0001"
down_revision: str | Sequence[str] | None = "20260818_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE products "
            "SET published_to_marketplace = true "
            "WHERE status = 'published' AND published_to_marketplace = false"
        )
    )


def downgrade() -> None:
    # Irreversible by design: we cannot distinguish products that were
    # backfilled here from ones a user later legitimately re-toggled true
    # via approve(). No-op downgrade, same pattern as other data-only
    # migrations in this codebase.
    pass
