"""Translation service for multi-language support.

Loads translations from JSON files and provides a simple API
for getting translated strings with key paths.
"""

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ValidationError


class Translations(BaseModel):
    """Translation container.

    Defines the structure of translation files.
    Nested categories for organization.
    """

    categories: dict[str, Any] = {}
    fields: dict[str, Any] = {}
    validation: dict[str, Any] = {}
    common: dict[str, Any] = {}
    # Add more categories as needed


class Translator:
    """Translation service for multi-language support.

    Loads translations from JSON files and provides a simple
    t() method for getting translated strings.

    Example:
        translator.t("fields.make", lang="es")  # "Marca"
        translator.t("fields.make", lang="en")  # "Make"
    """

    def __init__(self):
        """Initialize translator."""
        self.current_dir = Path(__file__).parent
        self._cache: dict[str, Translations] = {}

    def load_translations(self, lang: Literal["es", "en"]) -> Translations:
        """Load translations from JSON file.

        Args:
            lang: Language code (es or en)

        Returns:
            Translations object

        Raises:
            ValueError: If translation file is invalid
        """
        if lang in self._cache:
            return self._cache[lang]

        file_path = self.current_dir / "locales" / f"{lang}.json"
        if not file_path.exists():
            # Fallback to Spanish if language file not found
            file_path = self.current_dir / "locales" / "es.json"

        try:
            data = file_path.read_text(encoding="utf-8")
            translations = Translations.model_validate_json(data)
            self._cache[lang] = translations
            return translations
        except ValidationError as e:
            raise ValueError(f"Invalid translation file {lang}.json: {e}") from e

    def t(self, key: str, lang: Literal["es", "en"] = "es", **kwargs: Any) -> str:
        """Get translated string with key path.

        Supports nested keys (e.g., "fields.make").

        Args:
            key: Translation key path (e.g., "fields.make")
            lang: Language code (default: es)
            **kwargs: Format arguments for string

        Returns:
            Translated string

        Example:
            translator.t("fields.make", lang="es")
            translator.t("validation.min_value", lang="en", min=10)
        """
        translations = self.load_translations(lang)

        # Convert to dict for easier navigation
        translations_dict = translations.model_dump()

        # Navigate nested keys (e.g., "fields.make")
        keys: list[str] = key.split(".")
        value: dict[str, Any] | str | Any = translations_dict

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return key  # Fallback to key if path invalid

        if isinstance(value, str):
            return value.format(**kwargs) if kwargs else value

        return key  # Fallback to key if translation not found

    @lru_cache(maxsize=128)  # noqa: B019 - Cache is per-instance, acceptable use case
    def get_cached(self, key: str, lang: Literal["es", "en"] = "es") -> str:
        """Get translated string with LRU caching.

        Args:
            key: Translation key path
            lang: Language code

        Returns:
            Cached translated string
        """
        return self.t(key, lang)

    def clear_cache(self):
        """Clear all caches (useful for testing/dev)."""
        self._cache.clear()
        self.get_cached.cache_clear()


# Global translator instance
translator = Translator()


__all__ = ["Translations", "Translator", "translator"]
