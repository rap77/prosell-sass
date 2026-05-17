#!/usr/bin/env python3
"""Initialize test database schema from SQLAlchemy models."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps/api/src"))

import os

from sqlalchemy.ext.asyncio import create_async_engine

from prosell.infrastructure.database.base import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test",
)


async def init_test_db():
    """Create all tables in test database."""
    print("🔧 Creating test database schema from models...")

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Import ALL SQLAlchemy ORM models directly from infrastructure/models

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("✅ Test database schema created")


if __name__ == "__main__":
    asyncio.run(init_test_db())
