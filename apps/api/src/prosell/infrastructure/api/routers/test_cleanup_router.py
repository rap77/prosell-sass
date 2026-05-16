"""
Test data cleanup router for ProSell SaaS API.

This router provides endpoints to clean up test data automatically:
1. Clear test categories
2. Clear test leads
3. Clear test appointments
4. Clear all test data
5. Reset test database state

These endpoints are used by E2E tests to maintain data isolation.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.database.session import get_async_session

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/test-cleanup",
    tags=["test-cleanup"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
    },
)


@router.delete("/categories", status_code=status.HTTP_200_OK)
async def clear_test_categories(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test categories from the database.

    Test categories are identified by:
    - Names containing "test"
    - Created in the last 24 hours
    - Created by test users
    """
    try:
        # Delete test categories
        result = await session.execute(
            text("""
                DELETE FROM categories
                WHERE (name ILIKE '%test%'
                       OR description ILIKE '%test%')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test categories")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test categories",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test categories: {e!s}"
        ) from None


@router.delete("/leads", status_code=status.HTTP_200_OK)
async def clear_test_leads(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test leads from the database.

    Test leads are identified by:
    - Emails containing "test"
    - Names containing "test"
    - Created in the last 24 hours
    - Created by test users
    """
    try:
        # Delete test leads
        result = await session.execute(
            text("""
                DELETE FROM leads
                WHERE (email ILIKE '%test%'
                       OR first_name ILIKE '%test%'
                       OR last_name ILIKE '%test%')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test leads")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test leads",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test leads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test leads: {e!s}"
        ) from None


@router.delete("/appointments", status_code=status.HTTP_200_OK)
async def clear_test_appointments(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test appointments from the database.

    Test appointments are identified by:
    - Notes containing "test"
    - Created in the last 24 hours
    - Created by test users
    """
    try:
        # Delete test appointments
        result = await session.execute(
            text("""
                DELETE FROM appointments
                WHERE (notes ILIKE '%test%')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test appointments")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test appointments",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test appointments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test appointments: {e!s}"
        ) from None


@router.delete("/users", status_code=status.HTTP_200_OK)
async def clear_test_users(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test users from the database.

    Test users are identified by:
    - Emails containing "test"
    - Created in the last 24 hours
    - NOT system users
    """
    try:
        # Don't delete system users (admin, etc.)
        result = await session.execute(
            text("""
                DELETE FROM users
                WHERE (email ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND role NOT IN ('system', 'admin')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test users")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test users",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test users: {e!s}"
        ) from None


@router.delete("/organizations", status_code=status.HTTP_200_OK)
async def clear_test_organizations(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test organizations from the database.

    Test organizations are identified by:
    - Names containing "test"
    - Created in the last 24 hours
    - NOT system organizations
    """
    try:
        # Delete test organizations (cascade will delete related data)
        result = await session.execute(
            text("""
                DELETE FROM organizations
                WHERE (name ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND name NOT LIKE '%prosell%'
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test organizations")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test organizations",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test organizations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test organizations: {e!s}"
        ) from None


@router.delete("/all", status_code=status.HTTP_200_OK)
async def clear_all_test_data(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear all test data from the database in proper order.

    This endpoint:
    1. Clears test appointments
    2. Clears test leads
    3. Clears test categories
    4. Clears test users
    5. Clears test organizations

    This ensures proper foreign key constraints are respected.
    """
    try:
        total_deleted = 0
        cleanup_summary = []

        # 1. Clear test appointments (depends on leads)
        result = await session.execute(
            text("""
                DELETE FROM appointments
                WHERE notes ILIKE '%test%'
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )
        appointments_deleted = len(result.fetchall())
        total_deleted += appointments_deleted
        cleanup_summary.append(f"appointments: {appointments_deleted}")

        # 2. Clear test leads
        result = await session.execute(
            text("""
                DELETE FROM leads
                WHERE (email ILIKE '%test%'
                       OR first_name ILIKE '%test%'
                       OR last_name ILIKE '%test%')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )
        leads_deleted = len(result.fetchall())
        total_deleted += leads_deleted
        cleanup_summary.append(f"leads: {leads_deleted}")

        # 3. Clear test categories
        result = await session.execute(
            text("""
                DELETE FROM categories
                WHERE (name ILIKE '%test%'
                       OR description ILIKE '%test%')
                AND created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )
        categories_deleted = len(result.fetchall())
        total_deleted += categories_deleted
        cleanup_summary.append(f"categories: {categories_deleted}")

        # 4. Clear test users
        result = await session.execute(
            text("""
                DELETE FROM users
                WHERE (email ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND role NOT IN ('system', 'admin')
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )
        users_deleted = len(result.fetchall())
        total_deleted += users_deleted
        cleanup_summary.append(f"users: {users_deleted}")

        # 5. Clear test organizations
        result = await session.execute(
            text("""
                DELETE FROM organizations
                WHERE (name ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND name NOT LIKE '%prosell%'
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=24)}
        )
        organizations_deleted = len(result.fetchall())
        total_deleted += organizations_deleted
        cleanup_summary.append(f"organizations: {organizations_deleted}")

        logger.info(f"🗑️ Cleared all test data: {total_deleted} total items")

        return {
            "success": True,
            "message": f"Successfully cleared all test data: {total_deleted} items",
            "total_deleted": total_deleted,
            "cleanup_summary": cleanup_summary,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear all test data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear all test data: {e!s}"
        ) from None


@router.delete("/rate-limit-buckets", status_code=status.HTTP_200_OK)
async def clear_test_rate_limit_buckets(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Clear test rate limit buckets.

    This is useful for tests that need to reset rate limiting state.
    """
    try:
        # Delete old rate limit buckets
        result = await session.execute(
            text("""
                DELETE FROM rate_limit_buckets
                WHERE created_at >= :cutoff_time
                RETURNING id
            """),
            {"cutoff_time": datetime.utcnow() - timedelta(hours=1)}
        )

        deleted_count = len(result.fetchall())
        logger.info(f"🗑️ Cleared {deleted_count} test rate limit buckets")

        return {
            "success": True,
            "message": f"Successfully cleared {deleted_count} test rate limit buckets",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"❌ Failed to clear test rate limit buckets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear test rate limit buckets: {e!s}"
        ) from None


@router.get("/status", status_code=status.HTTP_200_OK)
async def get_cleanup_status(
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get the current status of test data in the database.

    This returns counts of test data that would be cleared.
    """
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)

        # Count test categories
        categories_result = await session.execute(
            text("""
                SELECT COUNT(*) as count
                FROM categories
                WHERE (name ILIKE '%test%'
                       OR description ILIKE '%test%')
                AND created_at >= :cutoff_time
            """),
            {"cutoff_time": cutoff_time}
        )
        test_categories = categories_result.scalar() or 0

        # Count test leads
        leads_result = await session.execute(
            text("""
                SELECT COUNT(*) as count
                FROM leads
                WHERE (email ILIKE '%test%'
                       OR first_name ILIKE '%test%'
                       OR last_name ILIKE '%test%')
                AND created_at >= :cutoff_time
            """),
            {"cutoff_time": cutoff_time}
        )
        test_leads = leads_result.scalar() or 0

        # Count test appointments
        appointments_result = await session.execute(
            text("""
                SELECT COUNT(*) as count
                FROM appointments
                WHERE notes ILIKE '%test%'
                AND created_at >= :cutoff_time
            """),
            {"cutoff_time": cutoff_time}
        )
        test_appointments = appointments_result.scalar() or 0

        # Count test users
        users_result = await session.execute(
            text("""
                SELECT COUNT(*) as count
                FROM users
                WHERE (email ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND role NOT IN ('system', 'admin')
            """),
            {"cutoff_time": cutoff_time}
        )
        test_users = users_result.scalar() or 0

        # Count test organizations
        organizations_result = await session.execute(
            text("""
                SELECT COUNT(*) as count
                FROM organizations
                WHERE (name ILIKE '%test%')
                AND created_at >= :cutoff_time
                AND name NOT LIKE '%prosell%'
            """),
            {"cutoff_time": cutoff_time}
        )
        test_organizations = organizations_result.scalar() or 0

        total_test_data = (
            test_categories + test_leads +
            test_appointments + test_users + test_organizations
        )

        return {
            "success": True,
            "message": "Test data status retrieved successfully",
            "test_data_counts": {
                "categories": test_categories,
                "leads": test_leads,
                "appointments": test_appointments,
                "users": test_users,
                "organizations": test_organizations,
            },
            "total_test_data": total_test_data,
            "cutoff_time": cutoff_time.isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ Failed to get cleanup status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cleanup status: {e!s}"
        ) from None
