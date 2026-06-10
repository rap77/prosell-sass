"""branches.settings text/json -> jsonb NOT NULL

The DB column was created as `json NOT NULL` (no default), but the ORM
declared it `Text, nullable=True`. The repository compounded the drift
by writing `NULL` for an empty settings dict into a NOT NULL column.
This aligns DB + ORM on `JSONB NOT NULL DEFAULT '{}'` (jsonb is
indexable/dedup'd and lets SQLAlchemy round-trip a dict directly).

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-06-08 14:10:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "b8c9d0e1f2a3"
down_revision: str | Sequence[str] | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Backfill any NULLs before tightening (defensive — column is already
    # NOT NULL today, but downgrades could have loosened it).
    op.execute("UPDATE branches SET settings = '{}'::json WHERE settings IS NULL")
    op.execute("ALTER TABLE branches ALTER COLUMN settings TYPE JSONB USING settings::jsonb")
    op.execute("ALTER TABLE branches ALTER COLUMN settings SET DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE branches ALTER COLUMN settings SET NOT NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE branches ALTER COLUMN settings DROP DEFAULT")
    op.execute("ALTER TABLE branches ALTER COLUMN settings TYPE JSON USING settings::json")
