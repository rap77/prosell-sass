"""Add fb_accounts and fb_account_groups tables.

Revision ID: 20260729_0001
Revises: 20260728_0001
Create Date: 2026-07-29
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260729_0001"
down_revision = "20260728_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM for group categories
    fb_group_category = postgresql.ENUM(
        "vehicles",
        "general",
        "real_estate",
        "electronics",
        "other",
        name="fb_group_category",
        create_type=True,
    )
    fb_group_category.create(op.get_bind(), checkfirst=True)

    # fb_accounts: stores bot login credentials (encrypted)
    op.create_table(
        "fb_accounts",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("broker_id", sa.UUID(), nullable=True),  # vendedor owner
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("alias", sa.String(100), nullable=True),
        sa.Column("password_encrypted", sa.LargeBinary(), nullable=False),
        sa.Column("browser", sa.String(20), nullable=False, server_default="chrome"),
        sa.Column("language", sa.String(10), nullable=False, server_default="es"),
        sa.Column("time_to_sleep", sa.Numeric(3, 1), nullable=False, server_default="0.7"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_error_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_publications", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_failures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["broker_id"], ["organization_brokers.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_fb_accounts_tenant_email"),
    )
    op.create_index("ix_fb_accounts_tenant_id", "fb_accounts", ["tenant_id"])
    op.create_index("ix_fb_accounts_status", "fb_accounts", ["status"])
    op.create_index("ix_fb_accounts_broker_id", "fb_accounts", ["broker_id"])

    # fb_account_groups: groups per account
    op.create_table(
        "fb_account_groups",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("fb_account_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("fb_group_id", sa.String(50), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column(
            "category",
            postgresql.ENUM(
                "vehicles",
                "general",
                "real_estate",
                "electronics",
                "other",
                name="fb_group_category",
                create_type=False,
            ),
            nullable=False,
            server_default="general",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("total_posts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_post_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["fb_account_id"], ["fb_accounts.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("fb_account_id", "position", name="uq_fb_account_groups_position"),
    )
    op.create_index("ix_fb_account_groups_fb_account_id", "fb_account_groups", ["fb_account_id"])
    op.create_index("ix_fb_account_groups_category", "fb_account_groups", ["category"])


def downgrade() -> None:
    op.drop_index("ix_fb_account_groups_category")
    op.drop_index("ix_fb_account_groups_fb_account_id")
    op.drop_table("fb_account_groups")

    op.drop_index("ix_fb_accounts_broker_id")
    op.drop_index("ix_fb_accounts_status")
    op.drop_index("ix_fb_accounts_tenant_id")
    op.drop_table("fb_accounts")

    # Drop ENUM
    postgresql.ENUM(name="fb_group_category").drop(op.get_bind(), checkfirst=True)
