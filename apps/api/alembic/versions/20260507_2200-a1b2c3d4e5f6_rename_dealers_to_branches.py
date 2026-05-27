"""rename dealers to branches

Revision ID: a1b2c3d4e5f6
Revises: b53d13201dcb
Create Date: 2026-05-07 22:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Rename dealers → branches
    op.rename_table("dealers", "branches")
    # Rename user_dealers → user_branches
    op.rename_table("user_dealers", "user_branches")
    # Update FK index names
    op.execute("ALTER INDEX IF EXISTS ix_dealers_tenant_slug RENAME TO ix_branches_tenant_slug")
    op.execute(
        "ALTER INDEX IF EXISTS ix_user_dealers_user_dealer RENAME TO ix_user_branches_user_branch"
    )
    op.execute("ALTER INDEX IF EXISTS ix_user_dealers_tenant RENAME TO ix_user_branches_tenant")


def downgrade() -> None:
    op.rename_table("branches", "dealers")
    op.rename_table("user_branches", "user_dealers")
    op.execute("ALTER INDEX IF EXISTS ix_branches_tenant_slug RENAME TO ix_dealers_tenant_slug")
    op.execute(
        "ALTER INDEX IF EXISTS ix_user_branches_user_branch RENAME TO ix_user_dealers_user_dealer"
    )
    op.execute("ALTER INDEX IF EXISTS ix_user_branches_tenant RENAME TO ix_user_dealers_tenant")
