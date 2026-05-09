"""Lead-specific API response schemas."""

from uuid import UUID

from pydantic import BaseModel


class DuplicateMatchResponse(BaseModel):
    """Pydantic schema for a single duplicate match."""

    lead_id: UUID
    match_type: str  # "email" | "phone" | "both"
    confidence: str  # "high" | "medium" | "low"


class DuplicatesResponse(BaseModel):
    """Response schema for the GET /leads/{id}/duplicates endpoint."""

    lead_id: UUID
    duplicates: list[DuplicateMatchResponse]
    count: int
