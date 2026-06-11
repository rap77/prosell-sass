"""Taskiq worker entry point.

Starts the taskiq worker to process async tasks from Redis broker.
"""

import asyncio
import logging

from taskiq.receiver import Receiver

from prosell.core.config import settings
from prosell.infrastructure.tasks.broker import broker

logger = logging.getLogger(__name__)


async def main() -> None:
    """Start taskiq worker."""
    receiver = Receiver(broker=broker)

    # Import tasks to register them with the broker
    from prosell.infrastructure.tasks.use_cases.prune_sold_galleries_task import (  # noqa: F401
        prune_sold_galleries_task,
    )

    logger.info("Starting Taskiq worker...")
    logger.info("Broker: %s", settings.task_queue_broker_url or settings.redis_url)

    await receiver.start()  # type: ignore[attr-defined]


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error("Worker error: %s", e)
        raise


__all__ = ["main"]
