"""Regression tests for alembic migration chain integrity.

These tests guard the project against orphan revisions (a migration whose
revision ID is referenced by the database but no longer exists in the source
tree). That was the root cause of the 2026-06-04 incident:

- A migration `d3e8ca98ee2b_create_facebook_accounts_and_pages_` was created
- Someone consolidated the alembic timeline (commit 06831ec) and renamed /
  removed that migration, replacing it with `recreate_facebook_tables`
- Local databases initialized with the old revision got stuck: every alembic
  command failed with "Can't locate revision identified by 'd3e8ca98ee2b'"
- The DB schema drifted from the ORM model — `image_urls` column was missing
  on `products` — causing 500s on every endpoint that touched the model.

These tests parse the migration files and assert that the chain is valid:
- Each `revision` is unique across the tree
- Each `down_revision` resolves to an existing revision
- The graph is connected (no orphan subtrees)
- There is at most one `head` (linear chain; multi-head requires explicit
  merge migrations which this project does not use)
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]
VERSIONS_DIR = REPO_ROOT / "apps" / "api" / "alembic" / "versions"


def _migration_files() -> list[Path]:
    """Return all .py migration files (excluding __pycache__)."""
    if not VERSIONS_DIR.exists():
        return []
    return sorted(p for p in VERSIONS_DIR.glob("*.py") if p.is_file())


def _parse_migration(path: Path) -> tuple[str, str | None]:
    """Extract (revision, down_revision) from a migration file via regex.

    Avoids importing alembic — keeps the test fast and pure.
    Supports two declaration styles:
    1. Typed (PEP 604 / Union): `revision: str = "..."`, `down_revision: ... = ...`
    2. Untyped (older alembic):    `revision = "..."`, `down_revision = "..."`
    """
    text = path.read_text()

    # Match `revision = "..."` OR `revision: str = "..."`
    rev_match = re.search(
        r'^\s*revision\s*(?::\s*\S+)?\s*=\s*["\']([^"\']+)["\']',
        text,
        re.MULTILINE,
    )
    if not rev_match:
        pytest.fail(f"{path.name}: cannot find `revision = ...` declaration")
    revision = rev_match.group(1)

    # Match `down_revision = "..."` OR `down_revision: <type> = ...` — single line only.
    # The value must be a string literal, None, or a list literal — all fit on one line.
    down_match = re.search(
        r"^\s*down_revision\s*(?::\s*[^=\n]+)?=\s*(\S.*?)\s*$",
        text,
        re.MULTILINE,
    )
    if not down_match:
        pytest.fail(
            f"{path.name}: cannot find `down_revision = ...` declaration. "
            f"Expected a string literal, None, or a list literal."
        )
    raw_value = down_match.group(1).strip()

    if raw_value.startswith('"') or raw_value.startswith("'"):
        down_revision: str | None = re.search(r'["\']([^"\']+)["\']', raw_value).group(1)  # type: ignore[union-attr]
    elif raw_value == "None":
        down_revision = None
    elif raw_value.startswith("["):
        # Sequence[str] case — first revision in the list
        first = re.search(r'["\']([^"\']+)["\']', raw_value)
        down_revision = first.group(1) if first else None
    else:
        pytest.fail(f"{path.name}: cannot parse down_revision value: {raw_value!r}")

    return revision, down_revision


@pytest.fixture(scope="module")
def migration_graph() -> dict[str, str | None]:
    """Parse all migrations once: {revision: down_revision_or_None}."""
    graph: dict[str, str | None] = {}
    for path in _migration_files():
        rev, down = _parse_migration(path)
        if rev in graph:
            pytest.fail(f"Duplicate revision ID {rev!r} found in {path.name}")
        graph[rev] = down
    return graph


class TestMigrationChainIntegrity:
    """The migration chain must be linear and self-contained."""

    def test_at_least_one_migration_exists(self) -> None:
        """Sanity: there should be migration files in the project."""
        files = _migration_files()
        assert len(files) > 0, (
            f"No migration files found at {VERSIONS_DIR}. "
            "Did the alembic directory move or get deleted?"
        )

    def test_each_migration_has_unique_revision(self, migration_graph: dict) -> None:
        """No two migrations may share the same `revision` ID."""
        revisions = list(migration_graph.keys())
        assert len(revisions) == len(
            set(revisions)
        ), f"Duplicate revision IDs detected. Revisions: {sorted(revisions)}"

    def test_every_down_revision_resolves_to_existing_migration(
        self, migration_graph: dict
    ) -> None:
        """Every down_revision (except None) must point to an existing migration.

        This is the exact bug that caused the 2026-06-04 incident: a database
        pointed to a revision that no longer existed in the source tree.
        """
        orphans: list[tuple[str, str]] = []
        for rev, down in migration_graph.items():
            if down is None:
                continue  # root migration (no parent)
            if down not in migration_graph:
                orphans.append((rev, down))

        assert not orphans, (
            f"Orphan down_revisions found (migration references a parent that "
            f"does not exist in the source tree). This is the schema-drift bug. "
            f"Orphans: {orphans}"
        )

    def test_chain_is_connected_no_orphan_subtrees(self, migration_graph: dict) -> None:
        """Starting from any node, walking up down_revisions must reach the root.

        If a migration's down_revision chain leads to a missing parent,
        it forms an orphan subtree that databases can get stuck on.
        """
        # Find all roots (down_revision is None)
        roots = [rev for rev, down in migration_graph.items() if down is None]
        assert len(roots) == 1, (
            f"Expected exactly one root migration (down_revision=None), "
            f"found {len(roots)}: {roots}. Multiple roots indicate a branched "
            f"history that needs an explicit merge migration."
        )

        # From every node, follow up to the root. If we ever hit a missing
        # parent, that's an orphan.
        for start in migration_graph:
            visited: set[str] = set()
            current: str | None = start
            while current is not None:
                if current in visited:
                    pytest.fail(f"Cycle detected in migration chain at {current!r}")
                visited.add(current)
                parent = migration_graph[current]
                if parent is not None and parent not in migration_graph:
                    pytest.fail(
                        f"Migration {current!r} references down_revision {parent!r} "
                        f"which does not exist in the source tree. "
                        f"Walked from {start!r} through: {visited}"
                    )
                current = parent

    def test_chain_is_linear_single_head(self, migration_graph: dict) -> None:
        """There should be at most one migration with no children (the head).

        Multiple heads = branched history that needs an explicit merge.
        """
        # A migration is a "head" if no other migration has it as down_revision
        children: set[str] = set()
        for down in migration_graph.values():
            if down is not None:
                children.add(down)

        heads = [rev for rev in migration_graph if rev not in children]
        assert len(heads) <= 1, (
            f"Multiple head migrations detected (branched history). "
            f"This project does not use merge migrations. Heads: {heads}. "
            f"Consolidate the timeline into a single linear chain."
        )

    def test_no_orphan_revisions_pointed_to_from_pyc_cache(self, migration_graph: dict) -> None:
        """Defensive: __pycache__ may still hold references to deleted migrations.

        This was the smoking gun on 2026-06-04: __pycache__/...d3e8ca98ee2b.pyc
        existed as a binary file but no .py source. Stale .pyc files can
        confuse devs (they see "the file exists!" when grepping) and
        occasionally confuse alembic itself.

        Run `find . -name __pycache__ -exec rm -rf {} +` to clean them.
        """
        pycache = VERSIONS_DIR / "__pycache__"
        if not pycache.exists():
            return

        orphan_pyc: list[str] = []
        for pyc in pycache.glob("*.pyc"):
            # Filenames look like "20260404_1429-094a57cf7b48_add_missing_tables....pyc"
            # Extract the revision ID portion (e.g., "094a57cf7b48")
            match = re.search(r"-([0-9a-zA-Z_]{6,})_", pyc.name)
            if not match:
                continue
            rev_candidate = match.group(1)
            # Only flag if the .pyc references a revision that DOESN'T have a .py
            # (i.e., a stale cache from a deleted migration)
            stem = pyc.stem.split(".", 1)[0]
            has_source = any(p.stem == stem for p in VERSIONS_DIR.glob("*.py"))
            if not has_source and rev_candidate not in set(migration_graph):
                orphan_pyc.append(pyc.name)

        assert not orphan_pyc, (
            f"Stale .pyc files in {pycache.name} reference deleted migrations: "
            f"{orphan_pyc}. This is the exact pattern that caused the 2026-06-04 "
            f"incident (alembic orphan state). Clean them with:\n"
            f"  find . -name __pycache__ -exec rm -rf {{}} +\n"
            f"Then verify: docker compose exec api alembic current"
        )
