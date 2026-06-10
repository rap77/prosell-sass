"""
Seed script for ProSell SaaS development and staging.

Creates:
1. Admin user (admin@prosell-demo.com / Admin123!)
2. Demo organization (ProSell Demo)
3. Sample branch for testing

Usage:
    DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \\
    uv run python scripts/seed_dev.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def seed_database():
    """Seed the database with initial data."""

    # Create async engine
    database_url = "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell"
    engine = create_async_engine(database_url, echo=True)

    async with engine.begin() as conn:
        # Create organizations table if not exists
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

        # Create roles table if not exists
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role_type VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
                tenant_id UUID,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )

        # Drop and recreate user_roles junction table
        # (matches UserRoleModel with id PK)
        await conn.execute(text("DROP TABLE IF EXISTS user_roles"))
        await conn.execute(
            text("""
            CREATE TABLE user_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                UNIQUE (user_id, role_id)
            );
        """)
        )

        # =========================================================================
        # MISSING TABLES: categories, products, product_images, vehicles, sessions,
        # oauth_accounts, facebook_accounts, facebook_pages
        # =========================================================================
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                level INTEGER NOT NULL DEFAULT 0,
                parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
                icon VARCHAR(100),
                description TEXT,
                image_url VARCHAR(500),
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT true,
                field_config JSON NOT NULL DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_categories_tenant_id ON categories(tenant_id);
            CREATE INDEX IF NOT EXISTS ix_categories_parent_id ON categories(parent_id);
            CREATE INDEX IF NOT EXISTS ix_categories_is_active ON categories(is_active);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES organizations(id)
                    ON DELETE CASCADE,
                organization_id UUID NOT NULL REFERENCES organizations(id)
                    ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id)
                    ON DELETE RESTRICT,
                title VARCHAR(500) NOT NULL,
                slug VARCHAR(500),
                description TEXT,
                price_cents INTEGER NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                condition VARCHAR(50) NOT NULL DEFAULT 'used',
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                attributes JSON NOT NULL DEFAULT '{}',
                location_city VARCHAR(100),
                location_state VARCHAR(100),
                location_zip VARCHAR(20),
                is_featured BOOLEAN NOT NULL DEFAULT false,
                view_count INTEGER NOT NULL DEFAULT 0,
                favorite_count INTEGER NOT NULL DEFAULT 0,
                submitted_for_approval_at TIMESTAMPTZ,
                submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMPTZ,
                approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
                rejection_reason TEXT,
                published_at TIMESTAMPTZ,
                sold_at TIMESTAMPTZ,
                archived_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_products_tenant_id
                ON products(tenant_id);
            CREATE INDEX IF NOT EXISTS ix_products_organization_id
                ON products(organization_id);
            CREATE INDEX IF NOT EXISTS ix_products_category_id
                ON products(category_id);
            CREATE INDEX IF NOT EXISTS ix_products_slug ON products(slug);
            CREATE INDEX IF NOT EXISTS ix_products_status ON products(status);
            CREATE INDEX IF NOT EXISTS ix_products_condition
                ON products(condition);
            CREATE INDEX IF NOT EXISTS ix_products_is_featured
                ON products(is_featured);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS product_images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                url VARCHAR(1000) NOT NULL,
                thumbnail_url VARCHAR(1000),
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_primary BOOLEAN NOT NULL DEFAULT false,
                alt_text VARCHAR(500),
                width INTEGER,
                height INTEGER,
                file_size_bytes INTEGER,
                storage_key VARCHAR(1000),
                content_type VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_product_images_product_id
                ON product_images(product_id);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id)
                    ON DELETE CASCADE UNIQUE,
                vin VARCHAR(17) NOT NULL UNIQUE,
                year INTEGER,
                make VARCHAR(100),
                model VARCHAR(100),
                trim VARCHAR(100),
                body_type VARCHAR(50),
                body_style VARCHAR(100),
                drivetrain VARCHAR(50),
                transmission VARCHAR(50),
                engine VARCHAR(200),
                fuel_type VARCHAR(50),
                mpg_city INTEGER,
                mpg_highway INTEGER,
                mpg_combined INTEGER,
                mileage INTEGER,
                mileage_unit VARCHAR(10) NOT NULL DEFAULT 'mi',
                exterior_color VARCHAR(100),
                interior_color VARCHAR(100),
                has_sunroof BOOLEAN NOT NULL DEFAULT false,
                has_navigation BOOLEAN NOT NULL DEFAULT false,
                has_leather BOOLEAN NOT NULL DEFAULT false,
                has_backup_camera BOOLEAN NOT NULL DEFAULT false,
                has_bluetooth BOOLEAN NOT NULL DEFAULT false,
                has_remote_start BOOLEAN NOT NULL DEFAULT false,
                seat_material VARCHAR(50),
                vin_decoded_data JSON NOT NULL DEFAULT '{}',
                vin_decoded_at TIMESTAMPTZ,
                stock_number VARCHAR(100),
                vin_verified BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_vehicles_vin ON vehicles(vin);
            CREATE INDEX IF NOT EXISTS ix_vehicles_make ON vehicles(make);
            CREATE INDEX IF NOT EXISTS ix_vehicles_model ON vehicles(model);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL UNIQUE,
                user_agent VARCHAR(500),
                ip_address VARCHAR(45),
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions(expires_at);
            CREATE INDEX IF NOT EXISTS ix_sessions_token_hash ON sessions(token_hash);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL,
                provider_user_id VARCHAR(255) NOT NULL,
                provider_email VARCHAR(255),
                access_token VARCHAR(500),
                refresh_token VARCHAR(500),
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_oauth_accounts_user_id
                ON oauth_accounts(user_id);
            CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_accounts_provider_user
                ON oauth_accounts(provider, provider_user_id);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS facebook_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seller_user_id UUID NOT NULL REFERENCES users(id)
                    ON DELETE CASCADE,
                facebook_user_id VARCHAR(255) NOT NULL UNIQUE,
                facebook_name VARCHAR(255),
                access_token_encrypted TEXT NOT NULL,
                token_expires_at TIMESTAMPTZ,
                scopes VARCHAR(1000) NOT NULL DEFAULT '',
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                refresh_failure_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_facebook_accounts_seller_user_id
                ON facebook_accounts(seller_user_id);
            CREATE INDEX IF NOT EXISTS ix_facebook_accounts_status
                ON facebook_accounts(status);
        """)
        )

        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS facebook_pages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                facebook_account_id UUID NOT NULL
                    REFERENCES facebook_accounts(id) ON DELETE CASCADE,
                page_id VARCHAR(255) NOT NULL,
                page_name VARCHAR(255) NOT NULL,
                page_access_token_encrypted TEXT NOT NULL,
                category VARCHAR(255),
                picture_url VARCHAR(500),
                is_default BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_facebook_pages_facebook_account_id
                ON facebook_pages(facebook_account_id);
            CREATE INDEX IF NOT EXISTS ix_facebook_pages_page_id
                ON facebook_pages(page_id);
        """)
        )

        # Check if admin organization exists
        result = await conn.execute(
            text("SELECT id FROM organizations WHERE slug = 'prosell-demo'")
        )
        org_row = result.first()

        if not org_row:
            # Create demo organization
            await conn.execute(
                text("""
                INSERT INTO organizations (name, slug)
                VALUES ('ProSell Demo', 'prosell-demo')
                RETURNING id
            """)
            )
            result = await conn.execute(
                text("SELECT id FROM organizations WHERE slug = :slug"),
                {"slug": "prosell-demo"},
            )
            org_row = result.first()

        org_id = org_row[0]
        print(f"✅ Organization created/found: {org_id}")

        # Check if admin user exists
        result = await conn.execute(
            text("SELECT id FROM users WHERE email = 'admin@prosell-demo.com'")
        )
        user_row = result.first()

        if not user_row:
            # Hash password
            password = "Admin123!"
            password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
                "utf-8"
            )

            # Create admin user
            await conn.execute(
                text("""
                INSERT INTO users
                (id, email, password_hash, full_name, status, email_verified, tenant_id)
                VALUES (
                    gen_random_uuid(),
                    'admin@prosell-demo.com',
                    :password_hash,
                    'Admin ProSell',
                    'active',
                    true,
                    :tenant_id
                )
            """),
                {"password_hash": password_hash, "tenant_id": org_id},
            )

            print("✅ Admin user created: admin@prosell-demo.com / Admin123!")
        else:
            print("Info:  Admin user already exists")

        # Get user_id (whether newly created or existing)
        result = await conn.execute(
            text("SELECT id FROM users WHERE email = 'admin@prosell-demo.com'")
        )
        user_row = result.first()
        user_id = user_row[0]

        # Ensure admin role exists
        result = await conn.execute(text("SELECT id FROM roles WHERE role_type = 'admin'"))
        role_row = result.first()
        if not role_row:
            await conn.execute(
                text("""
                INSERT INTO roles (id, role_type, name, description, is_system_role)
                VALUES (
                    gen_random_uuid(),
                    'admin',
                    'Administrator',
                    'System administrator with full access',
                    true
                )
            """)
            )
            result = await conn.execute(text("SELECT id FROM roles WHERE role_type = 'admin'"))
            role_row = result.first()
            print("✅ Admin role created")
        admin_role_id = role_row[0]

        # Assign admin role to user (if not already assigned)
        await conn.execute(
            text("""
            INSERT INTO user_roles (user_id, role_id)
            VALUES (:user_id, :role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING
        """),
            {"user_id": user_id, "role_id": admin_role_id},
        )
        print("✅ Admin role assigned to user")

        print("\n📊 Seeding complete!")
        print("   Email: admin@prosell-demo.com")
        print("   Password: Admin123!")
        print("   Organization: ProSell Demo")


if __name__ == "__main__":
    asyncio.run(seed_database())
