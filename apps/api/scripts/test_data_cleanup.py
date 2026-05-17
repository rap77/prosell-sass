#!/usr/bin/env python3
"""
Test data cleanup script for ProSell SaaS E2E tests.

This script cleans up test data created during E2E test execution.
It can be run:
1. Automatically after each test run
2. Manually between test runs
3. As a scheduled task (cron/CI)

Usage:
    python scripts/test_data_cleanup.py --env testing
    python scripts/test_data_cleanup.py --dry-run
"""

import asyncio
import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add src/ to path so `prosell` package is importable when the script is
# executed directly (e.g. `python scripts/test_data_cleanup.py`).
# __file__ = apps/api/scripts/test_data_cleanup.py
# parent   = apps/api/scripts/
# parent.parent = apps/api/
# parent.parent / "src" = apps/api/src/   ← where prosell lives
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.config import get_settings
from prosell.infrastructure.db.session import get_async_session


async def cleanup_test_data(
    session: AsyncSession,
    dry_run: bool = False,
    hours_old: int = 1,
    verbose: bool = False,
) -> dict[str, int]:
    """
    Clean up test data from the database.

    Args:
        session: Database session
        dry_run: If True, don't actually delete anything
        hours_old: Only delete data older than this many hours
        verbose: Print detailed information

    Returns:
        Dictionary with counts of deleted records
    """
    from prosell.infrastructure.db.models.appointment import AppointmentModel
    from prosell.infrastructure.db.models.lead import LeadModel
    from prosell.infrastructure.db.models.product import ProductModel
    from prosell.infrastructure.db.models.category import CategoryModel

    cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)
    counts = {
        "appointments": 0,
        "leads": 0,
        "products": 0,
        "categories": 0,
    }

    if verbose:
        print(f"Cleaning up test data older than {hours_old} hours (before {cutoff_time})")

    # Clean up appointments
    result = await session.execute(
        delete(AppointmentModel)
        .where(AppointmentModel.created_at < cutoff_time)
        .where(AppointmentModel.tenant_id == "00000000-0000-0000-0000-000000000000")
    )
    counts["appointments"] = result.rowcount
    if verbose:
        print(f"  Appointments to delete: {counts['appointments']}")

    # Clean up leads
    result = await session.execute(
        delete(LeadModel)
        .where(LeadModel.created_at < cutoff_time)
        .where(LeadModel.tenant_id == "00000000-0000-0000-0000-000000000000")
    )
    counts["leads"] = result.rowcount
    if verbose:
        print(f"  Leads to delete: {counts['leads']}")

    # Clean up products (vehicles)
    result = await session.execute(
        delete(ProductModel)
        .where(ProductModel.created_at < cutoff_time)
        .where(ProductModel.tenant_id == "00000000-0000-0000-0000-000000000000")
    )
    counts["products"] = result.rowcount
    if verbose:
        print(f"  Products to delete: {counts['products']}")

    # Clean up categories (only if not used by products)
    result = await session.execute(
        delete(CategoryModel)
        .where(CategoryModel.created_at < cutoff_time)
        .where(CategoryModel.tenant_id == "00000000-0000-0000-0000-000000000000")
        .where(~CategoryModel.id.in_(
            select(ProductModel.category_id)
            .where(ProductModel.tenant_id == "00000000-0000-0000-0000-000000000000")
        ))
    )
    counts["categories"] = result.rowcount
    if verbose:
        print(f"  Categories to delete: {counts['categories']}")

    if not dry_run:
        await session.commit()
        print("✅ Cleanup committed")
    else:
        await session.rollback()
        print("🔍 Dry run - no changes made")

    return counts


async def cleanup_test_users(
    session: AsyncSession,
    dry_run: bool = False,
    hours_old: int = 1,
    verbose: bool = False,
) -> int:
    """
    Clean up test users created during E2E tests.

    Args:
        session: Database session
        dry_run: If True, don't actually delete anything
        hours_old: Only delete users older than this many hours
        verbose: Print detailed information

    Returns:
        Number of deleted users
    """
    from prosell.infrastructure.db.models.user import UserModel

    cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)

    # Delete test users (created within cutoff time, not admin)
    result = await session.execute(
        delete(UserModel)
        .where(UserModel.created_at < cutoff_time)
        .where(UserModel.email.like("%@example.com"))
        .where(UserModel.email != "admin@prosell-demo.com")
    )
    count = result.rowcount

    if verbose:
        print(f"  Test users to delete: {count}")

    if not dry_run:
        await session.commit()
        print("✅ User cleanup committed")
    else:
        await session.rollback()
        print("🔍 Dry run - no changes made")

    return count


async def main():
    """Main cleanup function."""
    parser = argparse.ArgumentParser(description="Clean up test data from database")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument(
        "--hours",
        type=int,
        default=1,
        help="Only delete data older than this many hours (default: 1)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed information",
    )
    parser.add_argument(
        "--cleanup-users",
        action="store_true",
        help="Also clean up test users",
    )

    args = parser.parse_args()

    settings = get_settings()

    if args.verbose:
        print(f"Environment: {settings.environment}")
        print(f"Database: {settings.database_url}")

    async for session in get_async_session():
        try:
            print("\n🧹 Cleaning up test data...")

            # Clean up test entities
            counts = await cleanup_test_data(
                session=session,
                dry_run=args.dry_run,
                hours_old=args.hours,
                verbose=args.verbose,
            )

            total = sum(counts.values())
            print("\n📊 Summary:")
            print(f"  Appointments: {counts['appointments']}")
            print(f"  Leads: {counts['leads']}")
            print(f"  Products: {counts['products']}")
            print(f"  Categories: {counts['categories']}")
            print(f"  ** Total: {total} records")

            # Clean up test users if requested
            if args.cleanup_users:
                print("\n👤 Cleaning up test users...")
                user_count = await cleanup_test_users(
                    session=session,
                    dry_run=args.dry_run,
                    hours_old=args.hours,
                    verbose=args.verbose,
                )
                print(f"  Users deleted: {user_count}")

            print("\n✨ Cleanup complete!")

        except Exception as e:
            print(f"\n❌ Error during cleanup: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
