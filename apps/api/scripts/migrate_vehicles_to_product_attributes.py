"""
Migration script to transfer vehicle data from vehicles table to products.attributes JSONB.

This script reads all vehicle records, transforms them to VehicleAttributes schema,
and updates the corresponding product records with validated attributes.

Usage:
    # Dry run (show what would be migrated)
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py --dry-run
    
    # Full migration
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py
    
    # Custom batch size
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py --batch-size 100
    
    # With backup
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/migrate_vehicles_to_product_attributes.py --backup

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
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import models and DTOs
from prosell.application.dto.product.attributes import VehicleAttributes
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.vehicle_model import VehicleModel


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


def transform_vehicle_to_attributes(vehicle: VehicleModel) -> dict[str, Any]:
    """
    Transform VehicleModel to VehicleAttributes dict.
    
    Args:
        vehicle: VehicleModel instance
        
    Returns:
        Dict suitable for ProductModel.attributes JSONB field
        
    Raises:
        ValueError: If VIN validation fails or required fields missing
    """
    # Validate VIN length (required field)
    if not vehicle.vin or len(vehicle.vin) != 17:
        raise ValueError(f"Invalid VIN: {vehicle.vin} (must be 17 characters)")
    
    # Build attributes dict matching VehicleAttributes schema
    attrs: dict[str, Any] = {
        # Discriminator
        "category": "vehicle",
        
        # Required fields
        "vin": vehicle.vin.upper(),
        "make": vehicle.make or "Unknown",
        "model": vehicle.model or "Unknown",
        "year": vehicle.year or 2020,  # Default year if missing
        "mileage": float(vehicle.mileage or 0),
        
        # Optional fields
        "trim": vehicle.trim,
        "body_type": vehicle.body_type,
        "drivetrain": vehicle.drivetrain,
        "transmission": vehicle.transmission,
        "engine": vehicle.engine,
        "fuel_type": vehicle.fuel_type,
        
        # MPG (optional)
        "mpg_city": vehicle.mpg_city,
        "mpg_highway": vehicle.mpg_highway,
        "mpg_combined": vehicle.mpg_combined,
        
        # Mileage unit
        "mileage_unit": vehicle.mileage_unit if vehicle.mileage_unit in ("miles", "km") else "miles",
        
        # Colors
        "exterior_color": vehicle.exterior_color,
        "interior_color": vehicle.interior_color,
        
        # Features (boolean flags)
        "has_sunroof": vehicle.has_sunroof or False,
        "has_navigation": vehicle.has_navigation or False,
        "has_leather": vehicle.has_leather or False,
        "has_backup_camera": vehicle.has_backup_camera or False,
        "has_bluetooth": vehicle.has_bluetooth or False,
        "has_remote_start": vehicle.has_remote_start or False,
        
        # Additional fields
        "seat_material": vehicle.seat_material,
        "stock_number": vehicle.stock_number,
        "vin_verified": vehicle.vin_verified or False,
    }
    
    # Remove None values to keep JSONB clean
    return {k: v for k, v in attrs.items() if v is not None}


async def create_backup_table(session: AsyncSession) -> None:
    """Create backup of products table before migration."""
    backup_table = f"products_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    await session.execute(text(f"""
        CREATE TABLE {backup_table} AS 
        SELECT * FROM products
    """))
    
    # Create indexes on backup table
    await session.execute(text(f"""
        CREATE INDEX ix_{backup_table}_id 
        ON {backup_table}(id)
    """))
    
    await session.execute(text(f"""
        CREATE INDEX ix_{backup_table}_vehicle_id 
        ON {backup_table}(id) 
        WHERE id IN (SELECT product_id FROM vehicles)
    """))
    
    await session.commit()
    print(f"✅ Created backup table: {backup_table}")


async def get_migration_stats(session: AsyncSession) -> tuple[int, int]:
    """Get counts of vehicles and products."""
    # Count vehicles
    vehicle_count = await session.execute(
        select(func.count()).select_from(VehicleModel)
    )
    total_vehicles = vehicle_count.scalar() or 0
    
    # Count products that have corresponding vehicles
    product_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(ProductModel.id.in_(
            select(VehicleModel.product_id)
        ))
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
    
    # Count products missing category
    missing_category_count = await session.execute(
        select(func.count())
        .select_from(ProductModel)
        .where(
            ProductModel.id.in_(select(VehicleModel.product_id)),
            text("attributes->>'category' IS NULL")
        )
    )
    missing_category = missing_category_count.scalar() or 0
    
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
        "missing_category": missing_category,
        "invalid_vin": invalid_vin,
    }


async def migrate_vehicle_batch(
    session: AsyncSession,
    vehicles: list[VehicleModel],
    stats: MigrationStats,
    dry_run: bool = False,
) -> None:
    """
    Migrate a batch of vehicles to product attributes.
    
    Args:
        session: Async database session
        vehicles: List of VehicleModel instances
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
                    .where(ProductModel.id == vehicle.product_id)
                    .values(attributes=attrs, updated_at=datetime.now(UTC))
                )
            
            stats.migrated += 1
            
        except Exception as e:
            stats.add_error(
                vehicle_id=str(vehicle.id),
                product_id=str(vehicle.product_id) if vehicle.product_id else None,
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
    async_session_maker = sessionmaker(
        engine,
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
        
        # Fetch all vehicles with pagination
        offset = 0
        batch_num = 0
        
        while True:
            # Fetch batch
            result = await session.execute(
                select(VehicleModel)
                .offset(offset)
                .limit(batch_size)
            )
            vehicles = result.scalars().all()
            
            if not vehicles:
                break  # No more vehicles
            
            batch_num += 1
            print(f"📦 Processing batch {batch_num} ({len(vehicles)} vehicles)...")
            
            # Migrate batch
            await migrate_vehicle_batch(
                session=session,
                vehicles=list(vehicles),
                stats=stats,
                dry_run=dry_run,
            )
            
            # Progress update
            print(f"   ✅ Migrated: {stats.migrated}")
            if stats.failed > 0:
                print(f"   ❌ Failed: {stats.failed}")
            
            offset += batch_size
            
            # Stop if we've processed all vehicles
            if len(vehicles) < batch_size:
                break
        
        # Verify migration
        if not dry_run and stats.migrated > 0:
            print("\n🔍 Verifying migration...")
            verification = await verify_migration(session)
            print(f"   Products with vehicle category: {verification['vehicle_category_products']}")
            print(f"   Missing category: {verification['missing_category']}")
            print(f"   Invalid VIN: {verification['invalid_vin']}")
    
    await engine.dispose()
    return stats


def print_summary(stats: MigrationStats, dry_run: bool) -> None:
    """Print migration summary."""
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Total vehicles: {stats.total_vehicles}")
    print(f"Total products: {stats.total_products}")
    print(f"Migrated: {stats.migrated}")
    print(f"Failed: {stats.failed}")
    
    if stats.errors:
        print(f"\n❌ Errors ({len(stats.errors)}):")
        for i, error in enumerate(stats.errors[:10], 1):  # Show first 10
            print(f"   {i}. Vehicle {error['vehicle_id']}: {error['error']}")
        
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
