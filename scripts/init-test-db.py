#!/usr/bin/env python3
"""Initialize test database schema from SQLAlchemy models."""
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps/api/src"))

from sqlalchemy.ext.asyncio import create_async_engine
from prosell.infrastructure.database.base import Base
import os

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test"
)


async def init_test_db():
    """Create all tables in test database."""
    print("🔧 Creating test database schema from models...")

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Import ALL SQLAlchemy ORM models directly from infrastructure/models
        import prosell.infrastructure.models.category_model
        import prosell.infrastructure.models.dealer_model
        import prosell.infrastructure.models.facebook_account_model
        import prosell.infrastructure.models.oauth_account_model
        import prosell.infrastructure.models.organization_model
        import prosell.infrastructure.models.product_image_model
        import prosell.infrastructure.models.product_model
        import prosell.infrastructure.models.publication_model
        import prosell.infrastructure.models.role_model
        import prosell.infrastructure.models.session_model
        import prosell.infrastructure.models.team_model
        import prosell.infrastructure.models.user_dealer_model
        import prosell.infrastructure.models.user_model
        import prosell.infrastructure.models.user_token_model
        import prosell.infrastructure.models.vehicle_model
        import prosell.infrastructure.models.wallet_model

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("✅ Test database schema created")


if __name__ == "__main__":
    asyncio.run(init_test_db())
