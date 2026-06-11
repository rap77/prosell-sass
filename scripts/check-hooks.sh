#!/usr/bin/env bash
# Detect whether git hooks have been silently disabled in this repo.
#
# Why this exists: the claude-plugins-official `security-guidance` plugin (and
# anything running `git -c core.hooksPath=/dev/null ...`) can leave
# core.hooksPath pointed away from .git/hooks, which disables ALL hooks —
# including the pre-commit pipeline (ruff, pyright, gga). A disabled hook is
# invisible: commits just stop being checked.
#
# Run this anytime you suspect the hooks aren't firing, or wire it into your
# shell (e.g. an alias, or a direnv hook on entering the repo).
#
# Exit code 0 = hooks active. Exit code 1 = hooks disabled (with fix hint).

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

hooks_path="$(git config --get core.hooksPath || true)"

if [ -n "$hooks_path" ]; then
  echo "⚠️  git hooks are DISABLED: core.hooksPath = '$hooks_path'"
  echo "    (commits are NOT running ruff / pyright / gga / formatting checks)"
  echo ""
  echo "    Re-enable with:"
  echo "        git config --local --unset core.hooksPath"
  exit 1
fi

if [ ! -x .git/hooks/pre-commit ]; then
  echo "⚠️  no executable .git/hooks/pre-commit found."
  echo "    Install the pipeline with:  pre-commit install"
  exit 1
fi

echo "✓ git hooks active (core.hooksPath unset, .git/hooks/pre-commit present)"
