#!/usr/bin/env python3
"""Infer MasterMind brain routing for a task block in Codex compatibility mode."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass

BRAIN_CATALOG: dict[int, dict[str, str]] = {
    1: {
        "slug": "product",
        "name": "Product Strategy",
        "domain": "vision, discovery, prioritization",
        "experts": "Cagan, Torres, Ries, Doerr",
    },
    2: {
        "slug": "ux",
        "name": "UX Research",
        "domain": "user flows, interactions, usability",
        "experts": "Norman, Nielsen, Hall",
    },
    3: {
        "slug": "ui",
        "name": "UI Design",
        "domain": "visual design, components, accessibility",
        "experts": "Cooper, Wroblewski, Saffer",
    },
    4: {
        "slug": "frontend",
        "name": "Frontend",
        "domain": "architecture, performance, state",
        "experts": "Abramov, Markbåge",
    },
    5: {
        "slug": "backend",
        "name": "Backend",
        "domain": "APIs, data modeling, infrastructure",
        "experts": "Fowler, Evans",
    },
    6: {
        "slug": "qa",
        "name": "QA/DevOps",
        "domain": "testing strategy, CI/CD, reliability",
        "experts": "Humble, Majors",
    },
    7: {
        "slug": "growth",
        "name": "Growth/Data",
        "domain": "validation, systems thinking, metrics",
        "experts": "Balfour, Kohavi, Munger",
    },
}

KEYWORDS: dict[str, tuple[str, ...]] = {
    "product": (
        "product",
        "roadmap",
        "publish",
        "marketplace",
        "lead capture",
        "pricing",
        "onboarding",
        "discovery",
        "priorit",
        "seller workflow",
    ),
    "ux": (
        "ux",
        "journey",
        "flow",
        "usability",
        "empty state",
        "error state",
        "calendar",
        "appointment",
        "scheduler",
        "stepper",
        "navigation",
        "form",
    ),
    "ui": (
        "ui",
        "visual",
        "design",
        "layout",
        "responsive",
        "tailwind",
        "component library",
        "accessibility",
        "modal",
        "dialog",
        "table",
    ),
    "frontend": (
        "frontend",
        "next",
        "react",
        "typescript",
        "client",
        "server component",
        "query",
        "zustand",
        "page.tsx",
        "tsx",
        "form",
        "catalog",
    ),
    "backend": (
        "backend",
        "api",
        "fastapi",
        "sqlalchemy",
        "pydantic",
        "tenant",
        "auth",
        "jwt",
        "repository",
        "use case",
        "domain",
        "application",
        "infrastructure",
        "migration",
        "webhook",
        "lead",
        "appointment",
        "database",
        "async",
    ),
    "qa": (
        "test",
        "tests",
        "pytest",
        "playwright",
        "vitest",
        "assert",
        "smoke",
        "e2e",
        "fixture",
        "verify",
        "validation",
        "lint",
        "pyright",
        "ruff",
        "ci",
        "coverage",
    ),
    "growth": (
        "growth",
        "metric",
        "analytics",
        "tracking",
        "conversion",
        "funnel",
        "retention",
        "activation",
        "experiment",
        "ab test",
    ),
}

BRAIN_TO_CATEGORY = {
    1: "product",
    2: "ux",
    3: "ui",
    4: "frontend",
    5: "backend",
    6: "qa",
    7: "growth",
}


@dataclass
class BrainSelection:
    id: int
    slug: str
    name: str
    reason: str


@dataclass
class ExecutionPlan:
    task_mode: str
    internal_execution: str
    checkpoint_policy: str
    time_tracking: str
    notification_policy: str
    safe_commit_policy: str


@dataclass
class BrainRoutingResult:
    task_id: str
    task_title: str
    route_kind: str
    domain_scores: dict[str, int]
    primary_brains: list[BrainSelection]
    support_brains: list[BrainSelection]
    final_evaluator: BrainSelection
    optional_cascades: list[BrainSelection]
    worker_strategy: str
    execution_plan: ExecutionPlan


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _score_domains(task_text: str) -> Counter[str]:
    text = _normalize(task_text)
    scores: Counter[str] = Counter()
    for category, keywords in KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                scores[category] += 1
    return scores


def _reason(category: str, text: str) -> str:
    lowered = _normalize(text)
    hits = [kw for kw in KEYWORDS[category] if kw in lowered][:3]
    if hits:
        return f"Matched task signals: {', '.join(hits)}"
    return f"Selected as {category} support for this task"


def _brain(brain_id: int, reason: str) -> BrainSelection:
    meta = BRAIN_CATALOG[brain_id]
    return BrainSelection(id=brain_id, slug=meta["slug"], name=meta["name"], reason=reason)


def infer_route(task_id: str, task_title: str, task_text: str) -> BrainRoutingResult:
    scores = _score_domains(task_text)

    frontend = scores["frontend"]
    backend = scores["backend"]
    ux = scores["ux"]
    ui = scores["ui"]
    qa = scores["qa"]
    product = scores["product"]
    growth = scores["growth"]

    route_kind = "backend_heavy"
    primary_ids: list[int]
    support_ids: list[int] = []

    if frontend >= 2 and backend >= 2:
        route_kind = "full_stack_feature"
        primary_ids = [4, 5]
        if ux:
            support_ids.append(2)
        if ui:
            support_ids.append(3)
        support_ids.append(6)
        if product:
            support_ids.insert(0, 1)
    elif frontend >= 2:
        route_kind = "frontend_heavy"
        primary_ids = [4]
        if ux:
            support_ids.append(2)
        if ui:
            support_ids.append(3)
        support_ids.append(6)
        if product:
            support_ids.insert(0, 1)
    elif backend >= 2:
        route_kind = "backend_heavy"
        primary_ids = [5]
        support_ids = [6]
        if product:
            support_ids.insert(0, 1)
    elif qa >= 2 and frontend == 0 and backend == 0:
        route_kind = "qa_verification"
        primary_ids = [6]
        if growth:
            support_ids.append(7)
    elif product >= 2 and frontend == 0 and backend == 0:
        route_kind = "product_discovery"
        primary_ids = [1]
        if ux:
            support_ids.append(2)
    else:
        # default mixed/ambiguous software task
        route_kind = "mixed_execution"
        primary_ids = [5 if backend >= frontend else 4]
        support_ids = [6]
        if frontend and backend and 4 not in primary_ids:
            support_ids.insert(0, 4)
        if backend and frontend and 5 not in primary_ids:
            support_ids.insert(0, 5)
        if ux:
            support_ids.append(2)

    final_evaluator = _brain(7, "Always runs after domain execution to validate the block outcome")

    optional_cascade_ids: list[int] = []
    for brain_id, category in BRAIN_TO_CATEGORY.items():
        if brain_id in primary_ids or brain_id in support_ids or brain_id == 7:
            continue
        if scores[category] > 0:
            optional_cascade_ids.append(brain_id)

    primary_brains = [
        _brain(brain_id, _reason(BRAIN_TO_CATEGORY[brain_id], task_text))
        for brain_id in primary_ids
    ]
    support_brains = [
        _brain(brain_id, _reason(BRAIN_TO_CATEGORY[brain_id], task_text))
        for brain_id in support_ids
    ]
    optional_cascades = [
        _brain(brain_id, _reason(BRAIN_TO_CATEGORY[brain_id], task_text))
        for brain_id in optional_cascade_ids
    ]

    if route_kind == "full_stack_feature":
        worker_strategy = (
            "Launch one task-executor worker for the parent block; inside it, consult frontend and backend"
            " expert perspectives before implementing each subtask, then run QA review before final evaluator."
        )
    elif route_kind == "frontend_heavy":
        worker_strategy = (
            "Launch one task-executor worker for the block; keep implementation ownership in the frontend"
            " brain lane, consult UX/UI before risky interaction changes, then QA and final evaluator."
        )
    elif route_kind == "backend_heavy":
        worker_strategy = (
            "Launch one task-executor worker for the block; backend brain drives implementation, QA guards tests/"
            "reliability, final evaluator judges completeness."
        )
    elif route_kind == "qa_verification":
        worker_strategy = (
            "Launch one QA-focused worker for the block; prioritize test hardening, failure triage, verification gates,"
            " then final evaluator."
        )
    else:
        worker_strategy = (
            "Launch one task-executor worker for the block; primary brain owns implementation and support brains"
            " are consulted only when their domain is touched."
        )

    execution_plan = ExecutionPlan(
        task_mode="User-facing execution is per parent block/task (e.g. M3)",
        internal_execution="Worker executes subtasks sequentially with full lifecycle per subtask",
        checkpoint_policy=(
            "Every subtask must move pending → in_progress → completed, update task-progress.json and tasks/todo.md,"
            " then continue to the next pending subtask"
        ),
        time_tracking=(
            "Recalculate actual time and ETA after each subtask checkpoint using checkpoint-time-tracker.py /"
            " update-todo-times.py"
        ),
        notification_policy=(
            "Emit the completion sound when the parent block finishes; optional intermediate sound only for hard-stop"
            " failures requiring user attention"
        ),
        safe_commit_policy=(
            "Run review → verify-criteria → final Codex review → fix confirmed findings → revalidate →"
            " safe-commit once the block is complete; before revalidation, sync the source-of-truth artifacts"
            " (`tasks/todo.md`, `tasks/plan.md`, and equivalent canonical docs if affected`). If GGA or checks"
            " fail, fix and retry until clean, never use git commit --no-verify"
        ),
    )

    return BrainRoutingResult(
        task_id=task_id,
        task_title=task_title,
        route_kind=route_kind,
        domain_scores={key: int(scores.get(key, 0)) for key in KEYWORDS},
        primary_brains=primary_brains,
        support_brains=support_brains,
        final_evaluator=final_evaluator,
        optional_cascades=optional_cascades,
        worker_strategy=worker_strategy,
        execution_plan=execution_plan,
    )


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: brain_router.py <task_id> <task_title> <task_text>", file=sys.stderr)
        return 1

    task_id, task_title, task_text = sys.argv[1:4]
    result = infer_route(task_id, task_title, task_text)
    print(json.dumps(asdict(result), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
