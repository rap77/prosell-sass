"""Multi-language string value object.

Used for fields that need to support multiple languages (es, en).
Immutable by definition (ValueObject).
"""

from prosell.domain.base import ValueObject, Field, field_validator


class MultiLanguageString(ValueObject):
    """Multi-language string value object.

    Supports Spanish (es) and English (en) text.
    Immutable - once created, cannot be changed.

    Example:
        name = MultiLanguageString(es="Automóviles", en="Cars")
        name.get("es")  # "Automóviles"
        name.get("en")  # "Cars"
        name.get("fr")  # "Automóviles" (defaults to es)

    Args:
        es: Spanish text (required)
        en: English text (required)

    Raises:
        ValueError: If es or en is empty after stripping
    """

    es: str = Field(description="Spanish text")
    en: str = Field(description="English text")

    @field_validator("es", "en")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        """Strip whitespace from texts.

        Args:
            v: Text value

        Returns:
            Stripped text

        Raises:
            ValueError: If text is empty after stripping
        """
        stripped = v.strip()
        if not stripped:
            raise ValueError("Text cannot be empty or whitespace only")
        return stripped

    def get(self, language: str) -> str:
        """Get text for specific language.

        Priority:
        1. Exact language match (es or en)
        2. Default to Spanish (es)

        Args:
            language: Language code (es, en, etc.)

        Returns:
            Text in requested language (or Spanish if unsupported)
        """
        if language not in ("es", "en"):
            language = "es"  # Default
        return getattr(self, language)

    @classmethod
    def from_dict(cls, data: dict[str, str]) -> "MultiLanguageString":
        """Create from dictionary.

        Args:
            data: Dictionary with es and en keys

        Returns:
            MultiLanguageString instance

        Example:
            data = {"es": "Automóviles", "en": "Cars"}
            name = MultiLanguageString.from_dict(data)
        """
        es_val = data.get("es", "Texto")
        en_val = data.get("en", "Text")
        return cls(es=es_val, en=en_val)


__all__ = ["MultiLanguageString"]
