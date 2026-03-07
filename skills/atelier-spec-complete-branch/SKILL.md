---
name: atelier-spec-complete-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - handles worktree cleanup, graphite stacked PRs, and presents structured completion options
user-invocable: false
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow. Integrates with Graphite for stacked PRs and worktree for cleanup.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the atelier-spec-complete-branch skill to complete this work."

## When to Use

**Use when:**
- All implementation tasks complete
- All tests passing
- Ready to integrate work
- Need to decide between merge/PR/discard

**Don't use when:**
- Tests still failing
- Work incomplete
- Still iterating on implementation

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 3: Check for Graphite Stack

**If using Graphite for stacked PRs:**

```bash
# Check if in a stack
gt log 2>/dev/null
```

**If stack exists:**
- Note the number of branches in stack
- This affects options presentation

### Step 4: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Submit Graphite stack (all <N> PRs) / Merge locally
2. Push and create Pull Request(s)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 5: Execute Choice

#### Option 1: Submit Graphite Stack (or Merge Locally)

**If Graphite stack exists:**

```bash
# Submit all PRs in stack
gt submit

# Report
Stack submitted: <N> PRs created/updated
PRs: <links>
```

Then: Cleanup worktree (Step 6)

**If NO Graphite stack:**

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 6)

#### Option 2: Push and Create PR(s)

```bash
# Push branch
git push -u origin <feature-branch>

# If Graphite stack exists, use gt submit instead
if command -v gt &> /dev/null; then
  gt submit
else
  # Single PR
  gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] Verification steps
EOF
)"
fi
```

Then: Cleanup worktree (Step 6)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 6)

### Step 6: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

Also check for worktree directory:
```bash
# Check if worktree directory exists
ls -d .worktrees/* 2>/dev/null || ls -d worktrees/* 2>/dev/null
```

**Prompt user:**
```
Worktree directory exists at <path>. Remove it? (y/n)
```

If yes, remove the worktree:
```bash
rm -rf <worktree-path>
```

**For Option 3:** Keep worktree.

## Quick Reference

| Option | Graphite | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|----------|-------|------|---------------|----------------|
| 1. Stack/Merge | ✓ or - | ✓ | - | - | ✓ |
| 2. PR(s) | ✓ or - | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | - | ✓ | - |
| 4. Discard | - | - | - | - | ✓ (force) |

## Common Mistakes

### Skipping test verification

- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

### Open-ended questions

- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

### Automatic worktree cleanup

- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4, prompt for Option 1

### No confirmation for discard

- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

### Not checking Graphite stack

- **Problem:** Offer wrong option (e.g., single PR when stack exists)
- **Fix:** Check `gt log` before presenting options

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Skip Graphite check if stack exists

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Cleanup worktree for Options 1 & 4
- Check for Graphite stack first

## Integration

**Called by:**
- **atelier-spec-parallel-execution** (Step 5) - After all tasks complete
- **/spec:complete** - After feature implementation complete

**Pairs with:**
- **atelier-spec-worktree** - Cleans up worktree created by that skill
- **atelier-spec-graphite** - Handles stacked PR submission

## Example Workflow

```
You: I'm using the atelier-spec-complete-branch skill to complete this work.

[Verify tests - 47 passing]
[Check gt log - found stack with 4 branches]
[Determine base branch - main]

Implementation complete. What would you like to do?

1. Submit Graphite stack (4 PRs) / Merge locally
2. Push and create Pull Request(s)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

User: 1

[gt submit]
Stack submitted: 4 PRs created/updated
PRs:
- https://github.com/org/repo/pull/101 (entity)
- https://github.com/org/repo/pull/102 (repo) 
- https://github.com/org/repo/pull/103 (service)
- https://github.com/org/repo/pull/104 (router)

Worktree directory exists at .worktrees/auth. Remove it? (y/n)

User: y

[git worktree remove .worktrees/auth]
[rm -rf .worktrees/auth]

Worktree cleaned up. Complete!
```
