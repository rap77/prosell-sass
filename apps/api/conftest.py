"""Root pytest configuration - loads test environment variables."""

import os
import sys

# Load test environment variables
TEST_DB_URL = "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test"
os.environ.setdefault("DATABASE_URL", TEST_DB_URL)
os.environ.setdefault("TEST_DATABASE_URL", TEST_DB_URL)
