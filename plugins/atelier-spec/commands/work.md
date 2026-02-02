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

## Step 3: Implement Using Stub→Test→Fix Pattern

<skill-prompt>
Load: spec:testing, spec:architect
</skill-prompt>

@atelier-architect implement task following layer boundary testing approach with Stub→Test→Fix pattern.

Follow the testing patterns and architectural standards from the loaded skills to ensure quality implementation.

## Step 4: Handle Discovered Work

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

## Step 5: Mark Task Complete

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

Next ready task: [task-id and description] or "None - feature complete"

**Next steps:**

1. Continue next task: `/spec:work [feature]`
2. Check feature progress: `/spec:status [feature]`
3. When all tasks done:
   - Initial feature: `/spec:complete <feature> initial`
   - Change: `/spec:complete <feature> <change>`
