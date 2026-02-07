#!/bin/bash
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

estimate_tokens() {
    local file="$1"
    if [[ -f "$file" ]]; then
        local chars=$(wc -c < "$file" | tr -d ' ')
        echo $((chars / 35))
    else
        echo "0"
    fi
}

show_banner() {
    echo -e "${CYAN}=== ProSell SaaS - Infinite Memory ===${NC}"
}

case "$1" in
    init)
        echo -e "${GREEN}OK${NC} $WORK_DIR"
        ;;
    save|checkpoint)
        local ts=$(date +%Y-%m-%d_%H%M%S)
        local cf="$WORK_DIR/checkpoints/$ts.md"
        {
            echo "# Checkpoint: $ts"
            echo "## Context"
            cat "$WORK_DIR/context.md" 2>/dev/null
            echo "## Progress"
            cat "$WORK_DIR/progress.md" 2>/dev/null
            echo "## Queue"
            cat "$WORK_DIR/queue.md" 2>/dev/null
            echo "## Lessons"
            cat "$WORK_DIR/lessons.md" 2>/dev/null
        } > "$cf"
        echo -e "${GREEN}OK${NC} $cf"
        ;;
    status)
        show_banner
        local total=0
        for f in context.md rules.md progress.md lessons.md queue.md; do
            local path="$WORK_DIR/$f"
            if [[ -f "$path" ]]; then
                local t=$(estimate_tokens "$path")
                local l=$(wc -l < "$path" | tr -d ' ')
                total=$((total + t))
                printf "  %-15s %3d lines ~%d tokens\n" "$f" "$l" "$t"
            fi
        done
        echo -e "${BOLD}Total: ~$total tokens${NC}"
        ls -1t "$WORK_DIR/checkpoints/" 2>/dev/null | head -3
        ;;
    load)
        show_banner
        echo "=== CONTEXT ==="
        cat "$WORK_DIR/context.md" 2>/dev/null
        echo ""
        echo "=== QUEUE ==="
        head -10 "$WORK_DIR/queue.md" 2>/dev/null
        echo ""
        echo "=== PROGRESS ==="
        cat "$WORK_DIR/progress.md" 2>/dev/null
        ;;
    add)
        [[ -z "$2" ]] && echo "Usage: memory add <task>" && exit 1
        echo "- [ ] $2" >> "$WORK_DIR/queue.md"
        echo -e "${GREEN}OK${NC}"
        ;;
    lesson)
        [[ -z "$2" ]] && echo "Usage: memory lesson <text>" && exit 1
        echo "- $(date +%Y-%m-%d): $2" >> "$WORK_DIR/lessons.md"
        echo -e "${GREEN}OK${NC}"
        ;;
    rule)
        [[ -z "$2" ]] && echo "Usage: memory rule <text>" && exit 1
        echo "- $(date +%Y-%m-%d): $2" >> "$WORK_DIR/rules.md"
        echo -e "${GREEN}OK${NC}"
        ;;
    clean)
        ls -1t "$WORK_DIR/checkpoints/" 2>/dev/null | tail -n +4 | xargs -r rm
        echo -e "${GREEN}OK${NC}"
        ;;
    rules)
        cat "$WORK_DIR/rules.md" 2>/dev/null
        ;;
    *)
        show_banner
        echo "init|save|status|load|add|lesson|rule|clean|rules"
        ;;
esac
