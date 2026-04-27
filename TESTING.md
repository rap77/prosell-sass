# Testing Guide

## Quick Start

```bash
# Setup test database (one-time)
make test-setup

# Run all tests
make test

# Cleanup
make test-clean
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make test-help` | Show all available commands |
| `make test-setup` | Start postgres-test and run migrations |
| `make test` | Run all tests (unit + integration) |
| `make test-unit` | Run only unit tests (fast) |
| `make test-integration` | Run only integration tests |
| `make test-clean` | Stop and remove test database |
| `make test-coverage` | Run tests with coverage report |

## Test Results

### Unit Tests
- **Count**: 476 tests
- **Duration**: ~2.3 seconds
- **Scope**: Domain logic, use cases, services (no external dependencies)
- **Command**: `make test-unit`

### Integration Tests
- **Count**: 133 tests (62 passing, 43 failing, 19 skipped, 9 xfailed)
- **Duration**: ~8 seconds
- **Scope**: API endpoints, database operations
- **Command**: `make test-integration`

**Note**: Integration test failures are primarily due to missing authentication setup (401 responses). This is expected behavior without test user fixtures.

### Total Test Suite
- **Unit Tests**: 476 passing
- **Integration Tests**: 62 passing
- **Total**: 538+ passing tests

## Test Database

Integration tests use a separate PostgreSQL instance (`postgres-test`) on port 5433:
- **Database**: `prosell_test`
- **User**: `prosell`
- **Password**: `prosell_test_password`
- **Container**: `prosell-test-db`

This ensures tests never touch staging or production data.

## Architecture

### Test Organization
```
apps/api/tests/
├── unit/           # Fast, isolated tests (no DB/network)
│   ├── domain/     # Entity logic tests
│   ├── application/ # Use case tests
│   └── infrastructure/ # Service/utility tests
└── integration/    # API + database tests
    ├── api/        # Endpoint tests
    └── *.py        # Feature integration tests
```

### Fixture Design

**Integration fixtures** (`tests/integration/conftest.py`):
- `db_session` - Function-scoped database session with automatic rollback
- `disable_rate_limiting` - Disables rate limiting during tests

**Key principle**: Test database is setup via `make test-setup`, tests only provide a session wrapper.

## Running Individual Tests

```bash
# Unit tests
cd apps/api && uv run pytest tests/unit/test_specific_file.py -v

# Integration tests
cd apps/api && uv run pytest tests/integration/api/test_category_api.py -v

# Specific test
cd apps/api && uv run pytest tests/integration/api/test_category_api.py::test_create_category_returns_attribute_schema -v
```

## CI/CD Usage

```yaml
- name: Setup test database
  run: make test-setup

- name: Run tests
  run: make test

- name: Cleanup
  if: always()
  run: make test-clean
```

## Troubleshooting

### "relation does not exist" error
- Solution: Run `make test-setup` to create database schema

### "connection refused" on port 5433
- Solution: Ensure postgres-test container is running: `cd docker && docker compose up -d postgres-test`

### Tests pass locally but fail in CI
- Check that `TEST_DATABASE_URL` is set correctly in CI environment
- Verify postgres-test is properly initialized before running tests

### ScopeMismatch error with pytest-asyncio
- **Fixed**: Removed `asyncio_default_fixture_loop_scope` from pytest.ini
- All fixtures are now function-scoped (no session-scoped fixtures)

## Best Practices

1. **Unit tests first**: Write unit tests before integration tests
2. **Fast feedback**: Run `make test-unit` frequently during development
3. **Isolation**: Each test should be independent (use db_session rollback)
4. **Descriptive names**: Test names should describe what they test
5. **One assertion per test**: Keep tests focused and readable

## Next Steps

To improve the test suite:
1. Add test user fixtures to integration tests (fix 401 errors)
2. Increase integration test coverage
3. Add E2E tests with Playwright (see `tests/e2e/`)
4. Set up CI pipeline with test reporting
