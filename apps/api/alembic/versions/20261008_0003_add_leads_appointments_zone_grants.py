"""Add leads and appointments zone grants for system roles.

Extends the permission engine (diagnostic doc §6) with two new zones:
- leads: create, read, update, delete
- appointments: create, read, update, delete

Mirrors the existing zone granularity (permission domains 1:1) — NOT the
6 UI-navigation zones from diagnostic doc §3.1(1). The UI-section grouping
is a display concern for the admin UI (block 3), not an authorization-
granularity concern here.

Scope mapping follows the existing ROLE_SCOPE defaults (super_admin/admin=all,
others=own). Within-tenant visibility (vendedor sees own, manager sees all)
remains enforced in the use case/repository layer, same as catalog/products.

Revision ID: 20261008_0003
Revises: 20261008_0002
Create Date: 2026-10-08
"""

import sqlalchemy as sa
from alembic import op

revision = "20261008_0003"
down_revision = "20261008_0002"
branch_labels = None
depends_on = None

# New zone grants for leads and appointments.
# Mirrors the existing pattern: super_admin gets everything, admin gets most,
# manager gets CRUD, sales_agent gets CRU (no delete), sales_user/viewer get R.
LEADS_GRANTS: dict[str, list[tuple[str, str]]] = {
    "super_admin": [
        ("leads", "create"),
        ("leads", "read"),
        ("leads", "update"),
        ("leads", "delete"),
    ],
    "admin": [
        ("leads", "create"),
        ("leads", "read"),
        ("leads", "update"),
        ("leads", "delete"),
    ],
    "manager": [
        ("leads", "create"),
        ("leads", "read"),
        ("leads", "update"),
        ("leads", "delete"),
    ],
    "sales_agent": [
        ("leads", "create"),
        ("leads", "read"),
        ("leads", "update"),
    ],
    "sales_user": [
        ("leads", "read"),
    ],
    "viewer": [
        ("leads", "read"),
    ],
}

APPOINTMENTS_GRANTS: dict[str, list[tuple[str, str]]] = {
    "super_admin": [
        ("appointments", "create"),
        ("appointments", "read"),
        ("appointments", "update"),
        ("appointments", "delete"),
    ],
    "admin": [
        ("appointments", "create"),
        ("appointments", "read"),
        ("appointments", "update"),
        ("appointments", "delete"),
    ],
    "manager": [
        ("appointments", "create"),
        ("appointments", "read"),
        ("appointments", "update"),
        ("appointments", "delete"),
    ],
    "sales_agent": [
        ("appointments", "create"),
        ("appointments", "read"),
        ("appointments", "update"),
    ],
    "sales_user": [
        ("appointments", "read"),
    ],
    "viewer": [
        ("appointments", "read"),
    ],
}

# Combined grants for convenience in upgrade/downgrade
ALL_NEW_GRANTS: dict[str, list[tuple[str, str]]] = {}
for role_type in LEADS_GRANTS:
    ALL_NEW_GRANTS[role_type] = LEADS_GRANTS[role_type] + APPOINTMENTS_GRANTS[role_type]


def upgrade() -> None:
    connection = op.get_bind()

    for role_type, grants in ALL_NEW_GRANTS.items():
        role_id = connection.execute(
            sa.text("SELECT id FROM roles WHERE role_type = :role_type AND is_system_role = true"),
            {"role_type": role_type},
        ).scalar_one_or_none()
        if role_id is None:
            # Skip if this system role hasn't been seeded yet
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


def downgrade() -> None:
    connection = op.get_bind()

    for role_type, grants in ALL_NEW_GRANTS.items():
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
