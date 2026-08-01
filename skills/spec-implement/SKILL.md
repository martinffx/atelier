---
name: spec-implement
description: >
  Execute an approved Spec-backed Plan from plan.json. Uses task tracking when useful, enforces
  TDD, and reports between batches. Trigger when the user says "implement", "go", "start", or
  "do it" after approving a persisted plan. Do NOT use without an approved Spec-backed Plan.
user-invocable: true
---

# Spec Implement

Execute the approved Spec-backed Plan. Track progress when it uses tracked tasks. Report. Stop
when blocked.

**Announce at start:** "I'm using the spec-implement skill to execute this plan."

This skill does not make design decisions or modify the plan. If the plan is wrong, go
back to spec-plan. If the design is wrong, go back to spec-brainstorm.

## Prerequisites

Before starting, verify these exist:

1. Approved `docs/specs/YYYY-MM-DD-<feature>/design.md`
2. Approved `docs/specs/YYYY-MM-DD-<feature>/plan.json`
3. Any tracker entries selected during planning are available, along with
   `docs/agents/issue-tracker.md` when tracking is configured
4. You are not on main/master without explicit user consent. Create a branch or use a git
   worktree first.

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

If no concerns, proceed. Use existing tracker entries when present.

---

## Step 2: Choose Execution Style

If the human has not specified an execution style, ask.

### Autonomous Mode

> "Implement it all. Don't stop until you're done."

- Execute all tasks in dependency order
- Track progress when the Spec-backed Plan has tracker entries
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
- One combined plan and code-quality review per completed batch
- Independent tasks dispatch in parallel, dependent tasks run sequentially

Default to batched if the human hasn't expressed a preference.

---

## Step 3: Execute the Plan

Follow the approved plan exactly.

For each task, find the next unblocked task directly from `plan.json`. When tracker entries
exist, use `docs/agents/issue-tracker.md` to keep their execution state in sync; tracker state
never overrides the plan's dependency graph.

When a tracker exists, mark it in progress according to `docs/agents/issue-tracker.md`.

### For each task

Read the task's **inputs** and **description** first.

For behavior-changing code tasks, write tests that cover the validation criteria before writing
implementation. For documentation, configuration, migration, or verification-only tasks, use the
task's stated validation instead. Invoke an installed language-specific testing skill when needed.

```
1. Read task inputs and description
2. Write failing tests (cover validation criteria)
3. Run them — verify they fail for the RIGHT reason
4. Implement minimal code to make tests pass
5. Refactor if needed (tests stay green)
```

For behavior-changing code, do NOT write implementation before tests. Do NOT skip "verify it
fails." Do NOT write more code than needed to pass the test.

Verify the task against its **validation** and acceptance criteria.

### After each batch: Validate and commit

Run the task's focused validation and inspect the local diff for accidental or out-of-scope
changes. Report deviations and unexpected findings. Use **code-commit** for any commit; plan
approval does not bypass its approval gate. Comprehensive **code-review** happens in
**spec-finish**.

### On completion

When a tracker exists, mark the task complete according to
`docs/agents/issue-tracker.md`.

### Referencing existing code

When the plan or human references existing implementations ("make it look like the
users table"), read the referenced code before making changes. A reference communicates
all implicit requirements without spelling them out.

---

## Step 4: Report (Batched Mode)

After each batch:

```
Completed: [tasks]
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

If the design was wrong:

> "This changes design assumptions. Want me to go back to spec-brainstorm?"

---

## When to Revisit Earlier Steps

**Return to spec-plan when:**
- A material change affects approved behavior, scope, architecture, public contracts, or major dependencies
- Tasks cannot be completed without one of those material changes

Minor deviations may be recorded inline and reflected in plan.json when useful. Report them in the
next progress update.

**Return to spec-brainstorm when:**
- The fundamental approach needs rethinking
- Implementation reveals the design is wrong

---

## Completion

When all planned work is done, verify and present it.

### Verification checklist

1. **Run full test suite** — all tests must pass, not just the new ones
2. **Run type check / lint** — clean output, no new warnings
3. **Verify completion** — close every tracker entry when tracking is used
4. **Diff review** — review the full diff against the intended base branch. Look for:
   - Files that changed but shouldn't have
   - Debug code or temporary hacks left behind
   - Inconsistencies between what was planned and what was built

### Summary report

Present to the human:

```
## Feature Complete: {feature name}

**Plan:** Spec-backed Plan
**Tasks:** {completed} / {total}
**Tests:** {new tests added}, {total passing}
**Files:** {created}, {modified}

### What was built
- [concise list of what was implemented]

### Verification
- Test suite: ✓ all passing
- Type check: ✓ clean
- Lint: ✓ clean
- Comprehensive code review: pending spec-finish

### Ready for review
```

### Next steps

After all planned work is complete and verified, the next step is **spec-finish**.

> "Implementation complete. Ready to validate, review, and prepare for PR?"

Offer the human their options:

> **Finish** — invoke spec-finish to validate, review, stack commits
> **Keep** — leave the branch for now, come back later
> **Discard** — delete the branch, start over

Don't choose for them. Present options and wait.

If validation finds bugs, loop back to implement. See **atelier-orchestrator**
for iteration patterns.
