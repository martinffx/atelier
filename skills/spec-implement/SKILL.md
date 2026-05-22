---
name: spec-implement
description: >
  Execute implementation tasks from an approved plan.json. Use when spec-plan has produced
  approved tasks and the human is ready to start coding. Tracks progress via beads
  (preferred) or harness-native todos, enforces TDD, reports between batches. Trigger when the user says "implement", "go", "start",
  "do it", or after spec-plan completes task creation. Do NOT use without an approved plan —
  invoke spec-plan first.
user-invocable: true
---

# Spec Implement

Pick up tasks. Execute them. Track progress. Report. Stop when blocked.

**Announce at start:** "I'm using the spec-implement skill to execute this plan."

This skill does not make design decisions or modify the plan. If the plan is wrong, go
back to spec-plan. If the design is wrong, go back to spec-brainstorm.

## Prerequisites

Before starting, verify these exist:

1. **Approved spec** — `docs/specs/YYYY-MM-DD-<feature>/design.md`
2. **Approved plan** — `docs/specs/YYYY-MM-DD-<feature>/plan.json`
3. **Tasks created** — In beads, harness todo list, or plan.json task list
4. **Not on main/master** — Never start implementation on main/master without explicit
   user consent. Create a branch or use a git worktree first.

If anything is missing, do not proceed. Tell the human what's needed.

---

## Step 1: Load and Review the Plan

Read plan.json critically before writing code. Look for:

- Unclear or ambiguous tasks
- Missing file paths or incomplete validation criteria
- Tasks that conflict with each other
- Dependencies that don't match what you see in the codebase

If you find concerns, **raise them with the human before starting**. Don't guess. Don't
assume. Don't force through blockers.

If no concerns, create task tracking and proceed.

---

## Step 2: Choose Execution Mode

If the human hasn't specified a mode, ask.

### Autonomous Mode

> "Implement it all. Don't stop until you're done."

- Execute all tasks in dependency order
- Track progress: beads `bd update <id> --status in_progress` → `bd close <id>`, or harness todo list
- Run type checking / linting continuously
- Only stop if blocked

### Batched Mode (default)

> "Do a few tasks at a time."

- Execute 3-5 tasks
- Stop and report: what was done, test output, anything unexpected
- Wait for human feedback before continuing

### Subagent Mode

> "Use subagents."

- Invoke **code-subagents** for dispatch patterns and review cycle
- Fresh subagent per task — no context pollution
- Two-stage review after each: spec compliance, then code quality
- Independent tasks dispatch in parallel, dependent tasks run sequentially

Default to batched if the human hasn't expressed a preference.

---

## Step 3: Execute Tasks

For each task, follow the plan exactly. Find the next ready task:

**With beads (preferred):**
```bash
bd ready --label <feature> --json
```

**With harness todos:**
Check the todo list for the next unblocked task (respecting `depends_on` from plan.json).

Mark it in progress:

**With beads:**
```bash
bd update <task-id> --status in_progress
```

**With harness todos:**
Update the todo status to in_progress.

### For each task
Read the task's **inputs** first — understand what context you need.
Then read the **description** — know what to build and the constraints.

Invoke **oracle-testing** for test design. Write tests that cover the validation
criteria before writing implementation.

```
1. Read task inputs and description
2. Write failing tests (cover validation criteria)
3. Run them — verify they fail for the RIGHT reason
4. Implement minimal code to make tests pass
5. Refactor if needed (tests stay green)
6. Commit (use code-conventional-commit for commit message)
```

Do NOT write implementation before tests. Do NOT skip "verify it fails." Do NOT write
more code than needed to pass the test.

Verify the task against its **validation** — run the tests listed in the task and check
all acceptance criteria are met.

### After each task: Review

Invoke **code-review** to review the implementation before moving to the next task.
This catches issues early rather than accumulating debt across multiple tasks.

### On completion

Mark the task done:

**With beads:**
```bash
bd close <task-id> --reason "Implemented with tests"
```

**With harness todos:**
Mark the task as completed.

### Referencing existing code

When the plan or human references existing implementations ("make it look like the
users table"), read the referenced code before making changes. A reference communicates
all implicit requirements without spelling them out.

---

## Step 4: Report (Batched Mode)

After each batch:

```
Completed: Tasks T1-T3
- T1: UserEntity with validation ✓
- T2: UserEntity tests (6 passing) ✓
- T3: UserRepository ✓

Test output: 6 passed, 0 failed
Type check: clean

Ready for feedback.
```

Wait. Don't continue until the human responds.

---

## Step 5: Handle Feedback

Expect short, terse corrections:

- "You didn't implement `deduplicateByTitle`."
- "This should be in the admin app. Move it."
- "wider" / "still cropped"

Don't ask for elaboration unless genuinely needed.

### Steering patterns

| Pattern | Example | What to do |
|---------|---------|------------|
| Cherry-pick | "Use X for the first one. Ignore the fourth." | Item-level as directed |
| Trim scope | "Skip task T7." | Mark skipped, move on |
| Protect interfaces | "These signatures must not change." | Adapt callers |
| Override | "Use the library's built-in method." | Direct override |
| Revert | "I reverted. Now just do X." | Respect narrowed scope |

### On revert

If the human reverts git changes and re-scopes, respect the narrowed scope completely.
Don't salvage the previous approach. Don't ask "are you sure?"

---

## When to Stop and Ask

**STOP immediately when:**

- A test fails and you can't fix it within 2 attempts
- You hit a dependency not covered in the plan
- An instruction is unclear or ambiguous
- The plan conflicts with the actual codebase
- The design needs to change, not just the implementation
- Verification fails repeatedly

**When you stop:**

1. Explain the blocker clearly
2. Show what you tried
3. Ask for direction

Do not guess. Do not work around it. Stop and ask. **Ask for clarification rather than
guessing.**

If the plan needs to change:

> "This needs a plan revision. Want me to go back to spec-plan?"

If the design was wrong:

> "This changes design assumptions. Want me to go back to spec-brainstorm?"

---

## When to Revisit Earlier Steps

**Return to spec-plan when:**
- Partner updates the plan based on your feedback
- Tasks can't be completed as specified

**Return to spec-brainstorm when:**
- Fundamental approach needs rethinking
- Implementation reveals design is wrong

---

## Completion

When all tasks are done, verify and present the work.

### Verification checklist

1. **Run full test suite** — all tests must pass, not just the new ones
2. **Run type check / lint** — clean output, no new warnings
3. **Invoke code-review** — full review of all changes
4. **Verify tasks closed** — `bd list --label <feature> --json` (beads) or check harness todo list — all tasks must be done
5. **Diff review** — review the full diff against main/master. Look for:
   - Files that changed but shouldn't have
   - Debug code or temporary hacks left behind
   - Inconsistencies between what was planned and what was built

### Summary report

Present to the human:

```
## Feature Complete: {feature name}

**Tasks:** {completed} / {total}
**Tests:** {new tests added}, {total passing}
**Files:** {created}, {modified}

### What was built
- [concise list of what was implemented]

### Verification
- Test suite: ✓ all passing
- Type check: ✓ clean
- Lint: ✓ clean
- Code review: ✓ complete

### Ready for review
```

### Next steps

After all tasks complete and verified, the next step is **spec-finish**.

> "Implementation complete. Ready to validate, review, and prepare for PR?"

Offer the human their options:

> **Finish** — invoke spec-finish to validate, review, stack commits
> **Keep** — leave the branch for now, come back later
> **Discard** — delete the branch, start over

Don't choose for them. Present options and wait.

If validation finds bugs, loop back to implement. See **spec-orchestrator**
for iteration patterns.
