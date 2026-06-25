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

from sqlalchemy.ext.asyncio import create_async_engine
from tests.integration._constants import TEST_DB_URL

import prosell.infrastructure.models  # noqa: F401  registers all tables on Base.metadata
from prosell.infrastructure.database.base import Base


async def main() -> None:
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print(f"Created {len(Base.metadata.tables)} tables in {TEST_DB_URL}")


if __name__ == "__main__":
    asyncio.run(main())
