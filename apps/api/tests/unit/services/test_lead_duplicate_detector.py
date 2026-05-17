"""Unit tests for LeadDuplicateDetector service."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.domain.entities.lead import Lead
from prosell.domain.services.lead_duplicate_detector import (
    LeadDuplicateDetector,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def tenant_id():
    """Tenant ID for testing."""
    return uuid4()


@pytest.fixture
def lead_with_email(tenant_id):
    """Lead with email."""
    return Lead.create(
        tenant_id=tenant_id,
        buyer_name="John Doe",
        buyer_email="john@example.com",
        buyer_phone="+1234567890",
        message="Interested",
    )


@pytest.fixture
def lead_with_phone(tenant_id):
    """Lead with phone only."""
    return Lead.create(
        tenant_id=tenant_id,
        buyer_name="Jane Smith",
        buyer_email=None,
        buyer_phone="+19876543210",
        message="Interested",
    )


@pytest.fixture
def lead_with_both(tenant_id):
    """Lead with both email and phone."""
    return Lead.create(
        tenant_id=tenant_id,
        buyer_name="Bob Johnson",
        buyer_email="bob@example.com",
        buyer_phone="+15555555555",
        message="Interested",
    )


@pytest.fixture
def mock_lead_repository():
    """Mock lead repository."""
    repo = MagicMock()
    repo.find_by_email = AsyncMock(return_value=[])
    repo.find_by_phone = AsyncMock(return_value=[])
    repo.find_potential_duplicates = AsyncMock(return_value=[])
    return repo


# =============================================================================
# TESTS
# =============================================================================


class TestLeadDuplicateDetector:
    """Tests for LeadDuplicateDetector."""

    async def test_no_duplicates_when_no_email_or_phone(
        self,
        mock_lead_repository,
        tenant_id,
    ):
        """Detector returns empty list when no email or phone provided."""
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email=None,
            phone=None,
        )

        assert duplicates == []
        mock_lead_repository.find_by_email.assert_not_called()
        mock_lead_repository.find_by_phone.assert_not_called()

    async def test_finds_duplicates_by_email(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_email,
    ):
        """Detector finds duplicates by email exact match."""
        mock_lead_repository.find_by_email = AsyncMock(return_value=[lead_with_email])
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email="john@example.com",
            phone=None,
        )

        assert len(duplicates) == 1
        assert duplicates[0].lead_id == lead_with_email.id
        assert duplicates[0].match_type == "email"
        assert duplicates[0].confidence == "high"

    async def test_finds_duplicates_by_phone(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_phone,
    ):
        """Detector finds duplicates by normalized phone match."""
        mock_lead_repository.find_by_phone = AsyncMock(return_value=[lead_with_phone])
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email=None,
            phone="+1-987-654-3210",  # Different format, same number
        )

        assert len(duplicates) == 1
        assert duplicates[0].lead_id == lead_with_phone.id
        assert duplicates[0].match_type == "phone"
        assert duplicates[0].confidence == "medium"

    async def test_finds_duplicates_by_both_email_and_phone(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_both,
    ):
        """Detector finds duplicates when both email and phone match."""
        mock_lead_repository.find_potential_duplicates = AsyncMock(return_value=[lead_with_both])
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email="bob@example.com",
            phone="+1-555-555-5555",
        )

        assert len(duplicates) == 1
        assert duplicates[0].lead_id == lead_with_both.id
        assert duplicates[0].match_type == "both"
        assert duplicates[0].confidence == "high"

    async def test_excludes_specified_lead_id(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_email,
    ):
        """Detector excludes specified lead ID from results."""
        mock_lead_repository.find_by_email = AsyncMock(return_value=[lead_with_email])
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email="john@example.com",
            phone=None,
            exclude_lead_id=lead_with_email.id,
        )

        assert len(duplicates) == 0

    async def test_sorts_duplicates_by_confidence(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_email,
        lead_with_phone,
    ):
        """Detector sorts duplicates by confidence (high first)."""
        mock_lead_repository.find_by_email = AsyncMock(return_value=[lead_with_email])
        mock_lead_repository.find_by_phone = AsyncMock(return_value=[lead_with_phone])
        detector = LeadDuplicateDetector(mock_lead_repository)

        duplicates = await detector.find_duplicates(
            tenant_id=tenant_id,
            email="john@example.com",
            phone="+19876543210",
        )

        assert len(duplicates) == 2
        # High confidence (email) should come first
        assert duplicates[0].confidence == "high"
        assert duplicates[1].confidence == "medium"

    async def test_is_duplicate_returns_true_when_duplicates_exist(
        self,
        mock_lead_repository,
        tenant_id,
        lead_with_email,
    ):
        """is_duplicate returns True when duplicates exist."""
        mock_lead_repository.find_by_email = AsyncMock(return_value=[lead_with_email])
        detector = LeadDuplicateDetector(mock_lead_repository)

        is_dup = await detector.is_duplicate(
            tenant_id=tenant_id,
            email="john@example.com",
            phone=None,
        )

        assert is_dup is True

    async def test_is_duplicate_returns_false_when_no_duplicates(
        self,
        mock_lead_repository,
        tenant_id,
    ):
        """is_duplicate returns False when no duplicates exist."""
        detector = LeadDuplicateDetector(mock_lead_repository)

        is_dup = await detector.is_duplicate(
            tenant_id=tenant_id,
            email="nonexistent@example.com",
            phone=None,
        )

        assert is_dup is False


class TestPhoneNormalization:
    """Tests for phone number normalization."""

    def test_normalizes_us_phone_number_with_country_code(self):
        """Normalize US phone number with country code."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone("+1 (555) 123-4567")
        assert normalized == "+15551234567"

    def test_normalizes_us_phone_number_without_country_code(self):
        """Normalize US phone number without country code."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone("(555) 123-4567")
        assert normalized == "+15551234567"

    def test_normalizes_us_phone_number_with_dashes(self):
        """Normalize US phone number with dashes."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone("555-123-4567")
        assert normalized == "+15551234567"

    def test_returns_none_for_invalid_phone(self):
        """Return None for invalid phone number."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone("abc")
        assert normalized is None

    def test_returns_none_for_empty_phone(self):
        """Return None for empty phone number."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone("")
        assert normalized is None

    def test_returns_none_for_none_phone(self):
        """Return None for None phone number."""
        detector = LeadDuplicateDetector(lead_repository=MagicMock())

        normalized = detector._normalize_phone(None)  # type: ignore[arg-type]
        assert normalized is None
