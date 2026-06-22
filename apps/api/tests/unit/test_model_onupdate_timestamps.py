"""Guardrail: no SQLAlchemy model may use a bare Python string as `onupdate`.

`onupdate="now()"` looks like SQL but SQLAlchemy treats a plain string as a
literal Python value to bind directly — it crashes the very first UPDATE
with `asyncpg.DataError: invalid input ... got 'str'`. The fix is
`onupdate=text("now()")`, `onupdate=func.now()`, or `onupdate=lambda: ...`.

This test discovers every mapped column dynamically (no hardcoded model
list) so it also guards against the bug being reintroduced in future models.
"""

from sqlalchemy import Table

import prosell.infrastructure.models  # noqa: F401  (registers every mapper)
from prosell.infrastructure.database.base import Base


def _tables() -> list[Table]:
    """Every mapped table, narrowed from the more general `FromClause`."""
    tables = [mapper.local_table for mapper in Base.registry.mappers]
    return [t for t in tables if isinstance(t, Table)]


def _columns_with_onupdate() -> list[tuple[str, str]]:
    """Return (table.column) pairs for every column declaring `onupdate`."""
    found: list[tuple[str, str]] = []
    for table in _tables():
        for column in table.columns:
            if column.onupdate is not None:
                found.append((table.name, column.name))
    return found


def test_at_least_one_onupdate_column_exists() -> None:
    """Sanity check: the discovery mechanism itself actually finds columns."""
    assert len(_columns_with_onupdate()) > 0


def test_no_model_uses_a_bare_string_as_onupdate() -> None:
    """Every `onupdate` must be a SQL clause/callable, never a raw Python str."""
    offenders = []
    for table in _tables():
        for column in table.columns:
            if column.onupdate is None:
                continue
            if not column.onupdate.is_clause_element and isinstance(
                getattr(column.onupdate, "arg", None), str
            ):
                offenders.append(f"{table.name}.{column.name}")

    assert not offenders, (
        f"These columns use a bare Python string as onupdate (crashes every "
        f"UPDATE): {offenders}. Use onupdate=text('now()') or func.now() instead."
    )
