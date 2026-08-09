"""Generate unique colors that contrast with white text."""

import colorsys
import random

# Minimum RGB distance to consider colors "different enough"
MIN_COLOR_DISTANCE = 80


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert #RRGGBB to (R, G, B) tuple."""
    h = hex_color.lstrip("#").upper()
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rgb_distance(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    """Euclidean distance between two RGB colors."""
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def _is_too_similar(new_color: str, used_colors: set[str]) -> bool:
    """Check if new_color is too similar to any used color."""
    if not used_colors:
        return False
    new_rgb = _hex_to_rgb(new_color)
    for used in used_colors:
        used_rgb = _hex_to_rgb(used)
        if _rgb_distance(new_rgb, used_rgb) < MIN_COLOR_DISTANCE:
            return True
    return False


def _generate_random_color() -> str:
    """Generate a random color with good white text contrast."""
    # Random hue (0-360), high saturation, LOW lightness for contrast
    hue = random.random()
    sat = 0.70 + random.random() * 0.25  # 0.70-0.95
    light = 0.25 + random.random() * 0.12  # 0.25-0.37 (darker)
    r, g, b = colorsys.hls_to_rgb(hue, light, sat)
    return f"#{int(r * 255):02X}{int(g * 255):02X}{int(b * 255):02X}"


def generate_unique_color(used_colors: set[str]) -> str:
    """Generate a random color that's visually different from all used colors."""
    used_upper = {c.upper() for c in used_colors if c}
    color = _generate_random_color()  # Initialize for pyright
    # Try up to 100 times to find a sufficiently different color
    for _ in range(100):
        color = _generate_random_color()
        if color.upper() not in used_upper and not _is_too_similar(color, used_upper):
            return color
    # Fallback: return whatever we generated last (very unlikely)
    return color
