.PHONY: test test-setup test-clean test-help test-unit test-integration test-coverage

test-help:
	@echo "ProSell Test Commands:"
	@echo "  make test-setup       Setup test database (postgres-test)"
	@echo "  make test             Run all tests (unit + integration)"
	@echo "  make test-clean       Remove test database"
	@echo "  make test-unit        Run only unit tests"
	@echo "  make test-integration Run only integration tests"
	@echo "  make test-coverage    Run tests with coverage report"

test-setup:
	@echo "🔧 Setting up test database..."
	./scripts/setup-test-db.sh

test-clean:
	@echo "🧹 Cleaning test database..."
	cd docker && docker compose down -v postgres-test 2>/dev/null || true
	@echo "✅ Cleanup complete"

test: test-setup
	@echo "🧪 Running all tests..."
	cd apps/api && uv run pytest -v --tb=short
	@echo "✅ Tests complete"

test-unit:
	@echo "🧪 Running unit tests..."
	cd apps/api && uv run pytest tests/unit -v --tb=short

test-integration: test-setup
	@echo "🧪 Running integration tests..."
	cd apps/api && uv run pytest tests/integration -v --tb=short

test-coverage: test-setup
	@echo "📊 Running tests with coverage..."
	cd apps/api && uv run pytest --cov=prosell --cov-report=html --cov-report=term
