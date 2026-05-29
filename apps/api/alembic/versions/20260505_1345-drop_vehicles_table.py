"""drop_vehicles_table

Revision ID: c3schema_cleanup
Revises: 20260505_0805
Create Date: 2026-05-05 13:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3schema_cleanup"
down_revision: str | Sequence[str] | None = "20260428_1625"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop vehicles table - Phase 3 cleanup after migration to products."""
    # First, drop foreign key constraints that reference vehicles table
    # These are from leads and appointments tables
    op.drop_constraint("leads_vehicle_id_fkey", "leads", type_="foreignkey")
    op.drop_constraint("appointments_vehicle_id_fkey", "appointments", type_="foreignkey")

    # Drop the vehicles table
    # NOTE: This assumes all vehicles have been migrated to products.attributes
    # with category: "vehicle" in a previous migration step
    op.execute("DROP TABLE IF EXISTS vehicles")

    # Drop any orphaned sequences if they exist
    op.execute("DROP SEQUENCE IF EXISTS vehicles_id_seq CASCADE")


def downgrade() -> None:
    """Recreate vehicles table for rollback purposes."""
    # Recreate the vehicles table
    op.create_table(
        "vehicles",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "tenant_id",
            sa.UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "organization_id",
            sa.UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "dealer_id",
            sa.UUID(),
            sa.ForeignKey("user_dealers.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("vin", sa.String(17), nullable=False, unique=True, index=True),
        sa.Column("make", sa.String(100), nullable=False, index=True),
        sa.Column("model", sa.String(100), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("trim", sa.String(100), nullable=True),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), server_default="available", nullable=False, index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
    )

    # Create indexes
    op.create_index("ix_vehicles_tenant_id", "vehicles", ["tenant_id"], if_not_exists=True)
    op.create_index(
        "ix_vehicles_organization_id", "vehicles", ["organization_id"], if_not_exists=True
    )
    op.create_index("ix_vehicles_dealer_id", "vehicles", ["dealer_id"], if_not_exists=True)
    op.create_index("ix_vehicles_vin", "vehicles", ["vin"], unique=True, if_not_exists=True)
    op.create_index("ix_vehicles_make", "vehicles", ["make"], if_not_exists=True)
    op.create_index("ix_vehicles_model", "vehicles", ["model"], if_not_exists=True)
    op.create_index("ix_vehicles_status", "vehicles", ["status"], if_not_exists=True)

    # Recreate foreign key constraints
    op.create_foreign_key(
        "leads_vehicle_id_fkey", "leads", "vehicles", ["vehicle_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "appointments_vehicle_id_fkey",
        "appointments",
        "vehicles",
        ["vehicle_id"],
        ["id"],
        ondelete="SET NULL",
    )
