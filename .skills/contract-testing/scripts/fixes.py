"""Fix Application - Applies fixes to source code.

This module applies specific fixes based on diagnosis.
"""

from pathlib import Path

from scripts.diagnosis import Diagnosis


def apply_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply fix based on diagnosis.

    Args:
        diagnosis: Diagnosis with fix details

    Returns:
        List of modified file paths
    """
    if diagnosis.fix_type == "normalizer":
        return _apply_normalizer_fix(diagnosis)
    elif diagnosis.fix_type == "import":
        return _apply_import_fix(diagnosis)
    elif diagnosis.fix_type == "type_conversion":
        return _apply_type_conversion_fix(diagnosis)
    elif diagnosis.fix_type == "null_handling":
        return _apply_null_handling_fix(diagnosis)
    elif diagnosis.fix_type == "default_value":
        return _apply_default_value_fix(diagnosis)
    else:
        raise ValueError(f"Unknown fix type: {diagnosis.fix_type}")


def _apply_normalizer_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply normalizer connection fix.

    This is a placeholder. In production, this would:
    1. Parse the source file
    2. Find the target field
    3. Add import statement if needed
    4. Wrap field assignment with normalize_*() call
    """
    file_path = diagnosis.file_path

    # For now, just print what would be done
    print(f"  [PLACEHOLDER] Would apply to {file_path}:")
    print("    1. Add import: from ... import normalize_*")
    print("    2. Wrap field with normalize_*()")

    return [file_path]


def _apply_import_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply missing import fix."""
    file_path = diagnosis.file_path

    print(f"  [PLACEHOLDER] Would add import to {file_path}")

    return [file_path]


def _apply_type_conversion_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply type conversion fix."""
    file_path = diagnosis.file_path

    print(f"  [PLACEHOLDER] Would add type conversion in {file_path}")

    return [file_path]


def _apply_null_handling_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply null handling fix."""
    file_path = diagnosis.file_path

    print(f"  [PLACEHOLDER] Would add null check in {file_path}")

    return [file_path]


def _apply_default_value_fix(diagnosis: Diagnosis) -> list[Path]:
    """Apply default value fix."""
    file_path = diagnosis.file_path

    print(f"  [PLACEHOLDER] Would add default value in {file_path}")

    return [file_path]
