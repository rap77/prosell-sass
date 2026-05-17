#!/usr/bin/env python3
import asyncio

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def seed():
    db_url = "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell"
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        # Organizations table
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(100) NOT NULL UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )

        # Get or create org
        result = await conn.execute(
            text("SELECT id FROM organizations WHERE slug = 'prosell-demo'")
        )
        org_id = result.first()[0] if result.first() else None

        if not org_id:
            result = await conn.execute(
                text("""
                INSERT INTO organizations (name, slug) VALUES ('ProSell Demo', 'prosell-demo') RETURNING id
            """)
            )
            org_id = result.first()[0]

        print(f"✅ Organization ID: {org_id}")

        # Delete existing admin
        await conn.execute(text("DELETE FROM users WHERE email = 'admin@prosell-demo.com'"))

        # Create admin
        pwd = "Admin123!"
        hash = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await conn.execute(
            text("""
            INSERT INTO users (id, email, password_hash, full_name, status, email_verified, tenant_id)
            VALUES (gen_random_uuid(), 'admin@prosell-demo.com', :hash, 'Admin ProSell', 'active', true, :org_id)
        """),
            {"hash": hash, "org_id": org_id},
        )

        print("✅ Admin: admin@prosell-demo.com / Admin123!")
        print("✅ Organization: ProSell Demo")


asyncio.run(seed())
