---
name: atelier-spec-using-atelier
description: Companion guide for atelier-spec skills. Use when working on spec-driven development, planning features, implementing from specs, or completing development work. Load this skill proactively for any spec-related task.
user-invocable: false
---

# Atelier Spec Skills Reference

This skill provides a reference of available `atelier-spec-*` skills in `skills/atelier-spec-*/`. Use this to find the right skill for your current task.

## Available Skills

| Skill | When to Use |
|-------|-------------|
| `atelier-spec-research` | Starting a new feature, conducting discovery interviews, or creating technical design |
| `atelier-spec-planning` | Breaking down features into actionable tasks with Beads tracking |
| `atelier-spec-implement` | Implementing features using Stub-Driven TDD workflow |
| `atelier-spec-verification` | Verifying work is complete, running tests, checking results |
| `atelier-spec-stacked-commits` | Creating stacked pull requests with dependent branches |
| `atelier-spec-worktrees` | Creating isolated git workspaces for parallel development |
| `atelier-spec-parallel-execution` | Running multiple independent tasks concurrently |
| `atelier-spec-complete` | Finishing development work and integrating to main |

## Workflow

The skills follow the spec-driven development flow:

1. **Research** → **Planning** → **Implement** → **Verification** → **Complete**
2. Use **Worktrees** to isolate feature work
3. Use **Stacked Commits** for layer-by-layer PRs (Entity → Repository → Service → Router)
4. Use **Parallel Execution** when multiple independent tasks can run together

### Stacked Commits Flow

1. **During implementation**: Create stacked branches layer-by-layer with `gt create`
2. **At completion**: Submit all PRs together with `gt submit`
3. **Review & merge**: One at a time, bottom-up (Entity → Repository → Service → Router)
   - When PR #1 merges, Graphite auto-rebases the stack
