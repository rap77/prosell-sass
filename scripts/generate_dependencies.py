#!/usr/bin/env python3
"""
Automatic dependency generator for tasks/todo.md

Generates [requires: XX] tags based on clean architecture patterns.
AGGRESSIVE MODE: Generates dependencies for ALL tasks, not just completed ones.
"""

import re
from pathlib import Path


class Task:
    """Represents a single task with its metadata."""

    def __init__(self, line_number: int, full_id: str, prefix: str, number: int, description: str):
        self.line_number = line_number
        self.full_id = full_id  # e.g., "A1.04" or "B1.1.01"
        self.prefix = prefix  # e.g., "A1" or "B1.1"
        self.number = number  # e.g., 4 or 1 (last segment)
        self.description = description.strip()
        self.dependencies: list[str] = []
        self.existing_requires: str | None = None
        self.entity_names: set[str] = set()
        self.component_names: set[str] = set()
        self.hook_names: set[str] = set()

    def __repr__(self):
        return f"Task({self.full_id}: {self.description[:50]}...)"

    def extract_names(self):
        """Extract entity, component, and hook names from description."""
        desc_lower = self.description.lower()

        # Extract entity names
        entity_patterns = [
            r"create (\w+) entity",
            r"create (\w+) aggregate",
            r"(\w+) entity\b",
        ]
        for pattern in entity_patterns:
            matches = re.findall(pattern, desc_lower)
            self.entity_names.update(matches)

        # Extract component names
        component_patterns = [
            r"create (\w+) component",
            r"(\w+)component\b",
        ]
        for pattern in component_patterns:
            matches = re.findall(pattern, desc_lower)
            self.component_names.update(matches)

        # Extract hook names
        hook_patterns = [
            r"create use(\w+) hook",
            r"create use(\w+) mutation",
            r"use(\w+) hook",
        ]
        for pattern in hook_patterns:
            matches = re.findall(pattern, desc_lower)
            self.hook_names.update(matches)


class DependencyGenerator:
    """Generates dependencies based on clean architecture patterns."""

    # Layer ordering (lower number = earlier in dependency chain)
    LAYER_ORDER = {
        "migration": 1,
        "entity": 2,
        "enum": 3,
        "value_object": 3,
        "exception": 3,
        "domain_event": 3,
        "interface": 4,
        "port": 4,
        "repository": 5,
        "implementation": 5,
        "adapter": 5,
        "service": 6,
        "usecase": 7,
        "use_case": 7,
        "dto": 8,
        "endpoint": 9,
        "router": 9,
        "api": 9,
        "hook": 10,
        "component": 11,
        "page": 12,
        "test_unit": 13,
        "test_integration": 14,
        "test_e2e": 15,
        "test_contract": 16,
    }

    # Keywords for each layer (expanded for better matching)
    LAYER_KEYWORDS = {
        "migration": ["alembic", "migration", "create table", "add column", "add index"],
        "entity": ["entity", "aggregate", "create .* entity", "create .* aggregate"],
        "enum": ["enum", "create enum", "create status", "create type"],
        "value_object": ["value object", "valueobject"],
        "exception": ["exception", "create exception"],
        "domain_event": ["domain event", "event"],
        "interface": [
            "interface",
            "create i",
            "irepository",
            "iservice",
            "port",
            "repository interface",
        ],
        "port": ["port"],
        "repository": ["repository", "implement.*repository", "sqlalchemy", "create repository"],
        "implementation": ["implementation", "implement"],
        "adapter": ["adapter"],
        "service": ["service", "create service"],
        "usecase": ["usecase", "use case", "create.*usecase", "create.*use case"],
        "use_case": ["usecase", "use case"],
        "dto": ["dto", "request", "response", "schema"],
        "endpoint": ["endpoint", "post /", "get /", "put /", "delete /", "patch /", "/api/"],
        "router": ["router", "create router"],
        "api": ["api", "/api/"],
        "hook": ["hook", "use", "create use", "mutation"],
        "component": ["component", "create .*component", ".* component$"],
        "page": ["page", "create /", "page at", "/.*/.* page"],
        "test_unit": [
            "unit test",
            "write unit test",
            "test .*entity",
            "test .*service",
            "test .*component",
        ],
        "test_integration": [
            "integration test",
            "write integration test",
            "test .*endpoint",
            "test .*usecase",
            "test .*router",
        ],
        "test_e2e": ["e2e test", "write e2e test", "test .*flow", "test .*view", "test .*page"],
        "test_contract": ["contract test", "schema test", "verify .*dto", "verify .*schema"],
    }

    @classmethod
    def detect_layer(cls, description: str) -> tuple[str, int]:
        """Detect which layer a task belongs to and its order."""
        description_lower = description.lower()

        for layer, keywords in cls.LAYER_KEYWORDS.items():
            for keyword in keywords:
                if re.search(rf"\b{keyword}\b", description_lower):
                    return layer, cls.LAYER_ORDER[layer]

        # Default: if no layer detected, assign high order (execute last)
        return "unknown", 999

    @classmethod
    def extract_entity_name(cls, description: str) -> str | None:
        """Extract entity name from task description."""
        patterns = [
            r"create (\w+) entity",
            r"create (\w+) aggregate",
            r"(\w+) entity\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_interface_name(cls, description: str) -> str | None:
        """Extract interface name from task description."""
        patterns = [
            r"create i(\w+)repository",
            r"create (\w+) interface",
            r"create i(\w+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_repository_name(cls, description: str) -> str | None:
        """Extract repository name from task description."""
        patterns = [
            r"implement (\w+)repository",
            r"create (\w+)repository",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_usecase_name(cls, description: str) -> str | None:
        """Extract use case name from task description."""
        patterns = [
            r"create (\w+)usecase",
            r"create (\w+) use case",
            r"create (\w+)mutation",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_component_name(cls, description: str) -> str | None:
        """Extract component name from task description."""
        patterns = [
            r"create (\w+) component",
            r"(\w+)component\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_hook_name(cls, description: str) -> str | None:
        """Extract hook name from task description."""
        patterns = [
            r"create use(\w+) hook",
            r"create use(\w+) mutation",
            r"use(\w+) hook",
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_endpoint_entity(cls, description: str) -> str | None:
        """Extract entity name from endpoint task description."""
        # Look for patterns like "Create POST /api/v1/leads" -> extract "leads"
        match = re.search(r"/api/v1/\w+/(\w+)", description)
        if match:
            return match.group(1)

        # Look for patterns like "Create PUT /api/v1/leads/{id}/status" -> extract "leads"
        match = re.search(r"/api/v1/\w+/(\w+)/", description)
        if match:
            return match.group(1)

        return None


def parse_todo_md(file_path: Path) -> tuple[list[str], dict[str, list[Task]]]:
    """Parse todo.md and return lines and tasks grouped by prefix."""
    lines = file_path.read_text(encoding="utf-8").splitlines()
    tasks: dict[str, list[Task]] = {}

    # Regex to match task lines: "  - [x] A1.04: Description [requires: XX]"
    # Requires at least one dot in the task ID (to skip parent tasks like "A1:")
    # Supports multi-level IDs like "B1.1.01" and single-level like "A1.04"
    # Matches both "  - " (subtask with 2 spaces) and "    - " (sub-subtask with 4 spaces)
    task_pattern = re.compile(
        r"^\s+-\s+\[[x ]\]\s+([A-Z]\d+(?:\.\d+)+):\s+(.*?)(?:\s+\[requires:\s*([^\]]+)\])?$"
    )

    for line_num, line in enumerate(lines, 1):
        match = task_pattern.match(line)
        if match:
            full_id = match.group(1)  # e.g., "A1.04" or "B1.1.01"
            description = match.group(2)
            existing_requires = match.group(3)

            # Extract prefix (all but last segment)
            # e.g., "A1.04" -> "A1", "B1.1.01" -> "B1.1"
            parts = full_id.split(".")
            prefix = ".".join(parts[:-1])
            number = int(parts[-1])

            task = Task(line_num, full_id, prefix, number, description)
            task.existing_requires = existing_requires
            task.extract_names()

            if prefix not in tasks:
                tasks[prefix] = []
            tasks[prefix].append(task)

    return lines, tasks


def find_previous_task_in_group(current_task: Task, tasks_in_prefix: list[Task]) -> Task | None:
    """Find the immediately previous task in the same group."""
    for task in sorted(tasks_in_prefix, key=lambda t: t.number):
        if task.number == current_task.number - 1:
            return task
    return None


def find_entity_task(
    entity_name: str, tasks_in_prefix: list[Task], current_task: Task
) -> Task | None:
    """Find the task that creates an entity."""
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"create {entity_name.lower()} entity" in task.description.lower():
            return task
        if f"{entity_name.lower()} entity" in task.description.lower():
            return task
    return None


def find_interface_task(
    interface_name: str, tasks_in_prefix: list[Task], current_task: Task
) -> Task | None:
    """Find the task that creates an interface."""
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"i{interface_name.lower()}repository" in task.description.lower():
            return task
        if f"{interface_name.lower()} interface" in task.description.lower():
            return task
        if f"create i{interface_name.lower()}" in task.description.lower():
            return task
    return None


def find_repository_task(
    repository_name: str, tasks_in_prefix: list[Task], current_task: Task
) -> Task | None:
    """Find the task that implements a repository."""
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"implement {repository_name.lower()}repository" in task.description.lower():
            return task
        if f"{repository_name.lower()}repository" in task.description.lower():
            return task
    return None


def find_usecase_task(
    usecase_name: str,
    tasks_in_prefix: list[Task],
    current_task: Task,
    all_tasks: dict[str, list[Task]],
) -> Task | None:
    """Find a use case task (search across all prefixes)."""
    # First search in same prefix
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"{usecase_name.lower()}usecase" in task.description.lower():
            return task
        if f"{usecase_name} use case" in task.description.lower():
            return task

    # If not found, search across all prefixes (cross-prefix dependency)
    for prefix, task_list in all_tasks.items():
        for task in task_list:
            if f"{usecase_name.lower()}usecase" in task.description.lower():
                return task
            if f"{usecase_name} use case" in task.description.lower():
                return task

    return None


def find_component_task(
    component_name: str, tasks_in_prefix: list[Task], current_task: Task
) -> Task | None:
    """Find a component task."""
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"{component_name.lower()}component" in task.description.lower():
            return task
        if f"create {component_name.lower()} component" in task.description.lower():
            return task
    return None


def find_hook_task(hook_name: str, tasks_in_prefix: list[Task], current_task: Task) -> Task | None:
    """Find a hook task."""
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        if f"use{hook_name.lower()} hook" in task.description.lower():
            return task
        if f"create use{hook_name.lower()}" in task.description.lower():
            return task
    return None


def find_last_endpoint_task(tasks_in_prefix: list[Task], current_task: Task) -> Task | None:
    """Find the last endpoint task before current task."""
    last_endpoint = None
    for task in tasks_in_prefix:
        if task.number >= current_task.number:
            continue
        layer, _ = DependencyGenerator.detect_layer(task.description)
        if layer in ["endpoint", "router", "api"]:
            last_endpoint = task
    return last_endpoint


def find_implementation_task(tasks_in_prefix: list[Task], current_task: Task) -> Task | None:
    """Find the most recent implementation task."""
    for task in reversed(tasks_in_prefix):
        if task.number >= current_task.number:
            continue
        layer, _ = DependencyGenerator.detect_layer(task.description)
        if layer in ["usecase", "use_case", "service", "repository", "component"]:
            return task
    return None


def find_page_or_component_task(tasks_in_prefix: list[Task], current_task: Task) -> Task | None:
    """Find the most recent page or component task."""
    for task in reversed(tasks_in_prefix):
        if task.number >= current_task.number:
            continue
        layer, _ = DependencyGenerator.detect_layer(task.description)
        if layer in ["page", "component"]:
            return task
    return None


def generate_dependencies_for_task(
    task: Task, tasks_in_prefix: list[Task], all_tasks: dict[str, list[Task]]
) -> list[str]:
    """Generate dependencies for a single task."""
    if task.existing_requires:
        # Keep existing dependencies
        return [task.existing_requires]

    dependencies = []
    description_lower = task.description.lower()

    layer, layer_order = DependencyGenerator.detect_layer(task.description)

    # AGGRESSIVE: Generate sequential dependency if no clear pattern
    # This ensures every task (except the first) has at least one dependency
    if task.number > 1:
        previous_task = find_previous_task_in_group(task, tasks_in_prefix)
        if previous_task:
            dependencies.append(previous_task.full_id)

    # Skip further dependency generation for first layer tasks (except sequential)
    if layer_order <= 2:
        return dependencies

    # Pattern 1: Repository Interface → Entity
    if layer == "interface":
        entity_name = DependencyGenerator.extract_entity_name(task.description)
        if entity_name:
            entity_task = find_entity_task(entity_name, tasks_in_prefix, task)
            if entity_task and entity_task.full_id not in dependencies:
                dependencies.append(entity_task.full_id)

    # Pattern 2: Repository Implementation → Interface
    elif layer == "repository":
        repo_name = DependencyGenerator.extract_repository_name(task.description)
        if repo_name:
            interface_task = find_interface_task(repo_name, tasks_in_prefix, task)
            if interface_task and interface_task.full_id not in dependencies:
                dependencies.append(interface_task.full_id)

    # Pattern 3: Use Case → Repository
    elif layer in ["usecase", "use_case"]:
        usecase_name = DependencyGenerator.extract_usecase_name(task.description)
        if usecase_name:
            # Try to find repository for this entity
            repo_task = find_repository_task(usecase_name, tasks_in_prefix, task)
            if repo_task and repo_task.full_id not in dependencies:
                dependencies.append(repo_task.full_id)

    # Pattern 4: Endpoint → Use Case
    elif layer in ["endpoint", "router", "api"]:
        # Extract entity name from endpoint path
        entity_name = DependencyGenerator.extract_endpoint_entity(task.description)
        if entity_name:
            # Find the use case for this entity (cross-prefix search)
            usecase_task = find_usecase_task(entity_name, tasks_in_prefix, task, all_tasks)
            if usecase_task and usecase_task.full_id not in dependencies:
                dependencies.append(usecase_task.full_id)

    # Pattern 5: Tests → What they test (AGGRESSIVE: ALL tests must depend on something)
    elif layer.startswith("test_"):
        # Integration tests depend on endpoints
        if layer == "test_integration":
            last_endpoint = find_last_endpoint_task(tasks_in_prefix, task)
            if last_endpoint and last_endpoint.full_id not in dependencies:
                dependencies.append(last_endpoint.full_id)
            else:
                # Fallback: depend on most recent implementation
                impl_task = find_implementation_task(tasks_in_prefix, task)
                if impl_task and impl_task.full_id not in dependencies:
                    dependencies.append(impl_task.full_id)

        # Unit tests depend on the implementation
        elif layer == "test_unit":
            impl_task = find_implementation_task(tasks_in_prefix, task)
            if impl_task and impl_task.full_id not in dependencies:
                dependencies.append(impl_task.full_id)

        # Contract tests depend on DTOs/schemas
        elif layer == "test_contract":
            # Find most recent DTO/schema task
            for prev_task in reversed(tasks_in_prefix):
                if prev_task.number >= task.number:
                    continue
                prev_layer, _ = DependencyGenerator.detect_layer(prev_task.description)
                if prev_layer == "dto":
                    if prev_task.full_id not in dependencies:
                        dependencies.append(prev_task.full_id)
                    break
            # If no DTO found, depend on endpoint
            if not any(
                dep.endswith(str(prev_task.number))
                for prev_task in tasks_in_prefix
                for dep in dependencies
            ):
                last_endpoint = find_last_endpoint_task(tasks_in_prefix, task)
                if last_endpoint and last_endpoint.full_id not in dependencies:
                    dependencies.append(last_endpoint.full_id)

        # E2E tests depend on the page/feature being complete
        elif layer == "test_e2e":
            page_task = find_page_or_component_task(tasks_in_prefix, task)
            if page_task and page_task.full_id not in dependencies:
                dependencies.append(page_task.full_id)

    # Pattern 6: Frontend Hook → Interface definitions
    elif layer == "hook":
        # Find the most recent interface/type definition
        for prev_task in reversed(tasks_in_prefix):
            if prev_task.number >= task.number:
                continue
            if "interface" in prev_task.description.lower():
                if prev_task.full_id not in dependencies:
                    dependencies.append(prev_task.full_id)
                break

    # Pattern 7: Component → Hook
    elif layer == "component":
        # Try to find hook first
        comp_name = DependencyGenerator.extract_component_name(task.description)
        if comp_name:
            hook_task = find_hook_task(comp_name, tasks_in_prefix, task)
            if hook_task and hook_task.full_id not in dependencies:
                dependencies.append(hook_task.full_id)

        # If no hook found, depend on previous component or implementation
        if not any(d.startswith(task.prefix) for d in dependencies):
            for prev_task in reversed(tasks_in_prefix):
                if prev_task.number >= task.number:
                    continue
                prev_layer, _ = DependencyGenerator.detect_layer(prev_task.description)
                if prev_layer in ["hook", "component"]:
                    if prev_task.full_id not in dependencies:
                        dependencies.append(prev_task.full_id)
                    break

    # Pattern 8: Page → Component
    elif layer == "page":
        # Find the most recent component
        for prev_task in reversed(tasks_in_prefix):
            if prev_task.number >= task.number:
                continue
            prev_layer, _ = DependencyGenerator.detect_layer(prev_task.description)
            if prev_layer == "component":
                if prev_task.full_id not in dependencies:
                    dependencies.append(prev_task.full_id)
                break

    return dependencies


def generate_short_form(dependencies: list[str], current_task: Task) -> str:
    """Generate short-form dependency tag [requires: XX]."""
    if not dependencies:
        return ""

    # For same-task dependencies, use short form
    short_deps = []
    for dep in dependencies:
        if dep.startswith(current_task.prefix):
            # Same prefix: extract last number (e.g., "A1.04" -> "04", "B1.1.01" -> "01")
            dep_number = dep.split(".")[-1]
            short_deps.append(dep_number)
        else:
            # Different prefix: use full ID
            short_deps.append(dep)

    if not short_deps:
        return ""

    return f"[requires: {', '.join(short_deps)}]"


def update_todo_md(file_path: Path, lines: list[str], tasks: dict[str, list[Task]]) -> None:
    """Update todo.md with generated dependencies."""
    updated_lines = []

    for line_num, line in enumerate(lines, 1):
        # Check if this line has a task
        task_found = None
        for prefix, task_list in tasks.items():
            for task in task_list:
                if task.line_number == line_num:
                    task_found = task
                    break
            if task_found:
                break

        if not task_found:
            updated_lines.append(line)
            continue

        task = task_found

        # Skip if already has dependencies
        if task.existing_requires:
            updated_lines.append(line)
            continue

        # Generate dependencies
        dependencies = generate_dependencies_for_task(task, tasks[task.prefix], tasks)

        if not dependencies:
            updated_lines.append(line)
            continue

        # Generate short form
        requires_tag = generate_short_form(dependencies, task)

        if not requires_tag:
            updated_lines.append(line)
            continue

        # Append requires tag to line
        # Find the position before any existing newline
        updated_line = line.rstrip() + f" {requires_tag}"
        updated_lines.append(updated_line)

    # Write back to file
    file_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")


def main():
    """Main entry point."""
    todo_path = Path("/home/rpadron/proy/prosell-sass/tasks/todo.md")

    if not todo_path.exists():
        print(f"❌ Error: {todo_path} not found")
        return 1

    print("🔍 Parsing todo.md...")
    lines, tasks = parse_todo_md(todo_path)

    total_tasks = sum(len(task_list) for task_list in tasks.values())
    print(f"📊 Found {total_tasks} tasks across {len(tasks)} prefixes")

    print("\n🔗 Generating dependencies (AGGRESSIVE MODE)...")
    generated_count = 0
    skipped_count = 0
    no_deps_count = 0

    for prefix, task_list in tasks.items():
        for task in task_list:
            if task.existing_requires:
                skipped_count += 1
                continue

            dependencies = generate_dependencies_for_task(task, task_list, tasks)
            if dependencies:
                generated_count += 1
                print(f"  ✅ {task.full_id}: {task.description[:60]}... -> {dependencies}")
            else:
                no_deps_count += 1

    print("\n📈 Summary:")
    print(f"  - Tasks with existing dependencies: {skipped_count}")
    print(f"  - Tasks with new dependencies: {generated_count}")
    print(f"  - Tasks without dependencies (first in group): {no_deps_count}")
    print(f"  - Total tasks processed: {total_tasks}")

    print("\n💾 Updating todo.md...")
    update_todo_md(todo_path, lines, tasks)

    print("✅ Done! Dependencies generated successfully.")
    print("\n⚠️  Please review the changes before committing.")
    print("💡 Run 'python scripts/validate_dependencies.py' to check for errors.")
    return 0


if __name__ == "__main__":
    exit(main())
