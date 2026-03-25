"""Initial UUID schema — tracking existing database

Revision ID: 001
Revises:
Create Date: 2026-03-22

This migration tracks the initial UUID schema that was created via direct SQL.
All tables use UUID primary keys from the start.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Tables already exist - this migration is for tracking only."""
    pass


def downgrade() -> None:
    """Drop all tables if needed."""
    # Drop in reverse dependency order
    op.drop_table("facebook_pages")
    op.drop_table("facebook_accounts")
    op.drop_table("publications")
    op.drop_table("products")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("organizations")
    op.drop_table("sessions")
    op.drop_table("oauth_accounts")
    op.drop_table("users")
