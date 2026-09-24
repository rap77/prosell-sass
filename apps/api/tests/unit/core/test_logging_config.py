"""Unit tests for `prosell.core.logging_config.configure_logging`.

Regression for the fast-follow fix to intent `260920-catalog-image-performanc`:
without this configuration, Python's root logger defaults to WARNING and
every `logging.getLogger(__name__).info(...)` call in the app was silently
dropped in production (uvicorn's own access/error loggers are unaffected
either way — they attach their own handlers directly). See
`main.py`/`logging_config.py` for the full context.

Tests target a throwaway named logger via the `logger=` parameter rather
than the real root logger: `configure_logging` replaces its target's
handler list wholesale, and doing that against the real root logger
mid-session would fight pytest's own logging plugin (which manages a
root-logger handler for live-log/caplog capturing across the whole test
run).
"""

import json
import logging

from prosell.core.config import Settings
from prosell.core.logging_config import configure_logging


def _settings(*, log_level: str = "INFO", log_format: str = "text") -> Settings:
    return Settings(log_level=log_level, log_format=log_format)  # type: ignore[arg-type]


def _isolated_logger(name: str) -> logging.Logger:
    """A logger with no propagation to root, so tests don't pollute or
    depend on the real root logger's state."""
    logger = logging.getLogger(name)
    logger.propagate = False
    return logger


class TestConfigureLoggingSetsLevel:
    def test_logger_level_matches_setting(self) -> None:
        target = _isolated_logger("test-configure-logging-level")
        configure_logging(_settings(log_level="DEBUG"), logger=target)
        assert target.level == logging.DEBUG

    def test_info_records_are_not_swallowed(self) -> None:
        """The exact bug this fixes: an INFO call must actually reach a
        handler, not be swallowed by an unconfigured WARNING-level logger."""
        target = _isolated_logger("test-configure-logging-info-level")
        configure_logging(_settings(log_level="INFO"), logger=target)
        assert target.getEffectiveLevel() <= logging.INFO


class TestConfigureLoggingTextFormat:
    def test_text_format_writes_plain_line(self, capsys) -> None:
        target = _isolated_logger("test-configure-logging-text")
        configure_logging(_settings(log_format="text"), logger=target)
        target.info("hello world")
        captured = capsys.readouterr()
        assert "hello world" in captured.err
        assert not captured.err.strip().startswith("{")


class TestConfigureLoggingJsonFormat:
    def test_json_format_writes_parseable_json_line(self, capsys) -> None:
        target = _isolated_logger("test-configure-logging-json")
        configure_logging(_settings(log_format="json"), logger=target)
        target.info("hello json")
        captured = capsys.readouterr()
        line = captured.err.strip().splitlines()[-1]
        payload = json.loads(line)
        assert payload["message"] == "hello json"
        assert payload["level"] == "INFO"
        assert payload["logger"] == "test-configure-logging-json"
        assert "timestamp" in payload

    def test_json_format_includes_exception_info(self, capsys) -> None:
        target = _isolated_logger("test-configure-logging-json-exc")
        configure_logging(_settings(log_format="json"), logger=target)
        try:
            raise ValueError("boom")
        except ValueError:
            target.exception("something failed")
        captured = capsys.readouterr()
        line = captured.err.strip().splitlines()[-1]
        payload = json.loads(line)
        assert "boom" in payload["exception"]
