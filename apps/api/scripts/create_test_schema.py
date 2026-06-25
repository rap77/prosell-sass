#!/usr/bin/env python
"""Create the integration-test DB schema via Base.metadata.create_all.

The integration suite (tests/integration/) connects directly to a fixed
Postgres instance (see TEST_DB_URL in tests/integration/conftest.py) and
expects every table to already exist — there is no per-test create_all.
Schema here is NOT managed by Alembic: this project's migration chain has
drift (see alembic/versions/20260601_recreate_facebook_tables.py) and
fails on a fresh database, so the test DB is bootstrapped straight from
the ORM models instead.

Run after the Postgres container is healthy and before `pytest tests/integration`.
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

import prosell.infrastructure.models  # noqa: F401  registers all tables on Base.metadata
from prosell.infrastructure.database.base import Base

# Must match TEST_DB_URL in tests/integration/conftest.py.
TEST_DB_URL = "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test"


async def main() -> None:
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print(f"Created {len(Base.metadata.tables)} tables in {TEST_DB_URL}")


if __name__ == "__main__":
    asyncio.run(main())
