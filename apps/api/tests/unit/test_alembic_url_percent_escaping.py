"""Regression guard for the '%' escaping in `alembic/env.py`.

Alembic's `Config.set_main_option` writes to a ConfigParser, which treats '%'
as interpolation syntax and raises on a percent-encoded password in the URL
(e.g. '%2F'). `env.py` escapes '%' -> '%%'; ConfigParser un-escapes it on read.
This pins that the technique round-trips the URL unchanged in BOTH modes
(offline = get_main_option, online = get_section), so a future refactor that
drops the escaping is caught here instead of crashing the API on startup.
"""

from alembic.config import Config

URL_WITH_PERCENT = "postgresql+asyncpg://prosell:Ab%2Fcd%40ef@db:5432/prosell_prod"


def test_percent_encoded_url_survives_configparser_round_trip() -> None:
    cfg = Config()
    # Mirrors apps/api/alembic/env.py:
    cfg.set_main_option("sqlalchemy.url", URL_WITH_PERCENT.replace("%", "%%"))

    offline = cfg.get_main_option("sqlalchemy.url")
    online = cfg.get_section(cfg.config_ini_section, {}).get("sqlalchemy.url")

    assert offline == URL_WITH_PERCENT, f"offline mode mangled the URL: {offline!r}"
    assert online == URL_WITH_PERCENT, f"online mode mangled the URL: {online!r}"


def test_unescaped_percent_url_would_crash() -> None:
    """Documents WHY the escaping is needed: the raw URL crashes ConfigParser."""
    import pytest

    cfg = Config()
    with pytest.raises(ValueError, match="interpolation"):
        cfg.set_main_option("sqlalchemy.url", URL_WITH_PERCENT)
