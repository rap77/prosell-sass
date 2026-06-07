"""add category presentation

Revision ID: a4d7a394211c
Revises: add_cover_image_key
Create Date: 2026-06-06 20:30:10.766918

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a4d7a394211c'
down_revision: Union[str, Sequence[str], None] = 'add_cover_image_key'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the nullable `presentation` JSONB column to categories."""
    op.add_column(
        "categories",
        sa.Column("presentation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    """Drop the `presentation` column."""
    op.drop_column("categories", "presentation")
