#!/usr/bin/env python3
"""MasterMind block closeout helper for Codex compatibility.

Ensures the Codex flow triggers the same time-tracking and sound notification
side effects that Claude's runtime used to get through update-todo-times.py.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import TypedDict


class SubtaskProgress(TypedDict, total=False):
    """Runtime subtask data loaded from task-progress.json."""

    status: str


class ProgressData(TypedDict, total=False):
    """Runtime task progress structure loaded from task-progress.json."""

    task_id: str
    subtasks: dict[str, SubtaskProgress]


ROOT = Path(__file__).resolve().parents[2]
PLANNING_DIR = ROOT / ".planning"
PROGRESS_PATH = PLANNING_DIR / "task-progress.json"
UPDATE_SCRIPT = ROOT / ".claude" / "commands" / "mm" / "update-todo-times.py"


def load_progress() -> ProgressData:
    if not PROGRESS_PATH.exists():
        raise FileNotFoundError(f"task-progress.json not found at {PROGRESS_PATH}")

    return json.loads(PROGRESS_PATH.read_text())


def is_task_complete(progress: ProgressData, task_id: str) -> bool:
    if progress.get("task_id") != task_id:
        return False

    subtasks = progress.get("subtasks", {})
    if not subtasks:
        return False

    return all(subtask.get("status") == "completed" for subtask in subtasks.values())


def run_update_todo_times(task_id: str) -> None:
    result = subprocess.run(
        [sys.executable, str(UPDATE_SCRIPT), task_id],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip(), file=sys.stderr)

    if result.returncode != 0:
        raise RuntimeError(
            f"update-todo-times.py failed for {task_id} with exit code {result.returncode}"
        )


def main() -> int:
    task_id = sys.argv[1] if len(sys.argv) > 1 else ""
    if not task_id:
        print("Usage: python3 scripts/mm/block_closeout.py <TASK_ID>")
        return 1

    progress = load_progress()
    task_complete = is_task_complete(progress, task_id)

    run_update_todo_times(task_id)

    if task_complete:
        print(
            f"🔔 Closeout confirmed complete block for {task_id}; "
            "update-todo-times.py already triggered the notification sound."
        )
    else:
        print(
            f"INFO: Closeout synced progress for {task_id}; no completion sound because the block is not fully complete."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
