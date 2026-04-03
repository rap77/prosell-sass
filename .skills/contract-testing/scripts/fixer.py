"""Iterative Auto-Repair Agent - Makes tests pass automatically.

This module implements the core iterative logic that:
1. Runs pytest
2. Analyzes failures
3. Applies fixes
4. Re-tests until passing (max 10 iterations)
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path

from scripts.diagnosis import analyze_failure
from scripts.fixes import apply_fix

# Constants
MAX_ITERATIONS = 10
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


@dataclass
class FixResult:
    """Result of fix_until_pass operation."""

    success: bool
    iterations: int
    commit_hash: str | None = None
    error: str | None = None
    modified_files: list[Path] = None

    def __post_init__(self):
        if self.modified_files is None:
            self.modified_files = []


def fix_until_pass(
    test_path: Path,
    project_root: Path = PROJECT_ROOT,
    max_iterations: int = MAX_ITERATIONS,
) -> FixResult:
    """Iterate fixes until test passes or max iterations reached.

    Args:
        test_path: Path to the test file
        project_root: Root directory of the project
        max_iterations: Maximum number of fix attempts

    Returns:
        FixResult with success status and details
    """
    modified_files = []

    for iteration in range(1, max_iterations + 1):
        # 1. Run pytest
        result = run_pytest(test_path, project_root)

        if result.passed:
            # 2. Success! Commit the fix
            commit_hash = commit_fix(
                message=f"fix(contract): resolve {test_path.stem}",
                files=modified_files,
                project_root=project_root,
            )
            return FixResult(
                success=True,
                iterations=iteration,
                commit_hash=commit_hash,
                modified_files=modified_files,
            )

        # 3. Analyze failure
        diagnosis = analyze_failure(result.output, test_path, project_root)

        print(f"Iteration {iteration}: {diagnosis.reason}")
        print(f"  File: {diagnosis.file_path}")
        print(f"  Fix: {diagnosis.fix_description}")

        # 4. Apply fix
        fixed_files = apply_fix(diagnosis)
        modified_files.extend(fixed_files)

    # Max iterations reached
    return FixResult(
        success=False,
        iterations=max_iterations,
        error="Could not fix after max iterations",
        modified_files=modified_files,
    )


@dataclass
class PytestResult:
    """Result of pytest execution."""

    passed: bool
    output: str
    returncode: int


def run_pytest(test_path: Path, project_root: Path) -> PytestResult:
    """Run pytest on the test file.

    Args:
        test_path: Path to test file
        project_root: Project root directory

    Returns:
        PytestResult with pass status and output
    """
    cmd = ["uv", "run", "pytest", str(test_path), "-v"]
    result = subprocess.run(
        cmd,
        cwd=project_root,
        capture_output=True,
        text=True,
    )

    passed = result.returncode == 0

    return PytestResult(
        passed=passed,
        output=result.stdout + result.stderr,
        returncode=result.returncode,
    )


def commit_fix(
    message: str,
    files: list[Path],
    project_root: Path,
) -> str:
    """Commit the fix with conventional commit message.

    Args:
        message: Commit message
        files: List of modified files to commit
        project_root: Project root directory

    Returns:
        Commit hash
    """
    # Stage files
    for file_path in files:
        subprocess.run(
            ["git", "add", str(file_path)],
            cwd=project_root,
            capture_output=True,
        )

    # Commit
    result = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=project_root,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Warning: git commit failed: {result.stderr}")

    # Get commit hash
    hash_result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=project_root,
        capture_output=True,
        text=True,
    )

    return hash_result.stdout.strip()
