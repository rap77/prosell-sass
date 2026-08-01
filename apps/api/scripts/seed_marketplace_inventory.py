"""Load real CSV vehicles into dealer inventories for Marketplace testing.

The script creates independent dealer tenants, grants the selected operator
organization marketplace access, and explicitly assigns each publishable
vehicle to one active FB account. It is idempotent by CSV source ID.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from pathlib import Path
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import select

from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import (
    FBAccountModel,
    product_fb_account_assignments,
)
from prosell.infrastructure.models.organization_marketplace_access_model import (
    OrganizationMarketplaceAccessModel,
)
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

CSV_PATH = Path(__file__).resolve().parents[3] / "docs" / "data39.csv"
DEALER_CODES = ("US", "IC", "PC")


def _int(value: str | None) -> int | None:
    """Return a CSV integer when present and valid."""
    try:
        return int(value) if value else None
    except ValueError:
        return None


async def seed(operator_id: UUID, limit_per_dealer: int) -> None:
    """Create three dealer inventories and distribute eligible vehicles."""
    async with async_session_maker() as session:
        operator = await session.get(OrganizationModel, operator_id)
        if operator is None:
            raise ValueError(f"Operator organization {operator_id} was not found")

        accounts_result = await session.execute(
            select(FBAccountModel)
            .where(FBAccountModel.tenant_id == operator.id)
            .where(FBAccountModel.status == "active")
            .order_by(FBAccountModel.email)
        )
        accounts = accounts_result.scalars().all()
        if not accounts:
            raise ValueError("The operator organization has no active FB accounts")

        category_result = await session.execute(
            select(CategoryModel).where(CategoryModel.slug == "vehiculos-y-transporte")
        )
        vehicle_category = category_result.scalar_one_or_none()
        if vehicle_category is None:
            raise ValueError(
                "Global category 'vehiculos-y-transporte' was not found; seed taxonomy first"
            )

        with CSV_PATH.open(encoding="utf-8-sig", newline="") as csv_file:
            rows = list(csv.DictReader(csv_file, delimiter=";"))

        for dealer_index, dealer_code in enumerate(DEALER_CODES):
            dealer_rows = [row for row in rows if row["cod_dealer"] == dealer_code][
                :limit_per_dealer
            ]
            if not dealer_rows:
                raise ValueError(f"No rows found for dealer code {dealer_code}")

            dealer_result = await session.execute(
                select(OrganizationModel).where(OrganizationModel.code == dealer_code)
            )
            dealer = dealer_result.scalar_one_or_none()
            if dealer is None:
                dealer_id = uuid4()
                dealer = OrganizationModel(
                    id=dealer_id,
                    tenant_id=dealer_id,
                    name=f"Dealer {dealer_code}",
                    code=dealer_code,
                    status="active",
                    settings={},
                )
                session.add(dealer)
                await session.flush()

            access_result = await session.execute(
                select(OrganizationMarketplaceAccessModel).where(
                    OrganizationMarketplaceAccessModel.inventory_owner_organization_id == dealer.id,
                    OrganizationMarketplaceAccessModel.operator_organization_id == operator.id,
                )
            )
            access = access_result.scalar_one_or_none()
            if access is None:
                session.add(
                    OrganizationMarketplaceAccessModel(
                        inventory_owner_organization_id=dealer.id,
                        operator_organization_id=operator.id,
                        can_manage_inventory=True,
                        can_publish_marketplace=True,
                        status="active",
                    )
                )

            for row_index, row in enumerate(dealer_rows):
                source_id = row["id"]
                existing_result = await session.execute(
                    select(ProductModel).where(
                        ProductModel.tenant_id == dealer.id,
                        ProductModel.attributes["source_csv_id"].as_string() == source_id,
                    )
                )
                if existing_result.scalar_one_or_none() is not None:
                    continue

                status_cycle = ("published", "published", "pending", "paused", "sold")
                product_status = status_cycle[row_index % len(status_cycle)]
                year = _int(row["year"])
                make = row["make"].strip()
                model = row["model"].strip()
                product = ProductModel(
                    id=uuid4(),
                    tenant_id=dealer.id,
                    organization_id=dealer.id,
                    category_id=vehicle_category.id,
                    title=f"{dealer_code} {year or ''} {make} {model}".strip(),
                    description=row["description"].strip() or None,
                    price_cents=(_int(row["price"]) or 0) * 100,
                    condition="used",
                    status=product_status,
                    published_to_marketplace=True,
                    location_city="Orlando",
                    location_state="FL",
                    attributes={
                        "source_csv_id": source_id,
                        "stock_number": source_id,
                        "year": year,
                        "make": make,
                        "model": model,
                        "mileage": _int(row["mileage"]),
                        "body_type": row["body_style"].strip(),
                        "vin": row["VIN"].strip() or None,
                    },
                )
                session.add(product)
                await session.flush()

                if product_status == "published":
                    account = accounts[(dealer_index + row_index) % len(accounts)]
                    await session.execute(
                        product_fb_account_assignments.insert().values(
                            product_id=product.id,
                            fb_account_id=account.id,
                        )
                    )

        await session.commit()


def main() -> None:
    """Parse arguments and run the async seed operation."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--operator-id", type=UUID, required=True)
    parser.add_argument("--limit-per-dealer", type=int, default=10)
    args = parser.parse_args()
    asyncio.run(seed(args.operator_id, args.limit_per_dealer))


if __name__ == "__main__":
    main()
