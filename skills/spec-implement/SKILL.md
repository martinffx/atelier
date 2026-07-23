---
name: spec-implement
description: >
  Execute an approved Inline Plan or Spec-backed Plan. Uses the conversational plan directly
  for inline work and plan.json plus useful task tracking for spec-backed work. Enforces TDD
  and reports between batches. Trigger when the user says "implement", "go", "start", or
  "do it" after approving a written plan. Do NOT use without an approved plan.
user-invocable: true
---

# Spec Implement

Execute the approved plan. Track progress when the selected planning mode uses tracked
tasks. Report. Stop when blocked.

**Announce at start:** "I'm using the spec-implement skill to execute this plan."

This skill does not make design decisions or modify the plan. If the plan is wrong, go
back to spec-plan. If inline work develops substantial design or coordination needs, return
to spec-orchestrator for promotion. If a spec-backed design is wrong, go back to
spec-brainstorm.

## Prerequisites

Before starting, verify the prerequisites for the selected planning mode:

**Inline Plan:**
1. The complete five-section plan is present in the active conversation
2. The human explicitly approved it
3. No planning artifact or tracker is required

**Spec-backed Plan:**
1. Approved `docs/specs/YYYY-MM-DD-<feature>/design.md`
2. Approved `docs/specs/YYYY-MM-DD-<feature>/plan.json`
3. Any tracker entries selected during planning are available

**Both modes:** Never start implementation on main/master without explicit user consent.
Create a branch or use a git worktree first.

If anything is missing, do not proceed. Tell the human what's needed.

---

## Step 1: Load and Review the Plan

Read the approved conversational plan or plan.json critically before writing code. Look for:

- Unclear or ambiguous tasks
- Missing file paths or incomplete validation criteria
- Tasks that conflict with each other
- Dependencies that don't match what you see in the codebase

If you find concerns, **raise them with the human before starting**. Don't guess. Don't
assume. Don't force through blockers.

If no concerns, proceed. Use existing tracker entries for spec-backed work; do not create
tracking for Inline Plans.

---

## Step 2: Choose Execution Style

Planning mode and execution style are separate. If the human has not specified an execution
style, ask.

### Autonomous Mode

> "Implement it all. Don't stop until you're done."

- Execute all planned work in order
- Track progress only when the Spec-backed Plan has tracker entries
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

## Step 3: Execute the Plan

Follow the approved plan exactly.

### Inline Plan

Execute the `changes` in order while respecting `scope`, `files`, and `validation`. Do not
manufacture task IDs, dependencies, Beads issues, or harness todos. Treat each coherent
change as the unit for TDD, validation, and review.

### Spec-backed Plan

For each task, find the next ready task:

**With beads (preferred):**
```bash
bd ready --label <feature> --json
```

**With harness todos:** Check the todo list for the next unblocked task, respecting
`depends_on` from plan.json.

**Without a tracker:** Read the next unblocked task directly from plan.json.

When a tracker exists, mark it in progress:

**With beads:**
```bash
bd update <task-id> --status in_progress
```

**With harness todos:**
Update the todo status to in_progress.

### For each task or coherent inline change

For spec-backed work, read the task's **inputs** and **description** first. For inline work,
read the complete plan before each change so its scope and constraints remain visible.

Write tests that cover the validation criteria before writing implementation.
Invoke `typescript-testing` or `python-testing` (whichever matches the project)
for test design patterns when needed.

```
1. Read task inputs and description
2. Write failing tests (cover validation criteria)
3. Run them — verify they fail for the RIGHT reason
4. Implement minimal code to make tests pass
5. Refactor if needed (tests stay green)
6. Commit (use code-commit for commit message)
```

Do NOT write implementation before tests. Do NOT skip "verify it fails." Do NOT write
more code than needed to pass the test.

Verify the work against the active plan's validation section. For spec-backed work, also
check the task's acceptance criteria.

### After each task: Review

Invoke **code-review** before moving to the next tracked task or coherent inline change.
This catches issues early rather than accumulating debt across multiple tasks.

### On completion

For spec-backed work with a tracker, mark the task done:

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
Completed: [tasks or inline changes]
- [completed work]

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

If a Spec-backed Plan's design was wrong:

> "This changes design assumptions. Want me to go back to spec-brainstorm?"

If Inline Plan work now needs durable design or coordination:

> "This work now has substantial planning needs. Want me to return to spec-orchestrator
> and promote it to a Spec-backed Plan?"

---

## When to Revisit Earlier Steps

**Return to spec-plan when:**
- Partner updates the plan based on your feedback
- Tasks can't be completed as specified

**Return to spec-brainstorm when:**
- A Spec-backed Plan's fundamental approach needs rethinking
- Spec-backed implementation reveals design is wrong

**Return to spec-orchestrator when:**
- Inline work develops substantial unresolved design decisions
- Inline work now needs durable handoff, audit, or dependency coordination

---

## Completion

When all planned work is done, verify and present it.

### Verification checklist

1. **Run full test suite** — all tests must pass, not just the new ones
2. **Run type check / lint** — clean output, no new warnings
3. **Invoke code-review** — full review of all changes
4. **Verify completion** — for spec-backed work, close every tracker entry; for inline work,
   verify every planned change and validation item is complete
5. **Diff review** — review the full diff against main/master. Look for:
   - Files that changed but shouldn't have
   - Debug code or temporary hacks left behind
   - Inconsistencies between what was planned and what was built

### Summary report

Present to the human:

```
## Feature Complete: {feature name}

**Plan:** {Inline Plan | Spec-backed Plan}
**Changes:** {completed} (Inline Plan only)
**Tasks:** {completed} / {total} (Spec-backed Plan only)
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

Include only the progress line that matches the active planning mode.

### Next steps

After all planned work is complete and verified, the next step is **spec-finish**.

> "Implementation complete. Ready to validate, review, and prepare for PR?"

Offer the human their options:

> **Finish** — invoke spec-finish to validate, review, stack commits
> **Keep** — leave the branch for now, come back later
> **Discard** — delete the branch, start over

Don't choose for them. Present options and wait.

If validation finds bugs, loop back to implement. See **spec-orchestrator**
for iteration patterns.
