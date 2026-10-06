"""Seed role_grants/role_scope for the 6 RoleType-enum system roles.

Translates the static `ROLE_PERMISSIONS` dict (`domain/entities/role.py`,
as of this migration's writing — a frozen snapshot, not a live import;
Alembic migrations must not depend on mutable application code) into real
`role_grants`/`role_scope` rows, so the new engine's `has_zone_action()`
has real data instead of always empty grants. Does not change any
existing authorization behavior — nothing reads these rows yet
(`require_zone_action()` isn't wired into any router).

Zone granularity matches the OLD Permission enum's resource boundaries
1:1 (users/roles/organizations/catalog/marketplace/analytics/settings) --
NOT the 6 UI-navigation zones from diagnostic doc §3.1(1). Collapsing to
just the 6 UI sections would lose real distinctions the old system had
(e.g. "create a user" vs "create a role" would both become
`admin:create`) -- UI-section grouping is a display concern for the
admin UI (block 3), not an authorization-granularity concern here.

`Permission.ORG_ADMIN_VIEW_ALL` does NOT become a grant -- it maps to
`role_scope.scope_type`: roles that hold it (`super_admin`, `admin`) get
`all`, every other role gets `own` (the safe default).

Revision ID: 20261006_0002
Revises: 20261006_0001
Create Date: 2026-10-06

Known gap, deliberately NOT addressed here (see workbook, bloque 2):
`scripts/init_data.py` seeds a 7th role, role_type='vendedor'
("Sales Agent"), through a separate code path from the 6 official
RoleType values -- a real pre-existing bug (any user with that role_type
gets zero ROLE_PERMISSIONS today, since "vendedor" isn't a RoleType
member). This migration intentionally does NOT seed grants for it --
guessing it should equal sales_agent's grants, or deleting it, are both
product decisions this migration does not make silently.
"""

import sqlalchemy as sa
from alembic import op

revision = "20261006_0002"
down_revision = "20261006_0001"
branch_labels = None
depends_on = None

# Mirrors ROLE_PERMISSIONS in domain/entities/role.py at the time this
# migration was written. zone, action pairs -- ORG_ADMIN_VIEW_ALL is
# deliberately absent here (see module docstring).
ROLE_GRANTS: dict[str, list[tuple[str, str]]] = {
    "super_admin": [
        ("users", "create"),
        ("users", "read"),
        ("users", "update"),
        ("users", "delete"),
        ("roles", "create"),
        ("roles", "read"),
        ("roles", "update"),
        ("roles", "delete"),
        ("organizations", "create"),
        ("organizations", "read"),
        ("organizations", "update"),
        ("organizations", "delete"),
        ("catalog", "create"),
        ("catalog", "read"),
        ("catalog", "update"),
        ("catalog", "delete"),
        ("marketplace", "publish"),
        ("analytics", "view"),
        ("analytics", "export"),
        ("settings", "read"),
        ("settings", "update"),
    ],
    "admin": [
        ("users", "read"),
        ("users", "update"),
        ("organizations", "read"),
        ("organizations", "update"),
        ("catalog", "create"),
        ("catalog", "read"),
        ("catalog", "update"),
        ("catalog", "delete"),
        ("marketplace", "publish"),
        ("analytics", "view"),
        ("analytics", "export"),
        ("settings", "read"),
        ("settings", "update"),
    ],
    "manager": [
        ("users", "read"),
        ("organizations", "read"),
        ("catalog", "create"),
        ("catalog", "read"),
        ("catalog", "update"),
        ("catalog", "delete"),
        ("marketplace", "publish"),
        ("analytics", "view"),
        ("analytics", "export"),
        ("settings", "read"),
    ],
    "sales_agent": [
        ("catalog", "create"),
        ("catalog", "read"),
        ("catalog", "update"),
        ("analytics", "view"),
    ],
    "sales_user": [
        ("catalog", "read"),
        ("analytics", "view"),
    ],
    "viewer": [
        ("catalog", "read"),
        ("analytics", "view"),
    ],
}

# super_admin and admin hold ORG_ADMIN_VIEW_ALL today; everyone else gets
# the safe default.
ROLE_SCOPE: dict[str, str] = {
    "super_admin": "all",
    "admin": "all",
    "manager": "own",
    "sales_agent": "own",
    "sales_user": "own",
    "viewer": "own",
}


def upgrade() -> None:
    connection = op.get_bind()

    for role_type, grants in ROLE_GRANTS.items():
        role_id = connection.execute(
            sa.text("SELECT id FROM roles WHERE role_type = :role_type AND is_system_role = true"),
            {"role_type": role_type},
        ).scalar_one_or_none()
        if role_id is None:
            # ponytail: skip if this system role hasn't been seeded yet
            # (e.g. a fresh DB before the app's own role-seeding script runs)
            continue

        for zone, action in grants:
            connection.execute(
                sa.text(
                    "INSERT INTO role_grants (id, role_id, zone, action) "
                    "VALUES (gen_random_uuid(), :role_id, :zone, :action) "
                    "ON CONFLICT (role_id, zone, action) DO NOTHING"
                ),
                {"role_id": role_id, "zone": zone, "action": action},
            )

        connection.execute(
            sa.text(
                "INSERT INTO role_scope (id, role_id, scope_type) "
                "VALUES (gen_random_uuid(), :role_id, :scope_type) "
                "ON CONFLICT (role_id) DO NOTHING"
            ),
            {"role_id": role_id, "scope_type": ROLE_SCOPE[role_type]},
        )


def downgrade() -> None:
    connection = op.get_bind()

    for role_type, grants in ROLE_GRANTS.items():
        role_id = connection.execute(
            sa.text("SELECT id FROM roles WHERE role_type = :role_type AND is_system_role = true"),
            {"role_type": role_type},
        ).scalar_one_or_none()
        if role_id is None:
            continue

        for zone, action in grants:
            connection.execute(
                sa.text(
                    "DELETE FROM role_grants WHERE role_id = :role_id "
                    "AND zone = :zone AND action = :action"
                ),
                {"role_id": role_id, "zone": zone, "action": action},
            )

        connection.execute(
            sa.text("DELETE FROM role_scope WHERE role_id = :role_id"),
            {"role_id": role_id},
        )
