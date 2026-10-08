"""create_lead_activities_table

Revision ID: 20261008_0001
Revises: 20261007_0001
Create Date: 2026-10-08 00:00:00.000000

CRM roadmap Fase 4 ("Twenty concept: Activities"). Mirrors lead_audit_log
(see 20260427_2036) and product_audit_log (20260818_0001): an append-only
table, but unlike those two this one is NOT auto-recorded by the
repository on a status change — it's a manual note/call entry an agent
or manager adds by hand via POST /leads/{id}/activities.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261008_0001"
down_revision: str | Sequence[str] | None = "20261007_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create lead_activities table."""
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS lead_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_lead_activities_tenant_id ON lead_activities(tenant_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_lead_activities_lead_id ON lead_activities(lead_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_lead_activities_tenant_id_created_at"
            " ON lead_activities(tenant_id, created_at);"
        )
    )


def downgrade() -> None:
    """Downgrade schema - Drop lead_activities table."""
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_activities_tenant_id_created_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_activities_lead_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_activities_tenant_id;"))
    op.execute(sa.text("DROP TABLE IF EXISTS lead_activities;"))
