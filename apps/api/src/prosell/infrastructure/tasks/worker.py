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
    from prosell.infrastructure.tasks.use_cases.auto_republish_task import (
        auto_republish_task,  # noqa: F401
    )
    from prosell.infrastructure.tasks.use_cases.poll_facebook_leads_task import (
        poll_facebook_leads_task,  # noqa: F401
    )
    from prosell.infrastructure.tasks.use_cases.publish_vehicle_task import (
        publish_vehicle_task,  # noqa: F401
    )
    from prosell.infrastructure.tasks.use_cases.refresh_facebook_tokens import (
        refresh_facebook_tokens_task,  # noqa: F401
    )

    logger.info("Starting Taskiq worker...")
    logger.info("Broker: %s", settings.task_queue_broker_url or settings.redis_url)

    await receiver.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error("Worker error: %s", e)
        raise


__all__ = ["main"]
