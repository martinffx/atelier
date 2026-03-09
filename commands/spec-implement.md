# Spec Implement: $ARGUMENTS

Purpose: Execute tasks from approved plan

## Prerequisites

- `docs/spec/{feature}/plan.json` exists and is approved by human

## Steps

### Step 1: Load Plan

Read `docs/spec/{feature}/plan.json`
Read `docs/spec/{feature}/spec.md` for context

### Step 2: Find Next Task

Identify next task where all dependencies are satisfied.

Check each task in order:
- If dependencies are empty → ready
- If all dependency IDs are marked done → ready

Select first ready task.

### Step 3: Execute Task

Implement the task following TDD:

1. **Write Test First**
   - Create test file
   - Write failing test for expected behavior

2. **Implement Code**
   - Create implementation file
   - Write code to make test pass

3. **Run Tests**
   - Execute test suite
   - Fix any failures

4. **Refactor** (if needed)
   - Clean up code
   - Ensure tests still pass

### Step 4: Verify

- Run full test suite
- Verify no regressions
- Check lint/typecheck if configured

### Step 5: Mark Complete

Mark task as done in plan.json:
- Update task status to "done"
- Add completion notes if needed

### Step 6: Repeat

Go back to Step 2 and find next ready task.

If no more ready tasks:
- Check if any tasks are in progress
- Report completion status

## Output

- Implemented code and tests
- Updated plan.json with completed tasks

## Completion

When all tasks complete:

**Say:** "Implementation complete! {N} tasks finished. Ready for validation with /spec:finish {feature}?"
