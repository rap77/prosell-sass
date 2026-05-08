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
from datetime import UTC, datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import bcrypt
from sqlalchemy import select
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models import OrganizationModel, CategoryModel, RoleModel, UserModel, UserRoleModel
from prosell.domain.entities.user import UserStatus # Import UserStatus

# Load database URL from environment or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:postgres@localhost:5432/prosell_dev"
)

async def init_data():
    """Initialize minimal data for MVP using ORM models."""
    print(f"🚀 Initializing MVP data on {DATABASE_URL}...")
    
    async with async_session_maker() as session:
        # 1. Create Default Organization
        org_name = "ProSell Main Org"
        stmt = select(OrganizationModel).where(OrganizationModel.name == org_name)
        result = await session.execute(stmt)
        org = result.scalar_one_or_none()
        
        if not org:
            org_id = uuid4()
            org = OrganizationModel(
                id=org_id,
                name=org_name,
                tenant_id=org_id,
                status="active",
                settings={}
            )
            session.add(org)
            await session.flush()
            print(f"✅ Created Organization: {org_name}")
        else:
            org_id = org.id # Use existing org ID
            print(f"ℹ️  Organization {org_name} already exists")

        # 2. Create 'Vehicles' Category
        cat_slug = "vehicles"
        stmt = select(CategoryModel).where(
            CategoryModel.slug == cat_slug, 
            CategoryModel.tenant_id == org.id
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
                attribute_schema={}
            )
            session.add(cat)
            await session.flush()
            print(f"✅ Created Category: {cat_slug}")
        else:
            cat_id = cat.id # Use existing cat ID
            print(f"ℹ️  Category {cat_slug} already exists")

        # 3. Ensure System Roles Exist
        roles_data = [
            ("super_admin", "Super Administrator", "Full system access"),
            ("admin", "Organization Admin", "Full organization access"),
            ("manager", "Team Manager", "Manage teams and leads"),
            ("vendedor", "Sales Agent", "Manage own leads and catalog")
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
                    is_system_role=True
                )
                session.add(role)
                print(f"✅ Created Role: {r_type}")

        # 4. Create or Update Admin User
        admin_email = os.getenv("ADMIN_EMAIL", "admin@prosell.saas")
        admin_pass = os.getenv("ADMIN_PASSWORD", "Admin123!")
        
        # Generate a fresh password hash
        password_hash = bcrypt.hashpw(
            admin_pass.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')
        
        print(f"Generated password hash for admin ({admin_email}): {password_hash}") # Log generated hash
        
        # Check if user exists and delete it to ensure a fresh creation with the new hash
        delete_stmt = select(UserModel).where(UserModel.email == admin_email)
        result = await session.execute(delete_stmt)
        user_to_delete = result.scalar_one_or_none()

        if user_to_delete:
            await session.delete(user_to_delete)
            await session.flush()
            print(f"ℹ️  Deleted existing admin user: {admin_email}")
        
        # Create new user with the fresh hash
        user_id = uuid4()
        user = UserModel(
            id=user_id,
            email=admin_email,
            password_hash=password_hash,
            full_name="Admin MVP",
            status=UserStatus.ACTIVE, # Set to active directly
            email_verified=True,      # Mark as verified
            is_2fa_enabled=False,     # Ensure 2FA is off by default
            tenant_id=org.id,
            failed_login_attempts=0
        )
        session.add(user)
        await session.flush()
            
        # Assign super_admin role
        stmt = select(RoleModel).where(RoleModel.role_type == "super_admin")
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
            
        if role:
            user_role = UserRoleModel(
                id=uuid4(),
                user_id=user.id,
                role_id=role.id
            )
            session.add(user_role)
            
        print(f"✅ Created Admin User: {admin_email} with new hash.")

        await session.commit()
print("\n✨ MVP Initialization complete!")
if __name__ == "__main__":
    asyncio.run(init_data())
