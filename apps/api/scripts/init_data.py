"""
Initialization script for ProSell SaaS MVP.
Ensures the database has the minimum data required for the application to function.

Using SQLAlchemy models to ensure all defaults and constraints are satisfied.
"""

import asyncio
import os
import sys
from pathlib import Path
from uuid import uuid4

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import bcrypt
from sqlalchemy import make_url, select

# Use settings from the app — no hardcoded DATABASE_URL
from prosell.core.config import settings
from prosell.domain.entities.user import UserStatus  # Import UserStatus
from prosell.infrastructure.database.seed_categories import (
    enable_default_verticals,
    seed_global_taxonomy,
)
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models import (
    OrganizationModel,
    RoleModel,
    UserModel,
    UserRoleModel,
)


def _safe_db_url(url: str) -> str:
    """Return the DB URL with the password masked, for safe logging.

    The init script runs on container startup and its output lands in
    `docker logs`; logging the raw URL would leak the password in plaintext.
    """
    return make_url(url).render_as_string(hide_password=True)


async def init_data() -> None:
    """Initialize minimal data for MVP using ORM models."""
    print(f"Starting MVP data initialization on {_safe_db_url(settings.database_url)}...")

    async with async_session_maker() as session:
        # 1. Create Default Organization
        org_name = "ProSell Main Org"
        stmt = select(OrganizationModel).where(OrganizationModel.name == org_name)
        result = await session.execute(stmt)
        org = result.scalar_one_or_none()

        if not org:
            org_id = uuid4()
            org = OrganizationModel(
                id=org_id, name=org_name, tenant_id=org_id, status="active", settings={}
            )
            session.add(org)
            await session.flush()
            print(f"Created Organization: {org_name}")
        else:
            print(f"Organization {org_name} already exists")

        # 2. Seed the GLOBAL category taxonomy (Plan 2). Categories are
        # platform-managed global templates (tenant NULL), not per-org. All
        # niche verticals (Vehículos, Bienes Raíces, Artículos) are seeded
        # idempotently here.
        await seed_global_taxonomy(session)
        print("Seeded global category taxonomy (3 niches)")

        # 2b. Enable default verticals for ALL existing organizations.
        # This ensures orgs created before this code have their verticals.
        # The enable function is idempotent (ON CONFLICT DO NOTHING).
        all_orgs_stmt = select(OrganizationModel)
        all_orgs_result = await session.execute(all_orgs_stmt)
        all_orgs = all_orgs_result.scalars().all()
        for o in all_orgs:
            enabled = await enable_default_verticals(session, o.id)
            if enabled:
                print(f"Enabled {len(enabled)} default vertical(s) for {o.name}")

        # 3. Ensure System Roles Exist
        roles_data = [
            ("super_admin", "Super Administrator", "Full system access"),
            ("admin", "Organization Admin", "Full organization access"),
            ("manager", "Team Manager", "Manage teams and leads"),
            ("vendedor", "Sales Agent", "Manage own leads and catalog"),
        ]

        for r_type, r_name, r_desc in roles_data:
            stmt = select(RoleModel).where(RoleModel.role_type == r_type)
            result = await session.execute(stmt)
            if not result.scalar_one_or_none():
                role = RoleModel(
                    id=uuid4(),
                    role_type=r_type,
                    name=r_name,
                    description=r_desc,
                    is_system_role=True,
                )
                session.add(role)
                print(f"Created Role: {r_type}")

        # 4. Create Admin User (IDEMPOTENT — never destroy existing data)
        # The api.Dockerfile runs this on every container start, so it must
        # NOT delete the admin on each run. Doing so would:
        #   - Invalidate all live JWTs (user_id changes)
        #   - Wipe profile edits, password changes, avatar, etc.
        # ADMIN_PASSWORD in env is only consulted on FIRST creation. For
        # password rotation, use the change_password endpoint or rotate
        # directly in the DB.
        admin_email = os.environ["ADMIN_EMAIL"]

        stmt = select(UserModel).where(UserModel.email == admin_email)
        result = await session.execute(stmt)
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print(f"Admin user {admin_email} already exists — skipping (idempotent)")
        else:
            admin_pass = os.environ["ADMIN_PASSWORD"]
            password_hash = bcrypt.hashpw(admin_pass.encode("utf-8"), bcrypt.gensalt()).decode(
                "utf-8"
            )

            user_id = uuid4()
            user = UserModel(
                id=user_id,
                email=admin_email,
                password_hash=password_hash,
                full_name="Admin MVP",
                status=UserStatus.ACTIVE,
                email_verified=True,
                is_2fa_enabled=False,
                tenant_id=org.id,
                failed_login_attempts=0,
            )
            session.add(user)
            await session.flush()

            stmt = select(RoleModel).where(RoleModel.role_type == "super_admin")
            result = await session.execute(stmt)
            role = result.scalar_one_or_none()

            if role:
                user_role = UserRoleModel(id=uuid4(), user_id=user.id, role_id=role.id)
                session.add(user_role)

            print(f"Created Admin User: {admin_email}")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(init_data())
    print("\nMVP Initialization complete!")
