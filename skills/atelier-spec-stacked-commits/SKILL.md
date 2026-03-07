---
name: atelier-spec-stacked-commits
description: Manage dependency-ordered branches and stacked PRs. Use when implementing features layer-by-layer (Entity → Repository → Service → Router), creating stacked pull requests, or handling review feedback across dependent changes.
user-invocable: false
---

# Graphite Stacked PRs

## Overview

Graphite CLI (`gt`) automates stacked pull request workflows. Perfect for spec-driven development where each layer depends on the previous.

**Core concept:** Each implementation layer becomes a stacked PR:
```
PR 1: Entity layer (base - no dependencies)
  ↓
PR 2: Repository layer (stacked on Entity)
  ↓
PR 3: Service layer (stacked on Repository)
  ↓
PR 4: Router layer (stacked on Service)
```

**Announce at start:** "I'm using the atelier-spec-stacked-commits skill to manage stacked PRs."

## Core Concepts

### Terminology

| Term | Definition |
|------|------------|
| **Stack** | Sequence of dependent branches/PRs |
| **Trunk** | Main branch (main/master) - base of stack |
| **Parent** | Branch immediately below in stack |
| **Child** | Branch immediately above in stack |
| **Upstack** | Moving toward trunk (older changes) |
| **Downstack** | Moving away from trunk (newer changes) |

### Stacking Pattern for Atelier

```
main
  └── feature/auth/entity    ← PR #1: Entity layer (base)
        └── feature/auth/repo    ← PR #2: Repository layer
              └── feature/auth/service  ← PR #3: Service layer
                    └── feature/auth/router   ← PR #4: Router layer
```

**Each layer only depends on the layer below it.**

## Prerequisites

### Install Graphite CLI

```bash
# macOS
brew install graphite-cli

# Other platforms
pip install graphite-cli

# Verify
gt --version
```

### Authenticate

```bash
gt auth login
```

## Command Reference

### gt create

Create a new branch in the stack:

```bash
# First branch in stack (off trunk)
gt create "entity-layer" --message "Implement UserEntity with validation"

# Subsequent branches (stacked on current)
gt create "repo-layer" --message "Implement UserRepository with CRUD"
```

**Flags:**
- `--message` / `-m`: Commit message (becomes PR title)
- `--dry-run`: Show what would happen without executing

### gt submit

Submit entire stack as PRs:

```bash
# Create/update PRs for all branches in stack
gt submit
```

**What it does:**
- Creates PR for each branch if not exists
- Updates existing PRs if commits changed
- Stacks PRs using GitHub's parent PR API

### gt log

Visualize current stack:

```bash
gt log
```

Output:
```
◉ feature/auth/router   Service + Router implementation
├─◉ feature/auth/service   Service layer for user operations
  └─◉ feature/auth/repo     UserRepository with CRUD operations
    └─◉ feature/auth/entity  UserEntity with validation
```

### gt modify

Amend commits in stack (handles rebasing):

```bash
# Modify current branch
gt modify --message "Updated validation logic"

# Amend without changing message
gt modify --amend
```

**Why use gt modify instead of git commit --amend?**
- Automatically rebases all child branches
- Updates all PRs in stack
- Handles the complex rebase logic

### gt sync

Sync stack with remote/trunk:

```bash
# Fetch trunk and rebase
gt sync

# Sync and submit
gt sync --submit
```

### gt branch

Manage branches:

```bash
# Move to parent branch
gt branch parent

# Move to child branch
gt branch child

# Move to specific branch
gt branch feature/auth/entity
```

## Workflow Patterns

### Pattern 1: New Feature Implementation

**Step 1: Start with Entity layer**

```bash
gt create "entity-user" -m "Implement UserEntity with fromRequest, validate, toRecord"
# Creates branch off main, ready for PR
```

**Step 2: Implement, commit, stack next**

```bash
# Write code...
git add -A
git commit -m "Implement UserEntity"

# Create next layer stacked on current
gt create "repo-user" -m "Implement UserRepository with CRUD"
```

**Step 3: Continue for each layer**

```bash
# Entity done, move to Repository
gt create "repo-user" -m "Implement UserRepository"

# Repository done, move to Service
gt create "service-user" -m "Implement UserService"

# Service done, move to Router
gt create "router-user" -m "Implement user routes"
```

**Step 4: Submit entire stack**

```bash
gt submit
```

### Pattern 2: Review Feedback

**When PR #1 (Entity) gets review comments:**

```bash
# Make changes
vim src/entity/user.ts
git add -A

# Amend (not regular commit!)
gt modify --amend

# Graphite automatically:
# - Rebases all child branches
# - Updates all stacked PRs
```

### Pattern 3: Handle Trunk Changes

**When main has new commits:**

```bash
# Sync with trunk
gt sync

# Graphite automatically:
# - Fetches latest main
# - Rebases entire stack
# - Updates all PRs
```

## Integration with Spec Workflow

### Layer-to-PR Mapping

Each implementation layer maps to a stacked PR:

| Beads Task | Graphite Branch | PR |
|------------|-----------------|-----|
| Entity task | `feature/<name>/entity` | PR #1 (base) |
| Repository task | `feature/<name>/repo` | PR #2 (stacked) |
| Service task | `feature/<name>/service` | PR #3 (stacked) |
| Router task | `feature/<name>/router` | PR #4 (top) |

### Called by

- **atelier-spec-complete** - When completing feature work
- **/spec:complete** - After all tasks done, before cleanup

### Required after

- **atelier-spec-worktrees** - Worktree created, ready for stacked PRs
- Implementation tasks complete for each layer

## Common Mistakes

### Using git rebase directly

**Problem:** Breaks stack relationships, orphans child branches
**Fix:** Use `gt modify` instead

### Creating branches off feature branches

**Problem:** Creates complex dependency graph
**Fix:** Always stack off the layer immediately below

### Not using gt modify for amendments

**Problem:** Child branches become stale, PRs out of sync
**Fix:** Always use `gt modify` for any changes in stack

### Submitting before tests pass

**Problem:** CI fails on stacked PRs
**Fix:** Verify tests in worktree before `gt submit`

## Red Flags

**Never:**
- Use `git rebase` instead of `gt modify`
- Create branches not following layer order
- Submit with failing tests
- Force push (`gt` handles this)

**Always:**
- Use `gt create` for new branches in stack
- Use `gt modify` for amendments
- Use `gt sync` to handle trunk changes
- Test locally before submitting

## Quick Reference

```bash
# Start stack
gt create "entity-user" -m "Implement UserEntity"

# Continue stack
gt create "repo-user" -m "Implement UserRepository"

# View stack
gt log

# Amend (NOT git commit --amend!)
gt modify --amend

# Submit all PRs
gt submit

# Sync with trunk
gt sync

# Navigate stack
gt branch parent
gt branch child
```

## Non-Interactive Mode

For agent/automation use:

```bash
gt create "branch-name" -m "message" --no-interactive
gt submit --no-interactive
gt sync --no-interactive
```

## References

- [references/graphite-workflow.md](references/graphite-workflow.md) - Detailed Graphite workflow patterns
