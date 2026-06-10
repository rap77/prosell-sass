"""users.backup_codes: TEXT (JSON-string) -> JSONB (native)

GAP-5 finding: the column was declared `Text` and the repo did manual
`json.dumps(...) if user.backup_codes else None` / `json.loads(...)`. The
truthiness check collapsed an empty list `[]` to `None`, losing the
distinction between "no 2FA configured" and "all backup codes used up".

The proper home for a JSON value in Postgres is `JSONB`. SQLAlchemy then
round-trips the list natively, no manual encoding/decoding, and the
empty list stays an empty list.

Existing values are JSON strings (the prior serialization); Postgres can
cast TEXT to JSONB in a single ALTER. Any non-JSON-parseable legacy
value would fail the cast — but the only producer was this same repo,
so the cast is safe.

Revision ID: users_bkp_jsonb_20260608
Revises: users_deleted_at_20260608
Create Date: 2026-06-08 15:10:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "users_bkp_jsonb_20260608"
down_revision: str | Sequence[str] | None = "users_deleted_at_20260608"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users "
        "ALTER COLUMN backup_codes TYPE JSONB "
        "USING CASE WHEN backup_codes IS NULL THEN NULL "
        "ELSE backup_codes::jsonb END"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE users "
        "ALTER COLUMN backup_codes TYPE TEXT "
        "USING CASE WHEN backup_codes IS NULL THEN NULL "
        "ELSE backup_codes::text END"
    )
