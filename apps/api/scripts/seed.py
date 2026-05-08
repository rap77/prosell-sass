"""
Seed script for ProSell SaaS development and staging.

Creates:
1. Admin user (admin@prosell-demo.com / Admin123!)
2. Demo organization (ProSell Demo)

Usage:
    cd apps/api
    DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" uv run python scripts/seed.py
"""

import asyncio

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def seed_database():
    """Seed the database with initial data."""
    database_url = "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell"
    engine = create_async_engine(database_url, echo=False)

    async with engine.begin() as conn:
        # Create organizations table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(100) NOT NULL UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """))

        # Get or create organization
        result = await conn.execute(
            text("SELECT id FROM organizations WHERE slug = 'prosell-demo'")
        )
        org_row = result.first()

        if not org_row:
            await conn.execute(text("""
                INSERT INTO organizations (name, slug)
                VALUES ('ProSell Demo', 'prosell-demo')
                RETURNING id
            """))
            result = await conn.execute(text("SELECT id FROM organizations WHERE slug = 'prosell-demo'"))
            org_row = result.first()

        org_id = org_row[0]
        print(f"✅ Organization ID: {org_id}")

        # Delete existing admin user if any
        await conn.execute(
            text("DELETE FROM users WHERE email = 'admin@prosell-demo.com'")
        )

        # Create admin user
        password = "Admin123!"
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, full_name, status, email_verified, tenant_id)
            VALUES (
                gen_random_uuid(),
                'admin@prosell-demo.com',
                :password_hash,
                'Admin ProSell',
                'active',
                true,
                :tenant_id
            )
        """), {"password_hash": password_hash, "tenant_id": org_id})

        print("✅ Admin user created: admin@prosell-demo.com / Admin123!")
        print("✅ Organization: ProSell Demo")


if __name__ == "__main__":
    asyncio.run(seed_database())
