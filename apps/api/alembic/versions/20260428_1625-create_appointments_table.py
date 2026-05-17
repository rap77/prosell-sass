"""create_appointments_table

Revision ID: 20260428_1625
Revises: 20260427_2036
Create Date: 2026-04-28 16:25:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260428_1625"
down_revision: str | Sequence[str] | None = "20260427_2036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create appointments table."""

    # =========================================================================
    # APPOINTMENTS TABLE
    # =========================================================================
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            dealer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            scheduled_at TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT 'scheduled' NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    # Multi-tenant indexes (A4.6 requirement)
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_tenant_id ON appointments(tenant_id);")
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_appointments_tenant_id_dealer_id ON appointments(tenant_id, dealer_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_appointments_tenant_id_dealer_id_scheduled_at ON appointments(tenant_id, dealer_id, scheduled_at);"
        )
    )

    # Additional indexes for common queries
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_lead_id ON appointments(lead_id);")
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_appointments_vehicle_id ON appointments(vehicle_id);"
        )
    )
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments(status);")
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_appointments_scheduled_at ON appointments(scheduled_at);"
        )
    )


def downgrade() -> None:
    """Downgrade schema - Drop appointments table."""

    # Drop indexes
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_scheduled_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_status;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_vehicle_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_lead_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_tenant_id_dealer_id_scheduled_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_tenant_id_dealer_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_appointments_tenant_id;"))

    # Drop table
    op.execute(sa.text("DROP TABLE IF EXISTS appointments;"))
