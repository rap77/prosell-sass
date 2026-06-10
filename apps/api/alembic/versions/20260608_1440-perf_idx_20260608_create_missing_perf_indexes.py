"""create performance indexes declared in ORM but missing in DB

Two composite/single indexes were declared in the ORM (`__table_args__` /
`index=True`) but never created by a migration — invisible to the
column-level schema audit:

- ix_notifications_user_tenant_read (user_id, tenant_id, is_read): backs
  the unread-notifications counter and listing (hot path).
- ix_teams_name (name): team lookup by name.

Revision ID: perf_idx_20260608
Revises: d0e1f2a3b4c5
Create Date: 2026-06-08 14:40:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "perf_idx_20260608"
down_revision: str | Sequence[str] | None = "d0e1f2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_tenant_read "
        "ON notifications (user_id, tenant_id, is_read)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_name ON teams (name)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_teams_name")
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_tenant_read")
