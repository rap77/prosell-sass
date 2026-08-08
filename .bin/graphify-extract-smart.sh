#!/usr/bin/env zsh
# graphify-extract-smart.sh - Smart fallback chain for graphify semantic extraction.
#
# Two modes:
#   --auto       (default in post-commit hook): CHEAP, local-only.
#                Uses ollama + --no-cluster. No API cost, no reasoning tokens.
#   --full       (default in this wrapper): full extraction with LLM clustering.
#                Tries Gemini → MiniMax → Ollama in order.
#
# Backends tried in --full mode:
#   1. Gemini     (cloud, fast, cheap) — requires GEMINI_API_KEY
#   2. MiniMax    (OpenAI-compatible)  — requires MINIMAX_API_KEY
#                       Defined as custom provider in ~/.graphify/providers.json
#                       with `extra_body: {thinking: {type: disabled}}` — this
#                       DISABLES reasoning tokens (saves ~20-30% per call).
#                       Critical for graph extraction: reasoning tokens are
#                       wasted because the task is structured JSON, not open
#                       reasoning. Only MiniMax-M3 supports this flag; the
#                       M2.x family ignores it.
#   3. Ollama     (local fallback)     — requires OLLAMA_BASE_URL + OLLAMA_MODEL
#
# MiniMax available models (from GET /v1/models on api.minimax.io):
#   MiniMax-M3                  ← flagship + SUPPORTS thinking.disabled (uses this)
#   MiniMax-M2.7-highspeed      ← Starter plan (ignores thinking.disabled)
#   MiniMax-M2.7                ← Starter plan (ignores thinking.disabled)
#   MiniMax-M2.5-highspeed      ← Older tiers only (NOT in Starter)
#   MiniMax-M2.5                ← Older tiers only
#   MiniMax-M2.1-highspeed      ← Older tiers only
#   MiniMax-M2.1                ← Older tiers only
#   MiniMax-M2                  ← Legacy
#
# Starter plan quota: ~0.5B tokens/month for text/image/speech COMBINED.
# --auto mode = ZERO tokens consumed (ollama local, no LLM call).
# --full mode = up to 0.5B tokens consumed per full extract.
#
# IMPORTANT: this script is zsh (not bash) because the user's dotfiles are
# zsh-only. Running this from bash requires sourcing the secrets.env first.
#
# Usage:
#   .bin/graphify-extract-smart.sh [PROJECT_PATH]            # default: --full
#   .bin/graphify-extract-smart.sh --auto [PROJECT_PATH]     # ollama + no-cluster, no tokens
#   .bin/graphify-extract-smart.sh --full [PROJECT_PATH]     # full LLM extract with fallback
#   .bin/graphify-extract-smart.sh --check                   # only probe which backends work
#   .bin/graphify-extract-smart.sh --backend=X               # force a specific backend
#   .bin/graphify-extract-smart.sh --list-models             # list available MiniMax models
#   .bin/graphify-extract-smart.sh --model=X                 # override MiniMax model
#   .bin/graphify-extract-smart.sh --help
#
# Exit codes:
#   0 = success
#   1 = all backends failed
#   2 = no backends configured
#   3 = invalid args

set -euo pipefail

# ---------- Constants ----------
# Loaded after args because we need to read $HOME without env side-effects.
SECRETS_FILE="${SECRETS_FILE:-$HOME/.config/mastermind/secrets.env}"
MINIMAX_BASE_URL="${MINIMAX_BASE_URL:-https://api.minimax.io/v1}"
# MiniMax-M3 honors thinking.disabled, avoiding unnecessary reasoning tokens.
MINIMAX_MODEL="${MINIMAX_MODEL:-MiniMax-M3}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434/v1}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b}"
# Max concurrency. Starter allows 1-2; default 1 is safe for cloud. Override
# with MAX_CONCURRENCY=N for higher tiers or local ollama (4-12 is fine there).
MAX_CONCURRENCY="${MAX_CONCURRENCY:-1}"

# ---------- Args ----------
PROJECT_PATH="."
SELF_CHECK=0
LIST_MODELS=0
FORCED_BACKEND=""
MODE="full"   # 'auto' (ollama + no-cluster) or 'full' (Gemini→MiniMax→Ollama fallback)

while [ $# -gt 0 ]; do
    case "$1" in
        --auto) MODE="auto"; shift ;;
        --full) MODE="full"; shift ;;
        --check) SELF_CHECK=1; shift ;;
        --list-models) LIST_MODELS=1; shift ;;
        --backend=*) FORCED_BACKEND="${1#*=}"; shift ;;
        --model=*) MINIMAX_MODEL="${1#*=}"; shift ;;
        --help|-h)
            sed -n '2,40p' "$0"
            exit 0
            ;;
        -*) echo "Unknown flag: $1" >&2; exit 3 ;;
        *) PROJECT_PATH="$1"; shift ;;
    esac
done

cd "$PROJECT_PATH" || { echo "Project path not found: $PROJECT_PATH" >&2; exit 3; }

# ---------- Source secrets ----------
# API keys live in $SECRETS_FILE (a per-user file with perm 600), not in
# .zshrc. Sourcing it populates GEMINI_API_KEY and MINIMAX_API_KEY.
if [ -f "$SECRETS_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$SECRETS_FILE"
    set +a
fi

# ---------- Helpers ----------
has() { command -v "$1" >/dev/null 2>&1; }

probe_gemini() {
    [ -n "${GEMINI_API_KEY:-}" ] || { echo "    (GEMINI_API_KEY not set, skip)"; return 1; }
    echo "    probing generativelanguage.googleapis.com..."
    code=$(timeout 8 curl -s -o /dev/null -w "%{http_code}" \
        "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "    ✅ gemini reachable (200)"
        return 0
    else
        echo "    ❌ gemini unreachable (HTTP $code)"
        return 1
    fi
}

probe_minimax() {
    [ -n "${MINIMAX_API_KEY:-}" ] || { echo "    (MINIMAX_API_KEY not set, skip)"; return 1; }
    echo "    probing $MINIMAX_BASE_URL/models..."
    code=$(timeout 8 curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $MINIMAX_API_KEY" \
        "$MINIMAX_BASE_URL/models" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "    ✅ minimax reachable (200) — model=$MINIMAX_MODEL"
        return 0
    else
        echo "    ❌ minimax auth failed (HTTP $code)"
        return 1
    fi
}

probe_ollama() {
    [ -n "${OLLAMA_BASE_URL:-}" ] || { echo "    (OLLAMA_BASE_URL not set, skip)"; return 1; }
    echo "    probing ollama tags..."
    native_url="${OLLAMA_BASE_URL%/v1}/api/tags"
    code=$(timeout 8 curl -s -o /dev/null -w "%{http_code}" \
        "$native_url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "    ✅ ollama reachable, model=$OLLAMA_MODEL"
        return 0
    else
        echo "    ❌ ollama unreachable (HTTP $code)"
        return 1
    fi
}

list_minimax_models() {
    [ -n "${MINIMAX_API_KEY:-}" ] || { echo "❌ MINIMAX_API_KEY not set" >&2; exit 1; }
    echo "Fetching model list from $MINIMAX_BASE_URL/models..."
    curl -s -H "Authorization: Bearer $MINIMAX_API_KEY" \
        "$MINIMAX_BASE_URL/models" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in sorted(data.get('data', []), key=lambda x: -x.get('created', 0)):
    print(f'  {m[\"id\"]:30s} created={m.get(\"created\", \"?\")}')
"
}

# ---------- Runners ----------
# --auto mode: local-only, zero tokens, no LLM thinking.
# Used by post-commit hooks and watch daemons. Mirrors the pattern from
# ~/proy/mastermind/.claude/hooks/refresh-graphify.sh.
run_auto() {
    echo ">> Running graphify in --auto mode (ollama + --no-cluster, 0 tokens consumed)"
    OLLAMA_BASE_URL="$OLLAMA_BASE_URL" \
    OLLAMA_MODEL="$OLLAMA_MODEL" \
    GRAPHIFY_QUERY_LOG_DISABLE=1 \
    GRAPHIFY_NO_BACKUP=1 \
    GRAPHIFY_MAX_WORKERS=1 \
    graphify update . --no-cluster
}

run_gemini() {
    echo ">> Running graphify with backend=gemini (gemini-3-flash-preview, --full mode)"
    graphify extract . --backend gemini --model "gemini-3-flash-preview" \
        --max-concurrency "$MAX_CONCURRENCY" --out .
}

run_minimax() {
    echo ">> Running graphify with backend=minimax (custom provider with thinking.disabled, model=$MINIMAX_MODEL, max-concurrency=$MAX_CONCURRENCY)"
    # Custom provider "minimax" is defined in ~/.graphify/providers.json with
    # base_url=https://api.minimax.io/v1 and extra_body={thinking:{type:disabled}}.
    # That extra_body is what saves ~20-30% tokens per call.
    graphify extract . --backend minimax --model "$MINIMAX_MODEL" \
        --max-concurrency "$MAX_CONCURRENCY" --out .
}

run_ollama() {
    echo ">> Running graphify with backend=ollama ($OLLAMA_MODEL)"
    OLLAMA_BASE_URL="$OLLAMA_BASE_URL" \
    graphify extract . --backend ollama \
        --max-concurrency 1 --out .
}

# ---------- List models mode ----------
if [ $LIST_MODELS -eq 1 ]; then
    list_minimax_models
    exit 0
fi

# ---------- Self-check mode ----------
if [ $SELF_CHECK -eq 1 ]; then
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  graphify-extract-smart.sh: backend probe           ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    echo "Config:"
    echo "  SECRETS_FILE:     $SECRETS_FILE"
    echo "  MINIMAX_BASE_URL: $MINIMAX_BASE_URL"
    echo "  MINIMAX_MODEL:    $MINIMAX_MODEL"
    echo "  OLLAMA_BASE_URL:  $OLLAMA_BASE_URL"
    echo "  OLLAMA_MODEL:     $OLLAMA_MODEL"
    echo "  MAX_CONCURRENCY:  $MAX_CONCURRENCY"
    echo ""
    echo "Available env vars:"
    echo "  GEMINI_API_KEY:   ${GEMINI_API_KEY:+SET (${#GEMINI_API_KEY} chars)}"
    echo "  MINIMAX_API_KEY:  ${MINIMAX_API_KEY:+SET (${#MINIMAX_API_KEY} chars)}"
    echo ""
    echo "Backend probes:"
    probe_gemini && gemini_ok=1 || gemini_ok=0
    probe_minimax && minimax_ok=1 || minimax_ok=0
    probe_ollama && ollama_ok=1 || ollama_ok=0
    echo ""
    echo "Result:"
    echo "  gemini:  $([ $gemini_ok -eq 1 ] && echo "✅ READY" || echo "❌ NOT READY")"
    echo "  minimax: $([ $minimax_ok -eq 1 ] && echo "✅ READY" || echo "❌ NOT READY")"
    echo "  ollama:  $([ $ollama_ok -eq 1 ] && echo "✅ READY" || echo "❌ NOT READY")"
    echo ""
    echo "Modes:"
    echo "  --auto  : ollama + --no-cluster, 0 tokens (use for post-commit)"
    echo "  --full  : Gemini→MiniMax (thinking.disabled)→Ollama (default; consumes tokens)"
    echo ""
    echo "Critical config:"
    echo "  Custom provider file: ~/.graphify/providers.json"
    if [ -f ~/.graphify/providers.json ]; then
        echo "    ✅ EXISTS"
        grep -q '"minimax"' ~/.graphify/providers.json && echo "    ✅ minimax provider defined" || echo "    ❌ minimax NOT defined"
        grep -q '"disabled"' ~/.graphify/providers.json && echo "    ✅ thinking.disabled configured" || echo "    ⚠️  thinking.disabled not set (will waste reasoning tokens)"
    else
        echo "    ❌ MISSING — run: ~/.graphify/providers.json must exist with minimax provider"
    fi
    exit 0
fi

# ---------- Auto mode (cheap, local-only) ----------
if [ "$MODE" = "auto" ]; then
    echo "═══════════════════════════════════════════════════════"
    echo "  graphify --auto (ollama + --no-cluster, 0 tokens)"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    if probe_ollama && run_auto; then
        exit 0
    fi
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  ❌ --auto failed (ollama unreachable)"
    echo "═══════════════════════════════════════════════════════"
    exit 1
fi

# ---------- Forced backend mode ----------
if [ -n "$FORCED_BACKEND" ]; then
    case "$FORCED_BACKEND" in
        gemini)  probe_gemini  && run_gemini  || exit 1 ;;
        minimax) probe_minimax && run_minimax || exit 1 ;;
        ollama)  probe_ollama  && run_ollama  || exit 1 ;;
        *) echo "Unknown backend: $FORCED_BACKEND (use gemini|minimax|ollama)" >&2; exit 3 ;;
    esac
    exit 0
fi

# ---------- Full mode: fallback chain ----------
echo "═══════════════════════════════════════════════════════"
echo "  graphify --full (Gemini→MiniMax→Ollama fallback)"
echo "═══════════════════════════════════════════════════════"
echo ""

if probe_gemini && run_gemini; then
    exit 0
fi
echo ""
echo "Gemini failed or unavailable — falling back to MiniMax ($MINIMAX_MODEL)..."
echo ""

if probe_minimax && run_minimax; then
    exit 0
fi
echo ""
echo "MiniMax failed or unavailable — falling back to Ollama ($OLLAMA_MODEL)..."
echo ""

if probe_ollama && run_ollama; then
    exit 0
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ❌ All backends failed"
echo "  Run: .bin/graphify-extract-smart.sh --check"
echo "  to see which backends are misconfigured."
echo "═══════════════════════════════════════════════════════"
exit 1
