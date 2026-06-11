"""Unit tests for prune_sold_galleries_task scheduling wiring.

Verifies that the task carries a `schedule` label with the cron configured
via settings, and that LabelScheduleSource picks it up at startup.
Pure unit tests — no real Redis, no time-based assertions.
"""

import pytest
from taskiq.schedule_sources import LabelScheduleSource

from prosell.infrastructure.tasks.broker import broker
from prosell.infrastructure.tasks.use_cases.prune_sold_galleries_task import (
    prune_sold_galleries_task,
)


class TestPruneTaskScheduleLabel:
    """The task is registered with the broker and carries a schedule label."""

    def test_task_is_registered_with_broker(self) -> None:
        all_tasks = broker.get_all_tasks()
        assert prune_sold_galleries_task.task_name in all_tasks

    def test_task_has_schedule_label_with_cron(self) -> None:
        all_tasks = broker.get_all_tasks()
        task = all_tasks[prune_sold_galleries_task.task_name]
        labels = task.labels
        assert "schedule" in labels, f"Expected 'schedule' label, got {labels!r}"
        schedule = labels["schedule"]
        assert isinstance(schedule, list) and schedule, schedule
        entry = schedule[0]
        assert "cron" in entry
        # Default from settings; if you override in test env, assert specifically.
        assert entry["cron"] == "0 3 * * *"


class TestLabelScheduleSourcePicksUpPruneTask:
    """LabelScheduleSource.startup() sees the prune task's schedule."""

    @pytest.mark.asyncio
    async def test_label_source_startup_registers_schedule(self) -> None:
        source = LabelScheduleSource(broker)
        await source.startup()
        # schedules is a dict[schedule_id, ScheduleDescription]
        assert source.schedules, "LabelScheduleSource registered no schedules"
        # At least one schedule belongs to the prune task.
        task_names = {s.task_name for s in source.schedules.values()}
        assert prune_sold_galleries_task.task_name in task_names


__all__ = ["TestLabelScheduleSourcePicksUpPruneTask", "TestPruneTaskScheduleLabel"]
