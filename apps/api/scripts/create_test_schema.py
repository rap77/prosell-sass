#!/usr/bin/env python
"""Create the integration-test DB schema via Base.metadata.create_all.

The integration suite (tests/integration/) connects directly to a fixed
Postgres instance (see TEST_DB_URL in tests/integration/_constants.py) and
expects every table to already exist — there is no per-test create_all.
Schema here is NOT managed by Alembic: this project's migration chain has
drift (see alembic/versions/20260601_recreate_facebook_tables.py) and
fails on a fresh database, so the test DB is bootstrapped straight from
the ORM models instead.

Run after the Postgres container is healthy and before `pytest tests/integration`.
"""

import asyncio
import sys
from pathlib import Path

# Make `apps/api` importable so we can reach tests/integration/_constants.py
# without a hardcoded copy of TEST_DB_URL. Script runs standalone (no pytest
# context), so sys.path injection is the lightest option.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.ext.asyncio import create_async_engine
from tests.integration._constants import TEST_DB_URL

import prosell.infrastructure.models  # noqa: F401  registers all tables on Base.metadata
from prosell.infrastructure.database.base import Base

# ENUMs with create_type=False must be created manually before create_all()
MANUAL_ENUMS = [
    ("fb_group_category", ["vehicles", "general", "real_estate", "electronics", "other"]),
]


async def main() -> None:
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        # Wipe any prior run's tables FIRST. This script always means
        # "rebuild from scratch," never incremental — and it de-risks the
        # ENUM drop below: Postgres refuses DROP TYPE while a column still
        # uses it, so a bare `drop()` (no CASCADE) would fail on a second
        # run against an already-populated schema if we dropped the enum
        # before its dependent table.
        await conn.run_sync(Base.metadata.drop_all)

        # Create ENUMs that have create_type=False in models. Both DROP and
        # CREATE go through SQLAlchemy's own PostgreSQL ENUM DDL construct
        # (handles identifier/label quoting internally) instead of
        # hand-rolled SQL — GGA finding, fixed. `MANUAL_ENUMS` is a
        # hardcoded, developer-controlled constant (never external input),
        # but the project standard rejects string-interpolated DDL
        # regardless of actual exploitability.
        for enum_name, values in MANUAL_ENUMS:
            pg_enum = PG_ENUM(*values, name=enum_name)
            await conn.run_sync(lambda sync_conn, e=pg_enum: e.drop(sync_conn, checkfirst=True))
            await conn.run_sync(lambda sync_conn, e=pg_enum: e.create(sync_conn, checkfirst=False))
        await conn.run_sync(Base.metadata.create_all)
        # `products_vehicle_code_seq` is a raw Postgres sequence created by
        # Alembic migration `20260926_0001` — it has no SQLAlchemy model, so
        # `create_all` never creates it. `VehicleCodeAllocator.allocate_next()`
        # (used by product creation and bulk vehicle upload) depends on it
        # existing. Same defensive `IF NOT EXISTS` the migration itself uses.
        await conn.execute(
            text("CREATE SEQUENCE IF NOT EXISTS products_vehicle_code_seq AS BIGINT")
        )
    await engine.dispose()
    print(f"Created {len(MANUAL_ENUMS)} ENUMs + {len(Base.metadata.tables)} tables + 1 sequence")


if __name__ == "__main__":
    asyncio.run(main())
