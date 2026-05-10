#!/usr/bin/env python3
"""Handler para /mm:complete-task.

Lanza task-executor agent para ejecutar subtareas pendientes.

REFACTOR v2:
- Sin temp files - estado en task-progress.json
- Output estructurado machine-parseable
- Detección git mejorada con git log --grep
"""

import json
import logging
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Configure logging
# NOTE: This CLI tool uses print() instead of logger for structured output.
# The handler must emit machine-parseable messages (LAUNCH:, PAYLOAD:, STATUS:)
# that the calling command can parse. Logger output doesn't guarantee this format.
logging.basicConfig(
    level=logging.INFO,
    format="[mm] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def _find_project_root() -> Path:
    """Find project root via git, fallback to file-relative path."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except Exception:
        pass
    # Fallback: this file lives at <root>/.claude/commands/mm/
    return Path(__file__).resolve().parent.parent.parent.parent


def _read_stack_from_config(project_root: Path) -> list[str]:
    """Read stack list from .mastermind/config.yaml (no external deps)."""
    config_path = project_root / ".mastermind" / "config.yaml"
    if not config_path.exists():
        return []
    in_stack = False
    stack: list[str] = []
    for line in config_path.read_text().splitlines():
        stripped = line.strip()
        if stripped == "stack:":
            in_stack = True
            continue
        if in_stack:
            if stripped.startswith("- "):
                stack.append(stripped[2:].strip())
            elif stripped and not line[0].isspace():
                break
    return stack


def _read_project_id_from_config(project_root: Path) -> str | None:
    """Read project_id from .mastermind/config.yaml (written by /mm:init after DB registration)."""
    config_path = project_root / ".mastermind" / "config.yaml"
    if not config_path.exists():
        return None
    for line in config_path.read_text().splitlines():
        if line.strip().startswith("project_id:"):
            value = line.split(":", 1)[1].strip().strip('"').strip("'")
            return value if value else None
    return None


PROJECT_ROOT = _find_project_root()
TASKS_DIR = PROJECT_ROOT / "tasks"
PLANNING_DIR = PROJECT_ROOT / ".planning"
RUNTIME_STATE_PATH = PLANNING_DIR / "task-progress.json"
PLAN_MD = TASKS_DIR / "plan.md"
TODO_MD = TASKS_DIR / "todo.md"


# ============================================================================
# Output Helpers - Structured, machine-parseable
# ============================================================================


def mm_info(msg: str) -> None:
    """Print INFO message."""
    print(f"INFO: {msg}", flush=True)


def mm_task(task_id: str, title: str) -> None:
    """Print task header."""
    print(f"TASK: {task_id}", flush=True)
    print(f"TITLE: {title}", flush=True)


def mm_subtask(subtask_id: str, status: str, description: str = "") -> None:
    """Print subtask line."""
    desc = f" ({description})" if description else ""
    print(f"SUBTASK: {subtask_id} {status}{desc}", flush=True)


def mm_git(count: int, total: int, completed: list[str]) -> None:
    """Print git status."""
    completed_str = ",".join(completed) if completed else "none"
    print(f"GIT: {count}/{total} subtasks have commits [{completed_str}]", flush=True)


def mm_pending(count: int) -> None:
    """Print pending count."""
    print(f"PENDING: {count} subtasks to execute", flush=True)


def mm_launch(task_id: str) -> None:
    """Print launch command (no DB session — legacy path)."""
    payload = get_task_payload(task_id)
    print("LAUNCH: task-executor", flush=True)
    print(f"PAYLOAD: {json.dumps(payload)}", flush=True)


def _open_db_session(_task_id: str, _pending_count: int) -> str | None:
    """Open a dev session in the DB. Returns session UUID or None if DB unavailable."""
    try:
        sys.path.insert(0, str(PLANNING_DIR.parent / ".claude" / "commands" / "mm"))
        from db_client import MasterMindDB  # noqa: PLC0415

        project_id = _read_project_id_from_config(PROJECT_ROOT)
        with MasterMindDB() as db:
            if not db.available:
                return None
            return db.save_session(
                started_by="complete-task-handler",
                phase_number=None,
                project_id=project_id,
            )
    except Exception:
        return None


def _mm_launch_with_db(task_id: str, db_session_id: str | None) -> None:
    """Print launch command including db_session_id in payload."""
    payload = get_task_payload(task_id)
    if db_session_id:
        payload["db_session_id"] = db_session_id
    print("LAUNCH: task-executor", flush=True)
    print(f"PAYLOAD: {json.dumps(payload)}", flush=True)


def mm_status(msg: str) -> None:
    """Print status message."""
    print(f"STATUS: {msg}", flush=True)


def mm_error(msg: str) -> None:
    """Print error message."""
    print(f"ERROR: {msg}", flush=True, file=sys.stderr)


def get_previous_task_id(task_id: str) -> str | None:
    """Return the task ID that precedes task_id in plan.md, or None if first."""
    if not PLAN_MD.exists():
        return None
    content = PLAN_MD.read_text()
    # Match headings at any level (##, ###, ####) — task IDs like B1.1 live under ####
    task_ids = re.findall(r"^#{2,6}\s+([\w][\w.\-]*):", content, re.MULTILINE)
    # Remove checkpoint/summary headers (keep only real task IDs)
    task_ids = [t for t in task_ids if not t.lower().startswith("checkpoint")]
    try:
        idx = task_ids.index(task_id)
        return task_ids[idx - 1] if idx > 0 else None
    except ValueError:
        return None


def check_previous_criteria_complete(task_id: str) -> bool:
    """Block task start if the previous task has unverified acceptance criteria.

    For subtasks (e.g., "B2.1"), checks the parent task (B2) ONLY if the parent
    is marked as complete. Otherwise, skips verification to allow parallel execution.

    Returns True if OK to proceed, False if blocked.
    """
    # If this is a subtask (has a dot), check if parent is complete
    if "." in task_id:
        parent_id = task_id.rsplit(".", 1)[0]
        parent_complete = _is_parent_task_complete(parent_id)

        if not parent_complete:
            # Parent not complete - don't verify criteria (allow parallel work)
            return True

        # Parent IS complete - verify its acceptance criteria
        prev_id = parent_id
    else:
        # Not a subtask - get previous task normally
        prev_id = get_previous_task_id(task_id)
        if not prev_id:
            return True  # First task — no previous to check

    content = PLAN_MD.read_text()
    pattern = r"#{2,6}\s+" + re.escape(prev_id) + r".*?\*\*Acceptance(?: Criteria)?\*\*:?\n(.*?)(?=\n#|\n---|\Z)"
    m = re.search(pattern, content, re.DOTALL)
    if not m:
        return True  # No criteria section found — don't block

    criteria_block = m.group(1)
    pending = criteria_block.count("- [ ]")
    total = pending + criteria_block.count("- [x]")

    if pending > 0:
        mm_error(f"❌ BLOCKED: Task {prev_id} has {pending}/{total} unverified acceptance criteria")
        mm_error(f"   Complete them first: /mm:verify-criteria {prev_id} --all")
        mm_error(f"   Or auto-check: /mm:verify-criteria {prev_id} --verify")
        return False

    return True


def _is_parent_task_complete(parent_id: str) -> bool:
    """Check if parent task is marked as complete in todo.md.

    A parent task is considered complete if it has a checkpoint section
    with all checkboxes marked as complete.

    Args:
        parent_id: Parent task ID (e.g., "B2")

    Returns:
        True if parent task has a complete checkpoint section, False otherwise.
    """
    try:
        content = TODO_MD.read_text()
    except (FileNotFoundError, OSError):
        return False

    # Look for checkpoint section for this parent task
    # Pattern: "### Checkpoint X: ... (After B1, B2)" or similar
    checkpoint_pattern = rf"### .*{re.escape(parent_id)}.*Checkpoint.*Complete"
    if re.search(checkpoint_pattern, content, re.IGNORECASE | re.DOTALL):
        return True

    # Alternative: check if parent heading exists and has [x] checkboxes
    # But this is complex - for now, assume incomplete if no explicit checkpoint
    return False


def run_criteria_verification(task_id: str) -> None:
    """Run verify-criteria-handler.py after task completion."""
    handler = PROJECT_ROOT / ".claude/commands/mm/verify-criteria-handler.py"
    if not handler.exists():
        mm_info("NOTE: Use /mm:verify-criteria to mark acceptance criteria in plan.md")
        return

    mm_info("=" * 60)
    mm_info("Running acceptance criteria verification...")
    mm_info("=" * 60)
    result = subprocess.run(
        ["python3", str(handler), task_id, "--verify"],
        cwd=PROJECT_ROOT,
        capture_output=False,
        text=True,
    )
    if result.returncode != 0:
        mm_info("Criteria verification completed with warnings — check output above")


# ============================================================================
# Git Detection - Improved with git log --grep
# ============================================================================


def get_git_commits_for_task(task_id: str) -> set[str]:
    """Get subtask IDs that have commits in git using --grep.

    Uses git log --grep for more reliable detection.
    Pattern: matches "D1.1", "D1.2", etc. in commit messages.
    """
    completed: set[str] = set()

    # Pattern 1: grep for task ID in commit messages
    # Matches: "D1.1:", "(D1.1)", "[D1.1]", etc.
    patterns = [
        rf"{re.escape(task_id)}\.(\d+)",
    ]

    for pattern in patterns:
        result = subprocess.run(
            ["git", "log", "--all", "--pretty=format:%s", "-100"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )

        for line in result.stdout.split("\n"):
            match = re.search(pattern, line)
            if match:
                subtask_num = match.group(1)
                completed.add(f"{task_id}.{subtask_num}")

    return completed


# ============================================================================
# Task Parsing
# ============================================================================


def read_task_from_plan(task_id: str) -> dict[str, str]:
    """Read task details from plan.md, with fallback to todo.md.

    Args:
        task_id: Task identifier (e.g., "D1", "13-01").

    Returns:
        Dictionary with "id" and "title" keys.

    Raises:
        ValueError: If task_id not found in plan.md or todo.md.
        FileNotFoundError: If plan.md doesn't exist.
        OSError: If file cannot be read.
    """
    try:
        content = PLAN_MD.read_text()
    except FileNotFoundError:
        raise FileNotFoundError(f"plan.md not found at {PLAN_MD}")
    except OSError as e:
        raise OSError(f"Failed to read plan.md: {e}")

    # Match heading at any level (###, ####) — stop at any next heading or end
    pattern = r"#{2,6}\s+" + re.escape(task_id) + r":([^\n]+)\n(.*?)(?=\n#|\Z)"
    match = re.search(pattern, content, re.DOTALL)

    if match:
        return {"id": task_id, "title": match.group(1).strip()}

    # Fallback: read title from todo.md (supports phase-style IDs like "13-01")
    try:
        todo_content = TODO_MD.read_text()
        todo_match = re.search(rf"### {re.escape(task_id)}:([^\n]+)", todo_content)
        if todo_match:
            return {"id": task_id, "title": todo_match.group(1).strip()}
    except OSError:
        pass

    raise ValueError(f"Task {task_id} not found in plan.md or todo.md")


def read_subtasks_from_todo(task_id: str) -> list[dict[str, Any]]:
    """Read subtasks from todo.md.

    Supports three structures:
    1. V2 Hierarchical: "- [ ] A1: Task" with "  - [ ] A1.01: subtask" (2-space indent)
    2. V1 Flat: checkboxes directly under task heading (e.g., "### B2:" followed by "- [ ] subtask")
    3. V1 Nested: subtask headings under task (e.g., "#### B2.1:" under "### B2:")

    Args:
        task_id: Task identifier (e.g., "D1" or "D1.1").

    Returns:
        List of subtask dictionaries with "id", "description", "completed" keys.

    Raises:
        ValueError: If task_id not found in todo.md.
        FileNotFoundError: If todo.md doesn't exist.
        OSError: If file cannot be read.
    """
    try:
        content = TODO_MD.read_text()
    except FileNotFoundError:
        raise FileNotFoundError(f"todo.md not found at {TODO_MD}")
    except OSError as e:
        raise OSError(f"Failed to read todo.md: {e}")

    # Try V2 hierarchical format first (handles parent tasks with dots like B2.6)
    subtasks = _read_v2_hierarchical_subtasks(content, task_id)
    if subtasks:
        return subtasks

    # Check if task_id contains a dot (e.g., "B2.1") - subtask heading
    if "." in task_id:
        return _read_subtask_heading(content, task_id)

    # No dot - parent task, try both flat and nested structures
    subtasks = _read_flat_subtasks(content, task_id)
    if subtasks:
        return subtasks

    # Try nested structure (subtask headings under parent)
    return _read_nested_subtasks(content, task_id)


def _read_v2_hierarchical_subtasks(content: str, task_id: str) -> list[dict[str, Any]]:
    """Read V2 hierarchical format: list-based with intermediate task headings.

    Example:
        - [~] B2: Core Feature Completion

        - [x] B2.1: Facebook Webhook Polling Completion
          - [x] B2.1.01: Review TODO comments
          - [x] B2.1.02: Implement error handling

        - [x] B2.2: VIN Decode Integration Tests
          - [x] B2.2.01: Create test file

    Args:
        content: Full todo.md content.
        task_id: Task identifier (e.g., "B2").

    Returns:
        List of subtask dictionaries with "id", "description", "completed" keys.
        Empty list if task not found or has no subtasks.
    """
    # Find the parent task section
    # Pattern: "- [state] B2: title" until next phase (##) or next parent task (e.g., B3, C1)
    # The lookahead ensures we stop at the next PARENT task, not subtasks (B2.1, B2.2)
    # Next parent task format: "- [state] <LETTER><NUMBER>:" where <NUMBER> has no dot
    pattern = rf"^-\s\[([ x~])\]\s+{re.escape(task_id)}:.*?\n(.*?)(?=^##|^-\s\[[ x~]\]\s+[A-Z]\d+:|\Z)"
    match = re.search(pattern, content, re.MULTILINE | re.DOTALL)

    if not match:
        return []

    parent_section = match.group(2)

    # Find all subtask headings (e.g., "- [x] B2.1:", "- [x] B2.2:")
    # Subtasks are indented with 2 spaces in parent_section
    subtask_pattern = rf"^  -\s\[([ x~])\]\s+{re.escape(task_id)}\.(\d+):([^\n]+)\n((?:  -\[.*?\n)*)"
    subtask_matches = re.finditer(subtask_pattern, parent_section, re.MULTILINE)

    subtasks: list[dict[str, Any]] = []

    for match in subtask_matches:
        checkbox_state = match.group(1)
        subtask_num = match.group(2)
        subtask_title = match.group(3).strip()
        subtask_body = match.group(4)  # Indented checkboxes (B2.1.01, etc.)

        full_subtask_id = f"{task_id}.{subtask_num}"

        # Check if subtask is complete by examining its sub-subtasks
        # If there are sub-subtasks (indented checkboxes), check if all are complete
        # If there are no sub-subtasks, use the checkbox state of the subtask itself
        sub_subtasks = re.findall(r'^  - \[([ x~])\]', subtask_body, re.MULTILINE)
        if sub_subtasks:
            # Has sub-subtasks - check if all are complete
            is_complete = all(state == "x" for state in sub_subtasks)
        else:
            # No sub-subtasks - use the subtask's checkbox state
            is_complete = checkbox_state == "x"

        subtasks.append({
            "id": full_subtask_id,
            "description": subtask_title,
            "completed": is_complete
        })

    return subtasks


def _read_flat_subtasks(content: str, task_id: str) -> list[dict[str, Any]]:
    """Read flat structure: checkboxes directly under task heading.

    Example:
        ### B2: Core Feature Completion
        - [ ] Review TODO comments
        - [ ] Implement error handling
    """
    pattern = r"#{2,6}\s+" + re.escape(task_id) + r":([^\n]+)\n(.*?)(?=\n##|\n###|\Z)"
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        return []

    section = match.group(2)
    lines = section.split("\n")
    subtasks: list[dict[str, Any]] = []
    task_prefix = f"{task_id}."
    current_num = 1

    for line in lines:
        if line.strip().startswith("- ["):
            match = re.match(r"- \[([ x])\] (.+)", line)
            if match:
                status, text = match.groups()
                subtasks.append(
                    {
                        "id": f"{task_prefix}{current_num}",
                        "description": text.strip(),
                        "completed": status == "x",
                    }
                )
                current_num += 1

    return subtasks


def _read_nested_subtasks(content: str, task_id: str) -> list[dict[str, Any]]:
    """Read nested structure: subtask headings under parent task.

    Example:
        ### B2: Core Feature Completion

        #### B2.1: Facebook Webhook Polling Completion
        - [ ] Review TODO comments
        - [ ] Implement error handling

        #### B2.2: VIN Decode Integration Tests
        - [ ] Create test file
    """
    # Find the parent task section
    parent_pattern = r"(#{2,6}\s+" + re.escape(task_id) + r":[^\n]+\n)(.*?)(?=\n##|\n### [A-Z]|\Z)"
    parent_match = re.search(parent_pattern, content, re.DOTALL)

    if not parent_match:
        return []

    parent_section = parent_match.group(2)

    # Find all subtask headings (#### B2.1:, #### B2.2:, etc.)
    subtask_pattern = r"#{3,4}\s+" + re.escape(task_id) + r"\.\d+:(.+?)\n(.*?)(?=\n#{3,4}|\Z)"
    subtask_matches = re.finditer(subtask_pattern, parent_section, re.DOTALL)

    subtasks: list[dict[str, Any]] = []

    for match in subtask_matches:
        subtask_title = match.group(1).strip()
        subtask_body = match.group(2)

        # Extract subtask ID from the heading (e.g., "B2.1")
        heading_line = match.group(0).split("\n")[0]
        subtask_id_match = re.search(rf"{re.escape(task_id)}\.(\d+)", heading_line)
        if not subtask_id_match:
            continue
        subtask_num = subtask_id_match.group(1)
        full_subtask_id = f"{task_id}.{subtask_num}"

        # Count completed checkboxes in this subtask
        checkboxes = re.findall(r"- \[([ x])\]", subtask_body)
        completed_count = sum(1 for c in checkboxes if c == "x")
        total_count = len(checkboxes)

        # Subtask is complete if all checkboxes are checked
        is_complete = total_count > 0 and completed_count == total_count

        # Use the subtask title as description
        subtasks.append({
            "id": full_subtask_id,
            "description": subtask_title,
            "completed": is_complete
        })

    return subtasks


def _read_subtask_heading(content: str, task_id: str) -> list[dict[str, Any]]:
    """Read a specific subtask by ID (e.g., "B2.1").

    When calling /mm:complete-task B2.1, this finds the #### B2.1: section
    and returns its checkboxes as sub-subtasks.
    """
    # Fixed boundary: make newline optional to avoid race condition with consumed newline
    pattern = r"#{3,4}\s+" + re.escape(task_id) + r":([^\n]+)\n(.*?)(?=\n?#{3,4}|\n##|\Z)"
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        raise ValueError(f"Subtask {task_id} not found in todo.md")

    section = match.group(2)
    lines = section.split("\n")
    subtasks: list[dict[str, Any]] = []

    # For subtasks, we use letter suffixes (a, b, c) instead of numbers
    current_letter = ord('a')

    for line in lines:
        if line.strip().startswith("- ["):
            match = re.match(r"- \[([ x])\] (.+)", line)
            if match:
                status, text = match.groups()
                subtasks.append(
                    {
                        "id": f"{task_id}.{chr(current_letter)}",
                        "description": text.strip(),
                        "completed": status == "x",
                    }
                )
                current_letter += 1

    return subtasks


# ============================================================================
# State Management
# ============================================================================


def init_runtime_state(task_id: str, subtasks: list[dict[str, Any]]) -> dict[str, Any]:
    """Initialize runtime state file.

    Args:
        task_id: Task identifier.
        subtasks: List of subtask dictionaries.

    Returns:
        Runtime state dictionary with session info and subtask statuses.
    """
    session_id = f"sess-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    now_iso = datetime.now().isoformat()

    runtime_state: dict[str, Any] = {
        "task_id": task_id,
        "session_id": session_id,
        "started_at": now_iso,
        "phase": 19,  # Current MM-Flow phase
        "subtasks": {
            st["id"]: {
                "description": st["description"],
                "status": "completed" if st["completed"] else "pending",
                "retries": 0,
                "started_at": now_iso if not st["completed"] else None,
                "completed_at": None,
                "duration_seconds": 0,
            }
            for st in subtasks
        },
        "last_checkpoint": None,
        "context_budget_exit": None,
    }

    PLANNING_DIR.mkdir(parents=True, exist_ok=True)
    try:
        RUNTIME_STATE_PATH.write_text(json.dumps(runtime_state, indent=2))
    except OSError as e:
        mm_error(f"Failed to write runtime state: {e}")
        raise

    return runtime_state


def update_subtask_status(
    subtask_id: str,
    status: str,
    error: str | None = None,
    commit_sha: str | None = None,
) -> None:
    """Update a single subtask status in task-progress.json.

    Args:
        subtask_id: Subtask ID (e.g., "D1.1").
        status: New status (pending, in_progress, completed, failed, skipped).
        error: Optional error message if failed.
        commit_sha: Optional git commit SHA if committed.
    """
    if not RUNTIME_STATE_PATH.exists():
        return

    state = json.loads(RUNTIME_STATE_PATH.read_text())

    if subtask_id in state["subtasks"]:
        now = datetime.now()
        now_iso = now.isoformat()

        state["subtasks"][subtask_id]["status"] = status
        state["subtasks"][subtask_id]["updated_at"] = now_iso

        # Calculate duration if completing
        if status == "completed" and state["subtasks"][subtask_id].get("started_at"):
            started_at_str = state["subtasks"][subtask_id]["started_at"]
            if started_at_str:
                started_at = datetime.fromisoformat(started_at_str)
                duration = (now - started_at).total_seconds()
                state["subtasks"][subtask_id]["completed_at"] = now_iso
                state["subtasks"][subtask_id]["duration_seconds"] = round(duration, 2)
        elif status == "in_progress" and not state["subtasks"][subtask_id].get("started_at"):
            # Start the clock when moving to in_progress
            state["subtasks"][subtask_id]["started_at"] = now_iso

        if error:
            state["subtasks"][subtask_id]["error"] = error

        if commit_sha:
            state["subtasks"][subtask_id]["commit_sha"] = commit_sha

        state["last_checkpoint"] = subtask_id

        try:
            RUNTIME_STATE_PATH.write_text(json.dumps(state, indent=2))
        except OSError as e:
            mm_error(f"Failed to write runtime state: {e}")
            raise

    # If this subtask was just completed, check if all siblings are complete
    # and propagate completion to parent
    if status == "completed":
        # Extract parent task ID from subtask_id (e.g., "B2.1" -> "B2", "B2.1.a" -> "B2.1")
        if "." in subtask_id:
            # For sub-subtasks like "B2.1.a", parent is "B2.1"
            # For subtasks like "B2.1", parent is "B2"
            parts = subtask_id.rsplit(".", 1)
            parent_id = parts[0] if len(parts) == 2 else subtask_id

            try:
                propagate_parent_completion(parent_id)
            except Exception as e:
                # Don't fail the subtask update if propagation fails
                mm_error(f"Failed to propagate parent completion: {e}")

        # Update incremental time tracking after each checkpoint
        try:
            # Get the root parent task ID for time tracking
            # For B2.6.01, we want to update B2 (not B2.6)
            # For B2.1, we want to update B2
            root_parts = subtask_id.split(".")
            root_task_id = root_parts[0] if root_parts else subtask_id

            update_incremental_time_tracking(root_task_id)
        except Exception as e:
            # Don't fail the checkpoint if time tracking fails
            mm_error(f"Failed to update incremental time tracking: {e}")

    # If this subtask is now in_progress, mark all parents with ~
    if status == "in_progress":
        # Extract parent task ID from subtask_id (e.g., "B2.1" -> "B2", "B2.1.a" -> "B2.1")
        if "." in subtask_id:
            # For sub-subtasks like "B2.1.a", parent is "B2.1"
            # For subtasks like "B2.1", parent is "B2"
            parts = subtask_id.rsplit(".", 1)
            parent_id = parts[0] if len(parts) == 2 else subtask_id

            try:
                propagate_in_progress(parent_id)
            except Exception as e:
                # Don't fail the subtask update if propagation fails
                mm_error(f"Failed to propagate in_progress state: {e}")


def propagate_parent_completion(task_id: str) -> None:
    """Check if all subtasks of task_id are complete and mark parent as complete in todo.md.

    This function implements hierarchical completion propagation:
    - If all sub-subtasks of a subtask are complete (e.g., B2.1.a, B2.1.b), mark B2.1 as complete
    - If all subtasks of a parent are complete (e.g., B2.1-B2.6), mark B2 as complete
    - Cascades up the hierarchy automatically

    The function checks both task-progress.json (for leaf-level subtasks) and todo.md
    (for intermediate-level subtasks) to determine completion status.

    Args:
        task_id: Parent task ID to check (e.g., "B2" or "B2.1").

    Raises:
        FileNotFoundError: If todo.md doesn't exist.
        OSError: If files cannot be read or written.
    """
    if not TODO_MD.exists():
        mm_error(f"todo.md not found at {TODO_MD}")
        return

    # First, try to find leaf-level subtasks in task-progress.json
    # For parent "B2.5", find "B2.5.a", "B2.5.b", etc.
    # For parent "B2", this won't find anything (B2.1, B2.2 aren't in the JSON)
    has_json_subtasks = False
    if RUNTIME_STATE_PATH.exists():
        try:
            state = json.loads(RUNTIME_STATE_PATH.read_text())

            # Find all subtasks that belong to this parent
            # For parent "B2.5", find "B2.5.a", "B2.5.b", etc.
            # For parent "B2", find "B2.1", "B2.2", etc. (but these likely won't exist)
            subtask_pattern = rf"^{re.escape(task_id)}\."
            sibling_subtasks = {
                st_id: st_data
                for st_id, st_data in state["subtasks"].items()
                if st_id.startswith(task_id + ".")
            }

            if sibling_subtasks:
                has_json_subtasks = True

                # Check if all sibling subtasks are completed
                all_complete = all(
                    st_data.get("status") == "completed"
                    for st_data in sibling_subtasks.values()
                )

                if not all_complete:
                    # Not all subtasks complete - don't mark parent as complete
                    return
        except (json.JSONDecodeError, OSError) as e:
            mm_error(f"Failed to read task-progress.json: {e}")
            # Continue to check todo.md

    # If no JSON subtasks found, or if all JSON subtasks are complete,
    # check todo.md for intermediate-level subtasks
    # For parent "B2", check if B2.1, B2.2, etc. are marked as [x] in todo.md
    try:
        todo_content = TODO_MD.read_text()
    except (FileNotFoundError, OSError) as e:
        mm_error(f"Failed to read todo.md: {e}")
        return

    # Find all subtasks in todo.md that belong to this parent
    # Pattern: "- [x] B2.1:", "- [~] B2.2:", etc.
    subtask_pattern = rf"^-\s\[([ x~])\]\s+{re.escape(task_id)}\.\d+:"
    subtask_matches = re.findall(subtask_pattern, todo_content, re.MULTILINE)

    if subtask_matches:
        # Found subtasks in todo.md
        # Check if all are marked as complete ([x])
        all_complete = all(state == "x" for state in subtask_matches)

        if not all_complete:
            # Not all subtasks complete - don't mark parent as complete
            return
    elif not has_json_subtasks:
        # No subtasks found in either JSON or todo.md
        # This means the parent has no children - nothing to propagate
        return

    # All subtasks are complete - mark parent as complete in todo.md
    try:
        todo_content = TODO_MD.read_text()
    except (FileNotFoundError, OSError) as e:
        mm_error(f"Failed to read todo.md: {e}")
        return

    # Find the parent task line and update its checkbox
    # Pattern: "- [~] B2: Title" or "- [ ] B2: Title" -> "- [x] B2: Title"
    # Group 1: "- [" (dash, optional space, open bracket)
    # Group 2: " " or "~" (checkbox state)
    # Group 3: "] B2:" (close bracket, space, task_id, colon)
    parent_pattern = rf"(^-\s?\[)([ ~])(\]\s+{re.escape(task_id)}:)"

    def replace_checkbox(match: re.Match[str]) -> str:
        """Replace pending/in-progress checkbox with completed."""
        # Replace group 2 (checkbox state) with "x"
        return f"{match.group(1)}x{match.group(3)}"

    new_content, count = re.subn(parent_pattern, replace_checkbox, todo_content, count=1, flags=re.MULTILINE)

    if count == 0:
        # Parent checkbox not found - might already be complete or formatted differently
        # Check if it's already marked as complete
        already_complete = re.search(rf"^-\s\[x\]\s+{re.escape(task_id)}:", todo_content, re.MULTILINE)
        if already_complete:
            # Already complete - nothing to do
            return
        else:
            # Parent pattern not found - log and skip
            mm_error(f"Could not find parent task checkbox for {task_id} in todo.md")
            return

    # Write updated content back to todo.md
    try:
        TODO_MD.write_text(new_content)
        mm_info(f"Marked parent task {task_id} as complete in todo.md")
    except OSError as e:
        mm_error(f"Failed to write todo.md: {e}")
        return

    # Cascade up: check if this parent's completion makes its own parent complete
    # For example, if B2.1 is now complete, check if all B2.1-B2.6 are complete
    if "." in task_id:
        # Extract grandparent ID (e.g., "B2.1" -> "B2")
        parts = task_id.rsplit(".", 1)
        grandparent_id = parts[0] if len(parts) == 2 else None

        if grandparent_id:
            try:
                propagate_parent_completion(grandparent_id)
            except Exception as e:
                # Don't fail if cascade fails
                mm_error(f"Failed to cascade completion to grandparent {grandparent_id}: {e}")


def propagate_in_progress(task_id: str) -> None:
    """Mark parent task as in-progress (~) in todo.md when a child is in-progress.

    This function implements hierarchical in-progress propagation:
    - If a child subtask is in-progress (e.g., B2.6.01), mark B2.6 as ~
    - If B2.6 is now ~, mark B2 as ~
    - Cascades up the hierarchy automatically

    Args:
        task_id: Parent task ID to mark as in-progress (e.g., "B2" or "B2.6").

    Raises:
        FileNotFoundError: If todo.md doesn't exist.
        OSError: If files cannot be read or written.
    """
    if not TODO_MD.exists():
        mm_error(f"todo.md not found at {TODO_MD}")
        return

    # Mark parent as in-progress in todo.md
    try:
        todo_content = TODO_MD.read_text()
    except (FileNotFoundError, OSError) as e:
        mm_error(f"Failed to read todo.md: {e}")
        return

    # Find the parent task line and update its checkbox to ~
    # Pattern: "- [ ] B2: Title" or "- [x] B2: Title" -> "- [~] B2: Title"
    # Group 1: "- [" (dash, optional space, open bracket)
    # Group 2: " " or "x" (checkbox state - pending or complete)
    # Group 3: "] B2:" (close bracket, space, task_id, colon)
    parent_pattern = rf"(^-\s?\[)([ x])(\]\s+{re.escape(task_id)}:)"

    def replace_with_tilde(match: re.Match[str]) -> str:
        """Replace pending/complete checkbox with in-progress."""
        # Replace group 2 (checkbox state) with "~"
        return f"{match.group(1)}~{match.group(3)}"

    new_content, count = re.subn(parent_pattern, replace_with_tilde, todo_content, count=1, flags=re.MULTILINE)

    if count == 0:
        # Parent checkbox not found - might already be in-progress or formatted differently
        # Check if it's already marked as in-progress
        already_in_progress = re.search(rf"^-\s\[~\]\s+{re.escape(task_id)}:", todo_content, re.MULTILINE)
        if already_in_progress:
            # Already in-progress - nothing to do
            return
        else:
            # Parent pattern not found - log and skip
            mm_error(f"Could not find parent task checkbox for {task_id} in todo.md")
            return

    # Write updated content back to todo.md
    try:
        TODO_MD.write_text(new_content)
        mm_info(f"Marked parent task {task_id} as in-progress (~) in todo.md")
    except OSError as e:
        mm_error(f"Failed to write todo.md: {e}")
        return

    # Cascade up: mark grandparent as ~ too
    # For example, if B2.6 is now ~, mark B2 as ~
    if "." in task_id:
        # Extract grandparent ID (e.g., "B2.6" -> "B2")
        parts = task_id.rsplit(".", 1)
        grandparent_id = parts[0] if len(parts) == 2 else None

        if grandparent_id:
            try:
                propagate_in_progress(grandparent_id)
            except Exception as e:
                # Don't fail if cascade fails
                mm_error(f"Failed to cascade in_progress to grandparent {grandparent_id}: {e}")


def update_incremental_time_tracking(task_id: str) -> None:
    """Update time tracking in todo.md after each checkpoint.

    This function calls the update-todo-times.py script to update:
    - Estimate vs Actual time
    - Deviation from estimate
    - Average time per subtask
    - Progress percentage

    Args:
        task_id: Task identifier (e.g., "B2" or "B2.6").

    Raises:
        FileNotFoundError: If required files don't exist.
        OSError: If files cannot be read or written.
        subprocess.CalledProcessError: If update-todo-times.py fails.
    """
    try:
        # Call update-todo-times.py with the task_id
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "update-todo-times.py"), task_id],
            capture_output=True,
            text=True,
            check=False,
            cwd=Path(__file__).parent.parent.parent.parent
        )

        if result.returncode != 0:
            mm_error(f"update-todo-times.py failed: {result.stderr}")
        else:
            mm_info(f"Updated time tracking for task {task_id}")

    except FileNotFoundError:
        # update-todo-times.py not found - not critical
        mm_info(f"update-todo-times.py not found - skipping time tracking update")
    except Exception as e:
        # Don't fail the checkpoint if time tracking fails
        mm_error(f"Failed to update time tracking: {e}")


def execute_subtask_with_tracking(subtask_id: str, func: callable) -> Any:
    """Execute a subtask function with proper status tracking.

    Wraps subtask execution to handle errors and update status accordingly.
    This ensures that if a subtask fails, it's marked as 'failed' instead of
    staying 'in_progress' indefinitely.

    Args:
        subtask_id: Subtask ID (e.g., "B2.6.03").
        func: Function to execute (should return result or raise exception).

    Returns:
        Result of func().

    Raises:
        Exception: If func raises (after marking as failed).
    """
    try:
        update_subtask_status(subtask_id, "in_progress")
        result = func()
        update_subtask_status(subtask_id, "completed")
        return result
    except Exception as e:
        # Mark as failed with error message
        update_subtask_status(
            subtask_id,
            "failed",
            error=f"{type(e).__name__}: {str(e)}"
        )
        # Re-raise to allow caller to handle the exception
        raise


def get_task_payload(task_id: str) -> dict[str, Any]:
    """Get the full task payload for the agent.

    Args:
        task_id: Task identifier.

    Returns:
        Dict ready to be passed to task-executor agent.

    Raises:
        ValueError: If task_id not found in plan.md or todo.md.
        FileNotFoundError: If required files don't exist.
        OSError: If files cannot be read.
    """
    try:
        task = read_task_from_plan(task_id)
        subtasks = read_subtasks_from_todo(task_id)
        git_completed = get_git_commits_for_task(task_id)

        # Filter to pending subtasks only
        pending_subtasks = [
            st
            for st in subtasks
            if st["id"] not in git_completed and not st["completed"]
        ]

        project_id = _read_project_id_from_config(PROJECT_ROOT)
        return {
            "task_id": task_id,
            "task_title": task["title"],
            "subtasks": pending_subtasks,
            "total_subtasks": len(subtasks),
            "pending_count": len(pending_subtasks),
            "context_budget_threshold": 0.75,  # Exit at 75% context
            "working_directory": str(PROJECT_ROOT),
            "stack": _read_stack_from_config(PROJECT_ROOT),
            "project_id": project_id,
        }
    except (ValueError, FileNotFoundError, OSError):
        # Re-raise expected exceptions with context
        raise
    except Exception as e:
        # Catch truly unexpected errors
        raise RuntimeError(f"Unexpected error building payload: {e}") from e


# ============================================================================
# Permission Detection
# ============================================================================


def detect_required_permissions(
    _task_id: str, pending_subtasks: list[dict[str, Any]]
) -> list[str]:
    """Detect required tool permissions based on subtask descriptions.

    Args:
        _task_id: Task identifier (unused, for future extensions).
        pending_subtasks: List of pending subtask dictionaries.

    Returns:
        List of permission warnings to show before launching agent.
    """
    warnings: list[str] = []

    # Patterns that indicate Bash permission is needed
    bash_patterns = [
        r"\bborrar\b",
        r"\beliminar\b",
        r"\bdelete\b",
        r"\bremove\b",
        r"\bejecutar\b",
        r"\brun\b",
        r"\bnpm\b",
        r"\bpytest\b",
        r"\buv\s+run\b",
    ]

    # Patterns that indicate Write permission is needed
    write_patterns = [
        r"\bcrear\b",
        r"\bescribir\b",
        r"\bwrite\b",
        r"\bcrear\s+archivo\b",
        r"\bcreate\s+file\b",
        r"\badd\b.*\bfile\b",
    ]

    for st in pending_subtasks:
        desc_lower = st["description"].lower()

        # Check Bash patterns
        if any(
            re.search(pattern, desc_lower, re.IGNORECASE) for pattern in bash_patterns
        ):
            warnings.append(
                f"⚠️  Subtask {st['id']}: '{st['description']}' requires BASH permission"
            )

        # Check Write patterns
        if any(
            re.search(pattern, desc_lower, re.IGNORECASE) for pattern in write_patterns
        ):
            warnings.append(
                f"⚠️  Subtask {st['id']}: '{st['description']}' requires WRITE permission"
            )

    return warnings


# ============================================================================
# Main Logic
# ============================================================================


def start_task(task_id: str) -> None:
    """Start or resume a task.

    Args:
        task_id: Task identifier (e.g., "D1").
    """
    mm_info(f"Starting task {task_id}")

    # Gate: previous task must have all acceptance criteria verified
    if not check_previous_criteria_complete(task_id):
        return

    # Read task and subtasks
    task = read_task_from_plan(task_id)
    subtasks = read_subtasks_from_todo(task_id)

    mm_task(task_id, task["title"])

    # Show all subtasks with status
    for st in subtasks:
        status = "[x]" if st["completed"] else "[ ]"
        mm_subtask(st["id"], status, st["description"])

    # Check git for existing commits
    git_completed = get_git_commits_for_task(task_id)
    expected_ids = {f"{task_id}.{i+1}" for i in range(len(subtasks))}

    mm_git(len(git_completed), len(subtasks), sorted(git_completed))

    # Check if task is complete
    if git_completed == expected_ids:
        mm_status("TASK COMPLETE - all subtasks have git commits")
        mark_all_complete(task_id, subtasks)
        run_criteria_verification(task_id)
        return

    # Filter pending subtasks
    pending_subtasks = [
        st for st in subtasks if st["id"] not in git_completed and not st["completed"]
    ]

    if not pending_subtasks:
        mm_status("TASK COMPLETE - marking done")
        mark_all_complete(task_id, subtasks)
        run_criteria_verification(task_id)
        return

    mm_pending(len(pending_subtasks))

    # Show pending subtasks
    for st in pending_subtasks:
        mm_subtask(st["id"], "pending", st["description"])

    # Detect required permissions BEFORE launching agent
    permission_warnings = detect_required_permissions(task_id, pending_subtasks)
    if permission_warnings:
        mm_info("PERMISSION CHECK:")
        for warning in permission_warnings:
            print(warning, flush=True)
        mm_info(
            "Please ensure Claude Code has these permissions enabled in settings.json"
        )

    # Initialize runtime state
    runtime_state = init_runtime_state(task_id, subtasks)
    mm_info(f"Runtime state: {RUNTIME_STATE_PATH}")
    mm_info(f"Session ID: {runtime_state['session_id']}")

    # Open dev session in DB (non-blocking — continues if DB unavailable)
    db_session_id = _open_db_session(task_id, len(pending_subtasks))
    if db_session_id:
        mm_info(f"DB session opened: {db_session_id}")

    # Launch task-executor
    _mm_launch_with_db(task_id, db_session_id)


def resume_task(task_id: str) -> None:
    """Resume a task from checkpoint.

    Args:
        task_id: Task identifier (e.g., "D1").
    """
    mm_info(f"Resuming task {task_id}")

    # Gate: previous task must have all acceptance criteria verified
    if not check_previous_criteria_complete(task_id):
        return

    if not RUNTIME_STATE_PATH.exists():
        mm_error("No runtime state found. Run without --continue first.")
        mm_info(f"Starting fresh task {task_id}")
        start_task(task_id)
        return

    state = json.loads(RUNTIME_STATE_PATH.read_text())

    if state.get("task_id") != task_id:
        mm_error(f"Runtime state is for task {state.get('task_id')}, not {task_id}")
        return

    mm_info(f"Previous session: {state['session_id']}")
    mm_info(f"Last checkpoint: {state.get('last_checkpoint', 'none')}")

    # Detectar subtareas colgadas en in_progress > 1 hora
    stale_subtasks = []
    stale_threshold_hours = 1

    for sid, st in state["subtasks"].items():
        if st.get("status") == "in_progress" and st.get("started_at"):
            try:
                started = datetime.fromisoformat(st["started_at"])
                hours_since = (datetime.now() - started).total_seconds() / 3600
                if hours_since > stale_threshold_hours:
                    stale_subtasks.append((sid, hours_since))
            except (ValueError, TypeError):
                pass

    if stale_subtasks:
        mm_error("=" * 60)
        mm_error("⚠️  SUBTAREAS COLGADAS DETECTADAS")
        mm_error("=" * 60)
        for sid, hours in stale_subtasks:
            mm_error(f"  {sid}: lleva {hours:.1f}h en in_progress")
        mm_error("")
        mm_error("Esto indica que el agente se detuvo inesperadamente.")
        mm_error("")
        mm_error("Opciones:")
        mm_error(f"  1. Continuar normalmente (se reintentarán desde el último checkpoint)")
        mm_error(f"  2. Resetear a pending: /mm:complete-task {task_id} --reset-stale")
        mm_error("")
        mm_status("Verificá todo.md y task-progress.json antes de continuar")

    # Show current status from runtime state
    completed = [
        sid for sid, info in state["subtasks"].items() if info["status"] == "completed"
    ]
    pending = [
        sid for sid, info in state["subtasks"].items() if info["status"] == "pending"
    ]

    mm_info(f"Completed: {len(completed)}/{len(state['subtasks'])}")
    if completed:
        mm_info(f"Completed subtasks: {sorted(completed)}")

    # Check if task is actually complete
    if not pending:
        mm_status("TASK COMPLETE - all subtasks completed in runtime state")
        run_criteria_verification(task_id)
        return

    mm_pending(len(pending))
    if pending:
        mm_info(f"Pending subtasks: {sorted(pending)}")

    # Build pending subtasks list from runtime state
    pending_subtasks = []
    for sid in pending:
        st_info = state["subtasks"][sid]
        pending_subtasks.append(
            {
                "id": sid,
                "description": st_info["description"],
                "completed": False,
            }
        )

    # Detect permissions for pending subtasks
    permission_warnings = detect_required_permissions(task_id, pending_subtasks)
    if permission_warnings:
        mm_info("PERMISSION CHECK:")
        for warning in permission_warnings:
            print(warning, flush=True)
        mm_info(
            "Please ensure Claude Code has these permissions enabled in settings.json"
        )

    # Update runtime state with new session
    session_id = f"sess-resume-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    state["session_id"] = session_id
    state["resumed_at"] = datetime.now().isoformat()
    try:
        RUNTIME_STATE_PATH.write_text(json.dumps(state, indent=2))
    except OSError as e:
        mm_error(f"Failed to update runtime state: {e}")
        raise

    mm_info(f"Runtime state: {RUNTIME_STATE_PATH}")
    mm_info(f"Session ID: {session_id}")

    # Launch task-executor with pending subtasks
    payload = {
        "task_id": task_id,
        "task_title": read_task_from_plan(task_id)["title"],
        "subtasks": pending_subtasks,
        "total_subtasks": len(state["subtasks"]),
        "pending_count": len(pending_subtasks),
        "context_budget_threshold": 0.75,
        "resume": True,
        "resumed_from_checkpoint": state.get("last_checkpoint"),
    }
    print("LAUNCH: task-executor", flush=True)
    print(f"PAYLOAD: {json.dumps(payload)}", flush=True)
    mm_status("RESUMING FROM CHECKPOINT")


def mark_all_complete(task_id: str, subtasks: list[dict[str, Any]]) -> None:
    """Mark all subtasks as complete in todo.md and commit.

    Note: This does NOT verify acceptance criteria in plan.md.
    Use /mm:verify-criteria to manually verify what was implemented.

    Args:
        task_id: Task identifier.
        subtasks: List of subtask dicts.
    """
    # Mark in todo.md (supports both V1 and V2 formats)
    todo_content = TODO_MD.read_text()

    def replace_todo_checkboxes(match: re.Match[str]) -> str:
        section = match.group(0)
        # Replace both [ ] and [~] with [x] (pending and in-progress -> completed)
        section = re.sub(r"- \[ \]", "- [x]", section)
        section = re.sub(r"- \[~\]", "- [x]", section)
        # Also replace V2 indented checkboxes
        section = re.sub(r"  - \[ \]", "  - [x]", section)
        section = re.sub(r"  - \[~\]", "  - [x]", section)
        return section

    # Try V2 format first (hierarchical list)
    v2_pattern = rf"(^-\s\[([ x~])\]\s+{re.escape(task_id)}:.*?)(?=^##|^-\s\[[ x~]\]\s+[A-Z]|\Z)"
    if re.search(v2_pattern, todo_content, re.MULTILINE | re.DOTALL):
        todo_content = re.sub(
            v2_pattern, replace_todo_checkboxes, todo_content, flags=re.MULTILINE | re.DOTALL
        )
    else:
        # Fall back to V1 format (heading-based)
        v1_pattern = rf"(### {task_id}:.*?)(?=\n###|\n---|\Z)"
        todo_content = re.sub(
            v1_pattern, replace_todo_checkboxes, todo_content, flags=re.DOTALL
        )

    TODO_MD.write_text(todo_content)

    # Commit todo.md only
    task = read_task_from_plan(task_id)
    task_letter = task_id[0]
    commit_msg = f"feat(phase-{task_letter}): {task['title']}"

    subprocess.run(
        ["git", "add", "tasks/todo.md"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    result = subprocess.run(
        ["git", "commit", "-m", commit_msg],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        mm_info(f"Committed: {commit_msg}")
        mm_info("NOTE: Use /mm:verify-criteria to mark acceptance criteria in plan.md")
    else:
        mm_info("No changes to commit")


def show_status() -> None:
    """Show status of all tasks."""
    mm_info("Task Status Overview")

    # Read todo.md to get parent task checkbox states
    try:
        todo_content = TODO_MD.read_text()
    except (FileNotFoundError, OSError):
        mm_error("Could not read todo.md")
        return

    # Read all tasks from plan.md
    content = PLAN_MD.read_text()

    for match in re.finditer(r"### ([A-Z]\d):([^\n]+)\n", content):
        task_id = match.group(1)
        title = match.group(2).strip()

        try:
            # Get parent task checkbox state from todo.md
            # Pattern: "- [state] B2: title" where state is x, ~, or space
            parent_pattern = rf"^-\s\[([ x~])\]\s+{re.escape(task_id)}:"
            parent_match = re.search(parent_pattern, todo_content, re.MULTILINE)

            if parent_match:
                checkbox_state = parent_match.group(1)
            else:
                # Default to pending if no checkbox found
                checkbox_state = " "

            # Get subtasks and count completed
            subtasks = read_subtasks_from_todo(task_id)
            completed = sum(1 for st in subtasks if st["completed"])
            total = len(subtasks)

            # Determine status display based on parent checkbox
            if checkbox_state == "x":
                # Parent marked as complete
                status = "✅"
            elif checkbox_state == "~":
                # Parent marked as in-progress
                status = f"[~] {completed}/{total}"
            else:
                # Parent marked as pending
                status = f"[ ] {completed}/{total}"

            print(f"  {task_id} {status}: {title}", flush=True)
        except ValueError:
            print(f"  {task_id}: (no subtasks found)", flush=True)


def reset_stale_subtasks(task_id: str) -> None:
    """Reset stale in_progress subtasks to pending.

    Finds subtasks in in_progress > 1 hour and resets them to pending,
    incrementing retries counter.

    Args:
        task_id: Task identifier (e.g., "B2").
    """
    if not RUNTIME_STATE_PATH.exists():
        mm_error("No runtime state found")
        return

    try:
        state = json.loads(RUNTIME_STATE_PATH.read_text())
    except (json.JSONDecodeError, OSError) as e:
        mm_error(f"Failed to read runtime state: {e}")
        return

    if state.get("task_id") != task_id:
        mm_error(f"Runtime state is for task {state.get('task_id')}, not {task_id}")
        return

    stale_threshold = 1 * 60 * 60  # 1 hora en segundos
    reset_count = 0

    for sid, st in state["subtasks"].items():
        if st.get("status") == "in_progress" and st.get("started_at"):
            try:
                started = datetime.fromisoformat(st["started_at"])
                seconds_since = (datetime.now() - started).total_seconds()
                if seconds_since > stale_threshold:
                    # Reset to pending
                    state["subtasks"][sid]["status"] = "pending"
                    state["subtasks"][sid]["started_at"] = None
                    state["subtasks"][sid]["retries"] = st.get("retries", 0) + 1
                    reset_count += 1
                    mm_info(f"Reset {sid} to pending (retry #{state['subtasks'][sid]['retries']})")
            except (ValueError, TypeError) as e:
                mm_error(f"Error processing {sid}: {e}")

    if reset_count > 0:
        state["last_checkpoint"] = None
        try:
            RUNTIME_STATE_PATH.write_text(json.dumps(state, indent=2))
        except OSError as e:
            mm_error(f"Failed to write runtime state: {e}")
            return
        mm_info(f"Reset {reset_count} stale subtask(s)")
        mm_info(f"Usá /mm:complete-task {task_id} --continue para reanudar")
    else:
        mm_info("No stale subtasks found (all in_progress < 1 hour)")


def main() -> None:
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: mm-complete-task <TASK_ID> [--continue] [--status] [--reset-stale]", flush=True)
        print("       mm-complete-task --status  # Show all tasks", flush=True)
        sys.exit(1)

    # Status mode
    if sys.argv[1] == "--status":
        show_status()
        return

    # Reset stale mode
    if "--reset-stale" in sys.argv:
        if len(sys.argv) < 3:
            mm_error("Usage: mm-complete-task <TASK_ID> --reset-stale")
            sys.exit(1)
        task_id = sys.argv[1].upper()
        reset_stale_subtasks(task_id)
        return

    task_id = sys.argv[1].upper()
    resume_mode = "--continue" in sys.argv

    if resume_mode:
        resume_task(task_id)
    else:
        start_task(task_id)


if __name__ == "__main__":
    main()
