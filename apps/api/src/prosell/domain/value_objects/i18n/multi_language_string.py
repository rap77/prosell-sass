"""Multi-language string value object."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MultiLanguageString:
    """
    Multi-language text value object.

    Immutable container for text in multiple languages.
    Used for product names, descriptions, and UI labels.

    Attributes:
        es: Spanish text
        en: English text

    Example:
        name = MultiLanguageString(es="Automóviles", en="Cars")
        description = MultiLanguageString(
            es="Sedán compacto en excelente estado",
            en="Compact sedan in excellent condition"
        )
    """

    es: str
    en: str

    def __post_init__(self) -> None:
        object.__setattr__(self, "es", self.es.strip())
        object.__setattr__(self, "en", self.en.strip())
        if not self.es or not self.en:
            raise ValueError("MultiLanguageString text cannot be empty")

    def get_text(self, language: str) -> str:
        """
        Get text in requested language.

        Args:
            language: Language code (es, en, etc.)

        Returns:
            Text in requested language (or Spanish if unsupported)
        """
        if language not in ("es", "en"):
            language = "es"  # Default
        if language == "es":
            return self.es
        else:  # language == "en"
            return self.en

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
