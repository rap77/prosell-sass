#!/usr/bin/env python
"""Worker startup script.

Run with: uv run worker

This script starts the Taskiq worker process.
"""

import asyncio

from prosell.infrastructure.tasks.worker import main

if __name__ == "__main__":
    asyncio.run(main())
