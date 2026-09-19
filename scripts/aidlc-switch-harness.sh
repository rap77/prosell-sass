#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# aidlc-switch-harness.sh
#
# Toggle AI-DLC harness for this project without losing workflow state.
# Use this when one harness runs out of credits (e.g. Claude Code quota) and
# you need to continue with the other (e.g. opencode) on the SAME checkout.
#
# Usage:
#   ./scripts/aidlc-switch-harness.sh [--force] <harness>
#
# Where <harness> is one of: claude | opencode | codex | cursor | kiro |
# kiro-ide | copilot
#
# Flags:
#   --force    Bypass the in-progress stage guard. Use only when the workflow
#              state is stale or the engine failed to transition markers after
#              a READY verdict (the script will log a loud warning). Inside
#              the new harness, run `/aidlc --resume` to reconcile state.
#
# What it does:
#   1. Validates the workflow state (refuses to switch mid-stage).
#   2. Refreshes the harness-specific projection from the installed runtime.
#   3. Runs `aidlc doctor` and reports the result.
#   4. Prints the next-step command to open the new harness.
#
# What it preserves (intentionally):
#   - aidlc/ workspace (intents, audit shards, memory, codekb) — never touched
#   - AGENTS.md (project-owned, custom content)
#   - .gitignore (project-owned, managed block already merged)
#   - .aidlc/.aidlc-clone-id (machine-local clone identity)
#   - .aidlc/.aidlc-sessions/ (per-conversation session→intent map)
#
# What it DOES NOT do:
#   - It will NOT switch if any intent is mid-stage ([ ]).
#   - It will NOT commit anything (you decide what to commit).
#   - It will NOT open the harness for you.
#   - It will NOT touch the other harness's tree (you must have closed it).
#
# ----------------------------------------------------------------------------
set -euo pipefail

# ---- args & preconditions -------------------------------------------------

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
    FORCE=1
    shift
fi

readonly TARGET="${1:?usage: $0 [--force] <claude|opencode|codex|cursor|kiro|kiro-ide|copilot>}"

readonly VALID_HARNESSES=(claude opencode codex cursor kiro kiro-ide copilot)
is_valid=0
for h in "${VALID_HARNESSES[@]}"; do
    [[ "$h" == "$TARGET" ]] && is_valid=1 && break
done
if [[ $is_valid -eq 0 ]]; then
    echo "error: invalid harness '$TARGET'" >&2
    echo "       valid: ${VALID_HARNESSES[*]}" >&2
    exit 2
fi

# Resolve runtime root for the installed AIDLC version.
AIDLC_BIN="$(command -v aidlc || true)"
if [[ -z "$AIDLC_BIN" ]]; then
    echo "error: 'aidlc' not on PATH. Install with:" >&2
    echo "       curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh" >&2
    exit 3
fi

# aidlc version reports the runtime version, which lives at
# ~/.local/share/aidlc/versions/<runtime>/runtime/<harness>/.
RUNTIME_VERSION=""
if "$AIDLC_BIN" version --json >/dev/null 2>&1; then
    RUNTIME_VERSION="$("$AIDLC_BIN" version --json 2>/dev/null \
        | grep -oE '"runtimeVersion"[[:space:]]*:[[:space:]]*"[^"]+"' \
        | head -1 \
        | sed -E 's/.*"([^"]+)"$/\1/')"
fi
if [[ -z "$RUNTIME_VERSION" ]]; then
    AIDLC_INSTALL_ROOT="${AIDLC_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/aidlc}"
    RUNTIME_VERSION="$(cat "$AIDLC_INSTALL_ROOT/active-version" 2>/dev/null | tr -d '[:space:]' || true)"
fi
if [[ -z "$RUNTIME_VERSION" ]]; then
    echo "error: cannot resolve AIDLC runtime version." >&2
    echo "       tried: 'aidlc version --json' and active-version file." >&2
    exit 3
fi

AIDLC_INSTALL_ROOT="${AIDLC_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/aidlc}"
readonly RUNTIME_ROOT="$AIDLC_INSTALL_ROOT/versions/$RUNTIME_VERSION/runtime"
readonly RUNTIME_SRC="$RUNTIME_ROOT/$TARGET"

if [[ ! -d "$RUNTIME_SRC" ]]; then
    echo "error: runtime source not installed: $RUNTIME_SRC" >&2
    echo "       reinstall with the standard installer (it ships all harnesses)." >&2
    exit 3
fi

# Project root is the directory containing aidlc/ (the workspace).
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT"

# ---- state validator -------------------------------------------------------
#
# Reads the active intent's aidlc-state.md and refuses to switch if any stage
# is currently in-progress (symbol [ ]). Allows switching when the active
# stage is in a gate ([G]) or revising ([R]), with appropriate messaging.
#
# Symbols (per AIDLC state convention, see line 56 of any aidlc-state.md):
#   [ ]   not started      — not blocking
#   [-]   in-progress      — REFUSE to switch
#   [?]   awaiting approval — safe to switch (you decide the gate)
#   [R]   revising         — safe but warning (reviewer fingerprint at risk)
#   [x]   complete         — not blocking
#   [S]   skipped          — not blocking
#
# No active-intent file ⇒ no active workflow ⇒ safe to switch silently.
# ----------------------------------------------------------------------------

ACTIVE_INTENT_FILE="aidlc/spaces/default/intents/active-intent"
STATE_FILE=""

if [[ -f "$ACTIVE_INTENT_FILE" ]]; then
    ACTIVE_INTENT="$(cat "$ACTIVE_INTENT_FILE" | tr -d '[:space:]')"
    if [[ -n "$ACTIVE_INTENT" && "$ACTIVE_INTENT" != "default" ]]; then
        CANDIDATE="aidlc/spaces/default/intents/$ACTIVE_INTENT/aidlc-state.md"
        if [[ -f "$CANDIDATE" ]]; then
            STATE_FILE="$CANDIDATE"
        fi
    fi
fi

if [[ -z "$STATE_FILE" ]]; then
    echo "→ no active intent; switching is safe."
else
    # Count stages by symbol. The state file uses single-char markers
    # inside square brackets: [-] in-progress, [?] gate, [R] revising.
    # We accept them in both bullet (- [-]) and table-cell (`| [-]`) form
    # because the renderer varies across stages.
    in_progress=$(grep -cE '\[-\]' "$STATE_FILE" 2>/dev/null || true)
    in_gate=$(grep -cE '\[\?\]' "$STATE_FILE" 2>/dev/null || true)
    in_revision=$(grep -cE '\[R\]' "$STATE_FILE" 2>/dev/null || true)
    in_progress=${in_progress:-0}
    in_gate=${in_gate:-0}
    in_revision=${in_revision:-0}

    if [[ $in_progress -gt 0 ]]; then
        if [[ $FORCE -eq 1 ]]; then
            echo "================================================================="
            echo "  --force: bypassing in-progress guard."
            echo "================================================================="
            echo ""
            echo "  Intent:      $ACTIVE_INTENT"
            echo "  State file:  $STATE_FILE"
            echo "  Stages [-]:  $in_progress in-progress"
            echo ""
            echo "  The switch will proceed, but the workflow state may be"
            echo "  inconsistent on the other side. Run /aidlc --resume inside"
            echo "  the new harness to reconcile markers after the refresh."
            echo ""
        else
            echo "================================================================="
            echo "  REFUSING TO SWITCH: an intent is mid-stage."
            echo "================================================================="
            echo ""
            echo "  Intent:      $ACTIVE_INTENT"
            echo "  State file:  $STATE_FILE"
            echo "  Stages [-]:  $in_progress in-progress"
            echo ""
            echo "  Mid-stage switches corrupt sub-agent execution, invalidate"
            echo "  reviewer fingerprints, and can lose uncommitted artifacts."
            echo ""
            echo "  Wait for the active stage to reach a gate ([?]) and either"
            echo "  approve it or end your session there. Then re-run this script."
            echo ""
            echo "  If the markers are stale (READY verdict on file but [-] still"
            echo "  set, as happens after an engine bug), pass --force to bypass"
            echo "  this guard and reconcile state inside the new harness."
            echo ""
            echo "  Quick check: which stage is currently running?"
            echo "    grep -nE '\\[-\\]' \"$STATE_FILE\""
            echo ""
            exit 1
        fi
    fi

    if [[ $in_revision -gt 0 ]]; then
        echo "→ active intent has $in_revision stage(s) in revision ([R])."
        echo "  Switching now is mechanically safe but the reviewer fingerprint"
        echo "  on that revision may need a rebase after the switch."
    fi

    if [[ $in_gate -gt 0 ]]; then
        echo "→ active intent has $in_gate stage(s) awaiting your approval ([?])."
        echo "  This is the IDEAL moment to switch — no work is mid-flight."
    fi
fi

# ---- refresh the harness projection ---------------------------------------
#
# Strategy: copy the engine surface (.aidlc/, harness dot-dir, root config)
# from the runtime source onto the project. The runtime source is the
# canonical truth for the installed AIDLC version; project-owned files
# (AGENTS.md, .gitignore, aidlc/ workspace) are not touched.
#
# Why we don't just run `aidlc config --harness <TARGET> --from <SRC>`:
#   - In copy-channel installs the binary lacks the --harness switch and
#     refuses a refresh that would change the detected distribution.
#   - The manual refresh below is what the binary would do internally, and
#     it preserves the same machine-locals (.aidlc/.aidlc-clone-id, sessions).
# ----------------------------------------------------------------------------

echo "→ refreshing engine from $RUNTIME_SRC"

# 1. Engine tree — replace sub-dirs wholesale with the runtime version, but
#    preserve machine-locals that exist only on this clone.
for sub in tools hooks skills agents sensors aidlc-common scopes; do
    if [[ -d "$RUNTIME_SRC/.aidlc/$sub" ]]; then
        rm -rf ".aidlc/$sub"
        cp -rT "$RUNTIME_SRC/.aidlc/$sub" ".aidlc/$sub"
    fi
done

# 2. Harness-specific tree — only the one we're switching TO.
case "$TARGET" in
    opencode)
        [[ -d "$RUNTIME_SRC/.opencode" ]] && {
            rm -rf ".opencode"
            cp -rT "$RUNTIME_SRC/.opencode" ".opencode"
        }
        [[ -f "$RUNTIME_SRC/opencode.json" ]] && cp "$RUNTIME_SRC/opencode.json" "opencode.json"
        ;;
    claude)
        [[ -d "$RUNTIME_SRC/.claude" ]] && {
            rm -rf ".claude"
            cp -rT "$RUNTIME_SRC/.claude" ".claude"
        }
        ;;
    codex)
        [[ -d "$RUNTIME_SRC/.codex" ]] && {
            rm -rf ".codex"
            cp -rT "$RUNTIME_SRC/.codex" ".codex"
        }
        ;;
    cursor|kiro|kiro-ide|copilot)
        # These harnesses use the harness's own dot-dir + root config; copy
        # whatever the runtime ships without hard-coding paths.
        for entry in "$RUNTIME_SRC"/.* "$RUNTIME_SRC"/*; do
            name="$(basename "$entry")"
            case "$name" in
                .|.aidlc|aidlc|AGENTS.md|.gitignore|package.json) continue ;;
            esac
            rm -rf "$name"
            cp -rT "$entry" "$name"
        done
        ;;
esac

# 3. Sanity: machine-locals should still be present (we never delete them,
#    only skip refresh of their containing dirs).
if [[ ! -f "aidlc/.aidlc-clone-id" ]]; then
    echo "warning: aidlc/.aidlc-clone-id missing after refresh." >&2
    echo "         this clone's audit shard identity has been lost." >&2
    echo "         fix: re-init with 'aidlc --init' if subsequent stages fail." >&2
fi

# ---- post-refresh validation ----------------------------------------------

echo "→ running aidlc doctor"
if aidlc doctor >/tmp/aidlc-switch-harness.doctor.log 2>&1; then
    tail -1 /tmp/aidlc-switch-harness.doctor.log
else
    echo "warning: aidlc doctor reported issues. See /tmp/aidlc-switch-harness.doctor.log"
    tail -20 /tmp/aidlc-switch-harness.doctor.log
fi

echo ""
echo "================================================================="
echo "  Harness switched to: $TARGET"
echo "================================================================="
echo ""
echo "  Next:"
case "$TARGET" in
    opencode) echo "    opencode    # or: opencode run --command aidlc" ;;
    claude)    echo "    claude      # then /aidlc --resume" ;;
    codex)     echo "    codex       # then \$aidlc --resume" ;;
    cursor)    echo "    cursor      # or run 'agent' in this project" ;;
    kiro)      echo "    kiro-cli chat" ;;
    kiro-ide)  echo "    open the project in Kiro IDE" ;;
    copilot)   echo "    copilot     # or open VS Code with Copilot" ;;
esac
echo ""
echo "  Inside the harness, run /aidlc --resume to pick up the active intent."
echo ""
