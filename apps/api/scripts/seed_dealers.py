#!/usr/bin/env python3
"""Seed dealer organizations with complete example data and unique random colors.

Usage:
    uv run python scripts/seed_dealers.py

Each dealer is its own tenant (1:1 tenant=org relationship).
Colors are randomly generated with similarity checking.
"""

import asyncio
import colorsys
import os
import random

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Minimum RGB distance to consider colors "different enough"
MIN_COLOR_DISTANCE = 80


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#").upper()
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rgb_distance(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def _generate_unique_color(used_colors: set[str]) -> str:
    """Generate a random color different from all used colors."""
    for _ in range(100):
        hue = random.random()
        sat = 0.65 + random.random() * 0.30
        light = 0.30 + random.random() * 0.15
        r, g, b = colorsys.hls_to_rgb(hue, light, sat)
        color = f"#{int(r * 255):02X}{int(g * 255):02X}{int(b * 255):02X}"

        if color.upper() in used_colors:
            continue

        new_rgb = _hex_to_rgb(color)
        too_similar = any(
            _rgb_distance(new_rgb, _hex_to_rgb(used)) < MIN_COLOR_DISTANCE for used in used_colors
        )
        if not too_similar:
            return color

    return color  # fallback


# Dealers with complete example data
DEALERS = [
    {
        "code": "AF",
        "name": "AutoFerro Motors",
        "city": "Ciudad del Este",
        "phone": "+595 61 500 100",
        "email": "ventas@autoferro.com.py",
        "whatsapp": "+595 981 500 100",
        "street_address": "Av. Monseñor Rodríguez 1234",
        "state": "Alto Paraná",
        "instagram": "@autoferromotors",
    },
    {
        "code": "AG",
        "name": "Autos García",
        "city": "Asunción",
        "phone": "+595 21 600 200",
        "email": "info@autosgarcia.com.py",
        "whatsapp": "+595 982 600 200",
        "street_address": "Av. Eusebio Ayala 4567",
        "state": "Central",
        "instagram": "@autosgarcia",
    },
    {
        "code": "CF",
        "name": "CarFast PY",
        "city": "Fernando de la Mora",
        "phone": "+595 21 510 300",
        "email": "contacto@carfast.com.py",
        "whatsapp": "+595 983 510 300",
        "street_address": "Ruta 2 Km 12",
        "state": "Central",
        "instagram": "@carfastpy",
    },
    {
        "code": "DJ",
        "name": "Don José Autos",
        "city": "San Lorenzo",
        "phone": "+595 21 580 400",
        "email": "ventas@donjoseautos.com.py",
        "whatsapp": "+595 984 580 400",
        "street_address": "Av. San José 890",
        "state": "Central",
        "instagram": "@donjoseautos",
    },
    {
        "code": "DK",
        "name": "DK Motors",
        "city": "Luque",
        "phone": "+595 21 645 500",
        "email": "info@dkmotors.com.py",
        "whatsapp": "+595 985 645 500",
        "street_address": "Av. Defensores del Chaco 2345",
        "state": "Central",
        "instagram": "@dkmotorspy",
    },
    {
        "code": "EA",
        "name": "Elite Automotores",
        "city": "Asunción",
        "phone": "+595 21 222 600",
        "email": "elite@eliteauto.com.py",
        "whatsapp": "+595 986 222 600",
        "street_address": "Av. Mariscal López 3456",
        "state": "Central",
        "instagram": "@eliteautomotores",
    },
    {
        "code": "EG",
        "name": "EuroGerman Cars",
        "city": "Asunción",
        "phone": "+595 21 333 700",
        "email": "ventas@eurogerman.com.py",
        "whatsapp": "+595 987 333 700",
        "street_address": "Av. España 1234",
        "state": "Central",
        "instagram": "@eurogermancars",
    },
    {
        "code": "IC",
        "name": "Import Center",
        "city": "Ciudad del Este",
        "phone": "+595 61 501 800",
        "email": "import@importcenter.com.py",
        "whatsapp": "+595 988 501 800",
        "street_address": "Av. San Blas 5678",
        "state": "Alto Paraná",
        "instagram": "@importcenterpy",
    },
    {
        "code": "IM",
        "name": "Import Motors",
        "city": "Encarnación",
        "phone": "+595 71 202 900",
        "email": "info@importmotors.com.py",
        "whatsapp": "+595 989 202 900",
        "street_address": "Av. Irrazábal 890",
        "state": "Itapúa",
        "instagram": "@importmotorspy",
    },
    {
        "code": "IO",
        "name": "IO Automotriz",
        "city": "Asunción",
        "phone": "+595 21 444 010",
        "email": "ventas@ioauto.com.py",
        "whatsapp": "+595 990 444 010",
        "street_address": "Av. Aviadores del Chaco 2100",
        "state": "Central",
        "instagram": "@ioautomotriz",
    },
    {
        "code": "JD",
        "name": "JD Premium Cars",
        "city": "Asunción",
        "phone": "+595 21 555 011",
        "email": "premium@jdcars.com.py",
        "whatsapp": "+595 991 555 011",
        "street_address": "Av. Santa Teresa 3200",
        "state": "Central",
        "instagram": "@jdpremiumcars",
    },
    {
        "code": "LY",
        "name": "Luxury Wheels PY",
        "city": "Asunción",
        "phone": "+595 21 666 012",
        "email": "luxury@luxurywheels.com.py",
        "whatsapp": "+595 992 666 012",
        "street_address": "Av. Brasilia 4500",
        "state": "Central",
        "instagram": "@luxurywheelspy",
    },
    {
        "code": "MF",
        "name": "MegaFeria Autos",
        "city": "Fernando de la Mora",
        "phone": "+595 21 511 013",
        "email": "feria@megaferia.com.py",
        "whatsapp": "+595 993 511 013",
        "street_address": "Ruta 2 Km 15",
        "state": "Central",
        "instagram": "@megaferiaautos",
    },
    {
        "code": "MM",
        "name": "MM Automotores",
        "city": "San Lorenzo",
        "phone": "+595 21 581 014",
        "email": "ventas@mmautos.com.py",
        "whatsapp": "+595 994 581 014",
        "street_address": "Av. Primer Presidente 1500",
        "state": "Central",
        "instagram": "@mmautomotores",
    },
    {
        "code": "OX",
        "name": "OXCars Paraguay",
        "city": "Luque",
        "phone": "+595 21 646 015",
        "email": "info@oxcars.com.py",
        "whatsapp": "+595 995 646 015",
        "street_address": "Av. Aeropuerto 800",
        "state": "Central",
        "instagram": "@oxcarspy",
    },
    {
        "code": "PC",
        "name": "ProCars PY",
        "city": "Asunción",
        "phone": "+595 21 223 016",
        "email": "pro@procars.com.py",
        "whatsapp": "+595 996 223 016",
        "street_address": "Av. Perú 2300",
        "state": "Central",
        "instagram": "@procarspy",
    },
    {
        "code": "PM",
        "name": "Premium Motors",
        "city": "Asunción",
        "phone": "+595 21 334 017",
        "email": "premium@premiummotors.com.py",
        "whatsapp": "+595 997 334 017",
        "street_address": "Av. Sacramento 1800",
        "state": "Central",
        "instagram": "@premiummotorspy",
    },
    {
        "code": "PO",
        "name": "Power Auto",
        "city": "Ciudad del Este",
        "phone": "+595 61 502 018",
        "email": "power@powerauto.com.py",
        "whatsapp": "+595 998 502 018",
        "street_address": "Av. Adrián Jara 3400",
        "state": "Alto Paraná",
        "instagram": "@powerautopy",
    },
    {
        "code": "PS",
        "name": "ProSell Dealers",
        "city": "Asunción",
        "phone": "+595 21 445 019",
        "email": "dealers@prosell.com.py",
        "whatsapp": "+595 999 445 019",
        "street_address": "Av. Mcal. López 5000",
        "state": "Central",
        "instagram": "@proselldealers",
    },
    {
        "code": "PV",
        "name": "PV Automotriz",
        "city": "Encarnación",
        "phone": "+595 71 203 020",
        "email": "ventas@pvautomotriz.com.py",
        "whatsapp": "+595 981 203 020",
        "street_address": "Av. Japón 600",
        "state": "Itapúa",
        "instagram": "@pvautomotriz",
    },
    {
        "code": "RM",
        "name": "Royal Motors",
        "city": "Asunción",
        "phone": "+595 21 556 021",
        "email": "royal@royalmotors.com.py",
        "whatsapp": "+595 982 556 021",
        "street_address": "Av. España 5600",
        "state": "Central",
        "instagram": "@royalmotorspy",
    },
    {
        "code": "SL",
        "name": "Select Autos",
        "city": "San Lorenzo",
        "phone": "+595 21 582 022",
        "email": "select@selectautos.com.py",
        "whatsapp": "+595 983 582 022",
        "street_address": "Av. Eusebio Ayala 8900",
        "state": "Central",
        "instagram": "@selectautospy",
    },
    {
        "code": "TG",
        "name": "Top Gear PY",
        "city": "Asunción",
        "phone": "+595 21 667 023",
        "email": "top@topgear.com.py",
        "whatsapp": "+595 984 667 023",
        "street_address": "Av. Aviadores del Chaco 3500",
        "state": "Central",
        "instagram": "@topgearpy",
    },
    {
        "code": "TJ",
        "name": "TJ Import",
        "city": "Ciudad del Este",
        "phone": "+595 61 503 024",
        "email": "tj@tjimport.com.py",
        "whatsapp": "+595 985 503 024",
        "street_address": "Av. Internacional 2200",
        "state": "Alto Paraná",
        "instagram": "@tjimportpy",
    },
    {
        "code": "TY",
        "name": "Toyota Central",
        "city": "Asunción",
        "phone": "+595 21 224 025",
        "email": "toyota@toyotacentral.com.py",
        "whatsapp": "+595 986 224 025",
        "street_address": "Av. Eusebio Ayala 1200",
        "state": "Central",
        "instagram": "@toyotacentralpy",
    },
    {
        "code": "US",
        "name": "USA Import Cars",
        "city": "Ciudad del Este",
        "phone": "+595 61 504 026",
        "email": "usa@usaimport.com.py",
        "whatsapp": "+595 987 504 026",
        "street_address": "Av. San Blas 7800",
        "state": "Alto Paraná",
        "instagram": "@usaimportcarspy",
    },
    {
        "code": "VL",
        "name": "Vehículos Latinos",
        "city": "Encarnación",
        "phone": "+595 71 204 027",
        "email": "latinos@vlatinos.com.py",
        "whatsapp": "+595 988 204 027",
        "street_address": "Av. Carlos A. López 1100",
        "state": "Itapúa",
        "instagram": "@vehiculoslatinos",
    },
    {
        "code": "ZP",
        "name": "ZonaPro Motors",
        "city": "Fernando de la Mora",
        "phone": "+595 21 512 028",
        "email": "zona@zonapro.com.py",
        "whatsapp": "+595 989 512 028",
        "street_address": "Ruta 2 Km 18",
        "state": "Central",
        "instagram": "@zonapromotors",
    },
]


async def seed_dealers() -> None:
    """Create dealer organizations with complete data and unique random colors."""
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell",
    )
    engine = create_async_engine(database_url)

    async with engine.begin() as conn:
        # Get already used colors
        result = await conn.execute(
            text("SELECT UPPER(color) FROM organizations WHERE color IS NOT NULL")
        )
        used_colors = {row[0] for row in result.fetchall()}

        created = 0
        skipped = 0

        for dealer in DEALERS:
            # Check if exists
            result = await conn.execute(
                text("SELECT 1 FROM organizations WHERE code = :code"),
                {"code": dealer["code"]},
            )
            if result.fetchone():
                skipped += 1
                continue

            # Generate unique color
            color = _generate_unique_color(used_colors)
            used_colors.add(color.upper())

            # Insert with all fields
            await conn.execute(
                text("""
                    INSERT INTO organizations
                        (id, name, code, color, city, state, country,
                         phone, email, whatsapp, street_address, instagram,
                         tenant_id, setup_complete, status, settings)
                    SELECT new_id, :name, :code, :color, :city, :state, 'Paraguay',
                           :phone, :email, :whatsapp, :street_address, :instagram,
                           new_id, false, 'active', '{}'
                    FROM (SELECT gen_random_uuid() AS new_id) AS t
                """),
                {
                    "name": dealer["name"],
                    "code": dealer["code"],
                    "color": color,
                    "city": dealer["city"],
                    "state": dealer.get("state", "Central"),
                    "phone": dealer.get("phone"),
                    "email": dealer.get("email"),
                    "whatsapp": dealer.get("whatsapp"),
                    "street_address": dealer.get("street_address"),
                    "instagram": dealer.get("instagram"),
                },
            )
            created += 1
            print(f"  ✓ {dealer['code']}: {dealer['name']} ({color})")

        print(f"\n✅ Done: {created} created, {skipped} already existed")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_dealers())
