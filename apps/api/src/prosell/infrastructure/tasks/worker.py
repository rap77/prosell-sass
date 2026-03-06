"""Taskiq worker entry point.

Starts the taskiq worker to process async tasks from Redis broker.
"""

import asyncio

from taskiq.receiver import Receiver

from prosell.core.config import settings
from prosell.infrastructure.tasks.broker import broker


async def main():
    """Start taskiq worker."""
    receiver = Receiver(
        broker=broker,
        max_workers=settings.task_queue_max_workers,
    )

    # Import tasks to register them with broker
    # Tasks are defined in separate modules and imported here
    # Example: from prosell.infrastructure.tasks import tasks

    print(f"Starting Taskiq worker with {settings.task_queue_max_workers} workers...")
    print(f"Broker: {settings.task_queue_broker_url or settings.redis_url}")

    await receiver.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nWorker stopped by user")
    except Exception as e:
        print(f"Worker error: {e}")
        raise


__all__ = ["main"]
