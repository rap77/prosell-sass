"""Source-level guard tests for the post-backfill invariant.

Once the DB trigger installed by the enforce-vehicle_code-required
migration guarantees that ``attributes["vehicle_code"]`` is non-empty
on every published product in a vehicle category, the use case
``ExportCatalogClientFormatUseCase`` MUST drop its runtime backfill
branch — there is no fallback to run because the DB invariant makes
"missing vehicle_code" unreachable by the time the export reads the
row.

These tests are file-content assertions (not behavioural): they fail
if the use case still references the runtime backfill primitives
that became unreachable code post-migration. Both checks MUST hold
after the migration ships; if either is missing, the use case has
leftover dead code that future maintainers may mistakenly revive.
"""

from pathlib import Path

_USE_CASE_PATH = (
    Path(__file__).resolve().parents[5]
    / "src"
    / "prosell"
    / "application"
    / "use_cases"
    / "product"
    / "export_catalog_client_format.py"
)


def test_use_case_does_not_invoke_update_vehicle_code_if_absent() -> None:
    """The runtime backfill primitive is unreachable once the DB
    trigger guarantees ``vehicle_code`` is present on every vehicle-
    category product. Leaving the call in place creates a misleading
    failure surface — a future reader can mistake it for a live
    fallback path.
    """
    source = _USE_CASE_PATH.read_text(encoding="utf-8")
    assert "update_vehicle_code_if_absent" not in source, (
        "ExportCatalogClientFormatUseCase must not call the runtime "
        "backfill primitive `update_vehicle_code_if_absent`; the DB "
        "trigger installed by the enforce-vehicle_code_required migration "
        "guarantees vehicle_code is present on every vehicle-category "
        "product. The use case should trust the DB invariant."
    )


def test_use_case_does_not_reference_vehicle_code_allocator() -> None:
    """Document the intent: the allocator is the create-path's job
    (and is wired into ``CreateProductUseCase``), not the export's.
    Leaving a reference in the export suggests the export path can
    allocate — it cannot, because by the time the export runs the
    product already has a persisted code.
    """
    source = _USE_CASE_PATH.read_text(encoding="utf-8")
    assert "VehicleCodeAllocator" not in source, (
        "ExportCatalogClientFormatUseCase must not reference "
        "`VehicleCodeAllocator`; allocation belongs to the create "
        "path, not the export. A reference here signals to future "
        "readers that the export path can allocate codes, which is "
        "no longer true post-migration."
    )


# ── Regression note for the existing unit test suite ──────────────────────
#
# The pre-existing unit tests at
# ``tests/unit/application/use_cases/product/test_export_catalog_client_format.py``
# exercise the use case assuming `vehicle_code` is present on every input
# product — exactly the invariant the DB trigger now enforces. After the
# use case drops the runtime backfill branch, those existing tests MUST
# remain green unmodified (the test data and expected CSV contents do
# not change, only the implementation path that produces them). Pytest's
# own collection handles that guarantee; no separate assertion here.
