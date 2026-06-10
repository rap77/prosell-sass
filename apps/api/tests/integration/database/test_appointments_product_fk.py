"""Regression: appointments.product_id has its FK and non-legacy index.

Dropping the `vehicles` table removed `appointments_vehicle_id_fkey`, and
the later `vehicle_id -> product_id` column rename never recreated the FK
nor renamed the index. The ORM declares the FK, so the DB was left without
referential integrity and with a stale index name. These tests assert the
schema state the migration restores.
"""

import pytest
from sqlalchemy import text


@pytest.mark.asyncio
async def test_appointments_product_id_fk_exists(db_session) -> None:
    result = await db_session.execute(
        text(
            """
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'appointments'::regclass
              AND contype = 'f'
              AND conname = 'appointments_product_id_fkey'
            """
        )
    )
    assert result.scalar_one_or_none() is not None, (
        "FK appointments_product_id_fkey is missing — product_id has no "
        "referential integrity to products(id)"
    )


@pytest.mark.asyncio
async def test_appointments_product_id_index_is_renamed(db_session) -> None:
    result = await db_session.execute(
        text(
            """
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'appointments'
              AND indexname IN ('ix_appointments_product_id', 'ix_appointments_vehicle_id')
            """
        )
    )
    index_names = {row[0] for row in result.fetchall()}
    assert "ix_appointments_product_id" in index_names, "renamed index missing"
    assert "ix_appointments_vehicle_id" not in index_names, "legacy index name still present"
