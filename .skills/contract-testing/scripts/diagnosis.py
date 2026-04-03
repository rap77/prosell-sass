"""Failure Analysis - Diagnoses test failures and determines fixes.

This module analyzes pytest output to determine the root cause of test
failures and recommend specific fixes.
"""

import re
from dataclasses import dataclass
from pathlib import Path

# Constants
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


@dataclass
class Diagnosis:
    """Diagnosis of a test failure."""

    reason: str
    file_path: Path
    fix_description: str
    fix_type: str  # "import", "normalizer", "type_conversion", "null_handling", "default_value"
    line_number: int | None = None
    code_snippet: str | None = None


def analyze_failure(
    pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Analyze pytest failure and determine root cause.

    Args:
        pytest_output: Output from failed pytest run
        test_path: Path to the failing test
        project_root: Project root directory

    Returns:
        Diagnosis with fix recommendation
    """
    # Pattern 1: Normalizer not connected (casing mismatch)
    if "assert 'chevrolet' == 'CHEVROLET'" in pytest_output:
        return _diagnose_normalizer(pytest_output, test_path, project_root)

    # Pattern 2: Missing import
    if "ImportError" in pytest_output or "ModuleNotFoundError" in pytest_output:
        return _diagnose_missing_import(pytest_output, test_path, project_root)

    # Pattern 3: Type mismatch
    if "TypeError" in pytest_output:
        return _diagnose_type_mismatch(pytest_output, test_path, project_root)

    # Pattern 4: Null/None handling
    if "AssertionError: None != " in pytest_output or "NoneType" in pytest_output:
        return _diagnose_null_handling(pytest_output, test_path, project_root)

    # Pattern 5: Missing field/KeyError
    if "KeyError" in pytest_output:
        return _diagnose_missing_field(pytest_output, test_path, project_root)

    # Default: generic diagnosis
    return Diagnosis(
        reason="Unknown failure pattern",
        file_path=test_path,
        fix_description="Manual investigation required",
        fix_type="unknown",
    )


def _diagnose_normalizer(
    pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Diagnose normalizer not connected issue."""
    # Extract field name from assertion
    match = re.search(r"assert '(\w+)' == '(\w+)'", pytest_output)
    if match:
        field_name = match.group(1)
        return Diagnosis(
            reason=f"Normalizer not connected for field '{field_name}'",
            file_path=_find_use_case_file(test_path, project_root),
            fix_description=f"Wrap {field_name} with normalize_*() function",
            fix_type="normalizer",
        )

    return Diagnosis(
        reason="Normalizer not connected",
        file_path=_find_use_case_file(test_path, project_root),
        fix_description="Import and call normalize_*() function",
        fix_type="normalizer",
    )


def _diagnose_missing_import(
    pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Diagnose missing import issue."""
    match = re.search(r"No module named '(\w+)'", pytest_output)
    if match:
        module_name = match.group(1)
        return Diagnosis(
            reason=f"Missing import: {module_name}",
            file_path=_find_use_case_file(test_path, project_root),
            fix_description=f"Add: from ... import {module_name}",
            fix_type="import",
        )

    return Diagnosis(
        reason="Missing import",
        file_path=_find_use_case_file(test_path, project_root),
        fix_description="Add required import statement",
        fix_type="import",
    )


def _diagnose_type_mismatch(
    _pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Diagnose type mismatch issue."""
    return Diagnosis(
        reason="Type mismatch between expected and actual",
        file_path=_find_use_case_file(test_path, project_root),
        fix_description="Add type conversion (str(), int(), etc.)",
        fix_type="type_conversion",
    )


def _diagnose_null_handling(
    _pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Diagnose null/None handling issue."""
    return Diagnosis(
        reason="Null value not handled correctly",
        file_path=_find_use_case_file(test_path, project_root),
        fix_description="Add null check or default value",
        fix_type="null_handling",
    )


def _diagnose_missing_field(
    pytest_output: str,
    test_path: Path,
    project_root: Path,
) -> Diagnosis:
    """Diagnose missing field issue."""
    match = re.search(r"KeyError: '(\w+)'", pytest_output)
    if match:
        field_name = match.group(1)
        return Diagnosis(
            reason=f"Missing field: {field_name}",
            file_path=_find_use_case_file(test_path, project_root),
            fix_description=f"Add {field_name} to DTO or provide default value",
            fix_type="default_value",
        )

    return Diagnosis(
        reason="Missing field in DTO",
        file_path=_find_use_case_file(test_path, project_root),
        fix_description="Add missing field to DTO",
        fix_type="default_value",
    )


def _find_use_case_file(test_path: Path, project_root: Path) -> Path:
    """Find the use case file corresponding to the test.

    Args:
        test_path: Path to test file
        project_root: Project root directory

    Returns:
        Path to the use case file
    """
    # Extract endpoint name from test path
    # e.g., test_vin_decode_contract.py → decode_vin.py

    test_name = test_path.stem  # Remove .py
    test_name = test_name.replace("test_", "").replace("_contract", "")

    # Find matching use case file
    use_case_path = (
        project_root
        / "apps"
        / "api"
        / "src"
        / "prosell"
        / "application"
        / "use_cases"
        / f"{test_name}.py"
    )

    if use_case_path.exists():
        return use_case_path

    # Fallback: return test path
    return test_path
