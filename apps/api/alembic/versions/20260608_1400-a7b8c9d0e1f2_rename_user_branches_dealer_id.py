"""rename user_branches.dealer_id to branch_id

The `rename_dealers_to_branches` migration (a1b2c3d4e5f6) renamed the
`user_dealers` table and a couple of its indexes, but missed the FK
column `dealer_id`. The ORM (`UserBranchModel`) declares `branch_id`,
so every real assign/remove query raised `ProgrammingError: column
"branch_id" does not exist`. This finishes the incomplete rename:
column + its index + its FK constraint.

Revision ID: a7b8c9d0e1f2
Revises: fix_publications_schema
Create Date: 2026-06-08 14:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "fix_publications_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Column: dealer_id -> branch_id
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_branches' AND column_name = 'dealer_id'
            ) THEN
                ALTER TABLE user_branches RENAME COLUMN dealer_id TO branch_id;
            END IF;
        END $$;
        """
    )
    # Index on that column (left with the legacy name).
    op.execute(
        "ALTER INDEX IF EXISTS ix_user_dealers_dealer_id RENAME TO ix_user_branches_branch_id"
    )
    # FK constraint (left with the legacy name).
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_user_dealers_dealer_id_dealers'
            ) THEN
                ALTER TABLE user_branches
                    RENAME CONSTRAINT fk_user_dealers_dealer_id_dealers
                    TO fk_user_branches_branch_id_branches;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_user_branches_branch_id_branches'
            ) THEN
                ALTER TABLE user_branches
                    RENAME CONSTRAINT fk_user_branches_branch_id_branches
                    TO fk_user_dealers_dealer_id_dealers;
            END IF;
        END $$;
        """
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_user_branches_branch_id RENAME TO ix_user_dealers_dealer_id"
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_branches' AND column_name = 'branch_id'
            ) THEN
                ALTER TABLE user_branches RENAME COLUMN branch_id TO dealer_id;
            END IF;
        END $$;
        """
    )
