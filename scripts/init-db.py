#!/usr/bin/env python
"""Seed database with default roles. Schema is managed exclusively by Alembic."""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Resolve src path for both local dev and Docker container
_root = Path(__file__).parent.parent
_local_src = _root / "apps" / "api" / "src"
_docker_src = _root / "src"
sys.path.insert(0, str(_local_src if _local_src.exists() else _docker_src))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from prosell.domain.entities.role import RoleType  # noqa: E402
from prosell.infrastructure.database.session import async_session_maker  # noqa: E402
from prosell.infrastructure.models.role_model import RoleModel  # noqa: E402


async def seed_roles(session: AsyncSession) -> None:
    """Seed default system roles."""
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
        stmt = select(RoleModel).where(RoleModel.role_type == role.role_type)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if not existing:
            session.add(role)

    await session.commit()
    print(f"✅ Seeded {len(roles_to_create)} system roles")


async def main() -> None:
    print("🔧 Seeding ProSell SaaS database...")
    async with async_session_maker() as session:
        await seed_roles(session)
    print("\n✨ Seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
