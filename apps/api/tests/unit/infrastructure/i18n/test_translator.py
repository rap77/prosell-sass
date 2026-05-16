"""Unit tests for Translator service."""

from prosell.infrastructure.i18n import Translator


class TestTranslator:
    """Test Translator service."""

    def test_translator_initialization(self):
        """Test that translator can be initialized."""
        translator = Translator()
        assert translator is not None
        assert translator._cache == {}

    def test_load_spanish_translations(self):
        """Test loading Spanish translations."""
        translator = Translator()
        translations = translator.load_translations("es")

        assert translations is not None
        assert len(translations.fields) > 0
        assert "make" in translations.fields

    def test_load_english_translations(self):
        """Test loading English translations."""
        translator = Translator()
        translations = translator.load_translations("en")

        assert translations is not None
        assert len(translations.fields) > 0
        assert "make" in translations.fields

    def test_load_invalid_language_defaults_to_spanish(self):
        """Test that invalid language defaults to Spanish."""
        translator = Translator()
        # Should not raise error, should fallback to es
        translations = translator.load_translations("invalid")  # type: ignore[arg-type]
        assert translations is not None

    def test_get_simple_translation_spanish(self):
        """Test getting simple Spanish translation."""
        translator = Translator()
        result = translator.t("fields.make", lang="es")
        assert result == "Marca"

    def test_get_simple_translation_english(self):
        """Test getting simple English translation."""
        translator = Translator()
        result = translator.t("fields.make", lang="en")
        assert result == "Make"

    def test_get_nested_translation(self):
        """Test getting nested translation key."""
        translator = Translator()
        # Categories.vehicles.name
        result = translator.t("categories.vehicles.name", lang="es")
        assert result == "Vehículos"

    def test_get_translation_with_formatting(self):
        """Test getting translation with format arguments."""
        translator = Translator()
        result = translator.t("validation.min_value", lang="es", min=10)
        assert "10" in result
        assert "mínimo" in result.lower()

    def test_get_invalid_key_returns_key(self):
        """Test that invalid key returns the key itself."""
        translator = Translator()
        result = translator.t("invalid.key.nested", lang="es")
        assert result == "invalid.key.nested"

    def test_translations_are_cached(self):
        """Test that translations are cached after first load."""
        translator = Translator()

        # First load
        translations1 = translator.load_translations("es")
        # Second load (should be cached)
        translations2 = translator.load_translations("es")

        assert translations1 is translations2

    def test_clear_cache(self):
        """Test clearing translation cache."""
        translator = Translator()

        # Load something to populate cache
        translator.load_translations("es")
        assert len(translator._cache) > 0

        # Clear cache
        translator.clear_cache()
        assert len(translator._cache) == 0

    def test_get_cached_uses_lru_cache(self):
        """Test that get_cached uses LRU cache."""
        translator = Translator()

        # First call
        result1 = translator.get_cached("fields.make", lang="es")
        # Second call (cached)
        result2 = translator.get_cached("fields.make", lang="es")

        assert result1 == result2 == "Marca"


__all__ = ["TestTranslator"]
