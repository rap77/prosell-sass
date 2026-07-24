#!/usr/bin/env bash
# validate-tailwind.sh - Block commits with var() in className (Tailwind 4 rule)
#
# Searches for var(--ps-*) in className attributes in staged .tsx files.
# Exits with code 1 if violations found (blocks commit).

set -euo pipefail

# Find staged .tsx files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(tsx|jsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  # No .tsx files staged, skip check
  exit 0
fi

# Search for var() in className in staged files
VIOLATIONS=$(echo "$STAGED_FILES" | xargs rg 'className=["'"'"'][^"'"'"']*var\(--ps-' --no-heading --line-number 2>/dev/null || true)

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
