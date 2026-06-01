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
from sqlalchemy import select

# Use settings from the app — no hardcoded DATABASE_URL
from prosell.core.config import settings
from prosell.domain.entities.user import UserStatus  # Import UserStatus
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models import (
    CategoryModel,
    OrganizationModel,
    RoleModel,
    UserModel,
    UserRoleModel,
)


async def init_data() -> None:
    """Initialize minimal data for MVP using ORM models."""
    print(f"Starting MVP data initialization on {settings.database_url}...")

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

        # 2. Create 'Vehicles' Category
        cat_slug = "vehicles"
        stmt = select(CategoryModel).where(
            CategoryModel.slug == cat_slug, CategoryModel.tenant_id == org.id
        )
        result = await session.execute(stmt)
        cat = result.scalar_one_or_none()

        if not cat:
            cat_id = uuid4()
            cat = CategoryModel(
                id=cat_id,
                name="Vehicles",
                slug=cat_slug,
                tenant_id=org.id,
                level=0,
                is_active=True,
                sort_order=0,
                field_config=[],
                attribute_schema={},
            )
            session.add(cat)
            await session.flush()
            print(f"Created Category: {cat_slug}")
        else:
            print(f"Category {cat_slug} already exists")

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

        # 4. Create or Update Admin User
        admin_email = os.environ["ADMIN_EMAIL"]
        admin_pass = os.environ["ADMIN_PASSWORD"]

        password_hash = bcrypt.hashpw(admin_pass.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Delete existing admin to recreate with a fresh hash on every run
        delete_stmt = select(UserModel).where(UserModel.email == admin_email)
        result = await session.execute(delete_stmt)
        user_to_delete = result.scalar_one_or_none()

        if user_to_delete:
            await session.delete(user_to_delete)
            await session.flush()
            print(f"Deleted existing admin user: {admin_email}")

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
