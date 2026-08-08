#!/usr/bin/env python3
"""Seed dealer organizations for CSV import testing.

Usage:
    uv run python scripts/seed_dealers.py

Each dealer is its own tenant (1:1 tenant=org relationship).
Codes extracted from data39.csv title column.
"""

import asyncio
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DEALER_CODES = [
    "AF",
    "AG",
    "CF",
    "DJ",
    "DK",
    "EA",
    "EG",
    "IC",
    "IM",
    "IO",
    "JD",
    "LY",
    "MF",
    "MM",
    "OX",
    "PC",
    "PM",
    "PO",
    "PS",
    "PV",
    "RM",
    "SL",
    "TG",
    "TJ",
    "TY",
    "US",
    "VL",
    "ZP",
]


async def seed_dealers() -> None:
    """Create dealer organizations if they don't exist."""
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell",
    )
    engine = create_async_engine(database_url)

    async with engine.begin() as conn:
        created = 0
        skipped = 0

        for code in DEALER_CODES:
            name = f"Dealer {code}"
            # ponytail: id == tenant_id for 1:1 tenant=org
            result = await conn.execute(
                text("""
                    INSERT INTO organizations
                        (id, name, code, tenant_id, setup_complete, status, settings)
                    SELECT new_id, :name, :code, new_id, false, 'active', '{}'
                    FROM (SELECT gen_random_uuid() AS new_id) AS t
                    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = :code)
                    RETURNING id
                """),
                {"name": name, "code": code},
            )
            if result.fetchone():
                created += 1
                print(f"  ✓ Created {name}")
            else:
                skipped += 1

        print(f"\n✅ Done: {created} created, {skipped} already existed")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_dealers())
