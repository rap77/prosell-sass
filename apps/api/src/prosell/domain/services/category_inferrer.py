"""Category Auto-Inference domain service (T1).

Pure-domain, no I/O. Scores candidate categories against a (title,
attributes) input using a triple-signal heuristic:

- S1 (weight 0.35): title token overlap with category vocabulary
  (name + description + field_config field_names).
- S2 (weight 0.40): provided attribute keys ∩ category field_config
  field_names. Highest weight because typed attribute names reveal
  seller intent.
- S3 (weight 0.25): per-attribute schema validation. Counts the fraction
  of provided attributes that pass ``Category.validate_attributes`` for
  THIS category's ``attribute_schema``. Short-circuits to 0 when the
  category has no schema (no constraints to fit).

Final = 0.35·S1 + 0.40·S2 + 0.25·S3, clamped to [0, 1].

The single-suggestion threshold (>= 0.5) and the alternatives cap (5)
live in the use case (T3). This service returns raw floats only,
sorted DESC.
"""

import re

from prosell.domain.entities.category import Category

# Spanish + English common words that carry no semantic signal.
# Hardcoded by design: feature, not config (spec D3.3).
STOPWORDS: tuple[str, ...] = (
    "the",
    "a",
    "an",
    "y",
    "el",
    "la",
    "los",
    "las",
    "de",
    "del",
    "para",
    "con",
    "en",
    "to",
    "of",
    "for",
    "with",
    "by",
    "on",
)

# Signal weights (locked in spec D3).
WEIGHT_TITLE = 0.35
WEIGHT_ATTRIBUTE_NAME = 0.40
WEIGHT_VALUE_SCHEMA = 0.25

# Word-boundary tokenizer. Lowercased downstream; the regex itself is
# case-sensitive so we lowercase first.
_TOKEN_RE = re.compile(r"\b\w+\b")

# Tokens shorter than this are dropped (avoid noise: "a", "y", "1").
_MIN_TOKEN_LENGTH = 2


def _tokenize(text: str) -> set[str]:
    """Lowercase → word-boundary split → drop stopwords and short tokens."""
    lowered = text.lower()
    return {
        t for t in _TOKEN_RE.findall(lowered) if t not in STOPWORDS and len(t) >= _MIN_TOKEN_LENGTH
    }


def _category_vocabulary(category: Category) -> set[str]:
    """Union of name + description (when non-null) + field_config field_names."""
    vocab: set[str] = _tokenize(category.name)
    if category.description is not None:
        vocab |= _tokenize(category.description)
    for field in category.field_config:
        name = field.get("field_name")
        if isinstance(name, str):
            vocab |= _tokenize(name)
    return vocab


class CategoryInferrer:
    """Pure-domain scorer. No I/O, no async, no global state."""

    def score(
        self,
        title: str,
        attributes: dict[str, object],
        candidates: list[Category],
    ) -> list[tuple[Category, float]]:
        """Score each candidate. Returns (category, raw_score) sorted DESC.

        The threshold check (>= 0.5 → single suggestion) and the
        alternatives cap (5) live in the use case (T3), not here. This
        method returns raw floats only.

        When both title and attributes are empty, returns ``[]`` —
        there's no signal to compute, and returning zero-scored
        candidates would be a random winner.
        """
        if not candidates:
            return []
        if not title and not attributes:
            return []

        title_tokens = _tokenize(title)
        results: list[tuple[Category, float]] = []
        for cat in candidates:
            s1 = self._signal_title_overlap(title_tokens, cat)
            s2 = self._signal_attribute_name_overlap(attributes, cat)
            s3 = self._signal_value_schema_fit(attributes, cat)
            raw = WEIGHT_TITLE * s1 + WEIGHT_ATTRIBUTE_NAME * s2 + WEIGHT_VALUE_SCHEMA * s3
            score = max(0.0, min(1.0, raw))  # clamp to [0, 1]
            results.append((cat, score))

        # Timsort is stable: ties on score preserve input order.
        results.sort(key=lambda pair: pair[1], reverse=True)
        return results

    def _signal_title_overlap(self, title_tokens: set[str], category: Category) -> float:
        """S1: |title_tokens ∩ category_vocab| / |title_tokens|. Capped at 1.0."""
        if not title_tokens:
            return 0.0
        vocab = _category_vocabulary(category)
        overlap = len(title_tokens & vocab)
        return min(1.0, overlap / len(title_tokens))

    def _signal_attribute_name_overlap(
        self, attributes: dict[str, object], category: Category
    ) -> float:
        """S2: |provided keys ∩ field_config names| / |field_config names|.

        Empty field_config → 0 (no signal, not divide-by-zero).
        """
        field_names = {
            f["field_name"] for f in category.field_config if isinstance(f.get("field_name"), str)
        }
        if not field_names:
            return 0.0
        provided = {k for k in attributes if isinstance(k, str)}
        if not provided:
            return 0.0
        overlap = len(provided & field_names)
        return min(1.0, overlap / len(field_names))

    def _signal_value_schema_fit(self, attributes: dict[str, object], category: Category) -> float:
        """S3: |attrs passing category.validate_attributes| / |attrs|.

        When ``attribute_schema`` is empty, ``validate_attributes`` is a
        no-op that returns successfully for any input. Per spec D3, S3
        must count 0 fits in that case (no constraints = no signal),
        not 1.0. Short-circuit.
        """
        if not category.attribute_schema:
            return 0.0
        if not attributes:
            return 0.0
        fits = 0
        for key, value in attributes.items():
            try:
                category.validate_attributes({key: value})
                fits += 1
            except ValueError:
                pass
        return min(1.0, fits / len(attributes))
