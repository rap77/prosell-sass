#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

COMMAND="${1:-}"
shift || true

usage() {
  cat <<'EOF'
MasterMind Codex Compatibility Wrapper

Usage:
  bash scripts/mm/mm.sh <command> [args...]

Handler-backed commands:
  init [flags...]
  discover [idea|flags...]
  complete-task <TASK_ID> [--continue|--payload-only|--bundle-json]
  closeout <TASK_ID>
  review [--staged|--branch <name>|--files ...|--last-commit]
  safe-commit [flags...]
  verify-criteria <TASK_ID> [--verify|--all|--criteria N,N]
  ship [--verify|--patch|--minor|--major|--tag vX.Y.Z|--archive|--cleanup]

Codex-native utility commands:
  status
  next-task
  brain-plan <TASK_ID>
  catalog
  help <mm-command>

Examples:
  bash scripts/mm/mm.sh status
  bash scripts/mm/mm.sh next-task
  bash scripts/mm/mm.sh brain-plan M3
  bash scripts/mm/mm.sh complete-task M3 --bundle-json
EOF
}

show_catalog() {
  cat <<'EOF'
MM command catalog

Automated via handler/wrapper:
  init
  discover
  complete-task
  closeout
  review
  safe-commit
  verify-criteria
  ship
  status
  next-task
  brain-plan

Workflow-doc commands (manual orchestration by Codex reading the source .md):
  plan-phase
  ask-all
  ask-product
  ask-ux
  ask-design
  ask-frontend
  ask-backend
  ask-qa
  ask-growth
  ask-ui-docs
  audit
  project-health-check
  execute-milestone
  execute-phase
  execute-prp
  propose
  explore-first
  improve-prompt
  prd-clarifier
  generate-prp
  ux-spec-to-prompt
  complete-phase
  new-milestone
EOF
}

show_status() {
  if [[ ! -f tasks/todo.md ]]; then
    echo "ERROR: tasks/todo.md not found"
    exit 1
  fi

  echo "=== ⏳ PENDING ==="
  grep "^\- \[ \]" tasks/todo.md | grep -v "  -" || true
  echo
  echo "=== 🔄 IN PROGRESS ==="
  grep "^\- \[~\]" tasks/todo.md | grep -v "  -" || true
  echo
  echo "=== ✅ COMPLETED (last 5) ==="
  grep "^\- \[x\]" tasks/todo.md | grep -v "  -" | tail -5 || true
}

show_next_task() {
  if [[ ! -f tasks/todo.md ]]; then
    echo "ERROR: tasks/todo.md not found"
    exit 1
  fi

  local next
  next=$(grep -m1 "^\- \[ \]" tasks/todo.md | sed -E 's/^- \[ \] ([A-Z][A-Z0-9.]*)[: ].*/\1/')
  if [[ -z "${next:-}" ]]; then
    echo "STATUS: no-pending-task"
    exit 0
  fi

  echo "NEXT: $next"
  if [[ -f tasks/plan.md ]]; then
    python3 - <<PY
from pathlib import Path
import re
task_id = "$next"
text = Path("tasks/plan.md").read_text()
match = re.search(rf"^##+\\s+{re.escape(task_id)}:.*?(?=\\n##+\\s+|\\Z)", text, re.MULTILINE | re.DOTALL)
print(match.group(0).strip() if match else f"INFO: task {task_id} not found in tasks/plan.md")
PY
  fi
}

show_brain_plan() {
  local task_id="${1:-}"
  if [[ -z "$task_id" ]]; then
    echo "ERROR: brain-plan requires a task id"
    exit 1
  fi

  local bundle
  bundle=$(bash ".claude/commands/codex/mm-task.sh" "$task_id" --bundle-json)
  BUNDLE_JSON="$bundle" python3 - <<'PY'
import json
import os
bundle = json.loads(os.environ["BUNDLE_JSON"])
routing = bundle["brain_routing"]
print(f"TASK: {bundle['task_id']}")
print(f"ROUTE: {routing['route_kind']}")
print("PRIMARY:")
for brain in routing["primary_brains"]:
    print(f"- #{brain['id']} {brain['name']}: {brain['reason']}")
if routing["support_brains"]:
    print("SUPPORT:")
    for brain in routing["support_brains"]:
        print(f"- #{brain['id']} {brain['name']}: {brain['reason']}")
if routing["optional_cascades"]:
    print("OPTIONAL CASCADES:")
    for brain in routing["optional_cascades"]:
        print(f"- #{brain['id']} {brain['name']}: {brain['reason']}")
print(f"FINAL: #{routing['final_evaluator']['id']} {routing['final_evaluator']['name']}")
print(f"WORKER: {routing['worker_strategy']}")
print("EXECUTION:")
for key, value in routing["execution_plan"].items():
    print(f"- {key}: {value}")
PY
}

show_help_doc() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "ERROR: help requires a command name"
    exit 1
  fi

  local doc=".claude/commands/mm/${name}.md"
  if [[ -f "$doc" ]]; then
    echo "SOURCE: $doc"
    sed -n '1,220p' "$doc"
    exit 0
  fi

  echo "ERROR: command doc not found: $name"
  exit 1
}

run_handler() {
  local handler="$1"
  shift
  if [[ ! -f "$handler" ]]; then
    echo "ERROR: handler not found: $handler"
    exit 1
  fi
  python3 "$handler" "$@"
}

case "$COMMAND" in
  ""|-h|--help|help)
    if [[ $# -gt 0 ]]; then
      show_help_doc "$1"
    else
      usage
    fi
    ;;
  catalog)
    show_catalog
    ;;
  status)
    show_status
    ;;
  next-task)
    show_next_task
    ;;
  brain-plan)
    show_brain_plan "$@"
    ;;
  init)
    run_handler ".claude/commands/mm/init-handler.py" "$@"
    ;;
  discover)
    run_handler ".claude/commands/mm/discover-handler.py" "$@"
    ;;
  complete-task)
    bash ".claude/commands/codex/mm-task.sh" "$@"
    ;;
  closeout)
    if [[ $# -lt 1 ]]; then
      echo "ERROR: closeout requires a task id"
      exit 1
    fi
    python3 "scripts/mm/block_closeout.py" "$@"
    ;;
  review)
    run_handler ".claude/commands/mm/review-handler.py" "$@"
    ;;
  safe-commit)
    run_handler ".claude/commands/mm/safe_commit_handler.py" "$@"
    ;;
  verify-criteria)
    run_handler ".claude/commands/mm/verify-criteria-handler.py" "$@"
    ;;
  ship)
    run_handler ".claude/commands/mm/ship-handler.py" "$@"
    ;;
  *)
    echo "ERROR: unknown MM command: $COMMAND"
    echo
    usage
    exit 1
    ;;
esac
