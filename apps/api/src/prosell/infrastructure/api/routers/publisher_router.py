"""Publisher API router — publish, update, delete FB Marketplace listings."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from prosell.application.dto.publisher.publish import PublicationResponse, PublishVehicleRequest
from prosell.application.use_cases.publisher.delete_listing import DeleteListingUseCase
from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase
from prosell.application.use_cases.publisher.update_listing import (
    UpdateListingRequest,
    UpdateListingUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user,
    get_current_auth_user_from_cookie,
    get_publication_repository,
    get_publish_vehicle_use_case,
)
from prosell.infrastructure.api.middleware import API_LIMIT, limiter

router = APIRouter(prefix="/publisher", tags=["Publisher"])


@router.post(
    "/{product_id}/publish",
    response_model=PublicationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(API_LIMIT)
async def publish_vehicle(
    request: Request,  # noqa: ARG001 — required by slowapi @limiter.limit()
    product_id: UUID,
    body: PublishVehicleRequest,
    _current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[PublishVehicleUseCase, Depends(get_publish_vehicle_use_case)],
) -> PublicationResponse:
    """Publish vehicle to Facebook Marketplace. Returns 202 (task dispatched, async)."""
    body.product_id = product_id
    return await use_case.execute(body)


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def update_listing(
    publication_id: UUID,
    body: UpdateListingRequest,
    publication_repo: Annotated[IPublicationRepository, Depends(get_publication_repository)],
    _current_user: Annotated[User, Depends(get_current_auth_user)],
) -> PublicationResponse:
    """Update price/description/photos on an active FB listing."""
    use_case = UpdateListingUseCase(publication_repo=publication_repo)
    body.publication_id = publication_id
    return await use_case.execute(body)


@router.delete("/{publication_id}", response_model=PublicationResponse)
async def delete_listing(
    publication_id: UUID,
    publication_repo: Annotated[IPublicationRepository, Depends(get_publication_repository)],
    _current_user: Annotated[User, Depends(get_current_auth_user)],
) -> PublicationResponse:
    """Mark vehicle as sold and remove FB listing."""
    use_case = DeleteListingUseCase(publication_repo=publication_repo)
    return await use_case.execute(publication_id)


@router.post("/{publication_id}/unlock", response_model=PublicationResponse)
async def unlock_category_b(
    publication_id: UUID,
    publication_repo: Annotated[IPublicationRepository, Depends(get_publication_repository)],
    _current_user: Annotated[User, Depends(get_current_auth_user)],
) -> PublicationResponse:
    """Vendedor confirms Facebook security challenge resolved (Category B error recovery)."""
    pub = await publication_repo.get_by_id(publication_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    pub.unlock_from_category_b()
    pub = await publication_repo.update(pub)
    return PublicationResponse(id=pub.id, product_id=pub.product_id, status=pub.status.value)
