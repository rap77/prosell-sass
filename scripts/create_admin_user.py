#!/usr/bin/env python3
"""Create admin user for staging environment."""

import asyncio
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api" / "src"))

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


async def create_admin_user() -> None:
    """Create admin user with super_admin role."""

    # Read database URL from environment or use default for staging
    db_password = os.getenv("POSTGRES_PASSWORD", "yQZMINddwF+ZzTRhTQJ/B1R9fXstcfUU5VcFDbNCdm0=")
    database_url = f"postgresql+asyncpg://postgres:{db_password}@db:5432/prosell_staging"
    engine = create_async_engine(database_url, echo=False)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get super_admin role
        from sqlalchemy import text

        # Check if user already exists
        result = await session.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": "admin@prosell-demo.com"},
        )
        existing_user = result.fetchone()

        if existing_user:
            print(f"✅ User already exists: {existing_user[1]} (ID: {existing_user[0]})")
            return

        # Hash password
        password = "Admin123!"
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode(
            "utf-8"
        )

        # Get super_admin role ID
        result = await session.execute(
            text("SELECT id FROM roles WHERE role_type = 'super_admin' LIMIT 1")
        )
        role_row = result.fetchone()

        if not role_row:
            print("❌ Super admin role not found!")
            return

        super_admin_role_id = str(role_row[0])

        # Create user
        user_id = uuid4()
        now = datetime.now(UTC)

        await session.execute(
            text("""
                INSERT INTO users (
                    id, email, full_name, password_hash, status,
                    email_verified, email_verified_at, tenant_id,
                    is_2fa_enabled, totp_secret, backup_codes,
                    failed_login_attempts, last_login_at, last_login_ip,
                    locked_until,
                    created_at, updated_at
                ) VALUES (
                    :id, :email, :full_name, :password_hash, :status,
                    :email_verified, :email_verified_at, :tenant_id,
                    :is_2fa_enabled, :totp_secret, :backup_codes,
                    :failed_login_attempts, :last_login_at, :last_login_ip,
                    :locked_until,
                    :created_at, :updated_at
                )
            """),
            {
                "id": str(user_id),
                "email": "admin@prosell-demo.com",
                "full_name": "Admin User",
                "password_hash": password_hash,
                "status": "active",
                "email_verified": True,
                "email_verified_at": now,
                "tenant_id": str(user_id),  # User is their own tenant
                "is_2fa_enabled": False,
                "totp_secret": None,
                "backup_codes": None,
                "failed_login_attempts": 0,
                "last_login_at": None,
                "last_login_ip": None,
                "locked_until": None,
                "created_at": now,
                "updated_at": now,
            },
        )

        # Assign super_admin role
        await session.execute(
            text("""
                INSERT INTO user_roles (id, user_id, role_id, assigned_at)
                VALUES (:id, :user_id, :role_id, :assigned_at)
            """),
            {
                "id": str(uuid4()),
                "user_id": str(user_id),
                "role_id": super_admin_role_id,
                "assigned_at": now,
            },
        )

        await session.commit()

        print("✅ Admin user created successfully!")
        print("   Email: admin@prosell-demo.com")
        print("   Password: Admin123!")
        print(f"   User ID: {user_id}")
        print("   Role: super_admin")
        print("   Status: active (email verified)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_admin_user())
