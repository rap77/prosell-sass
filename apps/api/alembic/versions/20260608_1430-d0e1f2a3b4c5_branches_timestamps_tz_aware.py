"""branches.created_at/updated_at -> timestamptz (tz-aware)

These two columns were the only `timestamp without time zone` columns in
the schema, while the domain (`Branch.create()`) and the rest of the
system use tz-aware datetimes. Persisting a domain-created branch raised
asyncpg DataError. Align branches with the system convention: tz-aware.
Existing naive values are interpreted as UTC.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-06-08 14:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "d0e1f2a3b4c5"
down_revision: str | Sequence[str] | None = "c9d0e1f2a3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE branches ALTER COLUMN created_at "
        "TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE branches ALTER COLUMN updated_at "
        "TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC'"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE branches ALTER COLUMN created_at "
        "TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE branches ALTER COLUMN updated_at "
        "TYPE TIMESTAMP USING updated_at AT TIME ZONE 'UTC'"
    )
