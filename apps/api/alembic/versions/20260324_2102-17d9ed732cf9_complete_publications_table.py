"""complete_publications_table

Revision ID: 17d9ed732cf9
Revises: 83586f56fb82
Create Date: 2026-03-24 21:02:36.794452

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "17d9ed732cf9"
down_revision: str | Sequence[str] | None = "83586f56fb82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create publications table with all columns."""
    # Create publications table first (without FKs)
    op.execute("""
        CREATE TABLE IF NOT EXISTS publications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vehicle_id UUID NOT NULL,
            seller_user_id UUID,
            facebook_page_id UUID,
            strategy_used VARCHAR(50),
            engine_version VARCHAR(100),
            title VARCHAR(500) NOT NULL,
            description TEXT,
            price_cents INTEGER NOT NULL,
            zip_code VARCHAR(20) NOT NULL,
            image_urls JSON NOT NULL DEFAULT '[]',
            hero_shot_url VARCHAR(500),
            published_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            sold_at TIMESTAMPTZ,
            error_category VARCHAR(50),
            error_message TEXT,
            error_detail TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_retry_at TIMESTAMPTZ,
            blocked_until_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        )
    """)

    # Create indexes for performance
    op.create_index("ix_publications_seller_user_id", "publications", ["seller_user_id"])
    op.create_index("ix_publications_facebook_page_id", "publications", ["facebook_page_id"])
    op.create_index("ix_publications_expires_at", "publications", ["expires_at"])

    # Create foreign key to users table (AFTER creating table)
    op.create_foreign_key(
        "publications_seller_user_id_fkey",
        "publications",
        "users",
        ["seller_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema - Drop publications table."""
    # Drop indexes
    op.drop_index("ix_publications_expires_at", "publications")
    op.drop_index("ix_publications_facebook_page_id", "publications")
    op.drop_index("ix_publications_seller_user_id", "publications")

    # Drop foreign key
    op.drop_constraint("publications_seller_user_id_fkey", "publications", type_="foreignkey")

    # Drop table
    op.execute("DROP TABLE IF EXISTS publications CASCADE")
