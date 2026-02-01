---
name: beads
description: Beads CLI for dependency-aware task tracking. Use when managing tasks, checking progress, finding ready work, handling dependencies, or integrating with spec workflows.
user-invocable: false
---

# Beads Task Tracker

Dependency-aware task management integrated with spec workflows. Tasks are stored in `.beads/beads.jsonl` and persist across sessions via git.

## Overview

Beads enforces implementation order through dependency tracking:
- **Dependency-driven execution** - `bd ready` surfaces only unblocked tasks
- **Bottom-up enforcement** - Dependencies ensure Entity → Repository → Service → Router
- **Git-backed persistence** - `.beads/beads.jsonl` tracks all tasks and status
- **Spec integration** - Commands like `/spec:plan` auto-create epics with ordered tasks

## Core Workflow Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `bd init` | Initialize Beads in project | `bd init` |
| `bd create <name>` | Create task or epic | `bd create "Implement UserEntity" -t task -p 2 -l entity,user` |
| `bd ready` | Find next unblocked task | `bd ready --label user --json` |
| `bd update <id>` | Update task status/fields | `bd update task-123 --status in_progress` |
| `bd close <id>` | Mark task complete | `bd close task-123 --reason "Implemented with tests"` |
| `bd list` | Show all tasks | `bd list --json` or `bd list --label feature` |

### Task Types and Priority

**Types** (`-t` flag):
- `epic` - Feature or change container
- `task` - Implementation work (default)

**Priority** (`-p` flag):
- `1` - High (epics)
- `2` - Normal (implementation tasks)
- `3` - Low (nice-to-have)

**Labels** (`-l` flag):
- Feature name: `user`, `auth`, `billing`
- Layer: `entity`, `repository`, `service`, `router`
- Type: `feature`, `change`, `bug`

## Dependency Management

Dependencies enforce execution order and identify blocking relationships.

### Dependency Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `bd dep add <task> <blocks>` | Task blocks another | `bd dep add task-1 task-2 --type blocks` |
| `bd dep list` | Show all dependencies | `bd dep list --json` |
| `bd dep list <id>` | Show task dependencies | `bd dep list task-123` |
| `bd dep tree` | Visualize dependency tree | `bd dep tree` |

### Dependency Types

- `blocks` - Task must complete before dependent can start
- `discovered-from` - Task identified during another task
- `related-to` - Informational relationship

### Finding Blocked Tasks

```bash
# Show only blocked tasks
bd list --json | jq '.[] | select(.blocked == true)'

# Find tasks blocking a specific task
bd dep list task-123
```

## Task Organization

### Epic Structure

Epics contain related tasks for a feature or change:

```bash
# Create epic
bd create "Feature: User Management" -t epic -p 1 -l feature,user

# Create tasks in epic
bd create "Implement UserEntity" -t task -p 2 -l entity,user -e epic-1
bd create "Implement UserRepository" -t task -p 2 -l repository,user -e epic-1

# Add dependencies (Repository depends on Entity)
bd dep add task-1 task-2 --type blocks
```

### Status Transitions

Tasks flow through these states:
1. `pending` - Created, not yet started
2. `in_progress` - Actively being worked
3. `done` - Completed successfully

Update status explicitly:
```bash
bd update task-123 --status in_progress
bd close task-123  # Transitions to done
```

## Spec Command Integration

Spec commands automatically manage Beads for workflow enforcement.

### /spec:plan <feature> [change]

Creates implementation plan with Beads epic and tasks:

**Reads:**
- `docs/spec/<feature>/spec.md` - Technical design
- `docs/spec/<feature>/changes/<change>/design.md` - Change design

**Creates:**
- `docs/spec/<feature>/changes/<change>/plan.json` - Task list with dependencies
- `docs/spec/<feature>/changes/<change>/delta.md` - ADDED/MODIFIED/REMOVED
- Beads epic with label `<feature>`
- Beads tasks ordered by layer dependencies

**Dependencies:**
- Entity tasks have no dependencies (bottom layer)
- Repository tasks depend on Entity tasks
- Service tasks depend on Repository tasks
- Router tasks depend on Service tasks

### /spec:work [feature]

Implements next ready task:

**Finds ready task:**
```bash
bd ready --label <feature> --json  # If feature specified
bd ready --json                     # Any feature if not specified
```

**Marks in progress:**
```bash
bd update <task-id> --status in_progress
```

**After implementation:**
```bash
bd close <task-id> --reason "Implemented with layer boundary tests"
```

### /spec:status [feature]

Reports progress using Beads data:

**Queries tasks:**
```bash
bd list --label <feature> --json  # Feature status
bd list --json                     # All features
```

**Calculates metrics:**
- Completion percentage: `completed / total * 100`
- Ready task count: `bd ready --label <feature> | wc -l`
- Blocked task identification from dependencies

**Reports:**
- Total/completed/in-progress/blocked/ready counts
- Next ready tasks
- Dependency blockers
- Recommended next action

### /spec:complete <feature> <change>

Archives completed work:

**Verifies all tasks done:**
```bash
bd list --label <feature> --json
# All tasks must have status: done
```

**After merging delta to spec:**
- Beads epic remains (git history)
- Beads tracks completion metrics
- Change folder deleted (git preserves history)

## Common Patterns

### Pattern: Create Epic and Tasks

```bash
# 1. Create epic
bd create "Feature: User Auth" -t epic -p 1 -l feature,auth

# 2. Create layer tasks in dependency order
bd create "Implement UserEntity" -t task -p 2 -l entity,auth -e epic-1
bd create "Implement UserRepository" -t task -p 2 -l repository,auth -e epic-1
bd create "Implement AuthService" -t task -p 2 -l service,auth -e epic-1
bd create "Implement auth routes" -t task -p 2 -l router,auth -e epic-1

# 3. Add bottom-up dependencies
bd dep add task-1 task-2 --type blocks  # Entity blocks Repository
bd dep add task-2 task-3 --type blocks  # Repository blocks Service
bd dep add task-3 task-4 --type blocks  # Service blocks Router
```

### Pattern: Implementation Work Loop

```bash
# 1. Find next ready task
bd ready --label auth --json

# 2. Start work
bd update task-1 --status in_progress

# 3. Implement with tests (Stub→Test→Fix)
# ... code implementation ...

# 4. Complete task
bd close task-1 --reason "Entity implemented with validation tests"

# 5. Repeat
bd ready --label auth --json
```

### Pattern: Check Progress

```bash
# Feature-specific progress
bd list --label auth --json | jq '{
  total: length,
  done: [.[] | select(.status == "done")] | length,
  in_progress: [.[] | select(.status == "in_progress")] | length,
  blocked: [.[] | select(.blocked == true)] | length
}'

# All features overview
bd list --json | jq 'group_by(.labels[] | select(. == "feature"))
  | map({feature: .[0].labels[1], tasks: length})'
```

### Pattern: Handle Discovered Work

During implementation, create new tasks for edge cases:

```bash
# Create new task
bd create "Add email validation edge case" -t task -p 2 -l entity,auth

# Link to task where discovered
bd dep add task-5 task-1 --type discovered-from
```

## JSON Output

All commands support `--json` for programmatic access:

```bash
# Task structure
{
  "id": "task-123",
  "name": "Implement UserEntity",
  "type": "task",
  "status": "pending",
  "priority": 2,
  "labels": ["entity", "user"],
  "epic": "epic-1",
  "created": "2024-01-15T10:30:00Z",
  "updated": "2024-01-15T10:30:00Z",
  "blocked": false,
  "dependencies": []
}
```

Parse with `jq` for filtering:
```bash
# Ready tasks
bd ready --json | jq '.[0].id'

# Completed tasks
bd list --json | jq '[.[] | select(.status == "done")] | length'

# Tasks by layer
bd list --json | jq 'group_by(.labels[] | select(. == "entity" or . == "repository"))'
```

## Quick Reference

```bash
# Setup
bd init                                    # Initialize Beads

# Task Creation
bd create "Task name" -t task -p 2 -l feature  # Create task
bd create "Epic name" -t epic -p 1 -l feature  # Create epic

# Task Management
bd ready                                   # Find next task
bd ready --label feature                   # Feature-specific
bd update task-123 --status in_progress    # Start work
bd close task-123                          # Complete work

# Progress Tracking
bd list                                    # All tasks
bd list --label feature                    # Feature tasks
bd list --json                             # JSON output

# Dependencies
bd dep add task-1 task-2 --type blocks     # Add dependency
bd dep list task-123                       # Show dependencies
bd dep tree                                # Visualize tree

# Spec Integration
/spec:plan feature                         # Create Beads epic
/spec:work feature                         # Start next ready task
/spec:status feature                       # Check progress
/spec:complete feature change              # Archive work
```
