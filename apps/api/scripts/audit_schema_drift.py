"""Schema Drift Auditor — compares SQLAlchemy ORM models to the live database.

Detects drift introduced when ORM models evolve faster than their
Alembic migrations (or vice versa). Produces a markdown report grouped
by severity:

  critical  — queries will fail or data corruption likely
  warning   — inconsistent state, may cause silent bugs
  info      — orphan or extra objects, no functional impact

Usage (from apps/api/):
    uv run python scripts/audit_schema_drift.py
    uv run python scripts/audit_schema_drift.py postgresql://user:pass@host/db

If no URL is provided, the script uses TEST_DATABASE_URL from the env,
falling back to DATABASE_URL.

Exit code is 1 if any critical findings are present (CI-friendly).
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Any, cast

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Inspector

# Import the Base and EVERY model class explicitly. The
# `infrastructure.models.__init__` does not re-export TeamInvitationModel
# or FacebookPageModel — that omission is itself a drift symptom we want
# the auditor to surface. Importing each file directly guarantees full
# metadata.
from prosell.infrastructure.database.base import Base
from prosell.infrastructure.models.appointment_model import AppointmentModel
from prosell.infrastructure.models.branch_model import BranchModel
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.facebook_account_model import (
    FacebookAccountModel,
    FacebookPageModel,
)
from prosell.infrastructure.models.lead_model import LeadAuditLogModel, LeadModel
from prosell.infrastructure.models.notification_model import NotificationModel
from prosell.infrastructure.models.oauth_account_model import OAuthAccountModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.organization_vertical_model import (
    OrganizationVerticalModel,
)
from prosell.infrastructure.models.product_image_model import ProductImageModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.publication_model import PublicationModel
from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel
from prosell.infrastructure.models.session_model import SessionModel
from prosell.infrastructure.models.team_model import (
    TeamInvitationModel,
    TeamMemberModel,
    TeamModel,
)
from prosell.infrastructure.models.user_branch_model import UserBranchModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.models.user_token_model import UserTokenModel
from prosell.infrastructure.models.wallet_model import WalletModel, WalletTransactionModel

# Sanity check: every model we import must register on Base.metadata.
_REGISTERED = {t.name for t in Base.metadata.tables.values()}
_EXPECTED = {
    AppointmentModel.__tablename__,
    BranchModel.__tablename__,
    CategoryModel.__tablename__,
    FacebookAccountModel.__tablename__,
    FacebookPageModel.__tablename__,
    LeadModel.__tablename__,
    LeadAuditLogModel.__tablename__,
    NotificationModel.__tablename__,
    OAuthAccountModel.__tablename__,
    OrganizationModel.__tablename__,
    OrganizationVerticalModel.__tablename__,
    ProductImageModel.__tablename__,
    ProductModel.__tablename__,
    PublicationModel.__tablename__,
    RoleModel.__tablename__,
    UserRoleModel.__tablename__,
    SessionModel.__tablename__,
    TeamModel.__tablename__,
    TeamMemberModel.__tablename__,
    TeamInvitationModel.__tablename__,
    UserBranchModel.__tablename__,
    UserModel.__tablename__,
    UserTokenModel.__tablename__,
    WalletModel.__tablename__,
    WalletTransactionModel.__tablename__,
}
_UNREGISTERED = _EXPECTED - _REGISTERED
if _UNREGISTERED:
    print(
        f"FATAL: model classes do not register on Base.metadata: {_UNREGISTERED}",
        file=sys.stderr,
    )
    sys.exit(2)


@dataclass
class Finding:
    table: str
    column: str
    drift: str
    orm_value: Any
    db_value: Any
    severity: str
    note: str = ""


def _normalize_type(type_str: str) -> str:
    """Normalize SQLAlchemy/Postgres type strings for stable comparison.

    SQLAlchemy reports inferred types in its own dialect-neutral form
    (e.g. ``CHAR(32)`` for ``Mapped[UUID]``, ``DATETIME`` for
    ``DateTime(timezone=True)``). Postgres reports the storage type
    (``UUID``, ``TIMESTAMP WITH TIME ZONE``). We collapse both sides to
    a canonical short name so the comparison reflects schema agreement
    rather than dialect spelling.
    """
    s = type_str.lower().replace(" ", "")
    s = s.replace("character varying", "varchar")
    s = s.replace("timestampwithtimezone", "timestamptz")
    s = s.replace("timestampwithouttimezone", "timestamp")

    # Dialect-neutral → canonical
    canonical_map = {
        "char(32)": "uuid",
        "uuid": "uuid",
        "datetime": "timestamptz",  # DateTime default = tz-aware in this project
        "timestamp": "timestamptz",  # timestamp without tz still resolves here
        "timestamptz": "timestamptz",
        "float": "doubleprecision",
        "float(precision)": "doubleprecision",
        "doubleprecision": "doubleprecision",
        "double": "doubleprecision",
        # varchar / text / boolean / json / jsonb / int are 1:1
    }
    for src, dst in canonical_map.items():
        if s == src:
            return dst
    return s


def _is_temporal(col_type: Any) -> bool:
    """True if the column type is a timestamp/datetime variant."""
    s = str(col_type).lower()
    return "timestamp" in s or "datetime" in s


def _format_value(v: Any) -> str:
    if v is None:
        return "—"
    s = str(v).replace("|", "\\|").replace("\n", " ")
    return s if len(s) <= 80 else s[:77] + "..."


def _compare_columns(
    table_name: str,
    orm_columns: dict[str, Any],
    db_columns: dict[str, dict[str, Any]],
) -> list[Finding]:
    findings: list[Finding] = []

    for col_name, col in orm_columns.items():
        if col_name not in db_columns:
            findings.append(
                Finding(
                    table=table_name,
                    column=col_name,
                    drift="column_in_orm_missing_in_db",
                    orm_value=str(col.type),
                    db_value=None,
                    severity="critical",
                    note="Querying this column raises ProgrammingError",
                )
            )
            continue

        db_col = db_columns[col_name]

        orm_type = _normalize_type(str(col.type))
        db_type = _normalize_type(str(db_col["type"]))
        if orm_type != db_type:
            findings.append(
                Finding(
                    table=table_name,
                    column=col_name,
                    drift="type_mismatch",
                    orm_value=orm_type,
                    db_value=db_type,
                    severity="critical",
                    note="Type mismatch can cause cast errors or data loss",
                )
            )

        if col.nullable != db_col["nullable"]:
            findings.append(
                Finding(
                    table=table_name,
                    column=col_name,
                    drift="nullability_mismatch",
                    orm_value=f"nullable={col.nullable}",
                    db_value=f"nullable={db_col['nullable']}",
                    severity="critical",
                    note=(
                        "ORM nullability differs from DB constraint — "
                        "INSERTs may fail or accept unexpected NULLs"
                    ),
                )
            )

        # Timezone awareness: `_normalize_type` collapses naive and aware
        # timestamps to one canonical name, so a `timestamp` vs `timestamptz`
        # drift slips past type_mismatch. Compare the tz flag explicitly — a
        # naive column rejects the tz-aware datetimes the domain produces
        # (asyncpg raises DataError on insert).
        if _is_temporal(col.type) and _is_temporal(db_col["type"]):
            orm_tz = bool(getattr(col.type, "timezone", False))
            db_tz = bool(getattr(db_col["type"], "timezone", False))
            if orm_tz != db_tz:
                findings.append(
                    Finding(
                        table=table_name,
                        column=col_name,
                        drift="timezone_awareness_mismatch",
                        orm_value=f"tz_aware={orm_tz}",
                        db_value=f"tz_aware={db_tz}",
                        severity="critical",
                        note=(
                            "Naive/aware timestamp mismatch — asyncpg raises "
                            "DataError when persisting tz-aware datetimes"
                        ),
                    )
                )

    for col_name in db_columns:
        if col_name not in orm_columns:
            findings.append(
                Finding(
                    table=table_name,
                    column=col_name,
                    drift="column_in_db_not_in_orm",
                    orm_value=None,
                    db_value=db_columns[col_name]["type"],
                    severity="warning",
                    note="ORM doesn't know about this column",
                )
            )

    return findings


def _compare_fk_targets(
    table_name: str,
    orm_table: Any,
    db_foreign_keys: list[dict[str, Any]],
) -> list[Finding]:
    findings: list[Finding] = []

    expected: set[tuple[str, str, str]] = set()
    for col in orm_table.columns:
        for fk in col.foreign_keys:
            expected.add(
                (
                    col.name,
                    fk.column.table.name,
                    fk.column.name,
                )
            )

    actual: set[tuple[str, str, str]] = set()
    for fk in db_foreign_keys:
        for col in fk.get("constrained_columns", []):
            ref_table = fk.get("referred_table", "?")
            ref_cols = fk.get("referred_columns", [])
            ref_col = ref_cols[0] if ref_cols else "?"
            actual.add((col, ref_table, ref_col))

    for col, ref_t, ref_c in expected - actual:
        findings.append(
            Finding(
                table=table_name,
                column=col,
                drift="fk_in_orm_missing_in_db",
                orm_value=f"→ {ref_t}.{ref_c}",
                db_value=None,
                severity="critical",
                note="ORM-declared FK does not exist in DB",
            )
        )

    for col, ref_t, ref_c in actual - expected:
        findings.append(
            Finding(
                table=table_name,
                column=col,
                drift="fk_in_db_not_in_orm",
                orm_value=None,
                db_value=f"→ {ref_t}.{ref_c}",
                severity="warning",
                note="DB FK not declared in ORM model",
            )
        )

    return findings


def _compare_indexes(
    table_name: str,
    orm_table: Any,
    db_indexes: list[dict[str, Any]],
) -> list[Finding]:
    """Flag ORM-declared indexes with no covering DB index.

    An ORM index is considered covered when some DB index contains all its
    columns (subset match) — this treats a renamed index (same columns,
    legacy name) and a wider composite index as covering, so only a genuine
    performance gap (no index on those columns at all) is reported.
    """
    findings: list[Finding] = []
    db_colsets = [set(ix.get("column_names") or []) for ix in db_indexes]

    for ix in orm_table.indexes:
        orm_cols = {c.name for c in ix.columns}
        if not orm_cols:
            continue
        covered = any(orm_cols <= db_set for db_set in db_colsets)
        if not covered:
            findings.append(
                Finding(
                    table=table_name,
                    column=",".join(sorted(orm_cols)),
                    drift="index_in_orm_missing_in_db",
                    orm_value=ix.name,
                    db_value=None,
                    severity="warning",
                    note="Declared index has no covering DB index — queries scan these columns",
                )
            )

    return findings


def audit(orm_tables: dict[str, Any], inspector: Inspector) -> list[Finding]:
    all_findings: list[Finding] = []

    for table_name, orm_table in orm_tables.items():
        if not inspector.has_table(table_name):
            all_findings.append(
                Finding(
                    table=table_name,
                    column="<table>",
                    drift="missing_in_db",
                    orm_value=table_name,
                    db_value=None,
                    severity="critical",
                    note="ORM declares table but DB has none",
                )
            )
            continue

        orm_columns = {c.name: c for c in orm_table.columns}
        # Inspector returns ReflectedColumn objects (TypedDict-like). Cast
        # to the dict[str, Any] shape we use throughout this module.
        db_columns_list = inspector.get_columns(table_name)
        db_columns = cast(
            dict[str, dict[str, Any]],
            {c["name"]: dict(c) for c in db_columns_list},
        )

        all_findings.extend(_compare_columns(table_name, orm_columns, db_columns))

        db_fks = cast(
            list[dict[str, Any]],
            [dict(fk) for fk in inspector.get_foreign_keys(table_name)],
        )
        all_findings.extend(_compare_fk_targets(table_name, orm_table, db_fks))

        db_indexes = cast(
            list[dict[str, Any]],
            [dict(ix) for ix in inspector.get_indexes(table_name)],
        )
        all_findings.extend(_compare_indexes(table_name, orm_table, db_indexes))

    # Tables in DB not in ORM (skip alembic_version)
    for table_name in inspector.get_table_names():
        if table_name == "alembic_version":
            continue
        if table_name not in orm_tables:
            all_findings.append(
                Finding(
                    table=table_name,
                    column="<table>",
                    drift="table_in_db_not_in_orm",
                    orm_value=None,
                    db_value=table_name,
                    severity="info",
                    note="DB has table not declared in any ORM model",
                )
            )

    return all_findings


def main() -> int:
    db_url = (
        sys.argv[1]
        if len(sys.argv) > 1
        else os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
    )
    if not db_url:
        print("ERROR: no DB URL (pass as argv[1] or set TEST_DATABASE_URL)", file=sys.stderr)
        return 2

    # `inspect` requires a sync engine. If the URL is async (asyncpg),
    # swap to psycopg2/psycopg for the metadata reflection.
    sync_url = db_url
    for async_driver in ("postgresql+asyncpg://",):
        if sync_url.startswith(async_driver):
            sync_url = sync_url.replace(async_driver, "postgresql+psycopg2://", 1)
            break

    engine = create_engine(sync_url)
    inspector = inspect(engine)

    orm_tables = {t.name: t for t in Base.metadata.tables.values()}
    findings = audit(orm_tables, inspector)

    by_severity: dict[str, list[Finding]] = {"critical": [], "warning": [], "info": []}
    for f in findings:
        by_severity.setdefault(f.severity, []).append(f)

    # Identify which model classes from __init__.py are actually registered
    # (catches the symptom where __init__ doesn't re-export a model file
    # that defines a real ORM class).
    from prosell.infrastructure.models import __all__ as exported

    reexported_tables = set()
    for name in exported:
        cls = globals().get(name)
        if cls is not None and hasattr(cls, "__tablename__"):
            reexported_tables.add(cls.__tablename__)

    unreexported = set(orm_tables) - reexported_tables

    print("# Schema Drift Audit Report")
    print(f"Database host: `{db_url.split('@')[-1]}`")
    print(f"ORM tables in metadata: {len(orm_tables)}")
    print(f"DB tables: {len(inspector.get_table_names())}")
    print(f"Total findings: {len(findings)}")
    print(
        f"  🔴 critical: {len(by_severity['critical'])}  "
        f"🟡 warning: {len(by_severity['warning'])}  "
        f"🔵 info: {len(by_severity['info'])}"
    )

    if unreexported:
        print("\n## ⚠️  ORM classes not re-exported by `infrastructure.models.__init__`")
        print("These models are loaded by the auditor (explicit imports) but")
        print("NOT picked up by `from prosell.infrastructure.models import *`,")
        print("which means they are invisible to Alembic autogenerate and to")
        print("anything that relies on `Base.metadata` being complete.\n")
        for t in sorted(unreexported):
            print(f"  - `{t}`")
        print("\nFix: add the missing class to `__all__` in `models/__init__.py`.")

    for sev in ("critical", "warning", "info"):
        items = by_severity.get(sev, [])
        if not items:
            continue
        print(f"\n## {sev.upper()} ({len(items)})\n")
        print("| Table | Column | Drift | ORM | DB | Note |")
        print("|---|---|---|---|---|---|")
        for f in sorted(items, key=lambda x: (x.table, x.column, x.drift)):
            print(
                f"| {f.table} | {f.column} | {f.drift} | "
                f"{_format_value(f.orm_value)} | {_format_value(f.db_value)} | "
                f"{_format_value(f.note)} |"
            )

    return 1 if by_severity.get("critical") else 0


if __name__ == "__main__":
    sys.exit(main())
