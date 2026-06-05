"""Deactivate every non-"vehicles" category per tenant.

The catalog niche is fixed at seed time: the only category that should
be active for sellers is `slug="vehicles"`. Historical drift (open
POST endpoint, ad-hoc admin scripts) may have left extra categories
in the DB. This script soft-deletes them by setting `is_active=False`,
which:

  - Hides them from sellers (the `list_categories` use case already
    filters inactive for non-admins)
  - Preserves the row (and any FK references from products) for
    audit / rollback
  - Is idempotent (re-running is a no-op)

Usage:
    # Dry-run (audit only):
    uv run python -m prosell.scripts.deactivate_non_vehicle_categories --dry-run

    # Apply:
    uv run python -m prosell.scripts.deactivate_non_vehicle_categories
"""

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models import CategoryModel

VEHICLES_SLUG = "vehicles"
_DESCRIPTION = "Deactivate every non-'vehicles' category per tenant (soft-delete, idempotent)."


async def deactivate_non_vehicle_categories(
    session: AsyncSession, dry_run: bool = False
) -> list[CategoryModel]:
    """Return the list of categories that were deactivated (or would be, in dry-run).

    Categories with `slug != "vehicles"` AND `is_active=True` are
    affected. The function commits the change if `dry_run=False`,
    otherwise it just collects and returns the candidates without
    flushing.
    """
    stmt = select(CategoryModel).where(
        CategoryModel.slug != VEHICLES_SLUG,
        CategoryModel.is_active.is_(True),
    )
    result = await session.execute(stmt)
    candidates = list(result.scalars().all())

    if not dry_run:
        for category in candidates:
            category.is_active = False
        await session.commit()

    return candidates


async def _main(dry_run: bool) -> int:
    verb = "Would deactivate" if dry_run else "Deactivated"
    async with async_session_maker() as session:
        affected = await deactivate_non_vehicle_categories(session, dry_run=dry_run)

    if not affected:
        print("No non-vehicle categories found. Nothing to do.")
        return 0

    for category in affected:
        print(f"{verb}: tenant={category.tenant_id} slug={category.slug!r} name={category.name!r}")
    print(f"\nTotal: {len(affected)} category(ies) {verb.lower()}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=_DESCRIPTION)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be deactivated without writing to the DB.",
    )
    args = parser.parse_args()
    return asyncio.run(_main(dry_run=args.dry_run))


if __name__ == "__main__":
    sys.exit(main())
