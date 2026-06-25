#!/usr/bin/env python3
"""Validate Spec Status Lifecycle in docs/superpowers/specs/*.md.

Implements the Status lifecycle convention documented in CLAUDE.md. Every
spec file MUST have a `**Status**: <value>` line in its header (first 30
lines) with one of the allowed enum values.

Allowed values:
  - DRAFT         — spec in writing, decisions not locked
  - APPROVED      — decisions locked, work not started
  - IN PROGRESS   — PR open that implements the spec
  - IMPLEMENTED   — PR merged to main (PR #NNN reference optional but recommended)
  - COMPLETED     — for roadmaps only: all dependent work is done
  - SUPERSEDED    — replaced by a newer spec (must reference successor)
  - STALE         — items closed by other unrelated work (requires audit section)

Additional requirements:
  - STALE specs must contain a section discussing closure ("audit" word present).
  - SUPERSEDED specs should reference the successor spec (recommended, not enforced).

Exit codes:
  0 — all specs have valid Status
  1 — at least one spec has invalid/missing Status

Usage:
  python scripts/validate_spec_status.py

Wired into .pre-commit-config.yaml as the `spec-status-required` hook so it
runs on every commit that touches docs/superpowers/specs/*.md.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SPECS_DIR = Path("docs/superpowers/specs")

VALID_STATUSES: frozenset[str] = frozenset(
    {
        "DRAFT",
        "APPROVED",
        "IN PROGRESS",
        "IMPLEMENTED",
        "COMPLETED",
        "SUPERSEDED",
        "STALE",
    }
)

# Matches lines like:
#   **Status**: IMPLEMENTED (PR #34, merged 2026-06-17)
#   **Status:** STALE — items closed by Subsystems B/C/E (see audit below)
# Tolerates both `**Status**:` (colon outside) and `**Status:**` (colon inside).
STATUS_LINE_RE = re.compile(r"^\s*\*+\s*[Ss]tatus[^\n]*?([A-Z][A-Z][A-Z][A-Z ]*?)\b")


def _check_status_line(file_path: Path) -> tuple[str | None, int | None, list[int]]:
    """Return (status_value_uppercased, line_no, duplicate_line_nos).

    Scans all lines so duplicate **Status**: entries outside the header are caught.
    """
    try:
        lines = file_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None, None, []

    header_value: str | None = None
    header_line: int | None = None
    duplicates: list[int] = []

    for line_no, line in enumerate(lines, start=1):
        m = STATUS_LINE_RE.match(line)
        if not m:
            continue
        value = m.group(1).strip().upper()
        if header_line is None and line_no <= 30:
            header_value = value
            header_line = line_no
        elif header_line is not None:
            duplicates.append(line_no)

    return header_value, header_line, duplicates


def _has_audit_section(file_path: Path) -> bool:
    """Check if the file mentions 'audit' (any case) anywhere — proxy for
    STALE specs documenting why their items were closed elsewhere.
    """
    try:
        text = file_path.read_text(encoding="utf-8").lower()
    except OSError:
        return False
    return "audit" in text


def _validate_one(file_path: Path) -> list[str]:
    errors: list[str] = []
    status, line_no, duplicates = _check_status_line(file_path)

    if line_no is None:
        return [f"{file_path}: missing `**Status**: <value>` line in first 30 lines"]

    if status is None:
        errors.append(
            f"{file_path}:{line_no}: `**Status**:` line present but value could not be parsed"
        )
        return errors

    if status not in VALID_STATUSES:
        errors.append(
            f"{file_path}:{line_no}: status '{status}' is not valid. "
            f"Allowed: {', '.join(sorted(VALID_STATUSES))}"
        )

    if duplicates:
        errors.append(
            f"{file_path}: duplicate `**Status**:` line(s) found outside header "
            f"at line(s) {duplicates} — only the header (first 30 lines) is authoritative"
        )

    if status == "STALE" and not _has_audit_section(file_path):
        errors.append(
            f"{file_path}:{line_no}: STALE status requires an audit section in the doc "
            "explaining which items were closed by which other work"
        )

    return errors


def main() -> int:
    if not SPECS_DIR.is_dir():
        print(f"Spec directory not found: {SPECS_DIR}", file=sys.stderr)
        return 1

    spec_files = sorted(p for p in SPECS_DIR.glob("*.md") if p.is_file())
    if not spec_files:
        print(f"No spec files found in {SPECS_DIR}", file=sys.stderr)
        return 1

    all_errors: list[str] = []
    for f in spec_files:
        all_errors.extend(_validate_one(f))

    if all_errors:
        print("❌ spec-status validation FAILED:", file=sys.stderr)
        for err in all_errors:
            print(f"  - {err}", file=sys.stderr)
        print("", file=sys.stderr)
        print(
            "Allowed Status values: DRAFT | APPROVED | IN PROGRESS | "
            "IMPLEMENTED | COMPLETED | SUPERSEDED | STALE",
            file=sys.stderr,
        )
        print(
            "STALE requires an audit section. SUPERSEDED should reference the successor.",
            file=sys.stderr,
        )
        return 1

    print(f"✓ spec-status: validated {len(spec_files)} spec(s), all OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
