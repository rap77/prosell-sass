"""Root logger configuration, driven by `Settings.log_level`/`log_format`.

Without this, Python's root logger defaults to WARNING and nothing in the
app ever configures it, so every `logging.getLogger(__name__).info(...)`
call across the codebase is silently dropped — including audit-trail logs
(purge outcomes, batch cover-URL signing, etc.). Uvicorn's own
`uvicorn`/`uvicorn.error`/`uvicorn.access` loggers are unaffected either
way: uvicorn attaches its own handlers directly to those loggers, which is
why access-log lines already reach `docker logs` regardless of this
module.
"""

import json
import logging
from datetime import UTC, datetime

from prosell.core.config import Settings

_TEXT_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"


class _JsonFormatter(logging.Formatter):
    """Minimal structured formatter — one JSON object per line.

    No third-party dependency: the fields below are the ones an ops
    log aggregator needs (timestamp, level, logger name, message,
    exception info when present).
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(settings: Settings, *, logger: logging.Logger | None = None) -> None:
    """Configure `logger` (default: the root logger) from
    `settings.log_level`/`log_format`.

    Called once at module import time in `main.py`, before uvicorn
    configures its own loggers, against the default (root) logger.

    The `logger` parameter exists so unit tests can point this at a
    throwaway named logger instead of mutating the real root logger —
    replacing the real root logger's handlers mid pytest-session would
    fight pytest's own logging plugin, which manages a root-logger
    handler for its live-log / caplog capturing across the whole run.
    """
    target = logger if logger is not None else logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(
        _JsonFormatter() if settings.log_format == "json" else logging.Formatter(_TEXT_FORMAT)
    )
    target.handlers = [handler]
    target.setLevel(settings.log_level)
