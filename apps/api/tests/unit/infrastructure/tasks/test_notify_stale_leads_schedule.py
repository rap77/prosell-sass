"""Unit tests for notify_stale_leads_task scheduling wiring.

Mirrors test_prune_sold_galleries_schedule.py — verifies the task carries
a `schedule` label with the cron configured via settings, and that
LabelScheduleSource picks it up at startup. Pure unit tests — no real
Redis, no time-based assertions.
"""

import pytest
from taskiq.schedule_sources import LabelScheduleSource

from prosell.infrastructure.tasks.broker import broker
from prosell.infrastructure.tasks.use_cases.notify_stale_leads_task import (
    notify_stale_leads_task,
)


class TestNotifyStaleLeadsTaskScheduleLabel:
    def test_task_is_registered_with_broker(self) -> None:
        all_tasks = broker.get_all_tasks()
        assert notify_stale_leads_task.task_name in all_tasks

    def test_task_has_schedule_label_with_cron(self) -> None:
        all_tasks = broker.get_all_tasks()
        task = all_tasks[notify_stale_leads_task.task_name]
        labels = task.labels
        assert "schedule" in labels, f"Expected 'schedule' label, got {labels!r}"
        schedule = labels["schedule"]
        assert isinstance(schedule, list) and schedule, schedule
        entry = schedule[0]
        assert "cron" in entry
        assert entry["cron"] == "0 9 * * *"


class TestLabelScheduleSourcePicksUpNotifyStaleLeadsTask:
    @pytest.mark.asyncio
    async def test_label_source_startup_registers_schedule(self) -> None:
        source = LabelScheduleSource(broker)
        await source.startup()
        assert source.schedules, "LabelScheduleSource registered no schedules"
        task_names = {s.task_name for s in source.schedules.values()}
        assert notify_stale_leads_task.task_name in task_names
