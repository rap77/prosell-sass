"""fix_teams_schema_alignment

Revision ID: fix_teams_schema_align
Revises: ac4b1ad9593e
Create Date: 2026-06-08

Aligns the `teams` table with the ORM (`TeamModel`) and domain entity (`Team`).

The original migration `xyz987_create_teams_table.py` created the table with:
  - organization_id (FK), slug, is_active, unique(organization_id, slug)

But the ORM and domain entity define:
  - org_id (FK), parent_team_id (FK self-reference)
  - NO slug, NO is_active

This caused a schema drift where every repository query against teams.org_id
failed with `column "teams.org_id" does not exist`, cascading into transaction
aborts for any CreateLeadUseCase auto-assignment attempt.

The fix:
  1. Drop unique constraint that depends on slug
  2. Drop indexes that depend on the columns we're removing/renaming
  3. RENAME organization_id -> org_id (preserves FK + data)
  4. ADD parent_team_id UUID NULL with self-FK ON DELETE SET NULL
  5. DROP unused slug, is_active columns
  6. Recreate index on org_id

Idempotent: uses IF EXISTS / IF NOT EXISTS so it can run safely against
databases that already match the target shape (e.g. fresh test DB that was
seeded from another path).
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "fix_teams_schema_align"
down_revision: str | Sequence[str] | None = "ac4b1ad9593e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Align teams schema to ORM."""
    # 1. Drop unique constraint that references slug (no-op if already gone)
    op.execute("ALTER TABLE teams DROP CONSTRAINT IF EXISTS uq_teams_org_slug")

    # 2. Drop indexes on columns we're removing or renaming
    op.execute("DROP INDEX IF EXISTS ix_teams_organization_id")
    op.execute("DROP INDEX IF EXISTS ix_teams_slug")
    op.execute("DROP INDEX IF EXISTS ix_teams_is_active")

    # 3. Rename organization_id -> org_id (preserves FK)
    op.execute("ALTER TABLE teams RENAME COLUMN organization_id TO org_id")

    # 4. Add parent_team_id column with self-referencing FK
    op.execute("ALTER TABLE teams ADD COLUMN IF NOT EXISTS parent_team_id UUID NULL")
    op.execute(
        "ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_parent_team_id_fkey"
    )
    op.execute(
        "ALTER TABLE teams ADD CONSTRAINT teams_parent_team_id_fkey "
        "FOREIGN KEY (parent_team_id) REFERENCES teams(id) ON DELETE SET NULL"
    )

    # 5. Drop unused columns
    op.execute("ALTER TABLE teams DROP COLUMN IF EXISTS slug")
    op.execute("ALTER TABLE teams DROP COLUMN IF EXISTS is_active")

    # 6. Recreate index on org_id for query performance
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_org_id ON teams (org_id)")


def downgrade() -> None:
    """Reverse the schema alignment (best-effort)."""
    # Reverse the changes in opposite order
    op.execute("DROP INDEX IF EXISTS ix_teams_org_id")

    # Add back slug, is_active as nullable (we can't recover the data)
    op.execute("ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug VARCHAR(255)")
    op.execute(
        "ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
    )

    # Drop self-referencing FK and column
    op.execute(
        "ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_parent_team_id_fkey"
    )
    op.execute("ALTER TABLE teams DROP COLUMN IF EXISTS parent_team_id")

    # Rename back
    op.execute("ALTER TABLE teams RENAME COLUMN org_id TO organization_id")

    # Recreate original indexes
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_teams_organization_id "
        "ON teams (organization_id)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_slug ON teams (slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_is_active ON teams (is_active)")
