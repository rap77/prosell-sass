"""appointments.product_id: recreate FK + rename legacy index

`drop_vehicles_table` dropped `appointments_vehicle_id_fkey` and
`rename_vehicle_id_to_product_id` renamed the column but never recreated
the FK nor renamed the index. The ORM declares a FK to products(id), so
the DB was left without referential integrity and with a stale index
name (`ix_appointments_vehicle_id`).

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-08 14:20:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | Sequence[str] | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'appointments_product_id_fkey'
            ) THEN
                ALTER TABLE appointments
                    ADD CONSTRAINT appointments_product_id_fkey
                    FOREIGN KEY (product_id) REFERENCES products(id)
                    ON DELETE CASCADE;
            END IF;
        END $$;
        """
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_appointments_vehicle_id RENAME TO ix_appointments_product_id"
    )


def downgrade() -> None:
    op.execute(
        "ALTER INDEX IF EXISTS ix_appointments_product_id RENAME TO ix_appointments_vehicle_id"
    )
    op.execute("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_product_id_fkey")
