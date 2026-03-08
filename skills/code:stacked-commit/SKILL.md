---
name: code:stacked-commit
description: Manage stacked commits using Graphite. Use when the user wants to create multiple stacked commits, manage a commit stack, sync with remote, or submit PRs from a stack. Triggers on "stacked", "stack", "gt ", "graphite", or when working with multiple related commits.
user-invocable: true
---

# Stacked Commit Skill (Graphite)

Manage stacked commits using [Graphite](https://graphite.dev) - a CLI for creating and managing stacked PRs.

## When to Use

- User wants to break work into multiple small, reviewable commits
- Working with stacked commits (multiple commits stacked on each other)
- Syncing and submitting stacked PRs

## Prerequisites

Ensure Graphite is installed:
```bash
brew install graphite-dev || npm install -g @graphite-dev/cli
```

## Core Operations

### 1. View Current Stack

```bash
gt stack
```

Shows all branches in the stack with their status (synced, to-push, in-progress).

### 2. Create a New Commit

```bash
gt branch create "feat(auth): add JWT authentication"
```

This:
1. Creates a new branch on top of the current stack
2. Opens editor for commit message (or use `-m` for inline)
3. Commits the staged changes

**Works best when you:**
- Stage specific files: `git add file1 file2`
- Then create commit: `gt branch create "feat: add feature"`
- Repeat for each logical unit of work

### 3. Restack (Rebase onto Main)

```bash
gt branch restack
```

Rebases all branches in the stack onto the latest main. Use before submitting or when main has advanced.

### 4. Sync with Remote

```bash
gt branch sync
```

Pull latest changes from remote and restack.

### 5. Submit Stack as PRs

```bash
gt branch submit
```

Creates PRs for each branch in the stack. Opens browser to create the first PR; subsequent PRs link to it.

### 6. Continue Working on Branch

If you need to add more changes to a specific commit:

```bash
# Make your changes, stage them
git add .

# Amend to current branch
gt branch continue
```

### 7. Navigate Stack

```bash
# Go to parent branch
gt branch checkout @parent

# Go to child branch  
gt branch checkout @child
```

## Workflow Example

```
# Start new feature work
git checkout main
gt branch create "feat(api): add user endpoint"

# Add user endpoint code
git add src/users/
gt branch continue  # Amend to current commit

# Create next commit in stack
gt branch create "feat(api): add user validation"

# Add validation code  
git add src/validation/
gt branch continue

# View stack
gt stack

# Restack before submit
gt branch restack

# Submit all as stacked PRs
gt branch submit
```

## Best Practices

1. **One logical change per commit** - Each commit should be reviewable independently
2. **Meaningful commit messages** - Use conventional commit format
3. **Restack before submit** - Always `gt branch restack` before submitting to ensure clean history
4. **Keep stack small** - Deep stacks can be hard to manage; 3-5 commits is ideal
5. **Sync regularly** - Run `gt branch sync` often when working with others

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Conflicts during restack | Resolve in editor, then `gt branch continue` |
| Stack broken | `gt branch repair` to fix detached HEAD |
| Too many branches | `gt branch delete <name>` to remove (won't delete remote) |

## Commit Message Format

Follow conventional commits within the Graphite workflow:

```
<type>(<scope>): <subject>

[optional body]
```

Examples:
```
feat(api): add user profile endpoint
fix(db): resolve connection pool exhaustion
docs(readme): update installation instructions
```
