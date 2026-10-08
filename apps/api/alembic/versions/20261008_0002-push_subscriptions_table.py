"""create_push_subscriptions_table

Revision ID: 20261008_0002
Revises: 20261008_0001
Create Date: 2026-10-08 01:00:00.000000

CRM roadmap Fase 5 (deferred delivery channel, now built): one row per
browser Web Push subscription (endpoint + keys). A user can hold several
rows, one per browser/device. `endpoint` is globally unique — re-
subscribing with the same endpoint upserts rather than duplicating.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261008_0002"
down_revision: str | Sequence[str] | None = "20261008_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create push_subscriptions table."""
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh VARCHAR(255) NOT NULL,
            auth VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_push_subscriptions_tenant_id"
            " ON push_subscriptions(tenant_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id"
            " ON push_subscriptions(user_id);"
        )
    )


def downgrade() -> None:
    """Downgrade schema - Drop push_subscriptions table."""
    op.execute(sa.text("DROP INDEX IF EXISTS ix_push_subscriptions_user_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_push_subscriptions_tenant_id;"))
    op.execute(sa.text("DROP TABLE IF EXISTS push_subscriptions;"))
