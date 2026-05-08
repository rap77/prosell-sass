"""Lead Duplicate Detection Service.

Detects potential duplicate leads based on:
- Exact email match
- Normalized phone match
- Email + phone combination match

This service helps prevent duplicate leads from being created
when the same buyer inquiries multiple times.
"""

from dataclasses import dataclass
import re
from uuid import UUID
from typing import List

from prosell.domain.entities.lead import Lead


@dataclass
class DuplicateMatch:
    """Represents a duplicate lead match."""

    lead_id: UUID
    match_type: str  # "email", "phone", "both"
    confidence: str  # "high", "medium", "low"


class LeadDuplicateDetector:
    """
    Service for detecting duplicate leads.

    Uses multiple matching strategies:
    1. Email exact match (high confidence)
    2. Phone normalized match (medium confidence)
    3. Email + phone combination (high confidence)
    """

    def __init__(self, lead_repository):
        """
        Initialize detector with lead repository.

        Args:
            lead_repository: Repository for querying existing leads
        """
        self.lead_repository = lead_repository

    async def find_duplicates(
        self,
        email: str | None = None,
        phone: str | None = None,
        tenant_id: UUID | None = None,
        exclude_lead_id: UUID | None = None,
    ) -> list[DuplicateMatch]:
        """
        Find potential duplicate leads.

        Args:
            email: Buyer email to match
            phone: Buyer phone to match (will be normalized)
            tenant_id: Tenant context for filtering
            exclude_lead_id: Exclude this lead from results (useful for updates)

        Returns:
            List of DuplicateMatch objects, sorted by confidence
        """
        if not email and not phone:
            return []

        duplicates: list[DuplicateMatch] = []
        seen_lead_ids = set()

        # Strategy 1: Exact email match (high confidence)
        if email:
            email_matches = await self.lead_repository.find_by_email(
                tenant_id=tenant_id,
                email=email,
            )
            for lead in email_matches:
                if exclude_lead_id and lead.id == exclude_lead_id:
                    continue
                if lead.id not in seen_lead_ids:
                    duplicates.append(
                        DuplicateMatch(
                            lead_id=lead.id,
                            match_type="email",
                            confidence="high",
                        )
                    )
                    seen_lead_ids.add(lead.id)

        # Strategy 2: Normalized phone match (medium confidence)
        if phone:
            normalized_phone = self._normalize_phone(phone)
            if normalized_phone:
                phone_matches = await self.lead_repository.find_by_phone(
                    tenant_id=tenant_id,
                    phone=normalized_phone,
                )
                for lead in phone_matches:
                    if exclude_lead_id and lead.id == exclude_lead_id:
                        continue
                    if lead.id not in seen_lead_ids:
                        duplicates.append(
                            DuplicateMatch(
                                lead_id=lead.id,
                                match_type="phone",
                                confidence="medium",
                            )
                        )
                        seen_lead_ids.add(lead.id)

        # Strategy 3: Email + phone combination (high confidence)
        # If we have both email and phone, look for leads with both matching
        if email and phone:
            normalized_phone = self._normalize_phone(phone)
            if normalized_phone:
                combined_matches = await self.lead_repository.find_potential_duplicates(
                    tenant_id=tenant_id,
                    email=email,
                    phone=normalized_phone,
                )
                for lead in combined_matches:
                    if exclude_lead_id and lead.id == exclude_lead_id:
                        continue
                    if lead.id not in seen_lead_ids:
                        duplicates.append(
                            DuplicateMatch(
                                lead_id=lead.id,
                                match_type="both",
                                confidence="high",
                            )
                        )
                        seen_lead_ids.add(lead.id)

        # Sort by confidence (high first)
        return sorted(
            duplicates,
            key=lambda m: 0 if m.confidence == "high" else 1,
        )

    def _normalize_phone(self, phone: str) -> str | None:
        """
        Normalize phone number for comparison.

        Removes all non-numeric characters and formats in E.164 style.

        Args:
            phone: Phone number string (any format)

        Returns:
            Normalized phone in E.164 format (e.g., +1234567890) or None if invalid
        """
        if not phone:
            return None

        # Remove all non-numeric characters
        digits_only = re.sub(r'[^\d]', '', phone)

        if not digits_only:
            return None

        # If we have 10 digits, assume US number and add +1
        if len(digits_only) == 10:
            return f"+1{digits_only}"
        # If we have 11 digits starting with 1, assume US with country code
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            return f"+{digits_only}"
        # Otherwise, just add + prefix
        else:
            return f"+{digits_only}"

    async def is_duplicate(
        self,
        email: str | None = None,
        phone: str | None = None,
        tenant_id: UUID | None = None,
        exclude_lead_id: UUID | None = None,
    ) -> bool:
        """
        Check if any duplicates exist.

        Convenience method that returns True if any duplicates found.

        Args:
            email: Buyer email to match
            phone: Buyer phone to match
            tenant_id: Tenant context for filtering
            exclude_lead_id: Exclude this lead from results

        Returns:
            True if duplicates exist, False otherwise
        """
        duplicates = await self.find_duplicates(
            email=email,
            phone=phone,
            tenant_id=tenant_id,
            exclude_lead_id=exclude_lead_id,
        )
        return len(duplicates) > 0
