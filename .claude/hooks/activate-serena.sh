#!/bin/bash
# Hook script to activate Serena project
# This runs at SessionStart to inject context

PROJECT_DIR="/home/rpadron/proy/prosell-sass"

# Create a marker file that Claude can check
MARKER_FILE="$PROJECT_DIR/.claude/.serena-activated"

# Write activation instructions to marker
cat > "$MARKER_FILE" << 'EOF'
SERENA_AUTO_ACTIVATION=true
SERENA_PROJECT=prosell-sass
SERENA_PROJECT_PATH=/home/rpadron/proy/prosell-sass

INSTRUCTIONS:
When you start a new session in this project:
1. Call: mcp__serena__activate_project with project: "/home/rpadron/proy/prosell-sass"
2. Call: mcp__serena__list_memories to see available context
3. Read relevant memories based on your task

Available memories:
- project_overview.md: Purpose, roles, epics
- tech_stack.md: Python 3.13, FastAPI, Next.js 16, React 19
- code_style_conventions.md: Clean Architecture, SOLID
- suggested_commands.md: Development commands
- when_task_completed.md: Pre-commit checklist
- codebase_structure.md: Monorepo layout
EOF

# Output JSON for Claude
echo "{\"hookSpecificOutput\": {\"hookEventName\": \"SessionStart\", \"serenaMarkerCreated\": \"$MARKER_FILE\", \"autoActivation\": \"instructed\"}}"
