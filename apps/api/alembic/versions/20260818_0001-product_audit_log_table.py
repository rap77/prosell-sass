"""create_product_audit_log_table

Revision ID: 20260818_0001
Revises: 20260814_0001
Create Date: 2026-08-18 00:00:00.000000

Mirrors lead_audit_log (see 20260427_2036): an immutable, append-only trail
of product status transitions, auto-recorded by
SqlAlchemyProductRepository.update() whenever status actually changes.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260818_0001"
down_revision: str | Sequence[str] | None = "20260814_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create product_audit_log table."""
    op.execute(
        sa.text("""
        CREATE TABLE IF NOT EXISTS product_audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            old_status VARCHAR(20) NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """)
    )

    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_product_audit_log_tenant_id"
            " ON product_audit_log(tenant_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_product_audit_log_product_id"
            " ON product_audit_log(product_id);"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_product_audit_log_tenant_id_created_at"
            " ON product_audit_log(tenant_id, created_at);"
        )
    )


def downgrade() -> None:
    """Downgrade schema - Drop product_audit_log table."""
    op.execute(sa.text("DROP INDEX IF EXISTS ix_product_audit_log_tenant_id_created_at;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_product_audit_log_product_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_product_audit_log_tenant_id;"))
    op.execute(sa.text("DROP TABLE IF EXISTS product_audit_log;"))
