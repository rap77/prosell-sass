#!/usr/bin/env bash
# mm-task.sh — Bridge entre MasterMind y Codex CLI
#
# Uso:
#   bash .claude/commands/codex/mm-task.sh M3
#   bash .claude/commands/codex/mm-task.sh M3 --continue
#
# Lo que hace:
#   1. Corre el handler de MasterMind para leer tasks/plan.md y todo.md
#   2. Extrae los subtasks pendientes del PAYLOAD
#   3. Para cada subtask, llama a Codex con el contexto completo
#   4. Al terminar, guía los pasos de test + commit

set -euo pipefail

TASK_ID="${1:-}"
EXTRA_FLAGS=("${@:2}")
CODEX="node /home/rpadron/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs"

if [[ -z "$TASK_ID" ]]; then
  echo "Uso: mm-task.sh <TASK_ID> [--continue]"
  echo "Ejemplo: mm-task.sh M3"
  exit 1
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
cd "$PROJECT_ROOT"

echo "🔗 MasterMind → Codex bridge"
echo "📋 Task: $TASK_ID"
echo ""

# Correr el handler para obtener el payload
HANDLER_OUTPUT=$(python3 .claude/commands/mm/complete-task-handler.py "$TASK_ID" "${EXTRA_FLAGS[@]}" 2>&1)
echo "$HANDLER_OUTPUT"
echo ""

# Verificar errores o tarea completa
if echo "$HANDLER_OUTPUT" | grep -q "^ERROR:"; then
  echo "❌ Handler error — revisá el output arriba"
  exit 1
fi

if echo "$HANDLER_OUTPUT" | grep -q "STATUS: TASK COMPLETE"; then
  echo "✅ Task $TASK_ID ya está completa"
  exit 0
fi

# Extraer el PAYLOAD JSON
PAYLOAD=$(echo "$HANDLER_OUTPUT" | grep "^PAYLOAD:" | sed 's/^PAYLOAD: //')

if [[ -z "$PAYLOAD" ]]; then
  echo "❌ No se encontró PAYLOAD"
  exit 1
fi

# Leer campos del payload
TASK_TITLE=$(echo "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['task_title'])")
WORKING_DIR=$(echo "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['working_directory'])")
PENDING_COUNT=$(echo "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['pending_count'])")
SUBTASKS_JSON=$(echo "$PAYLOAD" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['subtasks']))")

echo "📦 $PENDING_COUNT subtask(s) pendiente(s)"
echo ""

# Extraer el spec del task desde plan.md
PLAN_CONTEXT=$(python3 -c "
import re, pathlib
plan = pathlib.Path('tasks/plan.md').read_text()
pattern = r'## ${TASK_ID}:.*?(?=\n## |\Z)'
m = re.search(pattern, plan, re.DOTALL)
print(m.group(0)[:3000] if m else '')
" 2>/dev/null || echo "")

# Iterar subtasks
SUBTASK_LIST=$(echo "$SUBTASKS_JSON" | python3 -c "
import json, sys
for st in json.load(sys.stdin):
    print(f\"{st['id']}|||{st['description']}\")
")

while IFS='|||' read -r SUBTASK_ID SUBTASK_DESC; do
  [[ -z "$SUBTASK_ID" ]] && continue

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 $SUBTASK_ID: $SUBTASK_DESC"
  echo ""

  # Prompt completo para Codex
  PROMPT="Project: ProSell SaaS — ${TASK_TITLE}
Stack: Next.js 16 + React 19 + TypeScript + TailwindCSS 4 + TanStack Query v5 + FastAPI Python 3.13 + SQLAlchemy 2.0

Task spec:
${PLAN_CONTEXT}

Implement subtask: ${SUBTASK_ID} — ${SUBTASK_DESC}

Rules:
- Read existing files before writing to match project patterns
- No stubs — implement real functionality
- Use TDD when possible (write test first)
- Follow Clean Architecture on backend (domain → application → infrastructure)
- After implementing, run: git diff --stat to summarize what changed"

  $CODEX task "$PROMPT" || {
    echo "⚠️  Codex terminó con error en $SUBTASK_ID — continuando..."
  }

  echo ""
done <<< "$SUBTASK_LIST"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Todos los subtasks enviados a Codex"
echo ""
echo "Próximos pasos manuales:"
echo "  git diff                  # revisá los cambios"
echo "  cd apps/api && uv run pytest"
echo "  cd apps/web && pnpm test run"
echo "  git add -A && git commit -m 'feat($TASK_ID): implementado via Codex'"
echo "  # Actualizá tasks/todo.md: marcá $TASK_ID como [x]"
