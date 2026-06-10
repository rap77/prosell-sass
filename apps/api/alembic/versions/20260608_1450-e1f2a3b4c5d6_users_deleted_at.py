"""users.deleted_at — soft-delete audit trail

GAP-5 finding: UserRepositoryImpl.delete() previously conflated two
distinct domain events by setting `status = SUSPENDED`:

  - admin "suspend" (temporary block on an active account)
  - tenant "delete" (intentional removal with audit trail)

The two operations differ in intent and audit semantics. The proper
soft-delete contract is a `deleted_at` column: nullable, tz-aware, and
distinct from `status`. `User.is_deleted()` is the new application-layer
gate, and `User.delete()` is the domain method that stamps the column.

The column is indexed because listing queries (e.g. `list_with_pagination`)
will start filtering by `deleted_at IS NULL` to exclude soft-deleted users
from default views.

Revision ID: users_deleted_at_20260608
Revises: perf_idx_20260608
Create Date: 2026-06-08 14:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "users_deleted_at_20260608"
down_revision: str | Sequence[str] | None = "perf_idx_20260608"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_users_deleted_at",
        "users",
        ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_column("users", "deleted_at")
