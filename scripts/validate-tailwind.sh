#!/usr/bin/env bash
# validate-tailwind.sh - Block commits with var() in className (Tailwind 4 rule)
#
# Searches for var(--ps-*) in className attributes in .tsx files.
# Works in both pre-commit (staged files) and CI (all files) modes.
# Exits with code 1 if violations found (blocks commit/build).

set -euo pipefail

# Detect if running in pre-commit (staged files) or CI (all files)
if git rev-parse --verify HEAD >/dev/null 2>&1 && git diff --cached --quiet 2>/dev/null; then
  # CI mode - search all files
  FILES=$(find apps/web/src -name '*.tsx' -o -name '*.jsx' 2>/dev/null || true)
else
  # Pre-commit mode - search staged files only
  FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(tsx|jsx)$' || true)
fi

if [ -z "$FILES" ]; then
  # No .tsx files to check
  exit 0
fi

# Search for var() in className
VIOLATIONS=$(echo "$FILES" | xargs rg 'className=["'"'"'][^"'"'"']*var\(--ps-' --no-heading --line-number 2>/dev/null || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Tailwind 4 violation: var(--ps-*) found in className attribute"
  echo ""
  echo "Files with violations:"
  echo "$VIOLATIONS"
  echo ""
  echo "Fix: Replace var() with semantic classes:"
  echo "  ❌ className=\"text-[var(--ps-error)]\""
  echo "  ✅ className=\"text-ps-error\""
  echo ""
  echo "var() is ONLY allowed in style attribute for dynamic values."
  exit 1
fi

echo "✓ No var() violations in className"
exit 0
