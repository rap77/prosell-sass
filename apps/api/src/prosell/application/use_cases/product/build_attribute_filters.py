"""Parse raw `attr.*` query params into validated AttributeFilters against a schema.

F3 hardening: escapes LIKE-pattern wildcards in `text`/`exact` values and
caps every per-filter dimension so attacker-controlled input cannot inflate
the resulting SQL filter (no wildcard injection, no DoS via giant lists,
no absurd range bounds).
"""

from decimal import Decimal, InvalidOperation

from prosell.domain.value_objects.attribute_filter import AttributeFilter

# Cap: bound how long a `text` value may be. ILIKE patterns scale with the
# value length and PostgreSQL btree index lookups degrade beyond a few KB.
MAX_TEXT_VALUE_LEN = 256

# Cap: bound the number of comma-separated `select` values per filter.
MAX_SELECT_VALUES = 64

# Cap: bound each individual `select` value's length.
MAX_SELECT_VALUE_LEN = 128

# Cap: bound the magnitude of `range` bounds. Negative min makes no semantic
# sense for our domain (years, prices, mileages) and a 1e9 ceiling covers
# every realistic value while keeping Decimal arithmetic sane.
RANGE_MIN_FLOOR = 0
RANGE_MAX_CEILING = 1_000_000_000


def _escape_like_pattern(value: str) -> str:
    """Escape ILIKE special characters so user input is treated literally.

    `\\` MUST be escaped first to avoid double-escaping the `%`/`_` we add
    next. Backslash is the default ESCAPE char for ILIKE in PostgreSQL.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _coerce_range_bound(raw_key: str, raw_val: str) -> Decimal:
    """Parse + bound-check a single range bound. Raises ValueError on out-of-range."""
    try:
        bound = Decimal(raw_val)
    except InvalidOperation as exc:
        raise ValueError(f"'{raw_key}' must be numeric") from exc
    if bound < RANGE_MIN_FLOOR or bound > RANGE_MAX_CEILING:
        raise ValueError(
            f"'{raw_key}' (range) must be within [{RANGE_MIN_FLOOR}, {RANGE_MAX_CEILING}]"
        )
    return bound


def build_attribute_filters(
    raw: dict[str, str], schema: dict[str, dict[str, object]]
) -> list[AttributeFilter]:
    """`raw` maps query keys (sans `attr.` prefix) to values. Rejects unknown keys."""
    filters: list[AttributeFilter] = []
    range_acc: dict[str, dict[str, Decimal]] = {}

    for raw_key, raw_val in raw.items():
        base, _, suffix = raw_key.partition("_")  # year_min -> ("year","_","min")
        key = base if suffix in ("min", "max") else raw_key
        defn = schema.get(key)
        if not defn or not defn.get("filterable"):
            raise ValueError(f"'{key}' is not a filterable attribute")
        ftype = str(defn.get("filter_type"))
        if ftype == "range":
            bound = _coerce_range_bound(raw_key, raw_val)
            range_acc.setdefault(key, {})[suffix or "min"] = bound
        elif ftype == "select":
            values = raw_val.split(",")
            if len(values) > MAX_SELECT_VALUES:
                raise ValueError(f"'{raw_key}' (select) accepts at most {MAX_SELECT_VALUES} values")
            for v in values:
                if len(v) > MAX_SELECT_VALUE_LEN:
                    raise ValueError(
                        f"'{raw_key}' (select) value exceeds {MAX_SELECT_VALUE_LEN} chars"
                    )
            filters.append(AttributeFilter(key=key, filter_type="select", values=values))
        elif ftype == "text":
            if len(raw_val) > MAX_TEXT_VALUE_LEN:
                raise ValueError(f"'{raw_key}' (text) value exceeds {MAX_TEXT_VALUE_LEN} chars")
            filters.append(
                AttributeFilter(key=key, filter_type="text", value=_escape_like_pattern(raw_val))
            )
        elif ftype == "boolean":
            filters.append(AttributeFilter(key=key, filter_type="boolean", value=raw_val == "true"))
        elif ftype == "exact":
            if len(raw_val) > MAX_TEXT_VALUE_LEN:
                raise ValueError(f"'{raw_key}' (exact) value exceeds {MAX_TEXT_VALUE_LEN} chars")
            filters.append(
                AttributeFilter(key=key, filter_type="exact", value=_escape_like_pattern(raw_val))
            )
        else:
            raise ValueError(f"unsupported filter_type for '{key}'")

    for key, bounds in range_acc.items():
        filters.append(
            AttributeFilter(
                key=key, filter_type="range", min=bounds.get("min"), max=bounds.get("max")
            )
        )
    return filters
