---
name: atelier-spec-planning
description: Create implementation plans with bite-sized tasks. Use when breaking down features into actionable tasks, creating task breakdowns, or preparing for implementation.
user-invocable: false
---

# Planning Skill

Create implementation plans with bite-sized tasks. Break down features into atomic, actionable pieces that can be implemented and verified independently.

## Overview

Planning transforms a design into a sequence of tasks. Good plans have:
- Tasks that can be completed in 2-5 minutes by a subagent
- Clear dependencies between tasks
- Verification criteria for each task
- Domain boundary focus per task

## Plan Document Header

Every plan should start with this header:

```markdown
**Goal:** [One sentence describing what we're building]

**Context:** [What we know - research findings, existing code, constraints]

**Constraints:** [Time, scope, technical limitations]

**Success Criteria:** [How we know we're done]
```

## Task Structure Template

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

## Execution Handoff

### Subagent Execution
- Sequential tasks with dependencies
- Complex implementations requiring context
- When you need to answer questions before work

### Parallel Execution
- Independent tasks (no shared state)
- Multiple similar tasks
- When tasks don't depend on each other

### Context to Provide
- Full task text with description
- Relevant code snippets (don't make subagent read files)
- Expected outcomes and verification steps
- Any constraints or preferences

## Key Principles

- **Bite-sized** - 2-5 minute tasks for subagents
- **Independent** - Each task can be completed standalone
- **Verifiable** - Clear success criteria for each task
- **Ordered** - Dependencies resolved, domain boundaries respected

## When Planning Is Complete

A plan is complete when:
- Every task has a clear domain boundary
- Dependencies are explicit
- Verification criteria are defined
- Tasks are 2-5 minutes each
- You can hand off to a subagent or parallel execution

## Integration

**Called by:**
- Architect skill (after design)
- Product skill (when features are large)

**Feeds into:**
- Parallel execution skill (for task execution)
- Subagent-driven development (for sequential execution)
