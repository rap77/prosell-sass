"""Compose a display string from a `{field}` template and an attributes map.

A template is a sequence of SEGMENTS, each = an optional literal prefix
followed by a `{field}` placeholder, plus a final trailing literal. When a
placeholder's value is missing or empty, the WHOLE segment (its literal
prefix + the placeholder) is dropped — so a missing field never leaves a
dangling separator ("· ", " en ") behind. Whitespace is normalized at the end.

Substitution is plain-text only: no nested templates, no logic, no HTML.
"""

import re
from collections.abc import Mapping

_SEGMENT = re.compile(r"([^{]*)\{(\w+)\}")


def compose_from_template(template: str, attributes: Mapping[str, object]) -> str:
    """Render ``template``, dropping segments whose field is missing/empty.

    Args:
        template: e.g. ``"{year} {make} {model}"`` or ``"{tipo} en {barrio}"``.
        attributes: field_name -> value. Missing keys, ``None``, and empty
            strings all count as "absent" and drop their segment.

    Returns:
        The composed string with whitespace collapsed and trimmed.
    """
    parts: list[str] = []
    end = 0
    for match in _SEGMENT.finditer(template):
        literal_prefix, field = match.group(1), match.group(2)
        value = attributes.get(field)
        text = "" if value is None else str(value).strip()
        if text:
            parts.append(literal_prefix + text)
        # else: drop the entire segment (literal prefix + placeholder)
        end = match.end()
    parts.append(template[end:])  # trailing literal after the last placeholder
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def resolve_title(
    presentation: Mapping[str, object] | None,
    attributes: Mapping[str, object],
    fallback: str | None,
) -> str | None:
    """Resolve a product title from a category presentation contract.

    Used by BOTH the create use case and the PATCH handler so the rule
    lives in one place:

      - If the category declares a ``title_template`` AND composing it
        yields a non-empty string, that wins.
      - Otherwise keep ``fallback`` (the request-provided title) —
        backward-compatible for categories without a contract.
    """
    template = (presentation or {}).get("title_template")
    if isinstance(template, str) and template:
        composed = compose_from_template(template, attributes)
        if composed:
            return composed
    return fallback
