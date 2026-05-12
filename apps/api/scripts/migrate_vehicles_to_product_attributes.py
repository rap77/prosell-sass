"""
Migration script to transfer vehicle data from vehicles table to products.attributes JSONB.

DEPRECATED: This script is no longer needed as the migration has been completed.
The vehicles table has been removed and all vehicle data is now stored in
ProductModel.attributes JSONB field.

This script is kept for historical reference only.

Original Usage:
    # Dry run (show what would be migrated)
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py --dry-run

    # Full migration
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py

Features:
    - Async processing with asyncio.TaskGroup for concurrent batch processing
    - Configurable batch size to avoid memory issues
    - Dry-run mode to preview changes
    - Backup table creation before migration
    - Progress reporting and error handling
    - Validation using Pydantic VehicleAttributes schema
    - Comprehensive summary report
"""

import asyncio
import argparse
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import DTOs
from prosell.application.dto.product.attributes import VehicleAttributes
from prosell.infrastructure.models.product_model import ProductModel

# Type alias for ProductModel with vehicle attributes (for historical reference)
# Note: VehicleModel was removed after migration to ProductModel.attributes
# This script is kept for reference but should not be used
VehicleModel = ProductModel  # type: ignore[misc,assignment]

# Type annotation for async session maker
AsyncSessionMaker = async_sessionmaker[AsyncSession]


class MigrationStats:
    """Track migration statistics."""
    
    def __init__(self) -> None:
        self.total_vehicles: int = 0
        self.total_products: int = 0
        self.migrated: int = 0
        self.failed: int = 0
        self.errors: list[dict[str, Any]] = []
        
    def add_error(self, vehicle_id: str, product_id: str | None, error: str) -> None:
        """Record a migration error."""
        self.failed += 1
        self.errors.append({
            "vehicle_id": vehicle_id,
            "product_id": product_id,
            "error": error,
        })


_SQL_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def quote_sql_identifier(identifier: str) -> str:
    """Validate and quote a SQL identifier."""
    if not _SQL_IDENTIFIER_PATTERN.fullmatch(identifier):
        raise ValueError(f"Invalid SQL identifier: {identifier}")
    return f'"{identifier}"'


def transform_vehicle_to_attributes(vehicle: ProductModel) -> dict[str, Any]:
    """
    Transform ProductModel with vehicle attributes to VehicleAttributes dict.

    Args:
        vehicle: ProductModel instance with vehicle attributes

    Returns:
        Dict suitable for ProductModel.attributes JSONB field

    Raises:
        ValueError: If VIN validation fails or required fields missing
    """
    # Get existing attributes or create new ones
    existing_attrs = vehicle.attributes or {}

    # Validate VIN length if present (required field)
    vin = existing_attrs.get("vin", "")
    if not vin or len(str(vin)) != 17:
        raise ValueError(f"Invalid VIN: {vin} (must be 17 characters)")

    # Build attributes dict matching VehicleAttributes schema
    # Use existing attributes as base, ensuring required fields are present
    attrs: dict[str, Any] = {
        # Discriminator
        "category": "vehicle",

        # Required fields (from existing attributes or defaults)
        "vin": str(vin).upper(),
        "make": str(existing_attrs.get("make", "Unknown")),
        "model": str(existing_attrs.get("model", "Unknown")),
        "year": int(str(existing_attrs.get("year", 2020))),  # type: ignore[arg-type]
        "mileage": float(str(existing_attrs.get("mileage", 0))),

        # Optional fields (preserve from existing)
        "trim": existing_attrs.get("trim"),
        "body_type": existing_attrs.get("body_type"),
        "drivetrain": existing_attrs.get("drivetrain"),
        "transmission": existing_attrs.get("transmission"),
        "engine": existing_attrs.get("engine"),
        "fuel_type": existing_attrs.get("fuel_type"),

        # MPG (optional)
        "mpg_city": existing_attrs.get("mpg_city"),
        "mpg_highway": existing_attrs.get("mpg_highway"),
        "mpg_combined": existing_attrs.get("mpg_combined"),

        # Mileage unit
        "mileage_unit": existing_attrs.get("mileage_unit", "miles") if existing_attrs.get("mileage_unit") in ("miles", "km") else "miles",

        # Colors
        "exterior_color": existing_attrs.get("exterior_color"),
        "interior_color": existing_attrs.get("interior_color"),

        # Features (boolean flags)
        "has_sunroof": existing_attrs.get("has_sunroof", False),
        "has_navigation": existing_attrs.get("has_navigation", False),
        "has_leather": existing_attrs.get("has_leather", False),
        "has_backup_camera": existing_attrs.get("has_backup_camera", False),
        "has_bluetooth": existing_attrs.get("has_bluetooth", False),
        "has_remote_start": existing_attrs.get("has_remote_start", False),

        # Additional fields
        "seat_material": existing_attrs.get("seat_material"),
        "stock_number": existing_attrs.get("stock_number"),
        "vin_verified": existing_attrs.get("vin_verified", False),
    }

    # Remove None values to keep JSONB clean
    return {k: v for k, v in attrs.items() if v is not None}


async def create_backup_table(session: AsyncSession) -> None:
    """Create backup of products table before migration."""
    backup_table = f"products_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_table_identifier = quote_sql_identifier(backup_table)

    await session.execute(
        text(
            f"""
        CREATE TABLE {backup_table_identifier} AS
        SELECT * FROM products
    """
        )
    )

    # Create indexes on backup table
    backup_id_index = quote_sql_identifier(f"ix_{backup_table}_id")
    backup_vehicle_index = quote_sql_identifier(f"ix_{backup_table}_vehicle_id")

    await session.execute(
        text(
            f"""
        CREATE INDEX {backup_id_index}
        ON {backup_table_identifier}(id)
    """
        )
    )

    await session.execute(
        text(
            f"""
        CREATE INDEX {backup_vehicle_index}
        ON {backup_table_identifier}(id)
        WHERE id IN (SELECT product_id FROM vehicles)
    """
        )
    )

    await session.commit()
    print(f"✅ Created backup table: {backup_table}")


async def get_migration_stats(session: AsyncSession) -> tuple[int, int]:
    """Get counts of vehicles and products."""
    # Count products with vehicle category
    vehicle_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(text("attributes->>'category' = 'vehicle'"))
    )
    total_vehicles = vehicle_count.scalar() or 0

    # Count all products
    product_count = await session.execute(
        select(func.count()).select_from(ProductModel)
    )
    total_products = product_count.scalar() or 0

    return total_vehicles, total_products


async def verify_migration(session: AsyncSession) -> dict[str, Any]:
    """
    Verify migration results.

    Returns:
        Dict with verification statistics
    """
    # Count products with vehicle category
    vehicle_category_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(text("attributes->>'category' = 'vehicle'"))
    )
    vehicle_products = vehicle_category_count.scalar() or 0

    # Count products with vehicle category but missing VIN
    missing_vin_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(
            text("attributes->>'category' = 'vehicle'"),
            text("attributes->>'vin' IS NULL")
        )
    )
    missing_vin = missing_vin_count.scalar() or 0

    # Count products with invalid VIN (not 17 chars)
    invalid_vin_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(
            text("attributes->>'category' = 'vehicle'"),
            text("LENGTH(attributes->>'vin') != 17")
        )
    )
    invalid_vin = invalid_vin_count.scalar() or 0

    return {
        "vehicle_category_products": vehicle_products,
        "missing_vin": missing_vin,
        "invalid_vin": invalid_vin,
    }


async def migrate_vehicle_batch(
    session: AsyncSession,
    vehicles: list[ProductModel],
    stats: MigrationStats,
    dry_run: bool = False,
) -> None:
    """
    Migrate a batch of vehicles to product attributes.

    Args:
        session: Async database session
        vehicles: List of ProductModel instances with vehicle attributes
        stats: MigrationStats instance to track progress
        dry_run: If True, don't commit changes
    """
    for vehicle in vehicles:
        try:
            # Transform vehicle data to attributes
            attrs = transform_vehicle_to_attributes(vehicle)

            # Validate with Pydantic schema
            VehicleAttributes.model_validate(attrs)

            if not dry_run:
                # Update product attributes
                from datetime import datetime, UTC
                await session.execute(
                    update(ProductModel)
                    .where(ProductModel.id == vehicle.id)
                    .values(attributes=attrs, updated_at=datetime.now(UTC))
                )

            stats.migrated += 1

        except Exception as e:
            stats.add_error(
                vehicle_id=str(vehicle.id),
                product_id=str(vehicle.id),
                error=str(e),
            )

    if not dry_run:
        await session.commit()


async def migrate_vehicles(
    database_url: str,
    batch_size: int = 50,
    dry_run: bool = False,
    backup: bool = False,
) -> MigrationStats:
    """
    Main migration function.
    
    Args:
        database_url: PostgreSQL database URL
        batch_size: Number of vehicles to process per batch
        dry_run: If True, don't make any changes
        backup: If True, create backup table before migration
        
    Returns:
        MigrationStats with migration results
    """
    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session_maker: AsyncSessionMaker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    stats = MigrationStats()

    async with async_session_maker() as session:
        # Get initial stats
        print("📊 Analyzing database...")
        stats.total_vehicles, stats.total_products = await get_migration_stats(session)

        print(f"   Found {stats.total_vehicles} vehicles")
        print(f"   Found {stats.total_products} products with vehicles")

        if stats.total_vehicles == 0:
            print("⚠️  No vehicles found to migrate")
            return stats

        # Create backup if requested
        if backup and not dry_run:
            print("💾 Creating backup table...")
            await create_backup_table(session)

        # Fetch all products with vehicle category with pagination
        offset = 0
        batch_num = 0

        while True:
            # Fetch batch
            result = await session.execute(
                select(ProductModel)
                .where(text("attributes->>'category' = 'vehicle'"))
                .offset(offset)
                .limit(batch_size)
            )
            products = list(result.scalars().all())

            if not products:
                break  # No more products

            batch_num += 1
            print(f"📦 Processing batch {batch_num} ({len(products)} products)...")

            # Migrate batch
            await migrate_vehicle_batch(
                session=session,
                vehicles=list(products),
                stats=stats,
                dry_run=dry_run,
            )

            # Progress update
            print(f"   ✅ Migrated: {stats.migrated}")
            if stats.failed > 0:
                print(f"   ❌ Failed: {stats.failed}")

            offset += batch_size

            # Stop if we've processed all products
            if len(products) < batch_size:
                break

        # Verify migration
        if not dry_run and stats.migrated > 0:
            print("\n🔍 Verifying migration...")
            verification = await verify_migration(session)
            print(f"   Products with vehicle category: {verification['vehicle_category_products']}")
            print(f"   Missing VIN: {verification['missing_vin']}")
            print(f"   Invalid VIN: {verification['invalid_vin']}")
    
    await engine.dispose()
    return stats


def print_summary(stats: MigrationStats, dry_run: bool) -> None:
    """Print migration summary."""
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Total products with vehicle category: {stats.total_vehicles}")
    print(f"Total products: {stats.total_products}")
    print(f"Validated: {stats.migrated}")
    print(f"Failed: {stats.failed}")

    if stats.errors:
        print(f"\n❌ Errors ({len(stats.errors)}):")
        for i, error in enumerate(stats.errors[:10], 1):  # Show first 10
            print(f"   {i}. Product {error['vehicle_id']}: {error['error']}")

        if len(stats.errors) > 10:
            print(f"   ... and {len(stats.errors) - 10} more errors")

    print("="*60)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate vehicle data to product attributes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run
  %(prog)s --dry-run
  
  # Full migration
  %(prog)s
  
  # With backup
  %(prog)s --backup
  
  # Custom batch size
  %(prog)s --batch-size 100
        """
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes",
    )
    
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of vehicles to process per batch (default: 50)",
    )
    
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Create backup table before migration",
    )
    
    args = parser.parse_args()
    
    # Get database URL from environment
    import os
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell"
    )
    
    print("🚀 Starting vehicle to product attributes migration...")
    print(f"   Database: {database_url.split('@')[1] if '@' in database_url else 'unknown'}")
    print(f"   Batch size: {args.batch_size}")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    if args.backup and not args.dry_run:
        print(f"   Backup: ENABLED")
    print()
    
    # Run migration
    stats = asyncio.run(migrate_vehicles(
        database_url=database_url,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        backup=args.backup,
    ))
    
    # Print summary
    print_summary(stats, args.dry_run)
    
    # Exit with error code if any failures
    if stats.failed > 0 and not args.dry_run:
        sys.exit(1)


if __name__ == "__main__":
    main()

"""
==============================================================================
ROLLBACK SQL (use if migration needs to be reverted)
==============================================================================

-- Find backup table name
SELECT tablename FROM pg_tables WHERE tablename LIKE 'products_backup_%';

-- Restore from backup (replace with actual backup table name)
BEGIN;
  -- Drop current products table
  DROP TABLE products CASCADE;
  
  -- Rename backup to products
  ALTER TABLE products_backup_YYYYMMDD_HHMMSS RENAME TO products;
  
  -- Recreate indexes
  CREATE INDEX ix_products_attributes_gin ON products 
    USING gin (attributes jsonb_path_ops);
  CREATE INDEX ix_products_tenant_id ON products(tenant_id);
  CREATE INDEX ix_products_organization_id ON products(organization_id);
  CREATE INDEX ix_products_category_id ON products(category_id);
  CREATE INDEX ix_products_slug ON products(slug);
  CREATE INDEX ix_products_condition ON products(condition);
  CREATE INDEX ix_products_status ON products(status);
  CREATE INDEX ix_products_is_featured ON products(is_featured);
COMMIT;

-- Alternative: Clear attributes from products (keep data, remove migration)
UPDATE products 
SET attributes = '{}'::jsonb 
WHERE attributes->>'category' = 'vehicle';

==============================================================================
"""
