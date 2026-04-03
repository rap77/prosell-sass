#!/usr/bin/env python3
"""
Seed test vehicles for staging E2E testing.

Creates sample vehicles in the database for testing the inventory feature.
Run this script inside the API container or locally with DATABASE_URL set.
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api" / "src"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.database import get_async_session
from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.value_objects.money import Money

# Sample vehicle data
TEST_VEHICLES = [
    {
        "vin": "1HGCM82633A123456",
        "make": "Honda",
        "model": "Civic",
        "year": 2020,
        "trim": "EX",
        "body_type": "Sedan",
        "color": "Blue",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "FWD",
        "odometer": 45000,
        "odometer_unit": "mi",
        "price": 18500.00,
        "currency": "USD",
        "title_status": "clean",
        "condition": "good",
        "description": "Well-maintained Honda Civic with low miles. Features include Bluetooth, backup camera, and Honda Sensing safety suite.",
    },
    {
        "vin": "2T1BURHE1FC123456",
        "make": "Toyota",
        "model": "Corolla",
        "year": 2015,
        "trim": "LE",
        "body_type": "Sedan",
        "color": "White",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "FWD",
        "odometer": 72000,
        "odometer_unit": "mi",
        "price": 14200.00,
        "currency": "USD",
        "title_status": "clean",
        "condition": "good",
        "description": "Reliable Toyota Corolla LE. Great commuter car with excellent fuel economy. Clean title, one owner.",
    },
    {
        "vin": "1F1F15000MF123456",
        "make": "Ford",
        "model": "F-150",
        "year": 2019,
        "trim": "XLT",
        "body_type": "Pickup",
        "color": "Black",
        "fuel_type": "gasoline",
        "transmission": "automatic",
        "drivetrain": "4WD",
        "odometer": 60000,
        "odometer_unit": "mi",
        "price": 32000.00,
        "currency": "USD",
        "title_status": "clean",
        "condition": "excellent",
        "description": "Powerful Ford F-150 XLT with 4WD. Tow package, bed liner, and leather interior. Ready for work or play.",
    },
    {
        "vin": "JM1BK32G061123456",
        "make": "Mazda",
        "model": "MX-5 Miata",
        "year": 2006,
        "trim": "Grand Touring",
        "body_type": "Convertible",
        "color": "Red",
        "fuel_type": "gasoline",
        "transmission": "manual",
        "drivetrain": "RWD",
        "odometer": 95000,
        "odometer_unit": "mi",
        "price": 12500.00,
        "currency": "USD",
        "title_status": "clean",
        "condition": "good",
        "description": "Fun-to-drive Mazda MX-5 Miata convertible. Manual transmission, premium package, well maintained.",
    },
    {
        "vin": "JTDKN3DU5A0123456",
        "make": "Toyota",
        "model": "Prius",
        "year": 2010,
        "trim": "II",
        "body_type": "Hatchback",
        "color": "Silver",
        "fuel_type": "hybrid",
        "transmission": "automatic",
        "drivetrain": "FWD",
        "odometer": 120000,
        "odometer_unit": "mi",
        "price": 8500.00,
        "currency": "USD",
        "title_status": "clean",
        "condition": "fair",
        "description": "Fuel-efficient Toyota Prius hybrid. Great gas mileage, reliable, practical hatchback design.",
    },
]


async def create_vehicles(session: AsyncSession, tenant_id: str) -> int:
    """Create test vehicles in the database."""
    created_count = 0

    for vehicle_data in TEST_VEHICLES:
        # Check if vehicle already exists
        result = await session.execute(select(Vehicle).where(Vehicle.vin == vehicle_data["vin"]))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✓ Vehicle with VIN {vehicle_data['vin']} already exists, skipping...")
            continue

        # Create price Money value object
        price = Money(
            amount=vehicle_data["price"],
            currency=vehicle_data["currency"],
        )

        # Create vehicle entity
        vehicle = Vehicle(
            tenant_id=tenant_id,
            vin=vehicle_data["vin"],
            make=vehicle_data["make"],
            model=vehicle_data["model"],
            year=vehicle_data["year"],
            trim=vehicle_data.get("trim"),
            body_type=vehicle_data["body_type"],
            color=vehicle_data.get("color"),
            fuel_type=vehicle_data["fuel_type"],
            transmission=vehicle_data["transmission"],
            drivetrain=vehicle_data["drivetrain"],
            odometer=vehicle_data["odometer"],
            odometer_unit=vehicle_data["odometer_unit"],
            price=price,
            title_status=vehicle_data["title_status"],
            vehicle_condition=vehicle_data["condition"],
            description=vehicle_data.get("description"),
            is_deleted=False,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        session.add(vehicle)
        created_count += 1
        print(
            f"✓ Created vehicle: {vehicle_data['year']} {vehicle_data['make']} {vehicle_data['model']}"
        )

    await session.commit()
    return created_count


async def main():
    """Main entry point."""
    print("🚗 Seeding test vehicles for staging...")

    # Get the admin user's tenant_id (created in previous session)
    # Admin user ID: 68a2323a-0254-48a4-a2c1-9ff0e29269d9
    # For the admin user, tenant_id equals user_id
    TENANT_ID = "68a2323a-0254-48a4-a2c1-9ff0e29269d9"

    async with get_async_session() as session:
        created_count = await create_vehicles(session, TENANT_ID)

    print(f"\n✅ Successfully created {created_count} test vehicles!")
    print(f"Total vehicles in database: {len(TEST_VEHICLES)}")


if __name__ == "__main__":
    asyncio.run(main())
