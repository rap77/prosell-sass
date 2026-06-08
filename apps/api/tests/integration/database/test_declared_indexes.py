"""Regression: performance indexes declared in the ORM exist in the DB.

Some models declare composite indexes in `__table_args__` (intended for
hot query paths) that the migrations never created — invisible to the
column-level schema audit. These two back real query patterns:

- ix_notifications_user_tenant_read (user_id, tenant_id, is_read): the
  unread-notifications counter / listing (count_unread, mark_all_as_read).
- ix_teams_name (name): team lookup by name.
"""

import pytest
from sqlalchemy import text


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("index_name", "table"),
    [
        ("ix_notifications_user_tenant_read", "notifications"),
        ("ix_teams_name", "teams"),
    ],
)
async def test_declared_index_exists_in_db(db_session, index_name: str, table: str) -> None:
    result = await db_session.execute(
        text("SELECT 1 FROM pg_indexes WHERE tablename = :t AND indexname = :i"),
        {"t": table, "i": index_name},
    )
    assert result.scalar_one_or_none() is not None, (
        f"index {index_name} declared in the ORM is missing on {table} — "
        "queries on its columns fall back to a scan"
    )
