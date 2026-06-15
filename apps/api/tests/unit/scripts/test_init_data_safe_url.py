"""Security regression guard for `apps/api/scripts/init_data.py`.

The MVP init script must NEVER log the DB password in plaintext (it runs on
container startup and the output lands in `docker logs`). We pin that the
`_safe_db_url` helper masks the password while keeping the rest of the
connection string useful for debugging.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "init_data.py"


@pytest.fixture(scope="module")
def init_data_module():
    """Load the script as a module so we can import its helpers.

    Mirrors the script's top-level `sys.path.insert` so the app imports resolve.
    """
    sys.path.insert(0, str(SCRIPT_PATH.parent.parent / "src"))
    spec = importlib.util.spec_from_file_location("init_data", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestSafeDbUrl:
    """`_safe_db_url` must hide the password but keep user/host/db visible."""

    def test_masks_plain_password(self, init_data_module) -> None:
        url = "postgresql+asyncpg://prosell:s3cr3tP4ss@db:5432/prosell_prod"
        safe = init_data_module._safe_db_url(url)
        assert "s3cr3tP4ss" not in safe, f"password leaked: {safe!r}"
        assert "prosell" in safe  # user kept
        assert "db:5432" in safe  # host:port kept
        assert "prosell_prod" in safe  # dbname kept

    def test_masks_percent_encoded_password(self, init_data_module) -> None:
        url = "postgresql+asyncpg://prosell:Ab%2Fcd%40ef@db:5432/prosell_prod"
        safe = init_data_module._safe_db_url(url)
        assert "Ab%2Fcd%40ef" not in safe, f"encoded password leaked: {safe!r}"
        assert "%2F" not in safe
        assert "prosell_prod" in safe
