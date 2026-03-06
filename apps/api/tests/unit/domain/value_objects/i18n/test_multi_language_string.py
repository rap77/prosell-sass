"""Unit tests for MultiLanguageString value object."""

import pytest

from prosell.domain.value_objects.i18n import MultiLanguageString


class TestMultiLanguageString:
    """Test MultiLanguageString value object."""

    def test_create_valid_instance(self):
        """Test creating a valid MultiLanguageString."""
        mls = MultiLanguageString(es="Automóviles", en="Cars")
        assert mls.es == "Automóviles"
        assert mls.en == "Cars"

    def test_whitespace_is_stripped(self):
        """Test that whitespace is stripped from texts."""
        mls = MultiLanguageString(es="  Automóviles  ", en="  Cars  ")
        assert mls.es == "Automóviles"
        assert mls.en == "Cars"

    def test_empty_text_raises_error(self):
        """Test that empty text raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            MultiLanguageString(es="", en="Cars")

        with pytest.raises(ValueError, match="cannot be empty"):
            MultiLanguageString(es="Automóviles", en="   ")

    def test_get_spanish(self):
        """Test getting Spanish text."""
        mls = MultiLanguageString(es="Automóviles", en="Cars")
        assert mls.get("es") == "Automóviles"

    def test_get_english(self):
        """Test getting English text."""
        mls = MultiLanguageString(es="Automóviles", en="Cars")
        assert mls.get("en") == "Cars"

    def test_get_unsupported_language_defaults_to_spanish(self):
        """Test that unsupported languages default to Spanish."""
        mls = MultiLanguageString(es="Automóviles", en="Cars")
        assert mls.get("fr") == "Automóviles"
        assert mls.get("de") == "Automóviles"

    def test_from_dict(self):
        """Test creating from dictionary."""
        data = {"es": "Automóviles", "en": "Cars"}
        mls = MultiLanguageString.from_dict(data)
        assert mls.es == "Automóviles"
        assert mls.en == "Cars"

    def test_from_dict_with_missing_keys(self):
        """Test creating from dictionary with missing keys."""
        data = {"es": "Automóviles", "en": "Cars"}
        mls = MultiLanguageString.from_dict(data)
        assert mls.es == "Automóviles"
        assert mls.en == "Cars"

        # Test with missing key - should use default placeholders
        data2 = {"es": "Automóviles"}
        mls2 = MultiLanguageString.from_dict(data2)
        assert mls2.es == "Automóviles"
        assert mls2.en == "Text"  # Default placeholder for missing key

    def test_immutability(self):
        """Test that value object is immutable."""
        mls = MultiLanguageString(es="Automóviles", en="Cars")

        # Pydantic frozen=True prevents modification
        with pytest.raises(Exception):  # ValidationError or similar
            mls.es = "Modified"


__all__ = ["TestMultiLanguageString"]
