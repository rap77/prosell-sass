"""Resolve a category's effective presentation contract by ancestor inheritance.

Two pure functions, no I/O, no external deps:

- ``resolve_presentation(own, ancestors_nearest_first)`` — own wins; otherwise
  the nearest ancestor (first non-None in the input sequence) wins.

- ``filter_fields(attribute_schema)`` — extract the fields marked
  ``filterable: True`` in declaration order, with their ``filter_type``
  (defaulting to ``"text"``). Used by the catalog UI to render dynamic
  filters per vertical.
"""

from collections.abc import Mapping, Sequence


def resolve_presentation(
    own: Mapping[str, object] | None,
    ancestors_nearest_first: Sequence[Mapping[str, object] | None],
) -> Mapping[str, object] | None:
    """Own presentation wins; else the nearest ancestor that has one.

    ``ancestors_nearest_first`` is ordered from closest-to-self to
    farthest-from-self. The first non-None entry in that order wins. Returns
    None only when neither the category nor any ancestor has a presentation.
    """
    if own:
        return own
    for anc in ancestors_nearest_first:
        if anc:
            return anc
    return None


def filter_fields(attribute_schema: Mapping[str, object]) -> list[dict[str, str]]:
    """Extract the filterable fields (in declared order) for the catalog UI.

    A field is included iff its schema entry is a dict with
    ``filterable: True``. The returned list keeps the schema's insertion
    order (CPython 3.7+ dict ordering) and each entry has shape
    ``{"field": <name>, "filter_type": <type>}`` with ``filter_type``
    defaulting to ``"text"`` if absent.
    """
    out: list[dict[str, str]] = []
    for name, defn in attribute_schema.items():
        if isinstance(defn, dict) and defn.get("filterable"):
            out.append({"field": name, "filter_type": str(defn.get("filter_type", "text"))})
    return out
