"""Tests for PublishVehicleUseCase, UpdateListingUseCase, DeleteListingUseCase."""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
async def test_publish_vehicle_creates_publication_record():
    """PublishVehicleUseCase creates a Publication with status PENDING then dispatches task."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
async def test_publish_vehicle_processes_images_before_dispatch():
    """ImagePipeline is called for each image before Playwright task."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 04")
async def test_update_listing_use_case():
    """UpdateListingUseCase updates price/description on existing PUBLISHED listing."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 04")
async def test_delete_listing_transitions_to_sold():
    """DeleteListingUseCase marks listing SOLD and dispatches FB delete task."""
    pytest.fail("stub")
