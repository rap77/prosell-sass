#!/usr/bin/env python
"""Initialize database with tables and default roles."""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api" / "src"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import RoleType
from prosell.infrastructure.database.base import Base
from prosell.infrastructure.database.session import async_session_maker, engine
from prosell.infrastructure.models.role_model import RoleModel


async def create_tables():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully")


async def seed_roles(session: AsyncSession):
    """Seed default system roles."""
    from uuid import uuid4

    roles_to_create = [
        RoleModel(
            id=uuid4(),
            role_type=role_type.value,
            name=role_type.value.replace("_", " ").title(),
            description=f"System role: {role_type.value}",
            is_system_role=True,
            tenant_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        for role_type in RoleType
    ]

    for role in roles_to_create:
        # Check if role already exists
        stmt = select(RoleModel).where(RoleModel.role_type == role.role_type)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if not existing:
            session.add(role)

    await session.commit()
    print(f"✅ Seeded {len(roles_to_create)} system roles")


async def main():
    """Main initialization function."""
    print("🔧 Initializing ProSell SaaS database...")

    # Create tables
    await create_tables()

    # Seed roles
    async with async_session_maker() as session:
        await seed_roles(session)

    print("\n✨ Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
