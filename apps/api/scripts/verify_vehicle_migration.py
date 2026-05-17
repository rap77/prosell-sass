"""
Verification script for vehicle to product attributes migration.

Run this after migration to verify data integrity.

Usage:
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db" \\
    uv run python scripts/verify_vehicle_migration.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.vehicle_model import VehicleModel


async def verify_migration(database_url: str) -> None:
    """Verify migration results."""

    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        print("🔍 Verifying vehicle to product attributes migration...\n")

        # 1. Count vehicles
        vehicle_count = await session.execute(select(func.count()).select_from(VehicleModel))
        total_vehicles = vehicle_count.scalar() or 0
        print(f"1️⃣  Total vehicles: {total_vehicles}")

        # 2. Count products with vehicle category
        vehicle_category_count = await session.execute(
            select(func.count())
            .select_from(ProductModel)
            .where(text("attributes->>'category' = 'vehicle'"))
        )
        vehicle_products = vehicle_category_count.scalar() or 0
        print(f"2️⃣  Products with vehicle category: {vehicle_products}")

        # 3. Check for missing categories
        missing_category_count = await session.execute(
            select(func.count())
            .select_from(ProductModel)
            .where(
                ProductModel.id.in_(select(VehicleModel.product_id)),
                text("attributes->>'category' IS NULL"),
            )
        )
        missing_category = missing_category_count.scalar() or 0
        print(f"3️⃣  Products missing category: {missing_category}")

        # 4. Check for invalid VINs
        invalid_vin_count = await session.execute(
            select(func.count())
            .select_from(ProductModel)
            .where(
                text("attributes->>'category' = 'vehicle'"),
                text("LENGTH(attributes->>'vin') != 17"),
            )
        )
        invalid_vin = invalid_vin_count.scalar() or 0
        print(f"4️⃣  Products with invalid VIN: {invalid_vin}")

        # 5. Check for missing required fields
        missing_make_count = await session.execute(
            select(func.count())
            .select_from(ProductModel)
            .where(text("attributes->>'category' = 'vehicle'"), text("attributes->>'make' IS NULL"))
        )
        missing_make = missing_make_count.scalar() or 0
        print(f"5️⃣  Products missing make: {missing_make}")

        missing_model_count = await session.execute(
            select(func.count())
            .select_from(ProductModel)
            .where(
                text("attributes->>'category' = 'vehicle'"), text("attributes->>'model' IS NULL")
            )
        )
        missing_model = missing_model_count.scalar() or 0
        print(f"6️⃣  Products missing model: {missing_model}")

        # 6. Sample migrated data
        print("\n📋 Sample migrated data (first 5):")
        result = await session.execute(
            select(ProductModel).where(text("attributes->>'category' = 'vehicle'")).limit(5)
        )
        products = result.scalars().all()

        for i, product in enumerate(products, 1):
            attrs = product.attributes
            print(f"\n   {i}. Product: {product.title}")
            print(f"      VIN: {attrs.get('vin', 'N/A')}")
            print(
                f"      Make/Model: {attrs.get('make', 'N/A')} {attrs.get('model', 'N/A')} {attrs.get('year', 'N/A')}"
            )
            print(
                f"      Mileage: {attrs.get('mileage', 'N/A')} {attrs.get('mileage_unit', 'miles')}"
            )

        # Summary
        print("\n" + "=" * 60)
        print("VERIFICATION SUMMARY")
        print("=" * 60)

        issues = []
        if missing_category > 0:
            issues.append(f"⚠️  {missing_category} products missing category")
        if invalid_vin > 0:
            issues.append(f"⚠️  {invalid_vin} products with invalid VIN")
        if missing_make > 0:
            issues.append(f"⚠️  {missing_make} products missing make")
        if missing_model > 0:
            issues.append(f"⚠️  {missing_model} products missing model")

        if total_vehicles == vehicle_products and not issues:
            print("✅ All checks passed!")
            print(f"   {total_vehicles} vehicles → {vehicle_products} products migrated")
        else:
            print("❌ Issues found:")
            for issue in issues:
                print(f"   {issue}")

            if total_vehicles != vehicle_products:
                print(f"   ⚠️  Mismatch: {total_vehicles} vehicles vs {vehicle_products} products")

        print("=" * 60)

    await engine.dispose()


def main() -> None:
    """Main entry point."""
    import os

    database_url = os.getenv(
        "DATABASE_URL", "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell"
    )

    asyncio.run(verify_migration(database_url))


if __name__ == "__main__":
    main()
