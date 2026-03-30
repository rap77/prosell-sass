"""Integration tests for Translator service."""

from prosell.infrastructure.i18n import translator


class TestTranslatorIntegration:
    """Integration tests for Translator."""

    def test_load_spanish_locale_file(self):
        """Test loading Spanish locale file from disk."""
        translations = translator.load_translations("es")

        assert translations is not None
        assert translations.fields["make"] == "Marca"
        assert translations.fields["model"] == "Modelo"
        assert translations.validation["required"] == "Este campo es requerido"

    def test_load_english_locale_file(self):
        """Test loading English locale file from disk."""
        translations = translator.load_translations("en")

        assert translations is not None
        assert translations.fields["make"] == "Make"
        assert translations.fields["model"] == "Model"
        assert translations.validation["required"] == "This field is required"

    def test_categories_are_loaded(self):
        """Test that categories are loaded correctly."""
        translations_es = translator.load_translations("es")
        translations_en = translator.load_translations("en")

        assert "vehicles" in translations_es.categories
        assert translations_es.categories["vehicles"]["name"] == "Vehículos"

        assert "vehicles" in translations_en.categories
        assert translations_en.categories["vehicles"]["name"] == "Vehicles"

    def test_common_translations(self):
        """Test common translations."""
        translations = translator.load_translations("es")

        assert translations.common["save"] == "Guardar"
        assert translations.common["cancel"] == "Cancelar"
        assert translations.common["delete"] == "Eliminar"

    def test_nested_key_navigation(self):
        """Test navigating nested keys."""
        # Test fields.make
        result = translator.t("fields.make", lang="es")
        assert result == "Marca"

        # Test categories.vehicles.name
        result = translator.t("categories.vehicles.name", lang="es")
        assert result == "Vehículos"

    def test_translation_with_parameters(self):
        """Test translation with format parameters."""
        result = translator.t("validation.min_value", lang="es", min=10)
        assert "10" in result

        result = translator.t("validation.max_value", lang="en", max=100)
        assert "100" in result

    def test_cache_persists_across_calls(self):
        """Test that cache works across multiple calls."""
        # Clear cache first
        translator.clear_cache()

        # First call
        translations1 = translator.load_translations("es")
        # Second call
        translations2 = translator.load_translations("es")

        # Should be same object (cached)
        assert translations1 is translations2


__all__ = ["TestTranslatorIntegration"]
