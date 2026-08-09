"""Tests for color generator."""

from prosell.domain.services.color_generator import (
    MIN_COLOR_DISTANCE,
    _hex_to_rgb,
    _is_too_similar,
    _rgb_distance,
    generate_unique_color,
)


def test_generates_color_not_in_used_set() -> None:
    """Should generate a color not already used."""
    used = {"#FF0000", "#00FF00"}
    color = generate_unique_color(used)
    assert color.upper() not in {c.upper() for c in used}


def test_generates_different_color_when_similar_exists() -> None:
    """Should avoid colors too similar to used ones."""
    # Use a specific red
    used = {"#B71414"}
    color = generate_unique_color(used)
    # New color should be different enough
    new_rgb = _hex_to_rgb(color)
    used_rgb = _hex_to_rgb("#B71414")
    assert _rgb_distance(new_rgb, used_rgb) >= MIN_COLOR_DISTANCE


def test_rgb_distance_identical_colors() -> None:
    """Distance between identical colors should be 0."""
    assert _rgb_distance((255, 0, 0), (255, 0, 0)) == 0


def test_rgb_distance_opposite_colors() -> None:
    """Distance between black and white should be max."""
    dist = _rgb_distance((0, 0, 0), (255, 255, 255))
    assert dist > 400  # sqrt(255^2 * 3) ≈ 441


def test_is_too_similar_with_empty_set() -> None:
    """Empty used set means nothing is too similar."""
    assert not _is_too_similar("#FF0000", set())


def test_generated_colors_contrast_with_white() -> None:
    """Generated colors should have decent contrast with white."""
    # Test with a fixed seed for reproducibility
    import random

    random.seed(42)
    for _ in range(10):
        color = generate_unique_color(set())
        r, g, b = _hex_to_rgb(color)
        # Relative luminance (simplified)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        # Should be reasonably dark (luminance < 0.6 for UI tags)
        assert luminance < 0.60, f"{color} luminance {luminance:.2f} too bright"
