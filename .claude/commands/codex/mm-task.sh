#!/usr/bin/env bash
# mm-task.sh — Bridge entre MasterMind y Codex
#
# Uso:
#   bash .claude/commands/codex/mm-task.sh M3
#   bash .claude/commands/codex/mm-task.sh M3 --continue
#   bash .claude/commands/codex/mm-task.sh M3 --payload-only
#   bash .claude/commands/codex/mm-task.sh M3 --bundle-json
#
# Lo que hace:
#   1. Corre el handler de MasterMind para leer tasks/plan.md y todo.md
#   2. Extrae el PAYLOAD estructurado
#   3. Enriquce el contexto con brain routing para Codex
#   4. Genera un bundle consumible por agentes Codex
#   5. NO depende de un runner externo hardcodeado

set -euo pipefail

TASK_ID="${1:-}"
shift || true

MODE="summary"
EXTRA_FLAGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --payload-only)
      MODE="payload"
      ;;
    --bundle-json)
      MODE="bundle"
      ;;
    --summary)
      MODE="summary"
      ;;
    *)
      EXTRA_FLAGS+=("$1")
      ;;
  esac
  shift
done

if [[ -z "$TASK_ID" ]]; then
  echo "Uso: mm-task.sh <TASK_ID> [--continue] [--payload-only|--bundle-json|--summary]"
  echo "Ejemplo: mm-task.sh M3"
  exit 1
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
cd "$PROJECT_ROOT"

HANDLER_OUTPUT=$(python3 .claude/commands/mm/complete-task-handler.py "$TASK_ID" "${EXTRA_FLAGS[@]}" 2>&1)

if echo "$HANDLER_OUTPUT" | grep -q "^ERROR:"; then
  echo "$HANDLER_OUTPUT"
  echo "❌ Handler error — revisá el output arriba"
  exit 1
fi

if echo "$HANDLER_OUTPUT" | grep -q "STATUS: TASK COMPLETE"; then
  if [[ "$MODE" == "payload" ]]; then
    echo '{"status":"task-complete"}'
  else
    echo "$HANDLER_OUTPUT"
    echo "✅ Task $TASK_ID ya está completa"
  fi
  exit 0
fi

PAYLOAD=$(echo "$HANDLER_OUTPUT" | grep "^PAYLOAD:" | sed 's/^PAYLOAD: //')

if [[ -z "$PAYLOAD" ]]; then
  echo "$HANDLER_OUTPUT"
  echo "❌ No se encontró PAYLOAD"
  exit 1
fi

PLAN_CONTEXT=$(python3 -c "
import re, pathlib
plan = pathlib.Path('tasks/plan.md').read_text()
pattern = r'## ${TASK_ID}:.*?(?=\n## |\Z)'
m = re.search(pattern, plan, re.DOTALL)
print(m.group(0)[:5000] if m else '')
" 2>/dev/null || echo "")

TASK_TITLE=$(printf '%s' "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['task_title'])")
BRAIN_ROUTING=$(python3 scripts/mm/brain_router.py "$TASK_ID" "$TASK_TITLE" "$PLAN_CONTEXT")

if [[ "$MODE" == "payload" ]]; then
  echo "$PAYLOAD"
  exit 0
fi

if [[ "$MODE" == "bundle" ]]; then
  PAYLOAD_JSON="$PAYLOAD" \
  PLAN_CONTEXT_TEXT="$PLAN_CONTEXT" \
  HANDLER_OUTPUT_TEXT="$HANDLER_OUTPUT" \
  BRAIN_ROUTING_JSON="$BRAIN_ROUTING" \
  TASK_ID_VALUE="$TASK_ID" \
  python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["PAYLOAD_JSON"])
brain_routing = json.loads(os.environ["BRAIN_ROUTING_JSON"])

bundle = {
    "task_id": os.environ["TASK_ID_VALUE"],
    "plan_context": os.environ["PLAN_CONTEXT_TEXT"].strip(),
    "handler_output": os.environ["HANDLER_OUTPUT_TEXT"].strip(),
    "payload": payload,
    "brain_routing": brain_routing,
    "agent_prompt_template": (
        "Project: ProSell SaaS — {task_title}\n"
        "Working directory: {working_directory}\n"
        "Execution mode: launch one background task-executor for the parent block,"
        " then execute subtasks sequentially inside it.\n"
        "Task spec:\n{plan_context}\n\n"
        "Brain routing:\n{brain_routing_summary}\n\n"
        "Execution policy:\n"
        "- Keep the main thread clean; do the work in the worker\n"
        "- Process all pending subtasks in the block sequentially\n"
        "- Checkpoint after each subtask: mark in_progress/completed, update task-progress.json, update tasks/todo.md\n"
        "- After each checkpoint run: bash scripts/mm/mm.sh closeout {task_id}\n"
        "- closeout must recalculate time tracking and trigger the notification sound when the parent block completes\n"
        "- Finish with review → verify-criteria → final Codex review → fix confirmed findings → sync source-of-truth docs → revalidate → safe-commit\n"
        "- If GGA or any verification fails, fix and retry until clean\n"
        "- Never use git commit --no-verify"
    ),
}
print(json.dumps(bundle, ensure_ascii=False))
PY
  exit 0
fi

PENDING_COUNT=$(printf '%s' "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['pending_count'])")
SUBTASK_LIST=$(PAYLOAD_JSON="$PAYLOAD" python3 - <<'PY'
import json
import os
payload = json.loads(os.environ["PAYLOAD_JSON"])
for st in payload["subtasks"]:
    print(f"- {st['id']}: {st['description']}")
PY
)
BRAIN_SUMMARY=$(BRAIN_ROUTING_JSON="$BRAIN_ROUTING" python3 - <<'PY'
import json
import os
routing = json.loads(os.environ["BRAIN_ROUTING_JSON"])
print(f"Route kind: {routing['route_kind']}")
print("Primary brains:")
for brain in routing["primary_brains"]:
    print(f"- #{brain['id']} {brain['name']}: {brain['reason']}")
if routing["support_brains"]:
    print("Support brains:")
    for brain in routing["support_brains"]:
        print(f"- #{brain['id']} {brain['name']}: {brain['reason']}")
print(f"Final evaluator: #{routing['final_evaluator']['id']} {routing['final_evaluator']['name']}")
print(f"Worker strategy: {routing['worker_strategy']}")
PY
)

echo "🔗 MasterMind → Codex bridge"
echo "📋 Task: $TASK_ID"
echo "📁 Working directory: $(printf '%s' "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['working_directory'])")"
echo "📦 Pending subtasks: $PENDING_COUNT"
echo ""
echo "Handler output:"
echo "$HANDLER_OUTPUT"
echo ""
echo "Subtasks:"
echo "$SUBTASK_LIST"
echo ""
echo "Brain routing:"
echo "$BRAIN_SUMMARY"
echo ""
echo "Plan context excerpt:"
echo "$PLAN_CONTEXT"
echo ""
echo "Next steps for Codex/manual execution:"
echo "  1. Re-run with --bundle-json to get a structured JSON bundle"
echo "  2. Launch one worker for the whole block and keep the main thread clean"
echo "  3. Execute pending subtasks sequentially with per-subtask checkpoints"
echo "  4. After each checkpoint run: bash scripts/mm/mm.sh closeout $TASK_ID"
echo "  5. Run review → verify-criteria → final Codex review"
echo "  6. Fix confirmed findings and sync source-of-truth docs"
echo "  7. Revalidate, then run safe-commit"
