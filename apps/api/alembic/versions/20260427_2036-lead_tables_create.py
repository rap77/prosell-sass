"""create_leads_and_lead_audit_log_tables

Revision ID: 20260427_2036
Revises:
Create Date: 2026-04-27 20:36:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260427_2036"
down_revision: str | Sequence[str] | None = "c3schema001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create leads and lead_audit_log tables."""

    # =========================================================================
    # LEADS TABLE
    # =========================================================================
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            buyer_name VARCHAR(255) NOT NULL,
            buyer_email VARCHAR(255),
            buyer_phone VARCHAR(50),
            vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
            vendedor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            message TEXT,
            source VARCHAR(50) DEFAULT 'manual' NOT NULL,
            status VARCHAR(20) DEFAULT 'new' NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    # Multi-tenant indexes
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_leads_tenant_id ON leads(tenant_id);"))
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_leads_tenant_id_status ON leads(tenant_id, status);")
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_leads_tenant_id_created_at ON leads(tenant_id, created_at DESC);"
        )
    )
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_leads_vendedor_id ON leads(vendedor_id);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_leads_vehicle_id ON leads(vehicle_id);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_leads_status ON leads(status);"))

    # =========================================================================
    # LEAD AUDIT LOG TABLE
    # =========================================================================
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS lead_audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            old_status VARCHAR(20) NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    # Multi-tenant indexes
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_lead_audit_log_tenant_id ON lead_audit_log(tenant_id);"
        )
    )
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_lead_audit_log_lead_id ON lead_audit_log(lead_id);")
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_lead_audit_log_tenant_id_created_at ON lead_audit_log(tenant_id, created_at DESC);"
        )
    )


def downgrade() -> None:
    """Downgrade schema - Drop leads and lead_audit_log tables."""
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_audit_log_tenant_id_created_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_audit_log_lead_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_lead_audit_log_tenant_id;"))
    op.execute(sa.text("DROP TABLE IF EXISTS lead_audit_log;"))

    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_status;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_vehicle_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_vendedor_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_tenant_id_created_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_tenant_id_status;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_leads_tenant_id;"))
    op.execute(sa.text("DROP TABLE IF EXISTS leads;"))
