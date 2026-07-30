# Graphify — Multi-project setup

Graphify is a knowledge-graph extractor that ships native support for 6
LLM backends (gemini, kimi, claude, openai, deepseek, ollama) plus a
**custom-provider escape hatch** for everything else.

This repo wires graphify into the full local dev loop (post-commit
hooks, IDE reminders). The same setup works for any other project — see
the recipe below.

## What's installed where

| Component                               | Scope   | Path                                                                    |
| --------------------------------------- | ------- | ----------------------------------------------------------------------- |
| graphify CLI (binary)                   | user    | `~/.local/bin/graphify` (via `uv tool install`)                         |
| graphify MCP server                     | user    | `~/.local/bin/graphify-mcp`                                             |
| Custom provider config (MiniMax)        | user    | `~/.graphify/providers.json`                                            |
| API keys                                | user    | `~/.config/mastermind/secrets.env`                                      |
| Skills (Claude Code / Codex / OpenCode) | user    | `~/.claude/skills/graphify/`, `~/.codex/...`, `~/.config/opencode/...`  |
| Project wrapper                         | project | `.bin/graphify-extract-smart.sh`                                        |
| Project template (`providers.json`)     | project | `.bin/templates/graphify-providers.json`                                |
| Git hooks (post-commit / -checkout)     | project | `.git/hooks/post-{commit,checkout}`                                     |
| IDE hooks (Claude/Codex/OpenCode)       | project | `.claude/settings.json`, `.codex/hooks.json`, `.opencode/opencode.json` |
| `.graphifyignore`                       | project | `<project>/.graphifyignore`                                             |
| `graphify-out/` output                  | project | `<project>/graphify-out/`                                               |

**❌ Do NOT install the wrapper script into `~/.local/bin/` or anywhere
shared between projects.** Each project must keep its own
`.bin/graphify-extract-smart.sh` and be invoked from inside the project
root. Sharing the wrapper globally would let one project's invocation
silently read another project's `graphify-out/` or write to the wrong
secrets file.

The pattern: **only stateless identity/config lives in HOME
(graphify CLI binary, custom provider config, API keys, skill
definitions). Anything stateful or project-specific lives in the
repo.**

## One-time per-machine setup (new dev, new machine)

```bash
# 1. Install graphify CLI
uv tool install graphifyy --force

# 2. Install graphify skills into each AI IDE
graphify install --platform claude
graphify install --platform codex
graphify install --platform opencode

# 3. Wire IDE-specific reminders + sections (CLAUDE.md / AGENTS.md)
graphify claude install
graphify opencode install
graphify codex install

# 4. Install custom providers + API keys
mkdir -p ~/.graphify ~/.config/mastermind
cp .bin/templates/graphify-providers.json ~/.graphify/providers.json
# Edit ~/.graphify/providers.json to confirm MiniMax endpoint
# Copy your secrets.env into ~/.config/mastermind/secrets.env (perm 0600)
```

The wrapper script `.bin/graphify-extract-smart.sh` is per-project and
should NOT be installed globally. Invoke it from inside the project:
`./.bin/graphify-extract-smart.sh --check`.

## One-time per-project setup (new repo, new clone)

```bash
# After `git clone`:
git clone <repo>
cd <repo>

# 1. Project-level filters
# Copy this repo's .graphifyignore as a starting template (it covers
# secrets, vendor, build artifacts, binaries). Adjust per codebase.

# 2. Git hooks
graphify hook install         # post-commit + post-checkout

# 3. IDE hooks
graphify claude install
graphify opencode install
graphify codex install

# 4. Generate the initial graph
graphify update .
```

## Daily usage

```bash
# Probe which backends are ready
graphify-extract-smart --check

# Manual full extract (consumes tokens — uses Gemini→MiniMax→Ollama)
graphify-extract-smart

# Cheap AST-only rebuild after big changes (0 tokens)
graphify-extract-smart --auto

# List MiniMax models available to your API key
graphify-extract-smart --list-models

# Pre-commit builds run automatically (post-commit hook)
git commit -m "..."      # → graphify update runs in background

# In-CLI graph queries (BFS / DFS / path / explain)
graphify query "How does verify_bot_token work?"
graphify path "verify_bot_token" "fb_publication_history"
graphify explain "FBEncryption"
```

## How the wrapper solves the cost problem

Graphify's full pipeline calls an LLM for `cluster()` (community naming).
On a 22k-node graph, that's expensive.

The wrapper ships **two modes**:

- `--auto` (cheap, default for post-commit): ollama + `--no-cluster` +
  `GRAPHIFY_NO_BACKUP=1` + `GRAPHIFY_MAX_WORKERS=1` + `GRAPHIFY_QUERY_LOG_DISABLE=1`.
  **0 tokens consumed**, deterministic, fast.
- `--full` (default): tries Gemini → MiniMax → Ollama fallback chain,
  full LLM clustering, regenerates community names.

For routine work after a commit you almost never need `--full` — the
inline post-commit graph rebuild keeps the AST up-to-date; community
naming is stable across AST-only rebuilds.

## How `~/.graphify/providers.json` saves tokens on MiniMax

MiniMax models have reasoning tokens enabled by default. For
structured-JSON extraction (graphify's task), reasoning is pure
overhead — the model thinks, drains quota, returns the same JSON.

Custom providers in `~/.graphify/providers.json` accept an `extra_body`
field that gets passed to every OpenAI SDK request. Setting:

```json
"extra_body": { "thinking": { "type": "disabled" } }
```

disables reasoning tokens. MiniMax API accepts only the value
`"disabled"` (NOT `"disable"`). Only the `MiniMax-M3` model respects
this flag — the `M2.x` family silently ignores it. Use M3 for
extracts.

Quoted savings (~25% completion tokens, 100% reasoning tokens):

```
completion_tokens=51, reasoning_tokens=21 → completion_tokens=38, reasoning_tokens=0
```

## Why the wrapper is per-project, not global

The wrapper **could** be installed globally — it has no hardcoded
paths to anything project-specific, it takes the project directory as
an argument (or `cd` and run without arg), it loads the API keys and
provider config from `$HOME` regardless of CWD.

But that would let one project's invocation silently read another
project's `graphify-out/` or trigger writes to the wrong secrets
file. Worse: an AI assistant running in project A might inherit
global state that belongs to project B (e.g. a teammate's stale hook
or temporary experimental provider). Keeping the wrapper inside each
repo means:

- `cd` into a project → only its own wrapper sees its own graph
- AI sessions are project-scoped by construction (no global to leak
  into other contexts)
- Each project's behaviour can evolve independently
- A new project's setup is reproducible just by copying
  `.bin/graphify-extract-smart.sh` + `.bin/templates/`

The per-project copy in `.bin/graphify-extract-smart.sh` is the only
copy. Don't install it globally.

## Troubleshooting

| Symptom                                      | Likely cause                                      | Fix                                                                                |
| -------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `graphify-extract-smart: command not found`  | `~/.local/bin` not in PATH for current shell      | Re-source `~/.zshrc`                                                               |
| `Missing critical env vars: MINIMAX_API_KEY` | secrets.env not sourced                           | Run from interactive zsh, or `source ~/.config/mastermind/secrets.env`             |
| Post-commit rebuild always does full cluster | hook not using `--no-cluster`                     | Edit `.git/hooks/post-commit`: append `--no-cluster` to the `graphify update` call |
| `minimax` provider not found in --check      | `~/.graphify/providers.json` missing or malformed | Run `cp .bin/templates/graphify-providers.json ~/.graphify/providers.json`         |
| `bad params: invalid thinking.type`          | typo: `"disable"` instead of `"disabled"`         | Edit providers.json to use `"disabled"`                                            |
| MiniMax-M2.x model ignores thinking.disabled | M2.x family doesn't support the flag              | Use `MiniMax-M3` (set `GRAPHIFY_MINIMAX_MODEL=MiniMax-M3`)                         |
