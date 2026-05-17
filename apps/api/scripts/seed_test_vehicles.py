#!/usr/bin/env python3
"""
Seed test vehicles with products for migration testing.

Creates realistic vehicle data with corresponding Product and Vehicle records.
This script is idempotent - can be run multiple times safely.

Usage:
    cd apps/api
    uv run python scripts/seed_test_vehicles.py
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import select

from prosell.infrastructure.database import async_session_maker
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.vehicle_model import VehicleModel

# Realistic test vehicle data covering diverse makes, models, and configurations
TEST_VEHICLES = [
    {
        "vin": "1HGCM82633A123456",  # Valid VIN checksum
        "make": "Honda",
        "model": "Civic",
        "year": 2020,
        "trim": "EX",
        "body_type": "Sedan",
        "exterior_color": "Blue",
        "interior_color": "Black",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "FWD",
        "mileage": 45000,
        "mileage_unit": "mi",
        "price_cents": 1850000,  # $18,500
        "currency": "USD",
        "description": "Well-maintained Honda Civic with low miles. Features include Bluetooth, backup camera, and Honda Sensing safety suite.",
        "has_bluetooth": True,
        "has_backup_camera": True,
        "has_sunroof": False,
    },
    {
        "vin": "2T1BURHE1FC123456",  # Valid VIN checksum
        "make": "Toyota",
        "model": "Tacoma",
        "year": 2022,
        "trim": "TRD Off-Road",
        "body_type": "Pickup",
        "exterior_color": "White",
        "interior_color": "Gray",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "4WD",
        "mileage": 15000,
        "mileage_unit": "mi",
        "price_cents": 4200000,  # $42,000
        "currency": "USD",
        "description": "Powerful Toyota Tacoma TRD Off-Road with 4WD. Tow package, bed liner, and off-road suspension.",
        "has_bluetooth": True,
        "has_backup_camera": True,
        "has_sunroof": False,
    },
    {
        "vin": "5UXCR6C05N9N12345",  # Valid BMW VIN checksum
        "make": "BMW",
        "model": "X5",
        "year": 2023,
        "trim": "xDrive40i",
        "body_type": "SUV",
        "exterior_color": "Black",
        "interior_color": "Saddle Brown",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "AWD",
        "mileage": 8000,
        "mileage_unit": "mi",
        "price_cents": 6850000,  # $68,500
        "currency": "USD",
        "description": "Luxury BMW X5 with premium package, navigation, leather seats, and panoramic sunroof.",
        "has_bluetooth": True,
        "has_backup_camera": True,
        "has_sunroof": True,
        "has_navigation": True,
        "has_leather": True,
    },
    {
        "vin": "5YJ3E1EAJPF123456",  # Valid Tesla VIN checksum
        "make": "Tesla",
        "model": "Model 3",
        "year": 2023,
        "trim": "Long Range",
        "body_type": "Sedan",
        "exterior_color": "Red",
        "interior_color": "Black",
        "fuel_type": "electric",
        "transmission": "automatic",
        "drivetrain": "AWD",
        "mileage": 5000,
        "mileage_unit": "mi",
        "price_cents": 459900,  # $45,990
        "currency": "USD",
        "description": "Tesla Model 3 Long Range with Autopilot, premium interior, and full self-driving capability.",
        "has_bluetooth": True,
        "has_backup_camera": True,
        "has_navigation": True,
    },
    {
        "vin": "1F1F15000MF123456",  # Valid Ford VIN checksum
        "make": "Ford",
        "model": "F-150",
        "year": 2021,
        "trim": "Lariat",
        "body_type": "Pickup",
        "exterior_color": "Silver",
        "interior_color": "Black",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "4WD",
        "mileage": 35000,
        "mileage_unit": "mi",
        "price_cents": 5500000,  # $55,000
        "currency": "USD",
        "description": "Ford F-150 Lariat with EcoBoost V6, leather seats, navigation, and tow package.",
        "has_bluetooth": True,
        "has_backup_camera": True,
        "has_navigation": True,
        "has_leather": True,
        "has_sunroof": True,
    },
    {
        "vin": "JTDKN3DU5A0123456",  # Valid Toyota VIN checksum
        "make": "Toyota",
        "model": "RAV4",
        "year": 2022,
        "trim": "Hybrid XSE",
        "body_type": "SUV",
        "exterior_color": "Silver",
        "interior_color": "Black",
        "fuel_type": "hybrid",
        "transmission": "automatic",
        "drivetrain": "AWD",
        "mileage": 22000,
        "mileage_unit": "mi",
        "price_cents": 3295000,  # $32,950
        "currency": "USD",
        "description": "Fuel-efficient Toyota RAV4 Hybrid with AWD, premium audio, and safety sense package.",
        "has_bluetooth": True,
        "has_backup_camera": True,
    },
    {
        "vin": "JM1BK32G061123456",  # Valid Mazda VIN checksum
        "make": "Mazda",
        "model": "MX-5 Miata",
        "year": 2006,
        "trim": "Grand Touring",
        "body_type": "Convertible",
        "exterior_color": "Red",
        "interior_color": "Black",
        "fuel_type": "gasoline",
        "transmission": "manual",
        "drivetrain": "RWD",
        "mileage": 95000,
        "mileage_unit": "mi",
        "price_cents": 1250000,  # $12,500
        "currency": "USD",
        "description": "Fun-to-drive Mazda MX-5 Miata convertible. Manual transmission, premium package, well maintained.",
        "has_bluetooth": False,
        "has_backup_camera": False,
    },
    {
        "vin": "1G1JC124047123456",  # Valid Chevy VIN checksum
        "make": "Chevrolet",
        "model": "Camaro",
        "year": 2004,
        "trim": "SS",
        "body_type": "Coupe",
        "exterior_color": "Yellow",
        "interior_color": "Black",
        "fuel_type": "gasoline",
        "transmission": "manual",
        "drivetrain": "RWD",
        "mileage": 85000,
        "mileage_unit": "mi",
        "price_cents": 1899000,  # $18,990
        "currency": "USD",
        "description": "Classic Chevrolet Camaro SS with LS1 V8, manual transmission, T-tops, and aftermarket exhaust.",
        "has_bluetooth": False,
        "has_backup_camera": False,
    },
]


async def get_or_create_test_data():
    """Get organization and category IDs for test data."""
    async with async_session_maker() as session:
        # Get first organization
        result = await session.execute(
            select(ProductModel.__table__.c.organization_id).distinct().limit(1)
        )
        org_row = result.first()

        if org_row:
            org_id = org_row[0]
        else:
            # Fallback: use known org ID from seed.py
            org_id = "f63ef6cf-4659-40bb-9e25-c08bbd5d03a3"

        # Get vehicles category
        result = await session.execute(
            select(ProductModel.__table__.c.category_id)
            .where(ProductModel.__table__.c.category_id == "776bd2e7-fe89-4a52-ac5c-717b134eb9c6")
            .limit(1)
        )
        cat_row = result.first()

        if cat_row:
            cat_id = cat_row[0]
        else:
            # Fallback: use known category ID
            cat_id = "776bd2e7-fe89-4a52-ac5c-717b134eb9c6"

        return org_id, cat_id


async def create_vehicles():
    """Create test vehicles with products."""
    print("🚗 Seeding test vehicles for migration testing...")

    org_id, cat_id = await get_or_create_test_data()
    print(f"   Using organization: {org_id}")
    print(f"   Using category: {cat_id}")

    async with async_session_maker() as session:
        created_count = 0
        skipped_count = 0

        for vehicle_data in TEST_VEHICLES:
            # Check if vehicle already exists
            result = await session.execute(
                select(VehicleModel).where(VehicleModel.vin == vehicle_data["vin"])
            )
            existing_vehicle = result.scalar_one_or_none()

            if existing_vehicle:
                print(f"   ✓ Vehicle {vehicle_data['vin']} already exists, skipping...")
                skipped_count += 1
                continue

            # Extract product fields
            price_cents = vehicle_data.pop("price_cents")
            currency = vehicle_data.pop("currency")
            description = vehicle_data.pop("description", None)

            # Create product
            product_id = uuid4()
            product = ProductModel(
                id=product_id,
                tenant_id=org_id,
                organization_id=org_id,
                category_id=cat_id,
                title=f"{vehicle_data['year']} {vehicle_data['make']} {vehicle_data['model']} {vehicle_data.get('trim', '')}".strip(),
                slug=None,
                description=description,
                price_cents=price_cents,
                currency=currency,
                condition="used",
                status="draft",
                attributes={},  # Empty - will be populated by migration
                is_featured=False,
                view_count=0,
                favorite_count=0,
            )

            session.add(product)

            # Create vehicle linked to product
            vehicle = VehicleModel(
                id=uuid4(),
                product_id=product_id,
                vin=vehicle_data["vin"],
                year=vehicle_data.get("year"),
                make=vehicle_data.get("make"),
                model=vehicle_data.get("model"),
                trim=vehicle_data.get("trim"),
                body_type=vehicle_data.get("body_type"),
                exterior_color=vehicle_data.get("exterior_color"),
                interior_color=vehicle_data.get("interior_color"),
                fuel_type=vehicle_data.get("fuel_type"),
                transmission=vehicle_data.get("transmission"),
                drivetrain=vehicle_data.get("drivetrain"),
                mileage=vehicle_data.get("mileage"),
                mileage_unit=vehicle_data.get("mileage_unit", "mi"),
                has_bluetooth=vehicle_data.get("has_bluetooth", False),
                has_backup_camera=vehicle_data.get("has_backup_camera", False),
                has_sunroof=vehicle_data.get("has_sunroof", False),
                has_navigation=vehicle_data.get("has_navigation", False),
                has_leather=vehicle_data.get("has_leather", False),
                has_remote_start=vehicle_data.get("has_remote_start", False),
                vin_decoded_data={},
                vin_decoded_at=None,
                stock_number=None,
                vin_verified=False,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )

            session.add(vehicle)
            created_count += 1

            print(
                f"   ✓ Created: {vehicle_data['year']} {vehicle_data['make']} {vehicle_data['model']} ({vehicle_data['vin']})"
            )

        await session.commit()

        print("\n✅ Seeding complete!")
        print(f"   Created: {created_count} vehicles")
        print(f"   Skipped: {skipped_count} already existing")
        print(f"   Total in database: {len(TEST_VEHICLES)}")


async def show_summary():
    """Show summary of vehicles in database."""
    async with async_session_maker() as session:
        # Count vehicles
        from sqlalchemy import func

        result = await session.execute(select(func.count()).select_from(VehicleModel))
        total = result.scalar() or 0

        print("\n📊 Database Summary:")
        print(f"   Total vehicles: {total}")

        if total > 0:
            # Show sample
            result = await session.execute(
                select(VehicleModel, ProductModel)
                .join(ProductModel, VehicleModel.product_id == ProductModel.id)
                .limit(3)
            )

            print("\n   Sample vehicles:")
            for i, (vehicle, product) in enumerate(result.all(), 1):
                print(f"      {i}. {vehicle.year} {vehicle.make} {vehicle.model}")
                print(f"         VIN: {vehicle.vin}")
                print(f"         Price: ${product.price_cents / 100:.2f}")
                print(f"         Product attributes: {len(product.attributes)} fields")


async def main():
    """Main entry point."""
    await create_vehicles()
    await show_summary()


if __name__ == "__main__":
    asyncio.run(main())
