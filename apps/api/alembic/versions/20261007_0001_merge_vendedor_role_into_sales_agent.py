"""Merge the real-but-orphaned 'vendedor' system role into 'sales_agent'.

Bug being fixed (diagnostic §1.6 / workbook, bloque 2): `scripts/init_data.py`
seeds a 7th real system role, `role_type='vendedor'` ("Sales Agent"), through
a code path entirely separate from the 6 `RoleType` enum values. Any user
holding that role gets ZERO permissions today — `ROLE_PERMISSIONS` (and, as
of migration `20261006_0002`, `role_grants`/`role_scope`) only ever keyed on
the real `RoleType` enum members, and `"vendedor"` was never one of them.
`vendedor_router.py`/`GetVendedoresUseCase` filter users by that same string
literal — a real, live feature (populates the salesperson dropdown in
`LeadReassignModal.tsx`), not dead code, so this migration does not touch it;
that code gets fixed separately (apps/api code change, same PR) to filter by
`RoleType.SALES_AGENT` instead of the literal string, once every user that
had `role_type='vendedor'` is reassigned here.

Decision (confirmed with the user, workbook bloque 3): fuse `vendedor` into
`sales_agent` rather than leave it broken or delete the subsystem. Users
keep every permission `sales_agent` already has; the `vendedor` role row
disappears so it never again shows up as a distinct (and silently
permission-less) role in the new admin UI (bloque 3) or anywhere else.

Same safety guards as the established precedent
(`20260812_0002_migrate_legacy_sedan_products.py`): skip silently when
there is nothing to do, `ON CONFLICT DO NOTHING` wherever a conflict is
possible, no cascading deletes relied on for the data that actually
matters (every `user_roles` reassignment is done explicitly, row by row,
before the now-empty `vendedor` role is deleted).

`sales_agent` is not guaranteed to exist as a seeded row in every
environment — `init_data.py` only seeds 4 roles (`super_admin`, `admin`,
`manager`, `vendedor`), not all 6 `RoleType` members, and migration
`20261006_0002` skips seeding grants for a role that doesn't exist yet.
This migration creates `sales_agent` (role + grants + scope) if missing,
using the exact same values `20261006_0002` already uses for it, so the
merge target always exists.

Revision ID: 20261007_0001
Revises: 20261006_0002
Create Date: 2026-10-07

Known limitation, intentional (see downgrade()): merging which SPECIFIC
users held 'vendedor' is not reversible — once a user's role_id points at
'sales_agent', that fact is indistinguishable from a user who always had
'sales_agent'. downgrade() only recreates the empty 'vendedor' role shell
(so a fresh upgrade() stays idempotent-safe); it does not and cannot
restore the original per-user assignments.
"""

import sqlalchemy as sa
from alembic import op

revision = "20261007_0001"
down_revision = "20261006_0002"
branch_labels = None
depends_on = None

# Mirrors ROLE_GRANTS["sales_agent"] / ROLE_SCOPE["sales_agent"] in
# 20261006_0002 exactly — used only if this migration has to create the
# 'sales_agent' row itself because no earlier seed did.
SALES_AGENT_GRANTS: list[tuple[str, str]] = [
    ("catalog", "create"),
    ("catalog", "read"),
    ("catalog", "update"),
    ("analytics", "view"),
]
SALES_AGENT_SCOPE = "own"


def _do_upgrade(connection: sa.engine.Connection) -> None:
    vendedor_role_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE role_type = 'vendedor' AND is_system_role = true"),
    ).scalar_one_or_none()
    if vendedor_role_id is None:
        # ponytail: nothing to merge (already merged, or this environment
        # never had the legacy seed) — safe no-op.
        return

    sales_agent_role_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE role_type = 'sales_agent' AND is_system_role = true"),
    ).scalar_one_or_none()

    if sales_agent_role_id is None:
        sales_agent_role_id = connection.execute(
            sa.text(
                "INSERT INTO roles (id, role_type, name, description, is_system_role) "
                "VALUES (gen_random_uuid(), 'sales_agent', 'Sales Agent', "
                "'Manage own leads and catalog', true) "
                "RETURNING id"
            ),
        ).scalar_one()

        for zone, action in SALES_AGENT_GRANTS:
            connection.execute(
                sa.text(
                    "INSERT INTO role_grants (id, role_id, zone, action) "
                    "VALUES (gen_random_uuid(), :role_id, :zone, :action) "
                    "ON CONFLICT (role_id, zone, action) DO NOTHING"
                ),
                {"role_id": sales_agent_role_id, "zone": zone, "action": action},
            )

        connection.execute(
            sa.text(
                "INSERT INTO role_scope (id, role_id, scope_type) "
                "VALUES (gen_random_uuid(), :role_id, :scope_type) "
                "ON CONFLICT (role_id) DO NOTHING"
            ),
            {"role_id": sales_agent_role_id, "scope_type": SALES_AGENT_SCOPE},
        )

    # Reassign every user_roles row off 'vendedor' and onto 'sales_agent',
    # one user at a time — never rely on the FK cascade for this, it would
    # just delete the assignment instead of migrating it.
    vendedor_user_ids = [
        row[0]
        for row in connection.execute(
            sa.text("SELECT user_id FROM user_roles WHERE role_id = :role_id"),
            {"role_id": vendedor_role_id},
        )
    ]
    for user_id in vendedor_user_ids:
        already_has_sales_agent = connection.execute(
            sa.text(
                "SELECT EXISTS(SELECT 1 FROM user_roles "
                "WHERE user_id = :user_id AND role_id = :role_id)"
            ),
            {"user_id": user_id, "role_id": sales_agent_role_id},
        ).scalar_one()

        if already_has_sales_agent:
            # User already holds both — drop the now-redundant 'vendedor' row.
            connection.execute(
                sa.text("DELETE FROM user_roles WHERE user_id = :user_id AND role_id = :role_id"),
                {"user_id": user_id, "role_id": vendedor_role_id},
            )
        else:
            connection.execute(
                sa.text(
                    "UPDATE user_roles SET role_id = :sales_agent_id "
                    "WHERE user_id = :user_id AND role_id = :vendedor_id"
                ),
                {
                    "sales_agent_id": sales_agent_role_id,
                    "user_id": user_id,
                    "vendedor_id": vendedor_role_id,
                },
            )

    # 'vendedor' has no grants/scope rows (confirmed in 20261006_0002's own
    # docstring — intentionally not seeded) and, as of the loop above, no
    # remaining user_roles rows either, so this delete carries no data loss.
    connection.execute(
        sa.text("DELETE FROM roles WHERE id = :role_id"),
        {"role_id": vendedor_role_id},
    )


def _do_downgrade(connection: sa.engine.Connection) -> None:
    exists = connection.execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM roles WHERE role_type = 'vendedor')"),
    ).scalar_one()
    if exists:
        return

    # Recreates the role shell only — see module docstring: which specific
    # users held 'vendedor' is not recoverable, by design, once merged.
    connection.execute(
        sa.text(
            "INSERT INTO roles (id, role_type, name, description, is_system_role) "
            "VALUES (gen_random_uuid(), 'vendedor', 'Sales Agent', "
            "'Manage own leads and catalog', true)"
        ),
    )


def upgrade() -> None:
    _do_upgrade(op.get_bind())


def downgrade() -> None:
    _do_downgrade(op.get_bind())
