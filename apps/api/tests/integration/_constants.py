"""Single source of truth for integration-test DB connection settings.

Both the integration test suite (tests/integration/conftest.py) and the
schema bootstrap script (apps/api/scripts/create_test_schema.py) need to
talk to the SAME Postgres instance. If these drift, ``create_all`` runs
against one DB and pytest against another → silent test failures.

Values must stay in lock-step with the ``postgres-test`` service block in
``.github/workflows/ci.yml`` and the local Docker setup at port 5433.
"""

# ponytail: local-only dev credential, matched by verify-no-secrets.sh allowlist.
# If you rotate this, also rotate the CI service env and any local Docker config.
TEST_DB_URL = "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test"
