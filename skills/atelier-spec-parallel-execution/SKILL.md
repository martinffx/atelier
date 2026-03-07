---
name: atelier-spec-parallel-execution
description: Execute plans with parallel agents. Use when running multiple independent tasks concurrently, dispatching subagents for parallel work, or implementing multiple features simultaneously.
user-invocable: false
---

# Parallel Execution Skill

Execute plans with parallel agents. Run multiple independent tasks concurrently when tasks don't share state.

## The Process

### Step 1: Verify Independence

Before parallel execution, confirm tasks have no shared state:
- Don't write to the same file
- Don't depend on each other's output
- Don't modify shared configuration
- Don't use same variable names

If tasks share state → Execute sequentially, not in parallel.

### Step 2: Dispatch Subagents

For each independent task:
1. Provide full task text
2. Include relevant code context
3. Specify verification criteria
4. Define commit message

### Step 3: Wait for Completion

All subagents must complete before proceeding:
- Track completion status
- Handle failures individually
- Don't proceed until all done

### Step 4: Verify Results

After parallel execution:
- Each task has its own verification
- Check for conflicts or overlaps
- Verify no state conflicts occurred

### Step 5: Handle Issues

If issues arise:
- Fix individually (don't re-run all parallel)
- Verify fix doesn't break other parallel work
- Re-run affected tasks only

## When to Use Parallel

**Good for parallel:**
- Multiple entity implementations (no shared code)
- Multiple API endpoints (independent routes)
- Multiple test files (independent coverage)
- Multiple utility functions (no dependencies)

**Bad for parallel:**
- Tasks that depend on each other
- Tasks that modify same files
- Tasks that share database state
- Tasks that share configuration

## When to Stop

Stop parallel execution when:
- Tasks are no longer independent
- Conflicts emerge between tasks
- Shared state is required
- Complexity exceeds parallel benefit

## When to Revisit

Revisit the plan when:
- Parallel execution reveals hidden dependencies
- Tasks need to be re-ordered
- New tasks are discovered
- Scope changes

## Remember

- **Domain boundaries define test boundaries** - Test at boundaries, mock at boundaries
- **Independent tasks only** - If tasks share state, run sequentially
- **Verify each result** - Don't assume parallel worked perfectly

## Integration

**With OpenCode:**
- Use Task tool with subagent_type: "general" for each parallel task
- Track results in TodoWrite
- Verify each independently before marking complete

**With Planning:**
- Planning skill provides independent tasks
- Verify tasks are actually independent before parallelizing
