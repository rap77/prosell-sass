"""Task queue infrastructure for async background jobs.

This module provides the Taskiq-based task queue system with Redis broker.
Supports async task execution, retry logic, and scheduled tasks.
"""

from prosell.infrastructure.tasks.broker import broker

__all__ = ["broker"]
