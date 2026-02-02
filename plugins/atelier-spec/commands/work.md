# Implementation: $ARGUMENTS

Optional format: `<feature>` or empty (any ready task)

## Step 1: Check Beads and Find Ready Task

<skill-prompt>
Load: beads
</skill-prompt>

@atelier-clerk check Beads installation and find next ready task.

Check Beads:
```bash
bd --version
```
- If command fails → ERROR: "Beads not found. Install with: npm install -g @beads/bd, then run: bd init"

Find ready task:

**If feature specified:**
```bash
bd ready --label $ARGUMENTS --json
```

**If no arguments:**
```bash
bd ready --json
```

Parse result:
- If no ready tasks → REPORT: "No ready tasks. Check status: /spec:status [feature]"
- If ready tasks found → Select first task

Mark task in progress:
```bash
bd update <task-id> --status in_progress
```

## Step 2: Load Implementation Context

@atelier-clerk load all necessary context for implementation.

Identify task type from labels:
- Feature task (initial): Changes are in `changes/initial/`
- Change task: Changes are in `changes/<change>/`

Read specifications:

**If initial feature task:**
- `docs/spec/<feature>/spec.md` → complete requirements and design
- `docs/spec/<feature>/changes/initial/delta.md` → what to implement (all ADDED)

**If change task:**
- `docs/spec/<feature>/spec.md` → current baseline
- `docs/spec/<feature>/changes/<change>/design.md` → change design
- `docs/spec/<feature>/changes/<change>/delta.md` → ADDED/MODIFIED/REMOVED

Read standards:
- `docs/standards/coding.md` → implementation patterns and testing
- `docs/standards/tech.md` → layered architecture patterns

Extract from spec/design/delta:
- Entity definitions and methods
- Service operations
- Repository methods
- API endpoints
- Database schema
- Events

## Step 2b: Check for Overlapping Work

@atelier-clerk check for potential conflicts with in-progress tasks.

Query all in-progress tasks:
```bash
bd list --status in_progress --json
```

For each in-progress task (excluding current task):
- Extract affected layer/component from task labels
- Compare with current task's target layer/component
- Check if tasks modify the same files or components

**If conflicts found:**
```
⚠️ Potential Overlap Detected

Current task: <current-task-id> - <current-task-name>
Target: <layer>/<component>

Conflicting tasks:
- <task-id>: <task-name> (also modifying <component>)

Risk: Merge conflicts or integration issues possible.

Options:
1. CONTINUE - Proceed with awareness of overlap
2. WAIT - Complete conflicting task first
3. COORDINATE - Review both tasks together

Enter choice:
```

[Wait for user response]

If no conflicts → Proceed to Step 3

## Step 3: Create Implementation Plan

<skill-prompt>
Load: spec:testing, spec:architect
</skill-prompt>

@atelier-architect analyze task and create detailed implementation plan with todos.

Based on loaded context (spec, design, delta, standards):

**Analyze task scope:**
- Which files need to be created/modified?
- What are the specific code changes needed?
- What tests need to be written?
- What's the implementation order?

**Create implementation todos using TodoWrite:**

Generate granular implementation steps as todos:
1. Stub: Create file structure with NotImplementedError placeholders
2. Test: Write tests for the component
3. Implement: Fill in actual implementation
4. Verify: Run tests and fix failures
5. Refactor: Clean up if needed

**Present implementation plan:**

```
Implementation Plan
===================

Task: <task-id> - <task-name>
Layer: <entity|repository|service|router>
Feature: <feature-name>

Files to create/modify:
- src/<path>/<file>.ts - <description>
- src/<path>/<file>.test.ts - <tests>

Implementation steps (now tracked as todos):
1. [pending] Create <component> stub with NotImplementedError
2. [pending] Write <component> tests
3. [pending] Implement <component> logic
4. [pending] Run tests and fix failures
5. [pending] Update related imports/exports

Estimated complexity: <low|medium|high>
Dependencies: <any external dependencies>
```

**Confirm before proceeding:**
"Plan created with {{todo_count}} todos. Ready to implement? (y/n)"

[Wait for user confirmation]

If user declines → EXIT with "Run /spec:work again when ready"

## Step 4: Implement Using Stub→Test→Fix Pattern

@atelier-architect implement task following the plan, updating todos as you progress.

**For each todo item:**
1. Mark todo as `in_progress`
2. Implement the change
3. Mark todo as `completed`
4. Move to next todo

**Stub Phase:**
- Create file with proper structure
- Add NotImplementedError / throw new Error('Not implemented') placeholders
- Define interfaces/types

**Test Phase:**
- Write tests based on acceptance criteria
- Cover happy path and edge cases
- Tests should fail initially (red)

**Implement Phase:**
- Fill in actual implementation
- Follow coding standards from `docs/standards/coding.md`
- Make tests pass (green)

**Refactor Phase:**
- Clean up code if needed
- Ensure no duplication
- Verify all tests still pass

## Step 5: Handle Discovered Work

During implementation, if new tasks are discovered:

**Create new Beads:**
```bash
bd create "Handle <edge case>" -t task -p 2 -l <feature>
bd dep add <new-task-id> <current-task-id> --type discovered-from
```

Examples of discovered work:
- Edge cases not in spec
- Additional validation needed
- Performance optimization required
- Missing error handling
- Integration issues

## Step 6: Mark Task Complete

Verify all quality checks pass and close task.

Run tests:
```bash
npm test # or appropriate test command
```

Verify all passing, then close task:
```bash
bd close <task-id> --reason "Implemented <component> with layer boundary tests"
```

Check for next ready task:
```bash
bd ready --label <feature> --json
```

## Task Complete

Completed: [task description]
- Implementation: [files modified]
- Tests: [test files created/updated]
- Coverage: [percentage if available]
- Todos completed: [X/Y]

Next ready task: [task-id and description] or "None - feature complete"

**Next steps:**

1. Continue next task: `/spec:work [feature]`
2. Check feature progress: `/spec:status [feature]`
3. When all tasks done:
   - Initial feature: `/spec:complete <feature> initial`
   - Change: `/spec:complete <feature> <change>`
