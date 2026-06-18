"""Parse raw `attr.*` query params into validated AttributeFilters against a schema."""

from decimal import Decimal, InvalidOperation

from prosell.domain.value_objects.attribute_filter import AttributeFilter


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
            try:
                bound = Decimal(raw_val)
            except InvalidOperation as exc:
                raise ValueError(f"'{raw_key}' must be numeric") from exc
            range_acc.setdefault(key, {})[suffix or "min"] = bound
        elif ftype == "select":
            filters.append(
                AttributeFilter(key=key, filter_type="select", values=raw_val.split(","))
            )
        elif ftype == "text":
            filters.append(AttributeFilter(key=key, filter_type="text", value=raw_val))
        elif ftype == "boolean":
            filters.append(AttributeFilter(key=key, filter_type="boolean", value=raw_val == "true"))
        elif ftype == "exact":
            filters.append(AttributeFilter(key=key, filter_type="exact", value=raw_val))
        else:
            raise ValueError(f"unsupported filter_type for '{key}'")

    for key, bounds in range_acc.items():
        filters.append(
            AttributeFilter(
                key=key, filter_type="range", min=bounds.get("min"), max=bounds.get("max")
            )
        )
    return filters
