---
name: atelier-spec-planning
description: Create implementation plans with bite-sized tasks and Beads tracking. Use when breaking down features into actionable tasks. Outputs a plan file.
user-invocable: true
---

# Planning Skill

Create implementation plans with bite-sized tasks and Beads integration.

## Overview

Planning transforms a PRD into a sequence of tasks with dependency tracking. Good plans have:
- Tasks that can be completed in 2-5 minutes by a subagent
- Clear dependencies between tasks
- Verification criteria for each task
- Domain boundary focus per task

## Part 1: Plan Document Format

### Plan Document Header

Every plan should start with this header:

```markdown
**Goal:** [One sentence describing what we're building]

**Context:** [What we know - research findings, existing code, constraints]

**Constraints:** [Time, scope, technical limitations]

**Success Criteria:** [How we know we're done]
```

### Task Structure Template

```markdown
### Task N: [Task name]

**Domain Boundary:** [Router|Service|Repository|Entity|Database]

**Description:** [What this task does in 1-2 sentences]

**Dependencies:** [What must be done first]

**Verification:** [How to verify it works - run X, see Y]

**Commit:** [Conventional commit message]
```

### Domain Boundary Reference

| Boundary | What it means |
|----------|---------------|
| **Entity** | Domain models, validation, business rules |
| **Repository** | Data access, database operations |
| **Service** | Business logic orchestration |
| **Router** | API endpoints, HTTP handling |
| **Database** | Schema, migrations |

### Execution Handoff

**Subagent Execution:**
- Sequential tasks with dependencies
- Complex implementations requiring context
- When you need to answer questions before work

**Parallel Execution:**
- Independent tasks (no shared state)
- Multiple similar tasks
- When tasks don't depend on each other

**Context to Provide:**
- Full task text with description
- Relevant code snippets (don't make subagent read files)
- Expected outcomes and verification steps
- Any constraints or preferences

### Key Principles

- **Bite-sized** - 2-5 minute tasks for subagents
- **Independent** - Each task can be completed standalone
- **Verifiable** - Clear success criteria for each task
- **Ordered** - Dependencies resolved, domain boundaries respected

### When Planning Is Complete

A plan is complete when:
- Every task has a clear domain boundary
- Dependencies are explicit
- Verification criteria are defined
- Tasks are 2-5 minutes each
- You can hand off to a subagent or parallel execution

## Part 2: Beads Integration

Beads enforces implementation order through dependency tracking.

### Core Workflow Commands

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

### Dependency Management

**Dependency Commands:**

| Command | Purpose | Example |
|---------|---------|---------|
| `bd dep add <task> <blocks>` | Task blocks another | `bd dep add task-1 task-2 --type blocks` |
| `bd dep list` | Show all dependencies | `bd dep list --json` |
| `bd dep list <id>` | Show task dependencies | `bd dep list task-123` |
| `bd dep tree` | Visualize dependency tree | `bd dep tree` |

**Dependency Types:**
- `blocks` - Task must complete before dependent can start
- `discovered-from` - Task identified during another task
- `related-to` - Informational relationship

### Task Organization

**Epic Structure:**

```bash
# Create epic
bd create "Feature: User Management" -t epic -p 1 -l feature,user

# Create tasks in epic
bd create "Implement UserEntity" -t task -p 2 -l entity,user -e epic-1
bd create "Implement UserRepository" -t task -p 2 -l repository,user -e epic-1

# Add dependencies (Repository depends on Entity)
bd dep add task-1 task-2 --type blocks
```

**Status Transitions:**
Tasks flow through these states:
1. `pending` - Created, not yet started
2. `in_progress` - Actively being worked
3. `done` - Completed successfully

Update status explicitly:
```bash
bd update task-123 --status in_progress
bd close task-123  # Transitions to done
```

### Common Patterns

**Create Epic and Tasks:**

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

### Quick Reference

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
```

## Output

- `docs/plans/YYYY-MM-DD-<feature>.md` - Implementation plan
- Beads epic with dependency-ordered tasks
