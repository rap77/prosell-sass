#!/bin/bash
# Mypy Migration Script
# This script runs mypy type checking on the ProSell SaaS API codebase

set -e  # Exit on error

echo "🔍 Running Mypy Type Checking..."
echo ""

# Change to API directory
cd "$(dirname "$0")/../apps/api" || exit 1

# Run mypy on both source and tests
echo "📊 Checking production code (src/)..."
uv run mypy src/ --show-error-codes || echo "⚠️  Production code has type errors"

echo ""
echo "📊 Checking test code (tests/)..."
uv run mypy tests/ --show-error-codes || echo "⚠️  Test code has type errors"

echo ""
echo "✅ Mypy type checking complete!"
echo ""
echo "📝 To view detailed error reports:"
echo "   uv run mypy src/ --show-error-codes | tee mypy-src-errors.txt"
echo "   uv run mypy tests/ --show-error-codes | tee mypy-tests-errors.txt"
