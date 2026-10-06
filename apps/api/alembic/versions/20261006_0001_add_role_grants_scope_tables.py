"""Add role_grants, role_scope, role_organization_access tables; relax
roles.role_type to allow custom (non-system) profiles.

Reuses the existing `roles` + `user_roles` tables as the permission-profile
and user-assignment entities instead of introducing parallel
`permission_profiles`/`user_profile_assignments` tables — `roles.tenant_id`
is already nullable (global vs per-org), `is_system_role` already
distinguishes built-in from custom, and `user_roles` already supports a user
holding multiple roles with union-of-permissions semantics
(`User.has_permission()` already iterates `self.roles`). Only the
zone/action grant matrix and the data-visibility scope are genuinely new
concepts — see docs/canonical/rbac-security-profiles-diagnostic-2026-10-05.md
§6 for the full design and this refinement.

This migration only prepares the schema (DB-level constraint relaxation +
new tables). It deliberately does NOT touch `Role`/`RoleType` domain code
or `create_custom_role()` — that is the next workbook item
("Migrar los 6 roles fijos actuales a perfiles-plantilla").

Revision ID: 20261006_0001
Revises: 20261002_0001
Create Date: 2026-10-06
"""

import sqlalchemy as sa
from alembic import op

revision = "20261006_0001"
down_revision = "20261002_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Relax roles.role_type: nullable + partial unique index -----------
    # Today it's a plain UNIQUE NOT NULL column, which is why
    # create_custom_role() must hardcode role_type=VIEWER (§1.3 of the
    # diagnostic) — a second custom role would violate the constraint.
    # Custom (non-system) profiles will get role_type=NULL; the 6 built-in
    # system role types stay unique among themselves via the partial index.
    op.drop_constraint("roles_role_type_key", "roles", type_="unique")
    op.alter_column("roles", "role_type", existing_type=sa.String(50), nullable=True)
    op.create_index(
        "ix_roles_role_type_unique_when_present",
        "roles",
        ["role_type"],
        unique=True,
        postgresql_where=sa.text("role_type IS NOT NULL"),
    )

    # --- role_grants: the zone x action matrix, one role -> many grants ---
    op.create_table(
        "role_grants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("role_id", sa.UUID(), nullable=False),
        sa.Column("zone", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("role_id", "zone", "action", name="uq_role_grants_role_zone_action"),
    )
    op.create_index("ix_role_grants_role_id", "role_grants", ["role_id"])

    # --- role_scope: one row per role, which visibility mode applies ------
    op.create_table(
        "role_scope",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("role_id", sa.UUID(), nullable=False),
        sa.Column("scope_type", sa.String(20), nullable=False),
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
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("role_id", name="uq_role_scope_role_id"),
        sa.CheckConstraint(
            "scope_type IN ('own', 'explicit', 'all')", name="ck_role_scope_scope_type"
        ),
    )

    # --- role_organization_access: only populated when scope_type='explicit'
    op.create_table(
        "role_organization_access",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("role_id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("role_id", "organization_id", name="uq_role_org_access_role_org"),
    )
    op.create_index("ix_role_organization_access_role_id", "role_organization_access", ["role_id"])


def downgrade() -> None:
    op.drop_index("ix_role_organization_access_role_id")
    op.drop_table("role_organization_access")
    op.drop_table("role_scope")
    op.drop_index("ix_role_grants_role_id")
    op.drop_table("role_grants")

    op.drop_index("ix_roles_role_type_unique_when_present")
    op.alter_column("roles", "role_type", existing_type=sa.String(50), nullable=False)
    op.create_unique_constraint("roles_role_type_key", "roles", ["role_type"])
