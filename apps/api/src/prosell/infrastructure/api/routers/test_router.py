"""Test utilities router for E2E testing.

Provides endpoints for creating and cleaning up test data.
ONLY available in development/testing environments.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.config import settings
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.infrastructure.api.dependencies import get_async_session
from prosell.infrastructure.api.middleware.auth_middleware import get_current_user
from prosell.infrastructure.models.appointment_model import AppointmentModel
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.lead_model import LeadModel
from prosell.infrastructure.models.product_model import ProductModel

router = APIRouter(prefix="/test", tags=["test"])


# Request/Response Models
class CleanupRequest(BaseModel):
    """Request model for test data cleanup.

    If specific ID lists are provided, only those IDs are deleted (safe for parallel tests).
    If no IDs are provided, falls back to deleting all data for the tenant (legacy behavior).
    """

    tenant_id: UUID
    # Specific IDs to delete (recommended — avoids race conditions in parallel tests)
    appointment_ids: list[UUID] = []
    lead_ids: list[UUID] = []
    product_ids: list[UUID] = []
    category_ids: list[UUID] = []


class CleanupResponse(BaseModel):
    """Response model for test data cleanup."""

    success: bool
    message: str
    deleted_counts: dict[str, int]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    environment: str


def verify_test_environment() -> None:
    """Verify that we're in a test/development environment.

    Raises:
        HTTPException: If not in development/testing mode
    """
    if settings.environment not in ["development", "testing"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test utilities are only available in development/testing environments",
        )


@router.get("/health", response_model=HealthResponse)
async def test_health() -> HealthResponse:
    """Health check for test utilities endpoint.

    Returns:
        HealthResponse with status and environment
    """
    verify_test_environment()

    return HealthResponse(
        status="ok",
        environment=settings.environment,
    )


@router.delete("/cleanup", response_model=CleanupResponse)
async def cleanup_test_data(
    request: CleanupRequest,
    _current_user: Annotated[AbstractUserRepository, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> CleanupResponse:
    """Cleanup test data by tenant_id.

    Soft-deletes all entities created during tests:
    - categories
    - products/vehicles
    - leads
    - appointments

    Args:
        request: CleanupRequest with tenant_id
        current_user: Authenticated user (must be admin)
        db: Database session

    Returns:
        CleanupResponse with summary of deleted records

    Raises:
        HTTPException: If not in dev/test environment or user lacks permissions
    """
    verify_test_environment()

    tenant_id = request.tenant_id
    deleted_counts: dict[str, int] = {"appointments": 0, "leads": 0, "products": 0, "categories": 0}

    # Use specific-ID mode when any IDs are provided.
    # If NO IDs are provided (all lists empty), return early — nothing to clean up.
    # This avoids accidentally deleting ALL tenant data when no test data was created.
    has_appointments = len(request.appointment_ids) > 0
    has_leads = len(request.lead_ids) > 0
    has_products = len(request.product_ids) > 0
    has_categories = len(request.category_ids) > 0
    use_specific_ids = has_appointments or has_leads or has_products or has_categories

    if not use_specific_ids:
        return CleanupResponse(
            success=True,
            message="No test records to clean up (no IDs provided)",
            deleted_counts={"appointments": 0, "leads": 0, "products": 0, "categories": 0},
        )

    try:
        # Delete in dependency order: appointments → leads → products → categories

        # 1. Appointments
        if use_specific_ids:
            if request.appointment_ids:
                result = await db.execute(
                    delete(AppointmentModel).where(
                        AppointmentModel.id.in_(request.appointment_ids),
                        AppointmentModel.tenant_id == tenant_id,
                    )
                )
                deleted_counts["appointments"] = result.rowcount  # type: ignore[attr-defined]
        else:
            result = await db.execute(
                delete(AppointmentModel).where(AppointmentModel.tenant_id == tenant_id)
            )
            deleted_counts["appointments"] = result.rowcount  # type: ignore[attr-defined]
        await db.commit()

        # 2. Leads
        if use_specific_ids:
            if request.lead_ids:
                result = await db.execute(
                    delete(LeadModel).where(
                        LeadModel.id.in_(request.lead_ids),
                        LeadModel.tenant_id == tenant_id,
                    )
                )
                deleted_counts["leads"] = result.rowcount  # type: ignore[attr-defined]
        else:
            result = await db.execute(delete(LeadModel).where(LeadModel.tenant_id == tenant_id))
            deleted_counts["leads"] = result.rowcount  # type: ignore[attr-defined]
        await db.commit()

        # 3. Products
        if use_specific_ids:
            if request.product_ids:
                result = await db.execute(
                    delete(ProductModel).where(
                        ProductModel.id.in_(request.product_ids),
                        ProductModel.tenant_id == tenant_id,
                    )
                )
                deleted_counts["products"] = result.rowcount  # type: ignore[attr-defined]
        else:
            result = await db.execute(
                delete(ProductModel).where(ProductModel.tenant_id == tenant_id)
            )
            deleted_counts["products"] = result.rowcount  # type: ignore[attr-defined]
        await db.commit()

        # 4. Categories — first purge any residual products referencing these categories
        # (products from previous test runs that weren't cleaned up) to avoid FK violations
        if use_specific_ids:
            if request.category_ids:
                await db.execute(
                    delete(ProductModel).where(
                        ProductModel.category_id.in_(request.category_ids),
                        ProductModel.tenant_id == tenant_id,
                    )
                )
                await db.commit()
                result = await db.execute(
                    delete(CategoryModel).where(
                        CategoryModel.id.in_(request.category_ids),
                        CategoryModel.tenant_id == tenant_id,
                    )
                )
                deleted_counts["categories"] = result.rowcount  # type: ignore[attr-defined]
        else:
            result = await db.execute(
                delete(CategoryModel).where(CategoryModel.tenant_id == tenant_id)
            )
            deleted_counts["categories"] = result.rowcount  # type: ignore[attr-defined]
        await db.commit()

        total_deleted = sum(deleted_counts.values())

        return CleanupResponse(
            success=True,
            message=f"Successfully deleted {total_deleted} test records",
            deleted_counts=deleted_counts,
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up test data: {e!s}",
        ) from e


@router.get("/stats/{tenant_id}")
async def get_test_data_stats(
    tenant_id: UUID,
    _current_user: Annotated[AbstractUserRepository, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> dict[str, int]:
    """Get statistics about test data for a tenant.

    Args:
        tenant_id: Tenant ID to get stats for
        current_user: Authenticated user (must be admin)
        db: Database session

    Returns:
        Dictionary with counts of each entity type
    """
    verify_test_environment()

    stats: dict[str, int] = {}

    # Count categories
    result_categories = await db.execute(
        select(CategoryModel).where(CategoryModel.tenant_id == tenant_id)
    )
    stats["categories"] = len(result_categories.scalars().all())

    # Count products
    result_products = await db.execute(
        select(ProductModel).where(ProductModel.tenant_id == tenant_id)
    )
    stats["products"] = len(result_products.scalars().all())

    # Count leads
    result_leads = await db.execute(select(LeadModel).where(LeadModel.tenant_id == tenant_id))
    stats["leads"] = len(result_leads.scalars().all())

    # Count appointments
    result_appointments = await db.execute(
        select(AppointmentModel).where(AppointmentModel.tenant_id == tenant_id)
    )
    stats["appointments"] = len(result_appointments.scalars().all())

    return stats
