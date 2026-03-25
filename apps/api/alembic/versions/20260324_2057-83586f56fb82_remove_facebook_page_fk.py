"""remove_facebook_page_fk

Revision ID: 83586f56fb82
Revises: 20f24e79033e
Create Date: 2026-03-24 20:57:00.672840

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "83586f56fb82"
down_revision: str | Sequence[str] | None = "20f24e79033e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop foreign key constraint from publications.facebook_page_id
    # The table facebook_pages doesn't exist yet, so we remove the FK
    op.drop_constraint("publications_facebook_page_id_fkey", "publications", type_="foreignkey")


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add foreign key (when facebook_pages table exists)
    op.create_foreign_key(
        "publications_facebook_page_id_fkey",
        "publications",
        "facebook_pages",
        ["facebook_page_id"],
        ["id"],
        ondelete="SET NULL",
    )
