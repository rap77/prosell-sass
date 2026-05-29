#!/usr/bin/env python3
"""Create admin user for production/staging environments."""

import asyncio
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Resolve src path for both local dev and Docker container
_root = Path(__file__).parent.parent
_local_src = _root / "apps" / "api" / "src"
_docker_src = _root / "src"
sys.path.insert(0, str(_local_src if _local_src.exists() else _docker_src))

import bcrypt  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


async def create_admin_user() -> None:
    """Create admin user with super_admin role."""
    database_url = os.getenv("DATABASE_URL")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@prosell.saas")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "Admin ProSell")

    if not database_url:
        print("❌ DATABASE_URL env var not set")
        sys.exit(1)
    if not admin_password:
        print("❌ ADMIN_PASSWORD env var not set")
        sys.exit(1)

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": admin_email},
        )
        existing = result.fetchone()
        if existing:
            print(f"✅ User already exists: {existing[1]} (ID: {existing[0]})")
            await engine.dispose()
            return

        loop = asyncio.get_running_loop()
        password_hash = await loop.run_in_executor(None, _hash_password, admin_password)

        result = await session.execute(
            text("SELECT id FROM roles WHERE role_type = 'super_admin' LIMIT 1")
        )
        role_row = result.fetchone()
        if not role_row:
            print("❌ super_admin role not found — run init-db.py first")
            await engine.dispose()
            sys.exit(1)

        super_admin_role_id = str(role_row[0])
        user_id = uuid4()
        now = datetime.now(UTC)

        await session.execute(
            text("""
                INSERT INTO users (
                    id, email, full_name, password_hash, status,
                    email_verified, email_verified_at, tenant_id,
                    is_2fa_enabled, totp_secret, backup_codes,
                    failed_login_attempts, last_login_at, last_login_ip,
                    locked_until, created_at, updated_at
                ) VALUES (
                    :id, :email, :full_name, :password_hash, :status,
                    :email_verified, :email_verified_at, :tenant_id,
                    :is_2fa_enabled, :totp_secret, :backup_codes,
                    :failed_login_attempts, :last_login_at, :last_login_ip,
                    :locked_until, :created_at, :updated_at
                )
            """),
            {
                "id": str(user_id),
                "email": admin_email,
                "full_name": admin_name,
                "password_hash": password_hash,
                "status": "active",
                "email_verified": True,
                "email_verified_at": now,
                "tenant_id": str(user_id),
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

    await engine.dispose()

    print("✅ Admin user created successfully!")
    print(f"   Email:   {admin_email}")
    print(f"   User ID: {user_id}")
    print("   Role:    super_admin")
    print("   Status:  active (email verified)")


if __name__ == "__main__":
    asyncio.run(create_admin_user())
