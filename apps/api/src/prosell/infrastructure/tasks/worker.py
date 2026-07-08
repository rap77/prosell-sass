"""Taskiq worker entry point.

Starts the taskiq worker to process async tasks from Redis broker.
Mounts the TaskiqScheduler alongside the Receiver so cron-scheduled
tasks (e.g. prune_sold_galleries_task) run in the same process.
"""

import asyncio
import logging

from taskiq.receiver import Receiver
from taskiq.schedule_sources import LabelScheduleSource
from taskiq.scheduler.scheduler import TaskiqScheduler

from prosell.core.config import settings
from prosell.infrastructure.tasks.broker import broker

logger = logging.getLogger(__name__)


async def main() -> None:
    """Start taskiq worker (receiver + scheduler)."""
    # Import tasks to register them with the broker. MUST happen before
    # scheduler.startup() so LabelScheduleSource sees the @broker.task(
    # schedule=...) labels at scan time. The _ = ... assignment is a no-op
    # at runtime; it silences pyright's "not accessed" warning.
    from prosell.infrastructure.tasks.use_cases.prune_sold_galleries_task import (
        prune_sold_galleries_task,
    )

    _ = prune_sold_galleries_task

    scheduler = TaskiqScheduler(
        broker=broker,
        sources=[LabelScheduleSource(broker)],
    )
    receiver = Receiver(broker=broker)
    # Event that signals shutdown — never set, so worker runs forever until killed
    finish_event = asyncio.Event()

    logger.info("Starting Taskiq worker (receiver + scheduler)...")
    logger.info("Broker: %s", settings.task_queue_broker_url or settings.redis_url)
    logger.info(
        "Scheduled tasks: prune_sold_galleries cron=%r tz=%r",
        settings.prune_sold_galleries_cron,
        settings.prune_sold_galleries_tz,
    )

    await scheduler.startup()
    try:
        await receiver.listen(finish_event)
    finally:
        await scheduler.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error("Worker error: %s", e)
        raise


__all__ = ["main"]
