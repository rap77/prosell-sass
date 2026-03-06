"""Language detection DTOs."""

from pydantic import BaseModel


class LanguageDetectionResponse(BaseModel):
    """Language detection response.

    Returned by the DetectLanguageUseCase.

    Attributes:
        language: Detected language code (es or en)
    """

    language: str  # "es" or "en"


__all__ = ["LanguageDetectionResponse"]
