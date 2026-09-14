#!/usr/bin/env bash
# aidlc-search — search AI-DLC workflow artifacts with ranked, contextual output.
#
# Why this exists: agents and humans navigating `aidlc/` typically need
# "what did the workflow decide/decide-not-do about X?" answers, and the raw
# filesystem has no first-class query surface. Grep alone returns paths but
# no context; grep -B -A returns context but no ranking, so the first hits
# are not always the most relevant. This script combines both: rank by
# match density, then emit a context window around each match in the top-N
# files, with a tail listing of the remaining matches by file.
#
# Designed to be IDE-agnostic. Invoked directly from a shell, or wrapped
# by OpenCode (.opencode/command/aidlc-search.md) and Claude Code
# (.claude/skills/aidlc-search/SKILL.md). Both wrappers just pass $ARGUMENTS
# to this script verbatim.
#
# Usage:
#   scripts/aidlc-search.sh "QUERY" [OPTIONS]
#
# Options:
#   --intent <slug>     Limit search to one intent dir (e.g. 260911-cross-org-export-ux).
#                        When omitted, searches every intent under aidlc/spaces/*/intents/*/.
#   --top <N>           Number of top-ranked files to show with context (default: 5).
#   --context <N>       Lines of context around each match (default: 3).
#   --stage <name>      Limit to one stage: inception|construction|operation|verification
#                        (matches the directory name under the intent dir).
#   --max-bytes <N>     Per-file match-count ceiling to keep one file from
#                        dominating the ranking (default: 200).
#   --no-tail           Do not print the tail listing of files beyond --top.
#   --help              Show this help.
#
# Examples:
#   scripts/aidlc-search.sh "ALL_ORGS" --intent 260911-cross-org-export-ux
#   scripts/aidlc-search.sh "tenant_id" --stage construction
#   scripts/aidlc-search.sh "BR1.7" --top 3 --context 5
#
# Output format:
#   ┌─ header ─────────────────────────────────────────────┐
#   │ INTENT: <slug>  |  TOTAL MATCHES: <n>  |  FILES: <n> │
#   └───────────────────────────────────────────────────────┘
#
#   ## Top 1: <path>  (matches: <n>)
#     L<line>: <line content>
#     -- <N> lines context above match at L<N> --
#     L<line>: <line content>
#     L<line>: <line content>
#
#   ## Top 2: ...
#
#   ## Other files with matches (no context):
#     <matches>: <path>
#     ...
#
# Exit codes:
#   0 — found matches
#   1 — no matches
#   2 — usage / argument error
#   3 — repo root not found (cwd outside a git repo)

set -euo pipefail

usage() {
  sed -n '2,/^# Examples:/p' "$0" | sed 's/^# \{0,1\}//'
}

# --- arg parsing -------------------------------------------------------------

query=""
intent=""
top=5
context_lines=3
stage=""
max_bytes=200
show_tail=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --intent)    intent="$2"; shift 2 ;;
    --top)       top="$2"; shift 2 ;;
    --context)   context_lines="$2"; shift 2 ;;
    --stage)     stage="$2"; shift 2 ;;
    --max-bytes) max_bytes="$2"; shift 2 ;;
    --no-tail)   show_tail=0; shift ;;
    --help|-h)   usage; exit 0 ;;
    -*)          echo "ERROR: unknown flag '$1'" >&2; usage >&2; exit 2 ;;
    *)
      if [[ -z "$query" ]]; then
        query="$1"
      else
        echo "ERROR: extra positional arg '$1' (only one QUERY allowed)" >&2; exit 2
      fi
      shift
      ;;
  esac
done

if [[ -z "$query" ]]; then
  echo "ERROR: QUERY required" >&2
  usage >&2
  exit 2
fi

# --- locate repo + aidlc root -----------------------------------------------

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "ERROR: not inside a git repo" >&2; exit 3
fi
cd "$repo_root"

aidlc_root="$repo_root/aidlc/spaces"
if [[ ! -d "$aidlc_root" ]]; then
  echo "ERROR: $aidlc_root not found" >&2; exit 3
fi

# --- build search root -------------------------------------------------------

if [[ -n "$intent" ]]; then
  search_root="$aidlc_root/*/intents/$intent"
else
  search_root="$aidlc_root/*/intents/*"
fi

if [[ -n "$stage" ]]; then
  search_root="$search_root/$stage"
fi

# Expand the glob (no matches → empty)
# shellcheck disable=SC2207
expanded=( $(compgen -G "$search_root" 2>/dev/null || true) )

if [[ ${#expanded[@]} -eq 0 ]]; then
  if [[ -n "$intent" ]]; then
    echo "ERROR: intent '$intent' not found under $aidlc_root/*/intents/" >&2
  else
    echo "ERROR: no intents found under $aidlc_root" >&2
  fi
  exit 3
fi

# --- rank files by match density --------------------------------------------

# For each candidate file, count matches of the query.
# Output rows: "<count>\t<path>" (only count>0 files).
mapfile -t ranked < <(
  for dir in "${expanded[@]}"; do
    if [[ -d "$dir" ]]; then
      # -I: skip binary; -l: files-with-matches; then re-count per file for density.
      # grep exits 1 when no matches found in some files; tolerate that.
      rtk grep -rIl --binary-files=without-match -- "$query" "$dir" 2>/dev/null || true
    fi
  done | sort -u | while read -r f; do
    n=$(rtk grep -c --binary-files=without-match -- "$query" "$f" 2>/dev/null)
    [[ -z "$n" ]] && n=0
    # Cap to keep one file from dominating (huge audit logs, etc.).
    [[ "$n" -gt "$max_bytes" ]] && n="$max_bytes"
    printf '%d\t%s\n' "$n" "$f"
  done | sort -t$'\t' -k1,1 -nr
)

if [[ ${#ranked[@]} -eq 0 ]]; then
  if [[ -n "$intent" ]]; then
    scope_label="intent '$intent'"
  else
    scope_label="all intents under aidlc/spaces/"
  fi
  echo "No matches for '$query' in $scope_label"
  exit 1
fi

total=$(printf '%s\n' "${ranked[@]}" | awk -F'\t' '{s+=$1} END {print s}')
file_count=${#ranked[@]}

# --- emit output -------------------------------------------------------------

printf '\nINTENT: %s  |  QUERY: %s  |  TOTAL MATCHES: %s  |  FILES: %s\n\n' \
  "${intent:-<all>}" "$query" "$total" "$file_count"

# Top-N with context.
if [[ "$top" -lt "$file_count" ]]; then
  limit="$top"
else
  limit="$file_count"
fi
for ((i = 0; i < limit; i++)); do
  count=$(echo "${ranked[$i]}" | cut -f1)
  path=$(echo "${ranked[$i]}" | cut -f2-)
  echo "## Top $((i + 1)) of $file_count: $path  (matches: $count)"
  echo
  # -B context_lines -A context_lines: symmetric window; -- separates blocks.
  rtk grep -B "$context_lines" -A "$context_lines" -- "$query" "$path" || true
  echo
done

# Tail of remaining files (just path + count, no context).
if [[ $show_tail -eq 1 && $file_count -gt $limit ]]; then
  remaining=$((file_count - limit))
  echo "## Other files with matches (no context): $remaining"
  echo
  for ((i = limit; i < file_count; i++)); do
    count=$(echo "${ranked[$i]}" | cut -f1)
    path=$(echo "${ranked[$i]}" | cut -f2-)
    printf '  %5d  %s\n' "$count" "$path"
  done
  echo
fi
