#!/usr/bin/env python3
"""
Dependency validator for tasks/todo.md
Detects circular dependencies, missing references, and suggests parallelization opportunities.
"""

import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional


class DependencyValidator:
    def __init__(self, todo_file: Path):
        self.todo_file = todo_file
        self.content = todo_file.read_text()
        self.tasks: Dict[str, Dict] = {}
        self.subtasks: Dict[str, Dict] = {}
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.suggestions: List[str] = []

    def parse(self):
        """Parse the todo.md file and extract tasks with dependencies."""
        lines = self.content.split('\n')
        current_task = None

        for line in lines:
            # Match subtasks FIRST (indented with 2 spaces): - [x] A1.01: Subtask OR - [x] B1.1.01: Subtask
            # Subtasks always have at least 2 dots after the letter (e.g., A1.01 or B1.1.01)
            # And they are indented with 2 spaces
            subtask_match = re.match(
                r'^  - \[(x| )\]\s+([A-Z]\d+\.\d+(?:\.\d+)?):\s*(.+)',
                line
            )
            if subtask_match:
                subtask_id = subtask_match.group(2)
                subtask_desc = subtask_match.group(3)

                # Infer parent task from subtask ID
                # A1.01 -> A1, B1.1.01 -> B1.1
                parent_id_match = re.match(r'([A-Z]\d+(?:\.\d+)?)\.\d+', subtask_id)
                parent_task = parent_id_match.group(1) if parent_id_match else current_task

                # Ensure parent task exists
                if parent_task not in self.tasks:
                    self.tasks[parent_task] = {
                        'name': f'Auto-generated parent for {subtask_id}',
                        'done': False,
                        'line': '',
                        'requires': [],
                        'parallel_with': [],
                        'subtasks': []
                    }

                # Extract tags from the end
                tags_pattern = r'\[(requires:|parallel-with:|requires-all:)(.+?)\]'
                tags = re.findall(tags_pattern, line)

                requires = []
                parallel_with = []
                requires_all = False

                for tag_type, tag_value in tags:
                    tag_value = tag_value.strip()
                    if tag_type == 'requires:':
                        # Parse multiple dependencies: "02, 03" or "02" or "previous"
                        if tag_value == 'previous':
                            requires_all = True
                        else:
                            deps = [d.strip() for d in tag_value.split(',')]
                            requires.extend(deps)
                    elif tag_type == 'parallel-with:':
                        deps = [d.strip() for d in tag_value.split(',')]
                        parallel_with.extend(deps)
                    elif tag_type == 'requires-all:':
                        if tag_value == 'previous':
                            requires_all = True

                self.subtasks[subtask_id] = {
                    'task_id': parent_task,
                    'description': subtask_desc,
                    'done': subtask_match.group(1) == 'x',
                    'line': line,
                    'requires': requires,
                    'parallel_with': parallel_with,
                    'requires_all_previous': requires_all
                }
                self.tasks[parent_task]['subtasks'].append(subtask_id)
                continue

            # Match main tasks: - [x] A1: Task Name OR - [x] B1.1: Task Name
            # Main tasks have 1-2 dots after the letter (e.g., A1 or B1.1)
            task_match = re.match(r'- \[(x| )\]\s+([A-Z]\d+(?:\.\d+)?)\s*:\s*(.+)', line)
            if task_match:
                current_task = task_match.group(2)
                self.tasks[current_task] = {
                    'name': task_match.group(3),
                    'done': task_match.group(1) == 'x',
                    'line': line,
                    'requires': [],
                    'parallel_with': [],
                    'subtasks': []
                }
                continue
            if subtask_match and current_task:
                subtask_id = subtask_match.group(2)
                subtask_desc = subtask_match.group(3)

                # Extract tags from the end
                tags_pattern = r'\[(requires:|parallel-with:|requires-all:)(.+?)\]'
                tags = re.findall(tags_pattern, line)

                requires = []
                parallel_with = []
                requires_all = False

                for tag_type, tag_value in tags:
                    tag_value = tag_value.strip()
                    if tag_type == 'requires:':
                        # Parse multiple dependencies: "02, 03" or "02" or "previous"
                        if tag_value == 'previous':
                            requires_all = True
                        else:
                            deps = [d.strip() for d in tag_value.split(',')]
                            requires.extend(deps)
                    elif tag_type == 'parallel-with:':
                        deps = [d.strip() for d in tag_value.split(',')]
                        parallel_with.extend(deps)
                    elif tag_type == 'requires-all:':
                        if tag_value == 'previous':
                            requires_all = True

                self.subtasks[subtask_id] = {
                    'task_id': current_task,
                    'description': subtask_desc,
                    'done': subtask_match.group(1) == 'x',
                    'line': line,
                    'requires': requires,
                    'parallel_with': parallel_with,
                    'requires_all_previous': requires_all
                }
                self.tasks[current_task]['subtasks'].append(subtask_id)

    def validate_references(self):
        """Validate that all referenced tasks exist."""
        all_subtasks = set(self.subtasks.keys())

        for subtask_id, subtask in self.subtasks.items():
            # Extract prefix correctly for multi-level IDs
            # e.g., "A1.01" -> "A1", "B2.3.05" -> "B2.3"
            parts = subtask_id.split('.')
            if len(parts) == 3:
                # 3 levels: B2.3.05 -> prefix is B2.3
                task_prefix = '.'.join(parts[:-1])
            else:
                # 2 levels: A1.01 -> prefix is A1
                task_prefix = parts[0]

            # Check requires
            for req in subtask['requires']:
                # Try to find the referenced subtask
                if '.' not in req:
                    # Reference without subtask number, try same task
                    req_full = f"{task_prefix}.{req}"
                else:
                    req_full = req

                if req_full not in all_subtasks:
                    self.errors.append(
                        f"❌ Missing dependency: {subtask_id} requires {req_full} (not found)"
                    )

            # Check parallel_with
            for pw in subtask['parallel_with']:
                if '.' not in pw:
                    pw_full = f"{task_prefix}.{pw}"
                else:
                    pw_full = pw

                if pw_full not in all_subtasks:
                    self.warnings.append(
                        f"⚠️ Parallel-with non-existent: {subtask_id} parallel-with {pw_full}"
                    )

    def detect_self_dependencies(self):
        """Detect tasks that depend on themselves."""
        for subtask_id, subtask in self.subtasks.items():
            for req in subtask['requires']:
                req_full = req if '.' in req else f"{subtask['task_id']}.{req}"
                if req_full == subtask_id:
                    self.errors.append(f"❌ Self-dependency: {subtask_id} depends on itself")

            # Check for conflicting tags
            if subtask['requires'] and subtask['parallel_with']:
                # Check if there's overlap
                for req in subtask['requires']:
                    req_full = req if '.' in req else f"{subtask['task_id']}.{req}"
                    if req_full in subtask['parallel_with'] or req in subtask['parallel_with']:
                        self.errors.append(
                            f"❌ Conflicting tags: {subtask_id} has both requires and parallel-with for {req_full}"
                        )

    def detect_circular_dependencies(self) -> List[List[str]]:
        """Detect circular dependencies using DFS."""
        cycles = []
        visited = set()
        rec_stack = set()

        def dfs(node: str, path: List[str]) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            # Get all dependencies
            if node in self.subtasks:
                subtask = self.subtasks[node]
                task_prefix = subtask['task_id']
                for req in subtask['requires']:
                    req_full = req if '.' in req else f"{task_prefix}.{req}"
                    if req_full not in visited:
                        if dfs(req_full, path.copy()):
                            return True
                    elif req_full in rec_stack:
                        # Found a cycle
                        cycle_start = path.index(req_full)
                        cycle = path[cycle_start:] + [req_full]
                        cycles.append(cycle)
                        return True

            rec_stack.remove(node)
            return False

        for subtask_id in self.subtasks:
            if subtask_id not in visited:
                dfs(subtask_id, [])

        return cycles

    def suggest_parallelization(self):
        """Suggest tasks that could run in parallel."""
        # Group tasks by their required tasks
        dependency_groups: Dict[str, Set[str]] = defaultdict(set)

        for subtask_id, subtask in self.subtasks.items():
            if not subtask['requires'] and not subtask['requires_all_previous']:
                dependency_groups['none'].add(subtask_id)
            else:
                for req in subtask['requires']:
                    req_full = req if '.' in req else f"{subtask['task_id']}.{req}"
                    dependency_groups[req_full].add(subtask_id)

        # Find groups that could run in parallel (same dependencies)
        for dep, tasks in dependency_groups.items():
            if len(tasks) > 1:
                # Check if they're not already marked as parallel
                tasks_list = list(tasks)
                already_parallel = True
                for task in tasks_list:
                    if task not in self.subtasks:
                        already_parallel = False
                        break
                    task_obj = self.subtasks[task]
                    # Check if all tasks in this group are marked as parallel with each other
                    for other in tasks_list:
                        if other != task:
                            if other not in task_obj['parallel_with']:
                                already_parallel = False
                                break
                    if not already_parallel:
                        break

                if not already_parallel:
                    # Limit output to first 5 tasks and show total count
                    tasks_sorted = sorted(tasks_list)
                    if len(tasks_sorted) > 5:
                        sample = ', '.join(tasks_sorted[:5])
                        self.suggestions.append(
                            f"💡 Could parallelize {len(tasks_sorted)} tasks depending on {dep}: {sample} ... (+{len(tasks_sorted) - 5} more)"
                        )
                    else:
                        group_str = ', '.join(tasks_sorted)
                        self.suggestions.append(
                            f"💡 Could parallelize: {group_str} (all depend on {dep})"
                        )

    def validate(self) -> Tuple[bool, str]:
        """Run all validations and return report."""
        self.parse()

        # Run validations
        self.validate_references()
        self.detect_self_dependencies()
        cycles = self.detect_circular_dependencies()

        for cycle in cycles:
            self.errors.append(f"❌ Circular dependency: {' → '.join(cycle)}")

        self.suggest_parallelization()

        # Build report
        report = []
        report.append("🔍 Dependency Validation Report\n")

        # Summary
        total_subtasks = len(self.subtasks)
        with_deps = sum(1 for st in self.subtasks.values() if st['requires'] or st['requires_all_previous'])
        parallel = sum(1 for st in self.subtasks.values() if st['parallel_with'])

        report.append(f"📊 Summary:")
        report.append(f"   Total subtasks: {total_subtasks}")
        report.append(f"   With dependencies: {with_deps}")
        report.append(f"   Marked parallel: {parallel}")
        report.append("")

        # Errors
        if self.errors:
            report.append("🚨 ERRORS (blocking):")
            for error in self.errors:
                report.append(f"   {error}")
            report.append("")

        # Warnings
        if self.warnings:
            report.append("⚠️ WARNINGS (should review):")
            for warning in self.warnings:
                report.append(f"   {warning}")
            report.append("")

        # Suggestions
        if self.suggestions:
            report.append("💡 SUGGESTIONS (optimization):")
            for suggestion in self.suggestions:
                report.append(f"   {suggestion}")
            report.append("")

        if not self.errors and not self.warnings and not self.suggestions:
            report.append("✅ All dependencies validated successfully!")

        return len(self.errors) == 0, '\n'.join(report)


def main():
    todo_file = Path(__file__).parent.parent / 'tasks' / 'todo.md'

    if not todo_file.exists():
        print(f"❌ Error: {todo_file} not found")
        sys.exit(1)

    validator = DependencyValidator(todo_file)
    is_valid, report = validator.validate()

    print(report)

    if not is_valid:
        sys.exit(1)


if __name__ == '__main__':
    main()
