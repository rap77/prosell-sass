"""add organization_invitations table

Revision ID: b4252cdd1c48
Revises: products_mkt_published_20260619
Create Date: 2026-06-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b4252cdd1c48"
down_revision: str | Sequence[str] | None = "products_mkt_published_20260619"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("accepted_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default="now()", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default="now()",
            onupdate="now()",
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )

    op.create_index(
        op.f("ix_organization_invitations_organization_id"),
        "organization_invitations",
        ["organization_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_organization_invitations_tenant_id"),
        "organization_invitations",
        ["tenant_id"],
        unique=False,
        if_not_exists=True,
    )
    # Partial unique index: only one PENDING invitation per (org, email) at a
    # time — stricter than team_invitations, which has no such constraint.
    op.create_index(
        "ux_organization_invitations_org_email_pending",
        "organization_invitations",
        ["organization_id", "email"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index(
        "ux_organization_invitations_org_email_pending", table_name="organization_invitations"
    )
    op.drop_index(
        op.f("ix_organization_invitations_tenant_id"), table_name="organization_invitations"
    )
    op.drop_index(
        op.f("ix_organization_invitations_organization_id"), table_name="organization_invitations"
    )
    op.drop_table("organization_invitations")
