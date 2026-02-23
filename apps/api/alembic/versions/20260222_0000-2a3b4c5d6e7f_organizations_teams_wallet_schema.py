"""Organizations, Teams and Wallet schema

Revision ID: 2a3b4c5d6e7f
Revises: d1823b89fecb
Create Date: 2026-02-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2a3b4c5d6e7f"
down_revision: str | Sequence[str] | None = "d1823b89fecb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # ========================================================================
    # ORGANIZATIONS TABLE
    # Must be created before wallets/teams (they FK to organizations.id)
    # Note: organizations.wallet_id is a plain UUID (no FK) to avoid circular
    # ========================================================================
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        # Branding
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("banner_url", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        # Verification
        sa.Column(
            "status",
            sa.String(length=50),
            server_default="pending_verification",
            nullable=False,
        ),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by", sa.String(), nullable=True),
        # Wallet ref (plain UUID - no FK to avoid circular dependency)
        sa.Column("wallet_id", sa.String(), nullable=True),
        # Settings
        sa.Column("settings", sa.JSON(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["verified_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_name"), "organizations", ["name"], unique=False)
    op.create_index(op.f("ix_organizations_tenant_id"), "organizations", ["tenant_id"], unique=True)
    op.create_index(op.f("ix_organizations_status"), "organizations", ["status"], unique=False)

    # ========================================================================
    # WALLETS TABLE
    # References organizations.id
    # ========================================================================
    op.create_table(
        "wallets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("balance_cents", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="USD", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wallets_org_id"), "wallets", ["org_id"], unique=True)
    op.create_index(op.f("ix_wallets_tenant_id"), "wallets", ["tenant_id"], unique=False)

    # ========================================================================
    # WALLET_TRANSACTIONS TABLE
    # References wallets.id
    # ========================================================================
    op.create_table(
        "wallet_transactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("wallet_id", sa.String(), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("balance_after_cents", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column(
            "metadata",
            sa.JSON(),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            index=True,
        ),
        sa.ForeignKeyConstraint(["wallet_id"], ["wallets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_wallet_transactions_wallet_id"),
        "wallet_transactions",
        ["wallet_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_wallet_transactions_tenant_id"),
        "wallet_transactions",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_wallet_transactions_created_at"),
        "wallet_transactions",
        ["created_at"],
        unique=False,
    )

    # ========================================================================
    # TEAMS TABLE
    # References organizations.id (and self-referential for parent_team_id)
    # ========================================================================
    op.create_table(
        "teams",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_team_id", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_team_id"], ["teams.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=False)
    op.create_index(op.f("ix_teams_tenant_id"), "teams", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_teams_org_id"), "teams", ["org_id"], unique=False)

    # ========================================================================
    # TEAM_MEMBERS TABLE
    # References teams.id and users.id
    # ========================================================================
    op.create_table(
        "team_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(length=50), server_default="vendor", nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("commission_rate", sa.Float(), nullable=True),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_team_members_team_id"), "team_members", ["team_id"], unique=False)
    op.create_index(op.f("ix_team_members_user_id"), "team_members", ["user_id"], unique=False)
    op.create_index(op.f("ix_team_members_tenant_id"), "team_members", ["tenant_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop in reverse dependency order
    op.drop_index(op.f("ix_team_members_tenant_id"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_user_id"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_team_id"), table_name="team_members")
    op.drop_table("team_members")

    op.drop_index(op.f("ix_teams_org_id"), table_name="teams")
    op.drop_index(op.f("ix_teams_tenant_id"), table_name="teams")
    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_table("teams")

    op.drop_index(op.f("ix_wallet_transactions_created_at"), table_name="wallet_transactions")
    op.drop_index(op.f("ix_wallet_transactions_tenant_id"), table_name="wallet_transactions")
    op.drop_index(op.f("ix_wallet_transactions_wallet_id"), table_name="wallet_transactions")
    op.drop_table("wallet_transactions")

    op.drop_index(op.f("ix_wallets_tenant_id"), table_name="wallets")
    op.drop_index(op.f("ix_wallets_org_id"), table_name="wallets")
    op.drop_table("wallets")

    op.drop_index(op.f("ix_organizations_status"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_tenant_id"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_name"), table_name="organizations")
    op.drop_table("organizations")
