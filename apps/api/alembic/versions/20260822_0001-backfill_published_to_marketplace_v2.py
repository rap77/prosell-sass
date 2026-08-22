"""Backfill published_to_marketplace for all previously-approved products

The first backfill (20260821_0001) only repaired products currently
status='published'. A product approved before the marketplace-publish
fusion fix, then later paused/reserved/sold/archived, still has
published_to_marketplace=false with no remaining repair path — PATCH is
closed and the manual UI toggle is gone. This widens the predicate to
every product that was ever approved (approved_at IS NOT NULL), regardless
of current status.

See docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md.

Revision ID: 20260822_0001
Revises: 20260821_0001
Create Date: 2026-08-22 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_0001"
down_revision: str | Sequence[str] | None = "20260821_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE products "
            "SET published_to_marketplace = true "
            "WHERE published_to_marketplace = false AND approved_at IS NOT NULL"
        )
    )


def downgrade() -> None:
    # Irreversible by design, same rationale as 20260821_0001: cannot
    # distinguish backfilled rows from later legitimate approve() writes.
    pass
