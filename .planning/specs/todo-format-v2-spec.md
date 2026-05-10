# Todo.md Format v2.0 — Hierarchical Tasks with Dependencies

**Status**: Proposed | **Author**: Rafael Padrón | **Date**: 2026-05-09

## Table of Contents

1. [Overview](#overview)
2. [Format Specification](#format-specification)
3. [State Propagation](#state-propagation)
4. [Dependency System](#dependency-system)
5. [Execution Model](#execution-model)
6. [Handler Requirements](#handler-requirements)
7. [Algorithms](#algorithms)
8. [Examples](#examples)
9. [Migration Plan](#migration-plan)

---

## Overview

### Problems with Current Format

1. **Header Ambiguity**: `###` vs `####` causes parser bugs
2. **No In-Progress State**: Can't distinguish "not started" from "working on it"
3. **No Dependency Validation**: Tasks execute before prerequisites complete
4. **Poor Hierarchy Visibility**: Hard to see parent-child relationships

### Goals

✅ **Unambiguous format**: List-based with explicit indentation
✅ **Three states**: Pending `[ ]`, In-Progress `[~]`, Completed `[x]`
✅ **Dependency validation**: Cannot execute if prerequisites incomplete
✅ **Automatic propagation**: Parent state derived from children
✅ **Parallel execution**: Independent tasks run simultaneously

---

## Format Specification

### Basic Structure

```markdown
## Phase Name

- [state] TASK_ID: Task Title (time estimate)
  - [state] SUBTASK_ID: Subtask Title [requires: DEP_ID, DEP_ID]
    - [state] GRANDCHILD_ID: Grandchild Title [requires: DEP_ID]
```

### Rules

1. **Level 0 (##)**: Phase headers
2. **Level 1 (-)**: Tasks (B1, B2, etc.)
3. **Level 2 (  -)**: Subtasks (B1.1, B1.2, etc.)
4. **Level 3 (    -)**: Granular subtasks (B1.1.01, B1.1.02, etc.)
5. **Indentation**: 2 spaces per level
6. **Dependencies**: Inline `[requires: ID, ID]`
7. **Estimates**: Optional `(hours)` in title

### State Values

| Symbol | Name | Meaning |
|--------|------|---------|
| `[ ]` | Pending | Task not started |
| `[~]` | In-Progress | Task actively being executed |
| `[x]` | Completed | Task finished successfully |

---

## State Propagation

### Parent State Calculation

The state of a parent task is **derived** from its children:

```python
def calculate_parent_state(children: list) -> str:
    """
    Calculate parent state based on children states.

    Returns:
      "[x]" if ALL children are "[x]"
      "[~]" if ANY child is "[~]" or "[x]" but not all "[x]"
      "[ ]" if ALL children are "[ ]"
    """
    states = [child.state for child in children]

    if all(s == "[x]" for s in states):
        return "[x]"  # All completed → parent complete
    elif any(s in ["[~]", "[x]"] for s in states):
        return "[~]"  # Some progress → parent in-progress
    else:
        return "[ ]"  # None started → parent pending
```

### Propagation Rules

| Children State | Parent State |
|----------------|--------------|
| All `[ ]` | `[ ]` |
| Any `[~]` or `[x]` (not all `[x]`) | `[~]` |
| All `[x]` | `[x]` |

### When to Propagate

1. **When a child starts**: Mark child `[~]`, propagate `[~]` up
2. **When a child completes**: Mark child `[x]`, check siblings, propagate up
3. **Before execution**: Validate parent state reflects children

---

## Dependency System

### Declaration Syntax

```markdown
- [ ] B1.1.02: Implement scenario [requires: B1.1.01]
- [ ] B1.2: Security Audit [requires: B1.1]
- [ ] B1.3: Release Checklist [requires: B1.1, B1.2]
```

### Validation Rules

1. **Before execution**: Check ALL `[requires: ...]` are `[x]`
2. **Missing dependency**: BLOCK execution, display error
3. **Circular dependency**: DETECT and reject at parse time

### Dependency Types

| Type | Syntax | Example |
|------|--------|---------|
| Single | `[requires: ID]` | `[requires: B1.1.01]` |
| Multiple | `[requires: ID, ID]` | `[requires: B1.1, B1.2]` |
| Sequential (implicit) | `requires: previous` | B1.1.02 requires B1.1.01 |

---

## Execution Model

### Sequential Execution

Tasks with dependencies execute **in order**:

```bash
/mm:complete-task B1.1
→ B1.1.01: [ ] → [~] → [x]
→ B1.1.02: [ ] → [~] → [x]  (waits for B1.1.01)
→ B1.1.03: [ ] → [~] → [x]  (waits for B1.1.02)
```

### Parallel Execution

Tasks **without** dependencies execute **simultaneously**:

```bash
/mm:complete-task B2
→ B2.1: [~] (parallel)
→ B2.2: [~] (parallel)
→ B2.3: [~] (parallel)
→ B2.4: [~] (parallel)
→ B2.5: [~] (parallel)
```

### Mixed Execution

Phases have **both patterns**:

```bash
/mm:complete-task B1
→ B1.1: Sequential internally (B1.1.01 → B1.1.02 → ...)
→ B1.2: Waits for B1.1 to complete
→ B1.3: Waits for B1.1 to complete
→ Once B1.1 is [x]: B1.2 and B1.3 run in parallel
→ B1.4: Waits for BOTH B1.2 and B1.3
```

---

## Handler Requirements

### complete-task-handler.py

**MUST:**

1. Parse hierarchical format with indentation
2. Extract `[requires: ...]` from task titles
3. Validate dependencies before execution:
   ```python
   if not can_execute_task(task_id):
       print(f"❌ Task {task_id} BLOCKED")
       print(f"   Missing: {missing_dependencies}")
       return ERROR
   ```
4. Mark task `[~]` when starting
5. Mark task `[x]` when complete
6. Propagate state to ALL parents
7. Find next executable task(s)

**MUST NOT:**

- Execute tasks with incomplete dependencies
- Allow circular dependencies
- Skip state propagation

### verify-criteria-handler.py

**MUST:**

1. Parse hierarchical format
2. Find task by ID at any level
3. Check ALL descendants are `[x]`
4. Propagate parent state if needed

### update-todo-times.py

**MUST:**

1. Preserve hierarchical structure
2. Update time estimates without breaking format
3. Maintain dependencies when updating

---

## Algorithms

### Parse Hierarchy

```python
def parse_todo_hierarchy(content: str) -> dict:
    """
    Parse todo.md into hierarchical tree structure.

    Returns:
        {
            "TASK_ID": {
                "title": "...",
                "state": "[ ]| [~]| [x]",
                "level": 1|2|3,
                "requires": ["ID", ...],
                "children": {
                    "SUBTASK_ID": { ... }
                }
            }
        }
    """
    lines = content.split("\n")
    root = {}
    stack = [(None, 0)]  # (parent_id, level)

    for line in lines:
        if not line.strip() or line.startswith("#"):
            continue

        # Calculate indentation level
        indent = len(line) - len(line.lstrip())
        level = indent // 2 + 1

        # Extract task info
        match = re.match(r'-\s\[([ x~])\]\s([A-Z0-9.]+):\s*(.*?)\s*(\[requires:\s*([^\]]+)\])?', line)
        if not match:
            continue

        state, task_id, title, _, requires_str = match.groups()
        requires = parse_requires(requires_str) if requires_str else []

        # Build tree
        task = {
            "id": task_id,
            "title": title.strip(),
            "state": f"[{state}]",
            "level": level,
            "requires": requires,
            "children": {}
        }

        # Find parent
        while stack and stack[-1][1] >= level:
            stack.pop()

        if stack:
            parent_id, _ = stack[-1]
            if parent_id:
                # Insert into parent's children
                insert_into_tree(root, parent_id, task)
            else:
                root[task_id] = task
        else:
            root[task_id] = task

        stack.append((task_id, level))

    return root
```

### Validate Dependencies

```python
def validate_dependencies(task_id: str, tree: dict) -> tuple[bool, list[str]]:
    """
    Validate that all dependencies are completed.

    Returns:
        (can_execute, list_of_missing_dependencies)
    """
    task = find_task_in_tree(tree, task_id)
    if not task:
        return (False, [f"Task {task_id} not found"])

    missing = []
    for dep_id in task.get("requires", []):
        dep_task = find_task_in_tree(tree, dep_id)
        if not dep_task:
            missing.append(f"{dep_id} (not found)")
        elif dep_task["state"] != "[x]":
            missing.append(f"{dep_id} (state: {dep_task['state']})")

    return (len(missing) == 0, missing)
```

### Propagate State

```python
def propagate_state_up(tree: dict, task_id: str, new_state: str) -> None:
    """
    Propagate state change up the hierarchy.

    1. Update the task itself
    2. Find parent
    3. Recalculate parent state from siblings
    4. Recurse up
    """
    # Find task and update
    task, parent_path = find_task_with_path(tree, task_id)
    if not task:
        return

    task["state"] = new_state

    # Find parent
    if not parent_path:
        return  # At root

    parent_id = parent_path[-1]
    parent = find_task_in_tree(tree, parent_id)
    if not parent:
        return

    # Calculate parent state from children
    children = list(parent.get("children", {}).values())
    new_parent_state = calculate_parent_state(children)

    # Recurse up
    if parent["state"] != new_parent_state:
        propagate_state_up(tree, parent_id, new_parent_state)
```

### Find Executable Tasks

```python
def find_executable_tasks(tree: dict, phase_id: str) -> list[str]:
    """
    Find all tasks that can execute in parallel.

    Criteria:
    - State is `[ ]` (not started)
    - All dependencies are `[x]` (completed)
    """
    phase = find_task_in_tree(tree, phase_id)
    if not phase:
        return []

    executable = []

    def traverse(tasks):
        for task_id, task in tasks.items():
            if task["state"] == "[ ]":
                can_execute, _ = validate_dependencies(task_id, tree)
                if can_execute:
                    executable.append(task_id)

            # Recurse into children
            if task.get("children"):
                traverse(task["children"])

    traverse(phase.get("children", {}))
    return executable
```

---

## Examples

### Example 1: Sequential Subtasks

```markdown
- [~] B1: Security & Release Readiness
  - [~] B1.1: E2E Integrated Flow Validation (8 hours)
    - [x] B1.1.01: Create integrated-critical-path.spec.ts test
    - [~] B1.1.02: Implement complete sales cycle scenario [requires: B1.1.01]
    - [ ] B1.1.03: Mock Facebook Graph API for publish [requires: B1.1.02]
    - [ ] B1.1.04: Mock webhook endpoint for lead capture [requires: B1.1.03]
    - [ ] B1.1.05: Mock SendGrid for email notifications [requires: B1.1.04]
    - [ ] B1.1.06: Verify test execution time < 3 minutes [requires: B1.1.05]
    - [ ] B1.1.07: Add test to smoke suite [requires: B1.1.06]
    - [ ] B1.1.08: Test passes consistently (>95% success rate) [requires: B1.1.07]
```

**Execution flow:**
```
B1.1.01 [x] → B1.1.02 [~] → [x] → B1.1.03 [~] → [x] → ... → B1.1.08 [x]
           ↓
        B1.1 becomes [x]
           ↓
        B1 becomes [~] (waiting for B1.2, B1.3)
```

### Example 2: Parallel Tasks

```markdown
- [~] B2: Core Feature Completion
  - [x] B2.1: Facebook Webhook Polling Completion (16 hours)
  - [x] B2.2: VIN Decode Integration Tests (6 hours)
  - [x] B2.3: Team Switching UI Implementation (8 hours)
  - [x] B2.4: Calendar Integration (12 hours)
  - [x] B2.5: Role-Based Permission Tests (12 hours)
```

**Execution flow:**
```
B2.1 [~] → [x]  │
B2.2 [~] → [x]  ├─ All in parallel
B2.3 [~] → [x]  │
B2.4 [~] → [x]  │
B2.5 [~] → [x]  │
     ↓
  B2 becomes [x]
```

### Example 3: Mixed Dependencies

```markdown
- [ ] C1: Infrastructure Setup
  - [ ] C1.1: Database Configuration
  - [ ] C1.2: API Server Setup [requires: C1.1]
  - [ ] C1.3: Frontend Build [requires: C1.1]
  - [ ] C1.4: E2E Tests [requires: C1.2, C1.3]
```

**Execution flow:**
```
C1.1 [~] → [x]
    ↓
C1.2 [~] → [x]  │
C1.3 [~] → [x]  ├─ Parallel (both depend only on C1.1)
    ↓
C1.4 [~] → [x]  (waits for BOTH C1.2 and C1.3)
    ↓
C1 becomes [x]
```

---

## Migration Plan

### Phase 1: Implementation (Priority)

1. ✅ **Create this spec** — Define format
2. ⏳ **Update complete-task-handler.py**:
   - Implement `parse_todo_hierarchy()`
   - Implement `validate_dependencies()`
   - Implement `propagate_state_up()`
   - Add `[~]` state on start
3. ⏳ **Update verify-criteria-handler.py**:
   - Implement hierarchical parsing
   - Check descendants, not just checkboxes
4. ⏳ **Create migration script**:
   - Convert `###`/`####` to list format
   - Add 2-space indentation
   - Preserve existing `[x]` states
5. ⏳ **Test with existing phases**:
   - Migrate B2 (just completed)
   - Validate handlers work
   - Verify no data loss

### Phase 2: Rollout

1. ⏳ **Backup current todo.md**
2. ⏳ **Run migration script**
3. ⏳ **Verify migrated content**
4. ⏳ **Update documentation**
5. ⏳ **Train users** (if applicable)

### Migration Script Pseudocode

```python
def migrate_todo_v1_to_v2(input_path: str, output_path: str) -> None:
    """
    Migrate from header-based to list-based format.
    """
    content = input_path.read_text()
    lines = content.split("\n")
    output = []

    current_phase = None
    current_task = None
    current_subtask = None

    for line in lines:
        if line.startswith("## "):
            # Phase header
            current_phase = line
            output.append(line)
            current_task = None
            current_subtask = None

        elif line.startswith("#### "):
            # Task header (old format)
            match = re.match(r'####\s+([A-Z0-9.]+):\s*(.*?)\s*\((\d+) hours\)', line)
            if match:
                task_id, title, hours = match.groups()
                indent = "  "  # Level 2
                checkbox = "[ ]"
                output.append(f"{indent}- {checkbox} {task_id}: {title.strip()} ({hours} hours)")
                current_task = task_id
                current_subtask = None

        elif line.startswith("- ["):
            # Checkbox line (keep but fix indent)
            indent = "    "  # Level 3
            output.append(f"{indent}{line}")

        else:
            output.append(line)

    output_path.write_text("\n".join(output))
```

---

## Appendix

### State Transition Diagram

```
    ┌─────────┐
    │  [ ]    │  Pending
    └────┬────┘
         │ starts
         ↓
    ┌─────────┐
    │  [~]    │  In-Progress
    └────┬────┘
         │ completes
         ↓
    ┌─────────┐
    │  [x]    │  Completed
    └─────────┘
```

### Dependency Validation Flow

```
┌─────────────────────┐
│  Start Task X.Y.Z   │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Parse [requires:]  │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ Check each dep      │
│ is [x]?             │
└──────┬──────────────┘
       │
   ┌───┴───┐
   │       │
  Yes      No
   │       │
   ↓       ↓
┌──────┐ ┌──────────┐
│EXECUTE│ │  BLOCK   │
└──────┘ │  Error   │
         └──────────┘
```

### FAQ

**Q: What if a dependency doesn't exist?**
A: Parser error. Task cannot execute.

**Q: Can I have circular dependencies?**
A: No. Parser detects and rejects.

**Q: What happens if I manually edit todo.md?**
A: Handlers re-parse on each run. Manual edits respected.

**Q: Can I skip dependencies?**
A: Only with `--force` flag (dangerous, requires confirmation).

**Q: How do I mark a task in-progress manually?**
A: Edit todo.md, change `[ ]` to `[~]`. Handlers will respect it.

---

**Version**: 2.0
**Status**: Proposed
**Next Steps**: Implement handlers → Migrate existing data → Test
